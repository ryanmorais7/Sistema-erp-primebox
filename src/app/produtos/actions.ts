"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { produtoSchema, precoParaNumero, type ProdutoFormValues } from "@/lib/validations/produto";

type ResultadoAcao =
  | { success: true }
  | { success: false; error: string; camposComErro?: Record<string, string> };

function extrairErrosDeCampo(issues: { path: PropertyKey[]; message: string }[]) {
  const campos: Record<string, string> = {};
  for (const issue of issues) {
    const campo = issue.path[0];
    if (typeof campo === "string" && !campos[campo]) {
      campos[campo] = issue.message;
    }
  }
  return campos;
}

export async function criarProduto(dadosBrutos: ProdutoFormValues): Promise<ResultadoAcao> {
  const resultado = produtoSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return {
      success: false,
      error: "Verifique os campos destacados.",
      camposComErro: extrairErrosDeCampo(resultado.error.issues),
    };
  }

  const { preco, custo, ...dados } = resultado.data;
  await prisma.produto.create({
    data: { ...dados, preco: precoParaNumero(preco), custo: precoParaNumero(custo) },
  });

  revalidatePath("/produtos");
  return { success: true };
}

export async function atualizarProduto(
  id: string,
  dadosBrutos: ProdutoFormValues,
): Promise<ResultadoAcao> {
  const resultado = produtoSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return {
      success: false,
      error: "Verifique os campos destacados.",
      camposComErro: extrairErrosDeCampo(resultado.error.issues),
    };
  }

  const { preco, custo, ...dados } = resultado.data;
  await prisma.produto.update({
    where: { id },
    data: { ...dados, preco: precoParaNumero(preco), custo: precoParaNumero(custo) },
  });

  revalidatePath("/produtos");
  return { success: true };
}

export async function alternarAtivoProduto(id: string, ativo: boolean) {
  await prisma.produto.update({ where: { id }, data: { ativo } });
  revalidatePath("/produtos");
}
