"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  darBaixaInsumos,
  estornarInsumos,
  darEntradaProdutoAcabado,
  estornarEntradaProdutoAcabado,
} from "@/lib/estoque";
import { precoParaNumero } from "@/lib/validations/moeda";
import { resolverProdutoFormal } from "@/lib/resolverProdutoFormal";
import {
  editarItemPedidoSchema,
  editarGrupoPedidoSchema,
  type EditarItemPedidoValues,
  type EditarGrupoPedidoValues,
} from "@/lib/validations/pedido";

type ResultadoAcao = { success: true } | { success: false; error: string };

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

  const produto = await resolverProdutoFormal(produtoTexto, produtoId, precoUnitario, custoUnitario);
  if ("erro" in produto) {
    return { success: false, error: produto.erro };
  }

  const precoUnitarioNumero = precoParaNumero(precoUnitario);
  const custoUnitarioNumero = precoParaNumero(custoUnitario);

  await prisma.$transaction(async (tx) => {
    await tx.itemPedido.update({
      where: { id: ordem.itemPedido.id },
      data: {
        produtoId: produto.id,
        produtoTexto,
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

  // Insumo já tinha sido baixado na criação (ver gerarOrdemProducao),
  // pelo produto/quantidade antigos — se algum dos dois mudou aqui,
  // estorna a baixa antiga e dá a baixa certa pelo produto/quantidade
  // novos, senão o estoque de matéria-prima fica errado.
  if (produto.id !== ordem.itemPedido.produtoId || quantidade !== ordem.itemPedido.quantidade) {
    await estornarInsumos(
      ordem.itemPedido.produtoId,
      ordem.itemPedido.quantidade,
      `OP #${ordem.numero} (edição)`,
    );
    await darBaixaInsumos(produto.id, quantidade, `OP #${ordem.numero} (edição)`);
    revalidatePath("/estoque");
  }

  revalidatePath("/producao");
  revalidatePath("/pedidos");
  return { success: true };
}

// Mesma edição, em lote — todas as linhas do card agrupado de um mesmo
// Pedido de uma vez. Recalcula o valorTotal uma única vez no final,
// considerando as linhas editadas e as demais linhas do pedido (que
// podem estar em outro status, fora desse grupo).
export async function atualizarGrupoOrdemProducao(
  dadosBrutos: EditarGrupoPedidoValues,
): Promise<ResultadoAcao> {
  const resultado = editarGrupoPedidoSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return { success: false, error: "Verifique os campos destacados." };
  }

  const linhas = resultado.data.linhas;
  const primeiraOrdem = await prisma.ordemProducao.findUnique({
    where: { id: linhas[0].itemId },
    include: { itemPedido: { include: { pedido: { include: { itens: true } } } } },
  });
  if (!primeiraOrdem) {
    return { success: false, error: "OP não encontrada." };
  }
  const pedidoId = primeiraOrdem.itemPedido.pedidoId;
  const valoresPorItem = new Map(
    primeiraOrdem.itemPedido.pedido.itens.map((item) => [
      item.id,
      Number(item.precoUnitario) * item.quantidade,
    ]),
  );

  for (const linha of linhas) {
    const ordem = await prisma.ordemProducao.findUnique({
      where: { id: linha.itemId },
      include: { itemPedido: true },
    });
    if (!ordem || ordem.status !== "AGUARDANDO") {
      continue;
    }

    const produto = await resolverProdutoFormal(
      linha.produtoTexto,
      linha.produtoId,
      linha.precoUnitario,
      linha.custoUnitario,
    );
    if ("erro" in produto) {
      return { success: false, error: produto.erro };
    }

    const precoUnitarioNumero = precoParaNumero(linha.precoUnitario);
    const custoUnitarioNumero = precoParaNumero(linha.custoUnitario);

    await prisma.$transaction([
      prisma.itemPedido.update({
        where: { id: ordem.itemPedido.id },
        data: {
          produtoId: produto.id,
          produtoTexto: linha.produtoTexto,
          quantidade: linha.quantidade,
          precoUnitario: precoUnitarioNumero,
          custoUnitario: custoUnitarioNumero,
        },
      }),
      prisma.ordemProducao.update({
        where: { id: linha.itemId },
        data: {
          dataProgramada: linha.dataProgramada ? new Date(`${linha.dataProgramada}T00:00:00`) : null,
        },
      }),
    ]);

    // Mesmo racional de atualizarOrdemProducao: se produto/quantidade
    // mudou, a baixa de insumo feita na criação ficou desatualizada.
    if (
      produto.id !== ordem.itemPedido.produtoId ||
      linha.quantidade !== ordem.itemPedido.quantidade
    ) {
      await estornarInsumos(
        ordem.itemPedido.produtoId,
        ordem.itemPedido.quantidade,
        `OP #${ordem.numero} (edição)`,
      );
      await darBaixaInsumos(produto.id, linha.quantidade, `OP #${ordem.numero} (edição)`);
    }

    valoresPorItem.set(ordem.itemPedido.id, precoUnitarioNumero * linha.quantidade);
  }

  const valorTotal = [...valoresPorItem.values()].reduce((total, valor) => total + valor, 0);
  await prisma.pedido.update({ where: { id: pedidoId }, data: { valorTotal } });

  revalidatePath("/producao");
  revalidatePath("/pedidos");
  revalidatePath("/estoque");
  return { success: true };
}

// Controle simples de pagamento, independente do status Em
// carteira/Faturado — mesmo campo/racional do ItemOrdemAvulsa.pago
// (ver ADR-033), estendido do avulso pro formal. Recebe o id da
// OrdemProducao (mesma convenção das outras ações do card, ver
// comentário em ReciboFormalPage) e resolve o ItemPedido por trás.
export async function alternarPagamentoPedido(ordemProducaoId: string, pago: boolean) {
  const ordem = await prisma.ordemProducao.findUnique({ where: { id: ordemProducaoId } });
  if (!ordem) {
    return;
  }
  await prisma.itemPedido.update({ where: { id: ordem.itemPedidoId }, data: { pago } });
  revalidatePath("/producao");
}

export async function gerarOrdemProducao(itemPedidoId: string) {
  const existente = await prisma.ordemProducao.findUnique({ where: { itemPedidoId } });
  if (existente) {
    return;
  }
  const itemPedido = await prisma.itemPedido.findUnique({ where: { id: itemPedidoId } });
  if (!itemPedido) {
    return;
  }
  const ordem = await prisma.ordemProducao.create({ data: { itemPedidoId } });
  // Baixa de insumo acontece aqui, na criação, uma única vez — nunca na
  // conclusão (ver ADR sobre baixa automática de insumo).
  await darBaixaInsumos(itemPedido.produtoId, itemPedido.quantidade, `OP #${ordem.numero}`);
  revalidatePath("/producao");
  revalidatePath("/pedidos");
  revalidatePath("/estoque");
}

export async function cancelarOrdemProducao(id: string) {
  const ordem = await prisma.ordemProducao.findUnique({
    where: { id },
    include: { itemPedido: true },
  });
  if (!ordem) {
    return;
  }
  // Apaga de verdade em vez de marcar como cancelada, então o botão
  // "Gerar OP" volta a aparecer no pedido como se a OP nunca tivesse
  // sido criada.
  if (ordem.status === "CONCLUIDO") {
    await estornarEntradaProdutoAcabado(
      ordem.itemPedido.produtoId,
      ordem.itemPedido.quantidade,
      `OP #${ordem.numero}`,
    );
  }
  // Insumo foi baixado na criação (ver gerarOrdemProducao), então
  // estorna sempre, independente do status atual da OP.
  await estornarInsumos(ordem.itemPedido.produtoId, ordem.itemPedido.quantidade, `OP #${ordem.numero}`);
  await prisma.ordemProducao.delete({ where: { id } });
  revalidatePath("/producao");
  revalidatePath("/pedidos");
  revalidatePath("/estoque");
}

// Cancela de uma vez todas as OrdemProducao do card agrupado (mesmo
// pedido, mesmo status) — mesma lógica de cancelarOrdemProducao, em
// lote, pra não precisar cancelar linha por linha.
export async function cancelarGrupoOrdemProducao(ids: string[]) {
  for (const id of ids) {
    await cancelarOrdemProducao(id);
  }
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

  // Só entrada do produto acabado agora — baixa de insumo já aconteceu
  // na criação (ver gerarOrdemProducao).
  await darEntradaProdutoAcabado(
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
// estorna só a entrada do produto acabado — insumo não é tocado aqui
// (baixado na criação, só volta se a OP for cancelada de vez).
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
    await estornarEntradaProdutoAcabado(
      ordem.itemPedido.produtoId,
      ordem.itemPedido.quantidade,
      `OP #${ordem.numero}`,
    );
    await prisma.ordemProducao.update({ where: { id }, data: { status: "EM_PRODUCAO" } });
    revalidatePath("/producao");
    revalidatePath("/estoque");
  }
}

// Checkbox "Feito" da tela OP do dia — binário (feito ou não), em vez
// dos 3 passos do Kanban. Reaproveita iniciarProducao/concluirProducao/
// voltarOrdemProducao por baixo pra manter a mesma baixa/estorno de
// estoque, só pulando o estado intermediário "Em produção" sem deixar
// ele persistido.
export async function marcarItemFeito(id: string) {
  const ordem = await prisma.ordemProducao.findUnique({ where: { id } });
  if (!ordem || ordem.status === "CONCLUIDO") {
    return;
  }
  if (ordem.status === "AGUARDANDO") {
    await iniciarProducao(id);
  }
  await concluirProducao(id);
}

export async function desmarcarItemFeito(id: string) {
  const ordem = await prisma.ordemProducao.findUnique({ where: { id } });
  if (!ordem || ordem.status === "AGUARDANDO") {
    return;
  }
  if (ordem.status === "CONCLUIDO") {
    await voltarOrdemProducao(id);
  }
  await voltarOrdemProducao(id);
}

// Botão "Marcar como concluída" no cabeçalho do grupo — confirmação
// explícita e em lote (ver ADR-033): marca qualquer item ainda não
// feito (reaproveitando marcarItemFeito, preservando a baixa de
// estoque) e só então grava a confirmação da OP inteira. O card só
// vira "Concluída" (amarelo) por causa desse campo, nunca sozinho
// só por todo item já estar com status CONCLUIDO.
export async function confirmarConclusaoGrupo(pedidoId: string) {
  const itens = await prisma.itemPedido.findMany({
    where: { pedidoId },
    include: { ordemProducao: true },
  });
  for (const item of itens) {
    if (item.ordemProducao && item.ordemProducao.status !== "CONCLUIDO") {
      await marcarItemFeito(item.ordemProducao.id);
    }
  }
  await prisma.pedido.update({ where: { id: pedidoId }, data: { concluidaConfirmada: true } });
  revalidatePath("/producao");
}

// Desfaz a confirmação — clicar de novo no badge "Concluída" tira a OP
// desse estado e some com a cor amarela dos cards. Não mexe no status
// "Feito" de cada item nem na baixa de estoque (são independentes);
// se quiser desfazer isso também, o Pedro desmarca item por item.
export async function desconfirmarConclusaoGrupo(pedidoId: string) {
  await prisma.pedido.update({ where: { id: pedidoId }, data: { concluidaConfirmada: false } });
  revalidatePath("/producao");
}
