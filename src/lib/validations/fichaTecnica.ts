import { z } from "zod";
import { precoParaNumero as valorParaNumero } from "./moeda";

export const consumoMateriaPrimaSchema = z.object({
  materiaPrimaId: z.string().trim().min(1, "Selecione a matéria-prima"),
  quantidade: z
    .string()
    .trim()
    .min(1, "Informe a quantidade")
    .refine((valor) => {
      const numero = valorParaNumero(valor);
      return Number.isFinite(numero) && numero > 0;
    }, "Informe uma quantidade válida, maior que zero"),
});

export type ConsumoMateriaPrimaFormValues = z.infer<typeof consumoMateriaPrimaSchema>;

export { precoParaNumero, formatarPrecoBr } from "./moeda";
