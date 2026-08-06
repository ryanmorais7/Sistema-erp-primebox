import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const NOME_COOKIE = "primebox_session";
const DURACAO_SESSAO_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

const chaveCodificada = new TextEncoder().encode(process.env.SESSION_SECRET);

export type PapelUsuario = "DESENVOLVEDOR" | "ADMINISTRADOR" | "FUNCIONARIO";

export type SessaoPayload = {
  usuarioId: string;
  nome: string;
  papel: PapelUsuario;
  expiresAt: string;
};

async function criptografar(payload: SessaoPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(chaveCodificada);
}

async function descriptografar(sessao: string | undefined) {
  if (!sessao) return null;
  try {
    const { payload } = await jwtVerify(sessao, chaveCodificada, { algorithms: ["HS256"] });
    return payload as unknown as SessaoPayload;
  } catch {
    return null;
  }
}

export async function criarSessao(usuario: { id: string; nome: string; papel: PapelUsuario }) {
  const expiresAt = new Date(Date.now() + DURACAO_SESSAO_MS);
  const sessao = await criptografar({
    usuarioId: usuario.id,
    nome: usuario.nome,
    papel: usuario.papel,
    expiresAt: expiresAt.toISOString(),
  });

  const cookieStore = await cookies();
  cookieStore.set(NOME_COOKIE, sessao, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function lerSessao(): Promise<SessaoPayload | null> {
  const cookieStore = await cookies();
  return descriptografar(cookieStore.get(NOME_COOKIE)?.value);
}

export async function apagarSessao() {
  const cookieStore = await cookies();
  cookieStore.delete(NOME_COOKIE);
}

export { NOME_COOKIE, descriptografar as descriptografarSessao };
