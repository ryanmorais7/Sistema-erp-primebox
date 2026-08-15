"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { darBaixaProducaoConcluida, reverterBaixaProducaoConcluida } from "@/lib/estoque";

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
  const ordem = await prisma.ordemProducao.findUnique({
    where: { id },
    include: { itemPedido: true },
  });
  if (!ordem) {
    return;
  }
  // Se já tinha sido concluída, o estoque foi movimentado — estorna
  // antes de apagar. Apaga de verdade em vez de marcar como cancelada,
  // então o botão "Gerar OP" volta a aparecer no pedido como se a OP
  // nunca tivesse sido criada.
  if (ordem.status === "CONCLUIDO") {
    await reverterBaixaProducaoConcluida(
      ordem.itemPedido.produtoId,
      ordem.itemPedido.quantidade,
      `OP #${ordem.numero}`,
    );
  }
  await prisma.ordemProducao.delete({ where: { id } });
  revalidatePath("/producao");
  revalidatePath("/pedidos");
  revalidatePath("/estoque");
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

// Volta um passo (Em produção → Aguardando, Concluído → Em produção),
// sem apagar a OP — pra quando desistiu de ter iniciado/concluído sem
// querer, sem precisar cancelar a OP inteira. Voltar de Concluído
// estorna o estoque do mesmo jeito que cancelar faria.
export async function voltarOrdemProducao(id: string) {
  const ordem = await prisma.ordemProducao.findUnique({
    where: { id },
    include: { itemPedido: true },
  });
  if (!ordem) {
    return;
  }

  if (ordem.status === "EM_PRODUCAO") {
    await prisma.ordemProducao.update({ where: { id }, data: { status: "AGUARDANDO" } });
    revalidatePath("/producao");
    return;
  }

  if (ordem.status === "CONCLUIDO") {
    await reverterBaixaProducaoConcluida(
      ordem.itemPedido.produtoId,
      ordem.itemPedido.quantidade,
      `OP #${ordem.numero}`,
    );
    await prisma.ordemProducao.update({ where: { id }, data: { status: "EM_PRODUCAO" } });
    revalidatePath("/producao");
    revalidatePath("/estoque");
  }
}
