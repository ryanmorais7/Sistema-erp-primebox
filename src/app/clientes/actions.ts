"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { clienteSchema, type ClienteFormValues } from "@/lib/validations/cliente";

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

function ehErroDeUnicidade(erro: unknown): erro is { code: "P2002" } {
  return typeof erro === "object" && erro !== null && "code" in erro && erro.code === "P2002";
}

export async function criarCliente(dadosBrutos: ClienteFormValues): Promise<ResultadoAcao> {
  const resultado = clienteSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return {
      success: false,
      error: "Verifique os campos destacados.",
      camposComErro: extrairErrosDeCampo(resultado.error.issues),
    };
  }

  try {
    await prisma.cliente.create({ data: resultado.data });
  } catch (erro) {
    if (ehErroDeUnicidade(erro)) {
      return { success: false, error: "Já existe um cliente cadastrado com esse CNPJ ou CPF." };
    }
    throw erro;
  }

  revalidatePath("/clientes");
  return { success: true };
}

export async function atualizarCliente(
  id: string,
  dadosBrutos: ClienteFormValues,
): Promise<ResultadoAcao> {
  const resultado = clienteSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return {
      success: false,
      error: "Verifique os campos destacados.",
      camposComErro: extrairErrosDeCampo(resultado.error.issues),
    };
  }

  try {
    await prisma.cliente.update({ where: { id }, data: resultado.data });
  } catch (erro) {
    if (ehErroDeUnicidade(erro)) {
      return { success: false, error: "Já existe um cliente cadastrado com esse CNPJ ou CPF." };
    }
    throw erro;
  }

  revalidatePath("/clientes");
  return { success: true };
}

export async function alternarAtivoCliente(id: string, ativo: boolean) {
  await prisma.cliente.update({ where: { id }, data: { ativo } });
  revalidatePath("/clientes");
}
