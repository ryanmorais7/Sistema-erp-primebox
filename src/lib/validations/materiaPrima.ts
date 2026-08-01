import { z } from "zod";
import { precoParaNumero as valorParaNumero } from "./moeda";

export const materiaPrimaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da matéria-prima"),
  unidade: z.string().trim().min(1, "Informe a unidade (ex: m, kg, un)"),
  estoqueMinimo: z
    .string()
    .trim()
    .min(1, "Informe o estoque mínimo (pode ser 0)")
    .refine((valor) => {
      const numero = valorParaNumero(valor);
      return Number.isFinite(numero) && numero >= 0;
    }, "Informe um número válido"),
});

export type MateriaPrimaFormValues = z.infer<typeof materiaPrimaSchema>;
