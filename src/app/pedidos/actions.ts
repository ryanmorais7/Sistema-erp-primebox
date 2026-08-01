"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { pedidoSchema, type PedidoFormValues } from "@/lib/validations/pedido";
import { precoParaNumero } from "@/lib/validations/moeda";

type ResultadoAcao =
  | { success: true; pedidoId?: string }
  | { success: false; error: string; camposComErro?: Record<string, string> };

function extrairErrosDeCampo(issues: { path: PropertyKey[]; message: string }[]) {
  const campos: Record<string, string> = {};
  for (const issue of issues) {
    const campo = issue.path.join(".");
    if (!campos[campo]) {
      campos[campo] = issue.message;
    }
  }
  return campos;
}

// O preço unitário vem do formulário (o vendedor pode negociar por pedido),
// não do cadastro do produto — só confirmamos que o produto ainda existe.
async function montarItensComPreco(
  itens: { produtoId: string; quantidade: number; precoUnitario: string }[],
) {
  const produtosExistentes = await prisma.produto.findMany({
    where: { id: { in: itens.map((item) => item.produtoId) } },
    select: { id: true },
  });
  const idsExistentes = new Set(produtosExistentes.map((produto) => produto.id));

  const itensComPreco = itens.map((item) => {
    if (!idsExistentes.has(item.produtoId)) {
      throw new Error("Produto selecionado não existe mais.");
    }
    return {
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      precoUnitario: precoParaNumero(item.precoUnitario),
    };
  });

  const valorTotal = itensComPreco.reduce(
    (total, item) => total + item.precoUnitario * item.quantidade,
    0,
  );

  return { itensComPreco, valorTotal };
}

export async function criarPedido(dadosBrutos: PedidoFormValues): Promise<ResultadoAcao> {
  const resultado = pedidoSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return {
      success: false,
      error: "Verifique os campos destacados.",
      camposComErro: extrairErrosDeCampo(resultado.error.issues),
    };
  }

  const { itensComPreco, valorTotal } = await montarItensComPreco(resultado.data.itens);

  const pedido = await prisma.pedido.create({
    data: {
      clienteId: resultado.data.clienteId,
      observacoes: resultado.data.observacoes || null,
      valorTotal,
      itens: { create: itensComPreco },
    },
  });

  revalidatePath("/pedidos");
  return { success: true, pedidoId: pedido.id };
}

export async function atualizarPedido(
  id: string,
  dadosBrutos: PedidoFormValues,
): Promise<ResultadoAcao> {
  const pedidoAtual = await prisma.pedido.findUnique({
    where: { id },
    include: { itens: { include: { ordemProducao: true } } },
  });
  if (!pedidoAtual) {
    return { success: false, error: "Pedido não encontrado." };
  }
  if (pedidoAtual.status === "FATURADO") {
    return { success: false, error: "Pedido faturado não pode ser editado." };
  }
  if (pedidoAtual.itens.some((item) => item.ordemProducao)) {
    return {
      success: false,
      error: "Este pedido já tem item em produção e não pode mais ser editado.",
    };
  }

  const resultado = pedidoSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return {
      success: false,
      error: "Verifique os campos destacados.",
      camposComErro: extrairErrosDeCampo(resultado.error.issues),
    };
  }

  const { itensComPreco, valorTotal } = await montarItensComPreco(resultado.data.itens);

  await prisma.pedido.update({
    where: { id },
    data: {
      clienteId: resultado.data.clienteId,
      observacoes: resultado.data.observacoes || null,
      valorTotal,
      itens: {
        deleteMany: {},
        create: itensComPreco,
      },
    },
  });

  revalidatePath("/pedidos");
  return { success: true };
}

export async function faturarPedido(id: string) {
  await prisma.pedido.update({ where: { id }, data: { status: "FATURADO" } });
  revalidatePath("/pedidos");
}

export async function excluirPedido(id: string) {
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: { itens: { include: { ordemProducao: true } } },
  });
  if (!pedido || pedido.status === "FATURADO") {
    return;
  }
  if (pedido.itens.some((item) => item.ordemProducao)) {
    return;
  }
  await prisma.pedido.delete({ where: { id } });
  revalidatePath("/pedidos");
}
