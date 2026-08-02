import { z } from "zod";
import { precoSchema, custoSchema } from "./moeda";

export const TIPOS_PRODUTO = ["BASE", "COLCHAO", "CONJUNTO_BOX"] as const;

export const tipoProdutoLabels: Record<(typeof TIPOS_PRODUTO)[number], string> = {
  BASE: "Base",
  COLCHAO: "Colchão",
  CONJUNTO_BOX: "Conjunto Box",
};

export const produtoSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome do produto"),
  tipo: z.enum(TIPOS_PRODUTO),
  medidaId: z.string().trim().min(1, "Selecione a medida"),
  tecido: z.string().trim().optional(),
  cor: z.string().trim().optional(),
  preco: precoSchema,
  custo: custoSchema,
});

export type ProdutoFormValues = z.infer<typeof produtoSchema>;

export { precoParaNumero, formatarPrecoBr } from "./moeda";
