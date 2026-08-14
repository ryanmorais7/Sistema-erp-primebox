"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { materiaPrimaSchema, type MateriaPrimaFormValues } from "@/lib/validations/materiaPrima";
import {
  movimentoEstoqueSchema,
  type MovimentoEstoqueFormValues,
} from "@/lib/validations/movimentoEstoque";
import { precoParaNumero as valorParaNumero } from "@/lib/validations/moeda";
import { calcularSaldoProduto, calcularSaldoMateriaPrima } from "@/lib/estoque";
import {
  fornecedorSchema,
  precoMateriaPrimaSchema,
  type FornecedorFormValues,
  type PrecoMateriaPrimaFormValues,
} from "@/lib/validations/fornecedor";
import {
  pedidoEstoqueSchema,
  type PedidoEstoqueFormValues,
} from "@/lib/validations/pedidoEstoque";

type ResultadoAcao =
  | { success: true }
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

export async function criarMateriaPrima(dadosBrutos: MateriaPrimaFormValues): Promise<ResultadoAcao> {
  const resultado = materiaPrimaSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return {
      success: false,
      error: "Verifique os campos destacados.",
      camposComErro: extrairErrosDeCampo(resultado.error.issues),
    };
  }

  await prisma.materiaPrima.create({
    data: {
      nome: resultado.data.nome,
      unidade: resultado.data.unidade,
      estoqueMinimo: valorParaNumero(resultado.data.estoqueMinimo),
    },
  });

  revalidatePath("/estoque");
  return { success: true };
}

export async function atualizarMateriaPrima(
  id: string,
  dadosBrutos: MateriaPrimaFormValues,
): Promise<ResultadoAcao> {
  const resultado = materiaPrimaSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return {
      success: false,
      error: "Verifique os campos destacados.",
      camposComErro: extrairErrosDeCampo(resultado.error.issues),
    };
  }

  await prisma.materiaPrima.update({
    where: { id },
    data: {
      nome: resultado.data.nome,
      unidade: resultado.data.unidade,
      estoqueMinimo: valorParaNumero(resultado.data.estoqueMinimo),
    },
  });

  revalidatePath("/estoque");
  return { success: true };
}

export async function alternarAtivoMateriaPrima(id: string, ativo: boolean) {
  await prisma.materiaPrima.update({ where: { id }, data: { ativo } });
  revalidatePath("/estoque");
}

export async function registrarMovimentoProduto(
  produtoId: string,
  dadosBrutos: MovimentoEstoqueFormValues,
): Promise<ResultadoAcao> {
  const resultado = movimentoEstoqueSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return {
      success: false,
      error: "Verifique os campos destacados.",
      camposComErro: extrairErrosDeCampo(resultado.error.issues),
    };
  }

  const quantidade = valorParaNumero(resultado.data.quantidade);

  if (resultado.data.tipo === "SAIDA") {
    const saldoAtual = await calcularSaldoProduto(produtoId);
    if (quantidade > saldoAtual) {
      return { success: false, error: `Saldo insuficiente (disponível: ${saldoAtual}).` };
    }
  }

  await prisma.movimentoEstoqueProduto.create({
    data: {
      produtoId,
      tipo: resultado.data.tipo,
      quantidade,
      observacao: resultado.data.observacao || null,
    },
  });

  revalidatePath("/estoque");
  return { success: true };
}

export async function registrarMovimentoMateriaPrima(
  materiaPrimaId: string,
  dadosBrutos: MovimentoEstoqueFormValues,
): Promise<ResultadoAcao> {
  const resultado = movimentoEstoqueSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return {
      success: false,
      error: "Verifique os campos destacados.",
      camposComErro: extrairErrosDeCampo(resultado.error.issues),
    };
  }

  const quantidade = valorParaNumero(resultado.data.quantidade);

  if (resultado.data.tipo === "SAIDA") {
    const saldoAtual = await calcularSaldoMateriaPrima(materiaPrimaId);
    if (quantidade > saldoAtual) {
      return { success: false, error: `Saldo insuficiente (disponível: ${saldoAtual}).` };
    }
  }

  await prisma.movimentoEstoqueMateriaPrima.create({
    data: {
      materiaPrimaId,
      tipo: resultado.data.tipo,
      quantidade,
      observacao: resultado.data.observacao || null,
    },
  });

  revalidatePath("/estoque");
  return { success: true };
}

export async function criarFornecedor(dadosBrutos: FornecedorFormValues): Promise<ResultadoAcao> {
  const resultado = fornecedorSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return {
      success: false,
      error: "Verifique os campos destacados.",
      camposComErro: extrairErrosDeCampo(resultado.error.issues),
    };
  }

  await prisma.fornecedor.create({ data: { nome: resultado.data.nome } });

  revalidatePath("/estoque/fornecedores");
  return { success: true };
}

export async function atualizarFornecedor(
  id: string,
  dadosBrutos: FornecedorFormValues,
): Promise<ResultadoAcao> {
  const resultado = fornecedorSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return {
      success: false,
      error: "Verifique os campos destacados.",
      camposComErro: extrairErrosDeCampo(resultado.error.issues),
    };
  }

  await prisma.fornecedor.update({ where: { id }, data: { nome: resultado.data.nome } });

  revalidatePath("/estoque/fornecedores");
  return { success: true };
}

export async function alternarAtivoFornecedor(id: string, ativo: boolean) {
  await prisma.fornecedor.update({ where: { id }, data: { ativo } });
  revalidatePath("/estoque/fornecedores");
}

export async function excluirFornecedor(id: string): Promise<ResultadoAcao> {
  const precos = await prisma.precoMateriaPrima.count({ where: { fornecedorId: id } });

  if (precos > 0) {
    return {
      success: false,
      error:
        'Não é possível excluir: esse fornecedor tem preços de matéria-prima vinculados. Use "Desativar" pra escondê-lo sem perder o histórico.',
    };
  }

  await prisma.fornecedor.delete({ where: { id } });
  revalidatePath("/estoque/fornecedores");
  return { success: true };
}

export async function salvarPrecoMateriaPrima(
  materiaPrimaId: string,
  dadosBrutos: PrecoMateriaPrimaFormValues,
): Promise<ResultadoAcao> {
  const resultado = precoMateriaPrimaSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return {
      success: false,
      error: "Verifique os campos destacados.",
      camposComErro: extrairErrosDeCampo(resultado.error.issues),
    };
  }

  await prisma.precoMateriaPrima.upsert({
    where: {
      materiaPrimaId_fornecedorId: {
        materiaPrimaId,
        fornecedorId: resultado.data.fornecedorId,
      },
    },
    create: {
      materiaPrimaId,
      fornecedorId: resultado.data.fornecedorId,
      valor: valorParaNumero(resultado.data.valor),
    },
    update: {
      valor: valorParaNumero(resultado.data.valor),
    },
  });

  revalidatePath(`/estoque/materia-prima/${materiaPrimaId}/editar`);
  revalidatePath("/estoque");
  return { success: true };
}

export async function excluirPrecoMateriaPrima(id: string, materiaPrimaId: string) {
  await prisma.precoMateriaPrima.delete({ where: { id } });
  revalidatePath(`/estoque/materia-prima/${materiaPrimaId}/editar`);
  revalidatePath("/estoque");
}

// Resolve um item de pedido direto do saldo em estoque, sem passar por
// produção: desconta o saldo, lança a saída automaticamente e marca o
// item como atendido (ver ADR de conexão Estoque + Pedidos).
export async function atenderItemDoEstoque(itemPedidoId: string) {
  const item = await prisma.itemPedido.findUnique({
    where: { id: itemPedidoId },
    include: { pedido: true, ordemProducao: true },
  });
  if (!item || item.ordemProducao || item.atendidoEstoque) {
    return;
  }

  const saldoAtual = await calcularSaldoProduto(item.produtoId);
  if (item.quantidade > saldoAtual) {
    return;
  }

  await prisma.$transaction([
    prisma.itemPedido.update({ where: { id: item.id }, data: { atendidoEstoque: true } }),
    prisma.movimentoEstoqueProduto.create({
      data: {
        produtoId: item.produtoId,
        tipo: "SAIDA",
        quantidade: item.quantidade,
        observacao: `Referente ao pedido #${item.pedido.numero}`,
      },
    }),
  ]);

  revalidatePath("/pedidos");
  revalidatePath(`/pedidos/${item.pedidoId}`);
  revalidatePath("/estoque");
}

type ResultadoPedidoEstoque = ResultadoAcao & { pedidoId?: string };

// Cria um pedido de um único produto já atendido direto do saldo em
// estoque — atalho pra vender o que já está pronto sem passar pela
// tela completa de novo pedido.
export async function criarPedidoDoEstoque(
  produtoId: string,
  dadosBrutos: PedidoEstoqueFormValues,
): Promise<ResultadoPedidoEstoque> {
  const resultado = pedidoEstoqueSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return {
      success: false,
      error: "Verifique os campos destacados.",
      camposComErro: extrairErrosDeCampo(resultado.error.issues),
    };
  }

  const produto = await prisma.produto.findUnique({ where: { id: produtoId } });
  if (!produto) {
    return { success: false, error: "Produto não encontrado." };
  }

  const saldoAtual = await calcularSaldoProduto(produtoId);
  if (resultado.data.quantidade > saldoAtual) {
    return {
      success: false,
      error: `Saldo insuficiente (disponível: ${saldoAtual}).`,
      camposComErro: { quantidade: "Quantidade maior que o saldo disponível." },
    };
  }

  const precoUnitario = valorParaNumero(resultado.data.precoUnitario);
  const valorTotal = precoUnitario * resultado.data.quantidade;

  const pedido = await prisma.$transaction(async (tx) => {
    const criado = await tx.pedido.create({
      data: {
        clienteId: resultado.data.clienteId,
        valorTotal,
        itens: {
          create: [
            {
              produtoId,
              quantidade: resultado.data.quantidade,
              precoUnitario,
              custoUnitario: Number(produto.custo),
              atendidoEstoque: true,
            },
          ],
        },
      },
    });

    await tx.movimentoEstoqueProduto.create({
      data: {
        produtoId,
        tipo: "SAIDA",
        quantidade: resultado.data.quantidade,
        observacao: `Referente ao pedido #${criado.numero}`,
      },
    });

    return criado;
  });

  revalidatePath("/pedidos");
  revalidatePath("/estoque");
  return { success: true, pedidoId: pedido.id };
}
