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
