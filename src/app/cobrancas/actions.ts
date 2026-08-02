"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { dataBr } from "@/lib/data";

export async function criarCobranca(pedidoId: string, vencimento: string) {
  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: { cobranca: true },
  });
  if (!pedido || pedido.status !== "FATURADO" || pedido.cobranca || !vencimento) {
    return null;
  }

  const cobranca = await prisma.cobranca.create({
    data: { pedidoId, vencimento: dataBr(vencimento) },
  });

  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/faturamento");
  return cobranca;
}

export async function marcarComoPago(id: string) {
  await prisma.cobranca.update({ where: { id }, data: { status: "PAGO" } });
  revalidatePath("/faturamento");
}

export async function marcarComoPendente(id: string) {
  await prisma.cobranca.update({ where: { id }, data: { status: "PENDENTE" } });
  revalidatePath("/faturamento");
}
