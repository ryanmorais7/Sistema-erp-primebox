import { z } from "zod";
import { precoParaNumero as valorParaNumero } from "./moeda";

export const TIPOS_MOVIMENTO = ["ENTRADA", "SAIDA"] as const;

export const tipoMovimentoLabels: Record<(typeof TIPOS_MOVIMENTO)[number], string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
};

export const movimentoEstoqueSchema = z.object({
  tipo: z.enum(TIPOS_MOVIMENTO),
  quantidade: z
    .string()
    .trim()
    .min(1, "Informe a quantidade")
    .refine((valor) => {
      const numero = valorParaNumero(valor);
      return Number.isFinite(numero) && numero > 0;
    }, "Informe uma quantidade válida, maior que zero"),
  observacao: z.string().trim().optional(),
});

export type MovimentoEstoqueFormValues = z.infer<typeof movimentoEstoqueSchema>;
export type TipoMovimento = (typeof TIPOS_MOVIMENTO)[number];
