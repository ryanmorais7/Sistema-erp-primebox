"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function gerarOrdemProducao(itemPedidoId: string) {
  const existente = await prisma.ordemProducao.findUnique({ where: { itemPedidoId } });
  if (existente) {
    return;
  }
  await prisma.ordemProducao.create({ data: { itemPedidoId } });
  revalidatePath("/producao");
  revalidatePath("/pedidos");
}

export async function iniciarProducao(id: string) {
  const ordem = await prisma.ordemProducao.findUnique({ where: { id } });
  if (!ordem || ordem.status !== "AGUARDANDO") {
    return;
  }
  await prisma.ordemProducao.update({ where: { id }, data: { status: "EM_PRODUCAO" } });
  revalidatePath("/producao");
}

export async function concluirProducao(id: string) {
  const ordem = await prisma.ordemProducao.findUnique({
    where: { id },
    include: { itemPedido: true },
  });
  if (!ordem || ordem.status !== "EM_PRODUCAO") {
    return;
  }

  await prisma.ordemProducao.update({ where: { id }, data: { status: "CONCLUIDO" } });

  // Concluir a OP dá entrada automática do produto acabado no estoque
  // (ver ADR-011) — a quantidade produzida é a mesma do item do pedido.
  await prisma.movimentoEstoqueProduto.create({
    data: {
      produtoId: ordem.itemPedido.produtoId,
      tipo: "ENTRADA",
      quantidade: ordem.itemPedido.quantidade,
      observacao: `Produção concluída — OP #${ordem.numero}`,
    },
  });

  revalidatePath("/producao");
  revalidatePath("/estoque");
}
