"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { criarSessao, apagarSessao } from "@/lib/session";
import { verificarSessao } from "@/lib/dal";
import { hashToken } from "@/lib/convite";
import {
  loginSchema,
  trocarSenhaSchema,
  definirSenhaSchema,
  type TrocarSenhaFormValues,
  type DefinirSenhaFormValues,
} from "@/lib/validations/auth";

type ResultadoAcao =
  | { success: true }
  | { success: false; error: string; camposComErro?: Record<string, string> };

export async function login(
  _estadoAnterior: ResultadoAcao | undefined,
  formData: FormData,
): Promise<ResultadoAcao> {
  const resultado = loginSchema.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
  });

  if (!resultado.success) {
    return { success: false, error: "Verifique o e-mail e a senha informados." };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: resultado.data.email.toLowerCase() },
  });

  if (!usuario || !usuario.ativo) {
    return { success: false, error: "E-mail ou senha inválidos." };
  }

  if (!usuario.senhaHash) {
    return {
      success: false,
      error: "Essa conta ainda não tem senha definida. Use o link de convite que você recebeu.",
    };
  }

  const senhaConfere = await bcrypt.compare(resultado.data.senha, usuario.senhaHash);
  if (!senhaConfere) {
    return { success: false, error: "E-mail ou senha inválidos." };
  }

  await criarSessao({ id: usuario.id, nome: usuario.nome, papel: usuario.papel });
  redirect("/");
}

export async function logout() {
  await apagarSessao();
  redirect("/login");
}

export async function trocarSenha(
  dadosBrutos: TrocarSenhaFormValues,
): Promise<ResultadoAcao> {
  const sessao = await verificarSessao();

  const resultado = trocarSenhaSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    const camposComErro: Record<string, string> = {};
    for (const issue of resultado.error.issues) {
      const campo = issue.path[0];
      if (typeof campo === "string" && !camposComErro[campo]) camposComErro[campo] = issue.message;
    }
    return { success: false, error: "Verifique os campos destacados.", camposComErro };
  }

  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: sessao.usuarioId } });
  const senhaAtualConfere =
    !!usuario.senhaHash && (await bcrypt.compare(resultado.data.senhaAtual, usuario.senhaHash));
  if (!senhaAtualConfere) {
    return {
      success: false,
      error: "Senha atual incorreta.",
      camposComErro: { senhaAtual: "Senha atual incorreta." },
    };
  }

  const novaSenhaHash = await bcrypt.hash(resultado.data.novaSenha, 10);
  await prisma.usuario.update({ where: { id: usuario.id }, data: { senhaHash: novaSenhaHash } });

  return { success: true };
}

export async function definirSenha(
  token: string,
  dadosBrutos: DefinirSenhaFormValues,
): Promise<ResultadoAcao> {
  const resultado = definirSenhaSchema.safeParse(dadosBrutos);
  if (!resultado.success) {
    const camposComErro: Record<string, string> = {};
    for (const issue of resultado.error.issues) {
      const campo = issue.path[0];
      if (typeof campo === "string" && !camposComErro[campo]) camposComErro[campo] = issue.message;
    }
    return { success: false, error: "Verifique os campos destacados.", camposComErro };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { tokenConviteHash: hashToken(token) },
  });

  if (!usuario || !usuario.ativo || !usuario.tokenConviteExpiraEm || usuario.tokenConviteExpiraEm < new Date()) {
    return { success: false, error: "Link inválido ou expirado." };
  }

  const novaSenhaHash = await bcrypt.hash(resultado.data.novaSenha, 10);
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { senhaHash: novaSenhaHash, tokenConviteHash: null, tokenConviteExpiraEm: null },
  });

  await criarSessao({ id: usuario.id, nome: usuario.nome, papel: usuario.papel });
  redirect("/");
}
