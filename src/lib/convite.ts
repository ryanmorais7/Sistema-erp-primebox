import "server-only";
import { randomBytes, createHash } from "node:crypto";

const DURACAO_CONVITE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export function gerarConvite() {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiraEm = new Date(Date.now() + DURACAO_CONVITE_MS);
  return { token, tokenHash, expiraEm };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
