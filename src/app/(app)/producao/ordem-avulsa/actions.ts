"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { precoParaNumero } from "@/lib/validations/moeda";
import {
  darBaixaInsumos,
  estornarInsumos,
  darEntradaProdutoAcabado,
  estornarEntradaProdutoAcabado,
} from "@/lib/estoque";
import { inferirMedidaId, formatarNomeBonito } from "@/lib/planilhaOp";
import { chaveDiaCartao } from "@/lib/producaoCartoes";
import {
  criarOrdemAvulsaSchema,
  clienteRapidoSchema,
  produtoRapidoSchema,
  editarItemAvulsaSchema,
  editarGrupoAvulsaSchema,
  type CriarOrdemAvulsaValues,
  type ClienteRapidoValues,
  type ProdutoRapidoValues,
  type LinhaOrdemAvulsaValues,
  type EditarItemAvulsaValues,
  type EditarGrupoAvulsaValues,
} from "@/lib/validations/ordemAvulsa";

type ResultadoAcao = { success: true } | { success: false; error: string };

type ResultadoClienteRapido =
  | { success: true; cliente: { id: string; nome: string } }
  | { success: false; error: string };

export async function criarClienteRapido(
  dadosBrutos: ClienteRapidoValues,
): Promise<ResultadoClienteRapido> {
  const resultado = clienteRapidoSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return { success: false, error: resultado.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const cliente = await prisma.cliente.create({
    data: { razaoSocial: resultado.data.razaoSocial, telefone: resultado.data.telefone },
  });

  revalidatePath("/clientes");
  return { success: true, cliente: { id: cliente.id, nome: cliente.razaoSocial } };
}

type ResultadoProdutoRapido =
  | { success: true; produto: { id: string; nome: string; preco: number; custo: number } }
  | { success: false; error: string };

export async function criarProdutoRapido(
  dadosBrutos: ProdutoRapidoValues,
): Promise<ResultadoProdutoRapido> {
  const resultado = produtoRapidoSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return { success: false, error: resultado.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const produto = await prisma.produto.create({
    data: {
      nome: resultado.data.nome,
      tipo: resultado.data.tipo,
      medidaId: resultado.data.medidaId,
      preco: precoParaNumero(resultado.data.preco),
      custo: precoParaNumero(resultado.data.custo),
    },
  });

  revalidatePath("/produtos");
  return {
    success: true,
    produto: {
      id: produto.id,
      nome: produto.nome,
      preco: Number(produto.preco),
      custo: Number(produto.custo),
    },
  };
}

function normalizar(texto: string) {
  return texto.trim().toLowerCase();
}

type ResultadoCriarOrdemAvulsa =
  | { success: true; avisosEstoque: string[] }
  | { success: false; error: string };

// Cria as linhas de uma submissão em lote. Cada linha vira produção
// formal (Pedido → ItemPedido → OrdemProducao, agrupada por cliente,
// mesma lógica da importação de planilha — ADR-031) se tiver um
// clienteId válido; senão, todas as linhas restantes viram uma única
// OrdemAvulsa. Ver ADR-033 para o racional completo.
export async function criarOrdemAvulsa(
  dadosBrutos: CriarOrdemAvulsaValues,
): Promise<ResultadoCriarOrdemAvulsa> {
  const resultado = criarOrdemAvulsaSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return { success: false, error: "Verifique as linhas destacadas." };
  }
  const { linhas, dataProgramada } = resultado.data;
  const dataProgramadaParsed = dataProgramada ? new Date(`${dataProgramada}T00:00:00`) : null;

  const [produtosAtivos, medidas] = await Promise.all([
    prisma.produto.findMany({ where: { ativo: true } }),
    prisma.medida.findMany({ where: { ativo: true } }),
  ]);
  const produtoPorId = new Map(produtosAtivos.map((produto) => [produto.id, produto]));
  const produtoPorNome = new Map(produtosAtivos.map((produto) => [normalizar(produto.nome), produto]));

  const clienteIds = [
    ...new Set(linhas.map((linha) => linha.clienteId).filter((v): v is string => Boolean(v))),
  ];
  const clientesExistentes = clienteIds.length
    ? await prisma.cliente.findMany({ where: { id: { in: clienteIds } } })
    : [];
  const clientePorId = new Map(clientesExistentes.map((cliente) => [cliente.id, cliente]));

  const ehFormal = (linha: LinhaOrdemAvulsaValues) =>
    !!linha.clienteId && clientePorId.has(linha.clienteId);

  const linhasParaBaixa: { produtoId: string; quantidade: number; rotulo: string }[] = [];

  await prisma.$transaction(async (tx) => {
    // Resolve o produto de cada linha: por id (selecionado/criado no
    // popup), por nome exato já cadastrado, ou — se nenhum dos dois —
    // cadastra um produto novo sozinho a partir do texto digitado,
    // inferindo a medida do nome (mesma lógica da importação de
    // planilha, ADR-031). Tipo entra como "Base" e custo como 0 por
    // padrão; ajustável depois em /produtos.
    const novosPorNome = new Map<string, string>();
    const produtos: { linha: LinhaOrdemAvulsaValues; produtoId: string; preco: number; custo: number }[] =
      [];
    for (const linha of linhas) {
      const nomeNormalizado = normalizar(linha.produtoTexto);
      let produto =
        (linha.produtoId ? produtoPorId.get(linha.produtoId) : undefined) ??
        produtoPorNome.get(nomeNormalizado);

      if (!produto) {
        const idJaCriado = novosPorNome.get(nomeNormalizado);
        if (idJaCriado) {
          produto = produtoPorId.get(idJaCriado)!;
        } else {
          const medidaId = inferirMedidaId(linha.produtoTexto, medidas) ?? medidas[0]?.id;
          if (!medidaId) {
            throw new Error("Não há nenhuma medida cadastrada no sistema pra usar como padrão.");
          }
          const preco = linha.precoUnitario ? precoParaNumero(linha.precoUnitario) : 0;
          const criado = await tx.produto.create({
            data: {
              nome: formatarNomeBonito(linha.produtoTexto),
              tipo: "BASE",
              medidaId,
              preco,
              custo: 0,
            },
          });
          produtoPorId.set(criado.id, criado);
          novosPorNome.set(nomeNormalizado, criado.id);
          produto = criado;
        }
      }

      produtos.push({
        linha,
        produtoId: produto.id,
        preco: Number(produto.preco),
        custo: Number(produto.custo),
      });
    }

    const linhasFormais = produtos.filter((p) => ehFormal(p.linha));
    const gruposPorCliente = new Map<string, typeof linhasFormais>();
    for (const item of linhasFormais) {
      const grupo = gruposPorCliente.get(item.linha.clienteId!) ?? [];
      grupo.push(item);
      gruposPorCliente.set(item.linha.clienteId!, grupo);
    }

    for (const [clienteId, itensDoCliente] of gruposPorCliente) {
      const itensComPreco = itensDoCliente.map(({ linha, produtoId, preco, custo }, indice) => ({
        produtoId,
        // Texto exatamente como digitado — nunca o nome do produto
        // vinculado (ver ADR-035). "ordem" preserva a sequência digitada.
        produtoTexto: linha.produtoTexto,
        ordem: indice,
        quantidade: linha.quantidade,
        precoUnitario: linha.precoUnitario ? precoParaNumero(linha.precoUnitario) : preco,
        custoUnitario: custo,
      }));
      const valorTotal = itensComPreco.reduce(
        (total, item) => total + item.precoUnitario * item.quantidade,
        0,
      );
      const observacoes =
        itensDoCliente
          .map(({ linha }) => linha.observacao)
          .filter((valor): valor is string => Boolean(valor))
          .join(" · ") || null;

      const pedido = await tx.pedido.create({
        data: { clienteId, valorTotal, observacoes, itens: { create: itensComPreco } },
        include: { itens: true },
      });
      // O include acima não garante a ordem de inserção (ver ADR-035) —
      // reordena explicitamente por "ordem" antes de criar a OrdemProducao
      // de cada item, senão o número da OP acaba não seguindo a ordem
      // digitada.
      const itensOrdenados = [...pedido.itens].sort((a, b) => a.ordem - b.ordem);
      for (const item of itensOrdenados) {
        const ordem = await tx.ordemProducao.create({
          data: { itemPedidoId: item.id, dataProgramada: dataProgramadaParsed },
        });
        linhasParaBaixa.push({
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          rotulo: `OP #${ordem.numero}`,
        });
      }
    }

    // Todas as linhas avulsas de uma submissão caem numa OrdemAvulsa só,
    // mesmo sendo de clientes diferentes — uma OP avulsa pode ter
    // vários clientes dentro (decisão revertida em 2026-08-18, ver
    // ADR-033/ADR-034: o agrupamento por cliente que existiu por um
    // tempo ficava com o dia partido em várias caixas separadas na
    // tela "OP do dia", o que o Ryan não queria).
    const linhasAvulsas = produtos.filter((p) => !ehFormal(p.linha));
    if (linhasAvulsas.length > 0) {
      // Se já existe uma OP avulsa aberta (não confirmada como concluída)
      // pro mesmo dia, os itens entram nela em vez de abrir uma OP nova —
      // senão cada submissão do mesmo dia virava um número novo (bug
      // relatado em 2026-08-18, ver ADR-035). "Mesmo dia" usa a mesma
      // regra de bucket de chaveDiaCartao (dataProgramada quando tem,
      // senão o dia de criação no fuso do Brasil), pra ficar consistente
      // com o agrupamento que a tela "OP do dia" já usa.
      const diaChaveAlvo = chaveDiaCartao(dataProgramadaParsed, new Date());
      const itensAbertos = await tx.itemOrdemAvulsa.findMany({
        where: { ordemAvulsa: { concluidaConfirmada: false } },
        select: {
          dataProgramada: true,
          createdAt: true,
          ordem: true,
          ordemAvulsaId: true,
          ordemAvulsa: { select: { numero: true } },
        },
      });
      const itensDoCandidato = itensAbertos.filter(
        (item) => chaveDiaCartao(item.dataProgramada, item.createdAt) === diaChaveAlvo,
      );
      const candidato = [...itensDoCandidato].sort(
        (a, b) => a.ordemAvulsa.numero - b.ordemAvulsa.numero,
      )[0];

      let ordemId: string;
      let ordemNumero: number;
      // Itens adicionados depois entram no final — nunca reordenados no
      // meio (ver ADR-035) — continua a partir do maior "ordem" já usado
      // no grupo reaproveitado, em vez de começar de novo em 0.
      let proximaOrdem = 0;
      if (candidato) {
        ordemId = candidato.ordemAvulsaId;
        ordemNumero = candidato.ordemAvulsa.numero;
        proximaOrdem =
          Math.max(
            ...itensDoCandidato
              .filter((item) => item.ordemAvulsaId === candidato.ordemAvulsaId)
              .map((item) => item.ordem),
          ) + 1;
      } else {
        const nova = await tx.ordemAvulsa.create({ data: {} });
        ordemId = nova.id;
        ordemNumero = nova.numero;
      }

      for (const { linha, produtoId } of linhasAvulsas) {
        const item = await tx.itemOrdemAvulsa.create({
          data: {
            ordemAvulsaId: ordemId,
            produtoId,
            // Texto exatamente como digitado — nunca o nome do produto
            // vinculado (ver ADR-035).
            produtoTexto: linha.produtoTexto,
            ordem: proximaOrdem++,
            quantidade: linha.quantidade,
            clienteTexto: linha.clienteTexto,
            observacao: linha.observacao || null,
            precoUnitario: linha.precoUnitario ? precoParaNumero(linha.precoUnitario) : null,
            dataProgramada: dataProgramadaParsed,
          },
        });
        linhasParaBaixa.push({
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          rotulo: `OP Avulsa #${ordemNumero}`,
        });
      }
    }
  });

  // Baixa de insumo roda fora da transação (usa o client global, ver
  // darBaixaInsumos) — uma única vez, na criação, nunca repetida.
  const avisosEstoque: string[] = [];
  for (const linha of linhasParaBaixa) {
    const { avisos } = await darBaixaInsumos(linha.produtoId, linha.quantidade, linha.rotulo);
    avisosEstoque.push(...avisos);
  }

  revalidatePath("/producao");
  revalidatePath("/pedidos");
  revalidatePath("/estoque");
  return { success: true, avisosEstoque: [...new Set(avisosEstoque)] };
}

// Resolve o produto de uma linha (id, nome exato, ou cadastra um novo a
// partir do texto digitado) — mesma lógica usada por criarOrdemAvulsa,
// atualizarItemOrdemAvulsa e atualizarGrupoAvulsa, extraída aqui pra não
// repetir pela terceira vez.
async function resolverProdutoAvulso(
  produtoTexto: string,
  produtoId: string | undefined,
  precoUnitario: string | undefined,
): Promise<{ id: string } | { erro: string }> {
  const nomeNormalizado = normalizar(produtoTexto);
  let produto = produtoId ? await prisma.produto.findUnique({ where: { id: produtoId } }) : null;
  if (!produto) {
    produto = await prisma.produto.findFirst({
      where: { ativo: true, nome: { equals: nomeNormalizado, mode: "insensitive" } },
    });
  }
  if (produto) {
    return { id: produto.id };
  }

  const medidas = await prisma.medida.findMany({ where: { ativo: true } });
  const medidaId = inferirMedidaId(produtoTexto, medidas) ?? medidas[0]?.id;
  if (!medidaId) {
    return { erro: "Não há nenhuma medida cadastrada no sistema pra usar como padrão." };
  }
  const criado = await prisma.produto.create({
    data: {
      nome: formatarNomeBonito(produtoTexto),
      tipo: "BASE",
      medidaId,
      preco: precoUnitario ? precoParaNumero(precoUnitario) : 0,
      custo: 0,
    },
  });
  return { id: criado.id };
}

// Edita uma OP avulsa já existente. Só permitido em AGUARDANDO — depois
// que a produção inicia (ou pior, conclui e dá baixa no estoque), mudar
// produto/quantidade deixaria os dados inconsistentes, então trava.
export async function atualizarItemOrdemAvulsa(
  id: string,
  dadosBrutos: EditarItemAvulsaValues,
): Promise<ResultadoAcao> {
  const resultado = editarItemAvulsaSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return { success: false, error: "Verifique os campos destacados." };
  }

  const item = await prisma.itemOrdemAvulsa.findUnique({
    where: { id },
    include: { ordemAvulsa: true },
  });
  if (!item) {
    return { success: false, error: "OP não encontrada." };
  }
  if (item.status !== "AGUARDANDO") {
    return { success: false, error: "Só é possível editar enquanto a OP está aguardando." };
  }

  const { produtoTexto, produtoId, quantidade, clienteTexto, clienteId, observacao, precoUnitario, dataProgramada } =
    resultado.data;

  const produto = await resolverProdutoAvulso(produtoTexto, produtoId, precoUnitario);
  if ("erro" in produto) {
    return { success: false, error: produto.erro };
  }

  await prisma.itemOrdemAvulsa.update({
    where: { id },
    data: {
      produtoId: produto.id,
      produtoTexto,
      quantidade,
      clienteTexto,
      clienteId: clienteId || null,
      observacao: observacao || null,
      precoUnitario: precoUnitario ? precoParaNumero(precoUnitario) : null,
      dataProgramada: dataProgramada ? new Date(`${dataProgramada}T00:00:00`) : null,
    },
  });

  // Insumo já tinha sido baixado na criação, pelo produto/quantidade
  // antigos — se algum dos dois mudou, refaz a baixa (mesmo racional do
  // lado formal, atualizarOrdemProducao).
  if (produto.id !== item.produtoId || quantidade !== item.quantidade) {
    const rotulo = `OP Avulsa #${item.ordemAvulsa.numero} (edição)`;
    await estornarInsumos(item.produtoId, item.quantidade, rotulo);
    await darBaixaInsumos(produto.id, quantidade, rotulo);
    revalidatePath("/estoque");
  }

  revalidatePath("/producao");
  return { success: true };
}

// Mesma edição, em lote — todos os itens do card agrupado de uma vez.
// Cada linha traz seu próprio id; qualquer uma fora de "Aguardando" é
// pulada (não trava as outras, só não aplica a mudança nela).
export async function atualizarGrupoAvulsa(
  dadosBrutos: EditarGrupoAvulsaValues,
): Promise<ResultadoAcao> {
  const resultado = editarGrupoAvulsaSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return { success: false, error: "Verifique os campos destacados." };
  }

  for (const linha of resultado.data.linhas) {
    const item = await prisma.itemOrdemAvulsa.findUnique({
      where: { id: linha.itemId },
      include: { ordemAvulsa: true },
    });
    if (!item || item.status !== "AGUARDANDO") {
      continue;
    }

    const produto = await resolverProdutoAvulso(linha.produtoTexto, linha.produtoId, linha.precoUnitario);
    if ("erro" in produto) {
      return { success: false, error: produto.erro };
    }

    await prisma.itemOrdemAvulsa.update({
      where: { id: linha.itemId },
      data: {
        produtoId: produto.id,
        produtoTexto: linha.produtoTexto,
        quantidade: linha.quantidade,
        clienteTexto: linha.clienteTexto,
        clienteId: linha.clienteId || null,
        observacao: linha.observacao || null,
        precoUnitario: linha.precoUnitario ? precoParaNumero(linha.precoUnitario) : null,
        dataProgramada: linha.dataProgramada ? new Date(`${linha.dataProgramada}T00:00:00`) : null,
      },
    });

    if (produto.id !== item.produtoId || linha.quantidade !== item.quantidade) {
      const rotulo = `OP Avulsa #${item.ordemAvulsa.numero} (edição)`;
      await estornarInsumos(item.produtoId, item.quantidade, rotulo);
      await darBaixaInsumos(produto.id, linha.quantidade, rotulo);
    }
  }

  revalidatePath("/producao");
  revalidatePath("/estoque");
  return { success: true };
}

// Controle simples de pagamento, independente do status de produção —
// ver comentário do campo `pago` no schema.
export async function alternarPagamentoAvulsa(id: string, pago: boolean) {
  await prisma.itemOrdemAvulsa.update({ where: { id }, data: { pago } });
  revalidatePath("/producao");
}

export async function iniciarProducaoAvulsa(id: string) {
  const item = await prisma.itemOrdemAvulsa.findUnique({ where: { id } });
  if (!item || item.status !== "AGUARDANDO") {
    return;
  }
  await prisma.itemOrdemAvulsa.update({ where: { id }, data: { status: "EM_PRODUCAO" } });
  revalidatePath("/producao");
}

export async function concluirProducaoAvulsa(id: string) {
  const item = await prisma.itemOrdemAvulsa.findUnique({
    where: { id },
    include: { ordemAvulsa: true },
  });
  if (!item || item.status !== "EM_PRODUCAO") {
    return;
  }

  await prisma.itemOrdemAvulsa.update({ where: { id }, data: { status: "CONCLUIDO" } });
  // Só entrada do produto acabado — baixa de insumo já aconteceu na
  // criação (ver criarOrdemAvulsa).
  await darEntradaProdutoAcabado(
    item.produtoId,
    item.quantidade,
    `OP Avulsa #${item.ordemAvulsa.numero}`,
  );

  revalidatePath("/producao");
  revalidatePath("/estoque");
}

// Volta um passo (Em produção → Aguardando, Concluído → Em produção),
// sem apagar a linha — mesma lógica de voltarOrdemProducao no fluxo
// formal. Só estorna a entrada do produto acabado — insumo não é
// tocado aqui (baixado na criação, só volta se a linha for cancelada
// de vez).
export async function voltarProducaoAvulsa(id: string) {
  const item = await prisma.itemOrdemAvulsa.findUnique({
    where: { id },
    include: { ordemAvulsa: true },
  });
  if (!item) {
    return;
  }

  if (item.status === "EM_PRODUCAO") {
    await prisma.itemOrdemAvulsa.update({ where: { id }, data: { status: "AGUARDANDO" } });
    revalidatePath("/producao");
    return;
  }

  if (item.status === "CONCLUIDO") {
    await estornarEntradaProdutoAcabado(
      item.produtoId,
      item.quantidade,
      `OP Avulsa #${item.ordemAvulsa.numero}`,
    );
    await prisma.itemOrdemAvulsa.update({ where: { id }, data: { status: "EM_PRODUCAO" } });
    revalidatePath("/producao");
    revalidatePath("/estoque");
  }
}

// Checkbox "Feito" da tela OP do dia — mesmo racional do lado formal
// (marcarItemFeito/desmarcarItemFeito em producao/actions.ts): binário,
// reaproveitando as funções de 3 passos por baixo.
export async function marcarItemFeitoAvulsa(id: string) {
  const item = await prisma.itemOrdemAvulsa.findUnique({ where: { id } });
  if (!item || item.status === "CONCLUIDO") {
    return;
  }
  if (item.status === "AGUARDANDO") {
    await iniciarProducaoAvulsa(id);
  }
  await concluirProducaoAvulsa(id);
}

export async function desmarcarItemFeitoAvulsa(id: string) {
  const item = await prisma.itemOrdemAvulsa.findUnique({ where: { id } });
  if (!item || item.status === "AGUARDANDO") {
    return;
  }
  if (item.status === "CONCLUIDO") {
    await voltarProducaoAvulsa(id);
  }
  await voltarProducaoAvulsa(id);
}

// Mesmo racional de confirmarConclusaoGrupo (producao/actions.ts) do
// lado avulso — ver ADR-033.
export async function confirmarConclusaoGrupoAvulsa(ordemAvulsaId: string) {
  const itens = await prisma.itemOrdemAvulsa.findMany({ where: { ordemAvulsaId } });
  for (const item of itens) {
    if (item.status !== "CONCLUIDO") {
      await marcarItemFeitoAvulsa(item.id);
    }
  }
  await prisma.ordemAvulsa.update({
    where: { id: ordemAvulsaId },
    data: { concluidaConfirmada: true },
  });
  revalidatePath("/producao");
}

// Mesmo racional de desconfirmarConclusaoGrupo (producao/actions.ts) —
// clicar de novo no badge tira a OP avulsa do estado confirmado.
export async function desconfirmarConclusaoGrupoAvulsa(ordemAvulsaId: string) {
  await prisma.ordemAvulsa.update({
    where: { id: ordemAvulsaId },
    data: { concluidaConfirmada: false },
  });
  revalidatePath("/producao");
}

export async function cancelarItemOrdemAvulsa(id: string) {
  const item = await prisma.itemOrdemAvulsa.findUnique({
    where: { id },
    include: { ordemAvulsa: true },
  });
  if (!item) {
    return;
  }
  if (item.status === "CONCLUIDO") {
    await estornarEntradaProdutoAcabado(
      item.produtoId,
      item.quantidade,
      `OP Avulsa #${item.ordemAvulsa.numero}`,
    );
  }
  // Insumo foi baixado na criação, então estorna sempre, independente
  // do status atual da linha.
  await estornarInsumos(item.produtoId, item.quantidade, `OP Avulsa #${item.ordemAvulsa.numero}`);
  await prisma.itemOrdemAvulsa.delete({ where: { id } });
  revalidatePath("/producao");
  revalidatePath("/estoque");
}

// Cancela de uma vez todos os itens do card agrupado (mesma OP, mesmo
// status) — mesma lógica de cancelarItemOrdemAvulsa, só que em lote,
// pra não precisar cancelar linha por linha quando quer descartar a OP
// inteira.
export async function cancelarGrupoAvulsa(ids: string[]) {
  for (const id of ids) {
    await cancelarItemOrdemAvulsa(id);
  }
}
