"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { darBaixaProducaoConcluida } from "@/lib/estoque";

export async function gerarOrdemProducao(itemPedidoId: string) {
  const existente = await prisma.ordemProducao.findUnique({ where: { itemPedidoId } });
  if (existente) {
    return;
  }
  await prisma.ordemProducao.create({ data: { itemPedidoId } });
  revalidatePath("/producao");
  revalidatePath("/pedidos");
}

export async function cancelarOrdemProducao(id: string) {
  const ordem = await prisma.ordemProducao.findUnique({ where: { id } });
  if (!ordem || ordem.status !== "AGUARDANDO") {
    return;
  }
  // Apaga de verdade em vez de marcar como cancelada — é pra desfazer um
  // clique em "Gerar OP" por engano, então o botão "Gerar OP" volta a
  // aparecer no pedido como se a OP nunca tivesse sido criada.
  await prisma.ordemProducao.delete({ where: { id } });
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

  await darBaixaProducaoConcluida(
    ordem.itemPedido.produtoId,
    ordem.itemPedido.quantidade,
    `OP #${ordem.numero}`,
  );

  revalidatePath("/producao");
  revalidatePath("/estoque");
}
