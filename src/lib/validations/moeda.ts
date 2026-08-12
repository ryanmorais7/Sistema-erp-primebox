import { z } from "zod";

// Aceita "," ou "." como separador decimal (usuário pode digitar em
// qualquer um dos dois formatos). O último separador na string é
// sempre o decimal; qualquer separador anterior é de milhar. Se os
// dígitos após esse separador forem 3 ou mais, na verdade não era um
// separador decimal e sim de milhar (ex: "1.500" = 1500, não 1,5).
export function precoParaNumero(preco: string): number {
  const limpo = preco.trim().replace(/[^0-9.,]/g, "");
  const indiceSeparadorDecimal = Math.max(limpo.lastIndexOf("."), limpo.lastIndexOf(","));

  if (indiceSeparadorDecimal === -1) {
    return Number(limpo);
  }

  const parteInteira = limpo.slice(0, indiceSeparadorDecimal).replace(/[.,]/g, "");
  const parteDecimal = limpo.slice(indiceSeparadorDecimal + 1).replace(/[.,]/g, "");

  if (parteDecimal.length >= 3) {
    return Number(parteInteira + parteDecimal);
  }

  return Number(`${parteInteira || "0"}.${parteDecimal}`);
}

export function formatarPrecoBr(preco: number): string {
  return preco.toFixed(2).replace(".", ",");
}

export const precoSchema = z
  .string()
  .trim()
  .min(1, "Informe o preço")
  .refine((valor) => {
    const numero = precoParaNumero(valor);
    return Number.isFinite(numero) && numero > 0;
  }, "Informe um preço válido (ex: 1500,00 ou 1.500,00)");

// Para custo: aceita zero (produto ainda sem custo cadastrado), ao
// contrário do preço de venda, que nunca deveria ser zero.
export const custoSchema = z
  .string()
  .trim()
  .min(1, "Informe o custo (pode ser 0 se ainda não souber)")
  .refine((valor) => {
    const numero = precoParaNumero(valor);
    return Number.isFinite(numero) && numero >= 0;
  }, "Informe um valor válido (ex: 0, 250,00 ou 1.500,00)");
