"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { pedidoSchema, type PedidoFormValues } from "@/lib/validations/pedido";
import { precoParaNumero } from "@/lib/validations/moeda";
import { resolverProdutoFormal } from "@/lib/resolverProdutoFormal";

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

// Preço e custo unitários vêm do formulário (o vendedor pode negociar
// preço e o custo pode variar por lote), não do cadastro do produto.
// Produto por texto livre (igual à OP avulsa/Produção, ver
// resolverProdutoFormal): resolve por id, por nome exato já cadastrado,
// ou cadastra um produto novo a partir do texto digitado.
async function montarItensComPreco(
  itens: {
    produtoTexto: string;
    produtoId?: string;
    quantidade: number;
    precoUnitario: string;
    custoUnitario: string;
  }[],
): Promise<
  | { erro: string }
  | {
      itensComPreco: {
        produtoId: string;
        quantidade: number;
        precoUnitario: number;
        custoUnitario: number;
      }[];
      valorTotal: number;
    }
> {
  const itensComPreco = [];
  for (const item of itens) {
    const produto = await resolverProdutoFormal(
      item.produtoTexto,
      item.produtoId,
      item.precoUnitario,
      item.custoUnitario,
    );
    if ("erro" in produto) {
      return { erro: produto.erro };
    }
    itensComPreco.push({
      produtoId: produto.id,
      quantidade: item.quantidade,
      precoUnitario: precoParaNumero(item.precoUnitario),
      custoUnitario: precoParaNumero(item.custoUnitario),
    });
  }

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

  const montado = await montarItensComPreco(resultado.data.itens);
  if ("erro" in montado) {
    return { success: false, error: montado.erro };
  }
  const { itensComPreco, valorTotal } = montado;

  const pedido = await prisma.pedido.create({
    data: {
      clienteId: resultado.data.clienteId,
      observacoes: resultado.data.observacoes || null,
      formaPagamento: resultado.data.formaPagamento || null,
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
  // Pedido faturado pode ser editado (ver ADR-006, atualizado) — o que
  // não pode mudar é a data de faturamento: valorTotal/itens ficam
  // livres, mas faturadoEm é gravado uma vez só em faturarPedido e
  // nunca tocado aqui, então o relatório de Faturamento/Painel
  // continua confiável mesmo que o pedido seja editado depois.
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

  const montado = await montarItensComPreco(resultado.data.itens);
  if ("erro" in montado) {
    return { success: false, error: montado.erro };
  }
  const { itensComPreco, valorTotal } = montado;

  await prisma.pedido.update({
    where: { id },
    data: {
      clienteId: resultado.data.clienteId,
      observacoes: resultado.data.observacoes || null,
      formaPagamento: resultado.data.formaPagamento || null,
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
  // faturadoEm é gravado uma única vez aqui — fica fixo mesmo que o
  // pedido seja editado depois (ver ADR-009). É o que o relatório de
  // Faturamento e o Painel usam pra saber em que dia o pedido faturou
  // de verdade, em vez de updatedAt (que mudaria a cada edição).
  await prisma.pedido.update({
    where: { id },
    data: { status: "FATURADO", faturadoEm: new Date() },
  });
  revalidatePath("/pedidos");
}

export async function excluirPedido(id: string) {
  // Excluir agora funciona em qualquer status (carteira ou faturado,
  // pedido do Ryan) — igual à trava de Editar (ver ADR-006, atualizado):
  // só continua bloqueado se algum item já tem OP, porque apagar o
  // Pedido apagaria a OP em cascata sem passar pelo fluxo de "Cancelar
  // OP" (que estorna estoque quando preciso).
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: { itens: { include: { ordemProducao: true } } },
  });
  if (!pedido) {
    return;
  }
  if (pedido.itens.some((item) => item.ordemProducao)) {
    return;
  }
  await prisma.pedido.delete({ where: { id } });
  revalidatePath("/pedidos");
}
