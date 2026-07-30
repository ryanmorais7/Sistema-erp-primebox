import { z } from "zod";

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
  preco: z
    .string()
    .trim()
    .min(1, "Informe o preço")
    .refine((valor) => {
      const numero = precoParaNumero(valor);
      return Number.isFinite(numero) && numero > 0;
    }, "Informe um preço válido (ex: 1500,00 ou 1.500,00)"),
});

export type ProdutoFormValues = z.infer<typeof produtoSchema>;

export function precoParaNumero(preco: string): number {
  return Number(preco.replace(/\./g, "").replace(",", "."));
}
