import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { lerSessao } from "./session";

export const verificarSessao = cache(async () => {
  const sessao = await lerSessao();
  if (!sessao?.usuarioId) {
    redirect("/login");
  }
  return sessao;
});

export const usuarioAtual = cache(async () => {
  return lerSessao();
});
