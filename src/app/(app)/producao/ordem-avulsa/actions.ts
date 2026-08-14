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
  type CriarOrdemAvulsaValues,
  type ClienteRapidoValues,
  type ProdutoRapidoValues,
  type LinhaOrdemAvulsaValues,
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
  const { linhas } = resultado.data;

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
        await tx.ordemProducao.create({ data: { itemPedidoId: item.id } });
      }
    }

    const linhasAvulsas = produtos.filter((p) => !ehFormal(p.linha));
    if (linhasAvulsas.length > 0) {
      await tx.ordemAvulsa.create({
        data: {
          itens: {
            create: linhasAvulsas.map(({ linha, produtoId }) => ({
              produtoId,
              quantidade: linha.quantidade,
              clienteTexto: linha.clienteTexto,
              observacao: linha.observacao || null,
              precoUnitario: linha.precoUnitario ? precoParaNumero(linha.precoUnitario) : null,
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
