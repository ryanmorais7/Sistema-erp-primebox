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
