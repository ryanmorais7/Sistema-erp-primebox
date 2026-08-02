import { z } from "zod";
import { precoSchema, custoSchema } from "./moeda";

export const itemPedidoSchema = z.object({
  produtoId: z.string().trim().min(1, "Selecione um produto"),
  quantidade: z
    .number()
    .int("Quantidade deve ser um número inteiro")
    .positive("Quantidade deve ser maior que zero"),
  precoUnitario: precoSchema,
  custoUnitario: custoSchema,
});

export const pedidoSchema = z.object({
  clienteId: z.string().trim().min(1, "Selecione um cliente"),
  observacoes: z.string().trim().optional(),
  itens: z
    .array(itemPedidoSchema)
    .min(1, "Adicione pelo menos um item")
    .refine(
      (itens) => new Set(itens.map((item) => item.produtoId)).size === itens.length,
      "Não repita o mesmo produto no pedido",
    ),
});

export type ItemPedidoFormValues = z.infer<typeof itemPedidoSchema>;
export type PedidoFormValues = z.infer<typeof pedidoSchema>;
