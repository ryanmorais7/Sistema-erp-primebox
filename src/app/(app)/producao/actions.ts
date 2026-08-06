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

  // E dá saída automática das matérias-primas cadastradas na ficha
  // técnica do produto (ver ADR-016) — quantidade da ficha multiplicada
  // pela quantidade produzida. Não bloqueia a conclusão se o saldo for
  // insuficiente: o estoque de matéria-prima é lançado manualmente e
  // pode estar desatualizado, então preferimos deixar o saldo ficar
  // negativo (sinal visível de que precisa corrigir uma entrada) a
  // impedir a fábrica de concluir a produção.
  const fichaTecnica = await prisma.consumoMateriaPrima.findMany({
    where: { produtoId: ordem.itemPedido.produtoId },
  });
  for (const consumo of fichaTecnica) {
    await prisma.movimentoEstoqueMateriaPrima.create({
      data: {
        materiaPrimaId: consumo.materiaPrimaId,
        tipo: "SAIDA",
        quantidade: Number(consumo.quantidade) * ordem.itemPedido.quantidade,
        observacao: `Consumo da produção — OP #${ordem.numero}`,
      },
    });
  }

  revalidatePath("/producao");
  revalidatePath("/estoque");
}
