"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { darBaixaProducaoConcluida, reverterBaixaProducaoConcluida } from "@/lib/estoque";
import { precoParaNumero } from "@/lib/validations/moeda";
import { inferirMedidaId, formatarNomeBonito } from "@/lib/planilhaOp";
import { editarItemPedidoSchema, type EditarItemPedidoValues } from "@/lib/validations/pedido";

type ResultadoAcao = { success: true } | { success: false; error: string };

function normalizar(texto: string) {
  return texto.trim().toLowerCase();
}

// Edita uma linha de Pedido formal direto do card de Produção — mesma
// trava e mesmo racional de atualizarItemOrdemAvulsa: só enquanto
// "Aguardando", pra não deixar produto/quantidade inconsistente com o
// que já foi produzido/baixado. Não mexe em outras linhas do mesmo
// Pedido nem no cliente/observações — só essa linha.
export async function atualizarOrdemProducao(
  id: string,
  dadosBrutos: EditarItemPedidoValues,
): Promise<ResultadoAcao> {
  const resultado = editarItemPedidoSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return { success: false, error: "Verifique os campos destacados." };
  }

  const ordem = await prisma.ordemProducao.findUnique({
    where: { id },
    include: { itemPedido: { include: { pedido: { include: { itens: true } } } } },
  });
  if (!ordem) {
    return { success: false, error: "OP não encontrada." };
  }
  if (ordem.status !== "AGUARDANDO") {
    return { success: false, error: "Só é possível editar enquanto a OP está aguardando." };
  }

  const { produtoTexto, produtoId, quantidade, precoUnitario, custoUnitario, dataProgramada } =
    resultado.data;

  const nomeNormalizado = normalizar(produtoTexto);
  let produto = produtoId ? await prisma.produto.findUnique({ where: { id: produtoId } }) : null;
  if (!produto) {
    produto = await prisma.produto.findFirst({
      where: { ativo: true, nome: { equals: nomeNormalizado, mode: "insensitive" } },
    });
  }
  if (!produto) {
    const medidas = await prisma.medida.findMany({ where: { ativo: true } });
    const medidaId = inferirMedidaId(produtoTexto, medidas) ?? medidas[0]?.id;
    if (!medidaId) {
      return { success: false, error: "Não há nenhuma medida cadastrada no sistema pra usar como padrão." };
    }
    produto = await prisma.produto.create({
      data: {
        nome: formatarNomeBonito(produtoTexto),
        tipo: "BASE",
        medidaId,
        preco: precoParaNumero(precoUnitario),
        custo: precoParaNumero(custoUnitario),
      },
    });
  }

  const precoUnitarioNumero = precoParaNumero(precoUnitario);
  const custoUnitarioNumero = precoParaNumero(custoUnitario);

  await prisma.$transaction(async (tx) => {
    await tx.itemPedido.update({
      where: { id: ordem.itemPedido.id },
      data: {
        produtoId: produto.id,
        quantidade,
        precoUnitario: precoUnitarioNumero,
        custoUnitario: custoUnitarioNumero,
      },
    });

    // valorTotal do Pedido é a soma de todas as linhas, não só essa —
    // recalcula com o valor novo desta linha + o que já tinha nas outras.
    const valorTotal = ordem.itemPedido.pedido.itens.reduce((total, item) => {
      if (item.id === ordem.itemPedido.id) {
        return total + precoUnitarioNumero * quantidade;
      }
      return total + Number(item.precoUnitario) * item.quantidade;
    }, 0);
    await tx.pedido.update({
      where: { id: ordem.itemPedido.pedidoId },
      data: { valorTotal },
    });

    await tx.ordemProducao.update({
      where: { id },
      data: { dataProgramada: dataProgramada ? new Date(`${dataProgramada}T00:00:00`) : null },
    });
  });

  revalidatePath("/producao");
  revalidatePath("/pedidos");
  return { success: true };
}

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
