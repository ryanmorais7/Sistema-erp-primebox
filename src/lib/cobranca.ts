import { hojeBr, dataBr } from "./data";

export type StatusExibicaoCobranca = "PENDENTE" | "PAGO" | "ATRASADO";

export const statusExibicaoLabels: Record<StatusExibicaoCobranca, string> = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  ATRASADO: "Atrasado",
};

// "Atrasado" nunca é salvo no banco — é sempre calculado a partir do
// vencimento, para ninguém precisar lembrar de marcar manualmente.
export function statusExibicaoCobranca(cobranca: {
  status: "PENDENTE" | "PAGO";
  vencimento: Date;
}): StatusExibicaoCobranca {
  if (cobranca.status === "PAGO") {
    return "PAGO";
  }
  const hoje = dataBr(hojeBr());
  return cobranca.vencimento < hoje ? "ATRASADO" : "PENDENTE";
}
