"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { precoParaNumero } from "@/lib/validations/moeda";
import { darBaixaProducaoConcluida, reverterBaixaProducaoConcluida } from "@/lib/estoque";
import { inferirMedidaId, formatarNomeBonito } from "@/lib/planilhaOp";
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
  | { success: true; produto: { id: string; nome: string; preco: number } }
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
    produto: { id: produto.id, nome: produto.nome, preco: Number(produto.preco) },
  };
}

function normalizar(texto: string) {
  return texto.trim().toLowerCase();
}

// Cria as linhas de uma submissão em lote. Cada linha vira produção
// formal (Pedido → ItemPedido → OrdemProducao, agrupada por cliente,
// mesma lógica da importação de planilha — ADR-031) se tiver um
// clienteId válido; senão, todas as linhas restantes viram uma única
// OrdemAvulsa. Ver ADR-033 para o racional completo.
export async function criarOrdemAvulsa(
  dadosBrutos: CriarOrdemAvulsaValues,
): Promise<ResultadoAcao> {
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
      const itensComPreco = itensDoCliente.map(({ linha, produtoId, preco, custo }) => ({
        produtoId,
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
      for (const item of pedido.itens) {
        await tx.ordemProducao.create({
          data: { itemPedidoId: item.id, dataProgramada: dataProgramadaParsed },
        });
      }
    }

    // Agrupa por cliente (texto normalizado) — uma OP avulsa só pode
    // ter um cliente, mesma regra do lado formal (que já agrupa por
    // clienteId). Antes todas as linhas avulsas de uma submissão
    // caíam numa OrdemAvulsa só, mesmo sendo de clientes diferentes.
    const linhasAvulsas = produtos.filter((p) => !ehFormal(p.linha));
    const gruposPorClienteTexto = new Map<string, typeof linhasAvulsas>();
    for (const item of linhasAvulsas) {
      const chave = normalizar(item.linha.clienteTexto);
      const grupo = gruposPorClienteTexto.get(chave) ?? [];
      grupo.push(item);
      gruposPorClienteTexto.set(chave, grupo);
    }

    for (const itensDoCliente of gruposPorClienteTexto.values()) {
      await tx.ordemAvulsa.create({
        data: {
          itens: {
            create: itensDoCliente.map(({ linha, produtoId }) => ({
              produtoId,
              quantidade: linha.quantidade,
              clienteTexto: linha.clienteTexto,
              observacao: linha.observacao || null,
              precoUnitario: linha.precoUnitario ? precoParaNumero(linha.precoUnitario) : null,
              dataProgramada: dataProgramadaParsed,
            })),
          },
        },
      });
    }
  });

  revalidatePath("/producao");
  revalidatePath("/pedidos");
  return { success: true };
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
// produto/quantidade deixaria os dados inconsistentes, então trava
// (mesmo espírito da trava de cancelamento pós-expedição).
export async function atualizarItemOrdemAvulsa(
  id: string,
  dadosBrutos: EditarItemAvulsaValues,
): Promise<ResultadoAcao> {
  const resultado = editarItemAvulsaSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return { success: false, error: "Verifique os campos destacados." };
  }

  const item = await prisma.itemOrdemAvulsa.findUnique({ where: { id } });
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
      quantidade,
      clienteTexto,
      clienteId: clienteId || null,
      observacao: observacao || null,
      precoUnitario: precoUnitario ? precoParaNumero(precoUnitario) : null,
      dataProgramada: dataProgramada ? new Date(`${dataProgramada}T00:00:00`) : null,
    },
  });

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
    const item = await prisma.itemOrdemAvulsa.findUnique({ where: { id: linha.itemId } });
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
        quantidade: linha.quantidade,
        clienteTexto: linha.clienteTexto,
        clienteId: linha.clienteId || null,
        observacao: linha.observacao || null,
        precoUnitario: linha.precoUnitario ? precoParaNumero(linha.precoUnitario) : null,
        dataProgramada: linha.dataProgramada ? new Date(`${linha.dataProgramada}T00:00:00`) : null,
      },
    });
  }

  revalidatePath("/producao");
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
  await darBaixaProducaoConcluida(
    item.produtoId,
    item.quantidade,
    `OP Avulsa #${item.ordemAvulsa.numero}`,
  );

  revalidatePath("/producao");
  revalidatePath("/estoque");
}

// Volta um passo (Em produção → Aguardando, Concluído → Em produção),
// sem apagar a linha — mesma lógica de voltarOrdemProducao no fluxo
// formal. Bloqueia se já tem expedição gerada (mesma trava do cancelar).
export async function voltarProducaoAvulsa(id: string) {
  const item = await prisma.itemOrdemAvulsa.findUnique({
    where: { id },
    include: { ordemAvulsa: true, expedicao: true },
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
    if (item.expedicao) {
      return;
    }
    await reverterBaixaProducaoConcluida(
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
// reaproveitando as funções de 3 passos por baixo. "Marcar" não tem
// trava de expedição (só "desmarcar" tem, herdada de voltarProducaoAvulsa).
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

export async function cancelarItemOrdemAvulsa(id: string) {
  const item = await prisma.itemOrdemAvulsa.findUnique({
    where: { id },
    include: { ordemAvulsa: true, expedicao: true },
  });
  if (!item) {
    return;
  }
  // Já tem expedição gerada a partir dessa linha — cancelar deixaria a
  // expedição órfã, então trava aqui (mesma lógica de excluirPedido).
  if (item.expedicao) {
    return;
  }
  if (item.status === "CONCLUIDO") {
    await reverterBaixaProducaoConcluida(
      item.produtoId,
      item.quantidade,
      `OP Avulsa #${item.ordemAvulsa.numero}`,
    );
  }
  await prisma.itemOrdemAvulsa.delete({ where: { id } });
  revalidatePath("/producao");
  revalidatePath("/estoque");
}

// Cancela de uma vez todos os itens do card agrupado (mesma OP, mesmo
// status) — mesma lógica de cancelarItemOrdemAvulsa, só que em lote,
// pra não precisar cancelar linha por linha quando quer descartar a OP
// inteira. Itens com expedição são pulados (não travam os outros).
export async function cancelarGrupoAvulsa(ids: string[]) {
  for (const id of ids) {
    await cancelarItemOrdemAvulsa(id);
  }
}
