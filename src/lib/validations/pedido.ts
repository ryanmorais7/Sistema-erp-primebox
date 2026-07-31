import { z } from "zod";

export const itemPedidoSchema = z.object({
  produtoId: z.string().trim().min(1, "Selecione um produto"),
  quantidade: z
    .number()
    .int("Quantidade deve ser um número inteiro")
    .positive("Quantidade deve ser maior que zero"),
});

export const pedidoSchema = z.object({
  clienteId: z.string().trim().min(1, "Selecione um cliente"),
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
