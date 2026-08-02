import { z } from "zod";

export function precoParaNumero(preco: string): number {
  return Number(preco.replace(/\./g, "").replace(",", "."));
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
