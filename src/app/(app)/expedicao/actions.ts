"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function gerarExpedicao(pedidoId: string, transportadora: string) {
  const existente = await prisma.expedicao.findUnique({ where: { pedidoId } });
  if (existente) {
    return existente;
  }
  const expedicao = await prisma.expedicao.create({
    data: { pedidoId, transportadora: transportadora || null },
  });
  revalidatePath("/expedicao");
  revalidatePath(`/pedidos/${pedidoId}`);
  return expedicao;
}

export async function iniciarRota(id: string) {
  const expedicao = await prisma.expedicao.findUnique({ where: { id } });
  if (!expedicao || expedicao.status !== "AGUARDANDO") {
    return;
  }
  await prisma.expedicao.update({ where: { id }, data: { status: "EM_ROTA" } });
  revalidatePath("/expedicao");
}

export async function marcarEntregue(id: string) {
  const expedicao = await prisma.expedicao.findUnique({ where: { id } });
  if (!expedicao || expedicao.status !== "EM_ROTA") {
    return;
  }
  await prisma.expedicao.update({ where: { id }, data: { status: "ENTREGUE" } });
  revalidatePath("/expedicao");
}
