import { z } from "zod";
import { precoSchema, custoSchema } from "./moeda";

export const TIPOS_PRODUTO = ["BASE", "UNIBOX", "BAU"] as const;

export const tipoProdutoLabels: Record<(typeof TIPOS_PRODUTO)[number], string> = {
  BASE: "Base",
  UNIBOX: "Unibox",
  BAU: "Baú",
};

export const produtoSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome do produto").max(150, "Nome muito longo"),
  tipo: z.enum(TIPOS_PRODUTO),
  medidaId: z.string().trim().min(1, "Selecione a medida"),
  tecido: z.string().trim().max(100, "Tecido muito longo").optional(),
  cor: z.string().trim().max(60, "Cor muito longa").optional(),
  preco: precoSchema,
  custo: custoSchema,
});

export type ProdutoFormValues = z.infer<typeof produtoSchema>;

export { precoParaNumero, formatarPrecoBr } from "./moeda";
