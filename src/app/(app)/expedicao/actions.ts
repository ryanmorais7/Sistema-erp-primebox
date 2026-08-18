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

export async function gerarExpedicaoAvulsa(itemOrdemAvulsaId: string) {
  const existente = await prisma.expedicao.findUnique({ where: { itemOrdemAvulsaId } });
  if (existente) {
    return existente;
  }
  const expedicao = await prisma.expedicao.create({ data: { itemOrdemAvulsaId } });
  revalidatePath("/expedicao");
  revalidatePath("/producao");
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

// Cancela em qualquer etapa (Aguardando, Em rota ou Entregue) — mesmo
// racional do "Cancelar OP" em Produção: apaga o registro de vez, sem
// status de cancelado, e o botão "Gerar expedição" volta a aparecer no
// Pedido/OP avulsa de origem, como se nunca tivesse sido gerada.
export async function cancelarExpedicao(id: string) {
  const expedicao = await prisma.expedicao.findUnique({ where: { id } });
  if (!expedicao) {
    return;
  }
  await prisma.expedicao.delete({ where: { id } });
  revalidatePath("/expedicao");
  if (expedicao.pedidoId) {
    revalidatePath(`/pedidos/${expedicao.pedidoId}`);
  } else {
    revalidatePath("/producao");
  }
}
