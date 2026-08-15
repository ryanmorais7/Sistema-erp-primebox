import { z } from "zod";
import { precoSchema, custoSchema } from "./moeda";

export const itemPedidoSchema = z.object({
  produtoId: z.string().trim().min(1, "Selecione um produto"),
  quantidade: z
    .number()
    .int("Quantidade deve ser um número inteiro")
    .positive("Quantidade deve ser maior que zero")
    .max(100000, "Quantidade muito alta"),
  precoUnitario: precoSchema,
  custoUnitario: custoSchema,
});

export const pedidoSchema = z.object({
  clienteId: z.string().trim().min(1, "Selecione um cliente"),
  observacoes: z.string().trim().max(1000, "Observações muito longas").optional(),
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

// Edição de uma única linha (ItemPedido/OrdemProducao) direto do card de
// Produção — diferente do PedidoForm normal, que edita o pedido inteiro
// de uma vez. Produto por texto livre (igual à OP avulsa) porque essa
// linha pode ter vindo de "Criar OP" com produto digitado/auto-cadastrado.
export const editarItemPedidoSchema = z.object({
  produtoTexto: z.string().trim().min(1, "Informe o produto"),
  produtoId: z.string().trim().optional(),
  quantidade: z
    .number()
    .int("Quantidade deve ser um número inteiro")
    .positive("Quantidade deve ser maior que zero")
    .max(100000, "Quantidade muito alta"),
  precoUnitario: precoSchema,
  custoUnitario: custoSchema,
  dataProgramada: z.string().trim().optional(),
});

export type EditarItemPedidoValues = z.infer<typeof editarItemPedidoSchema>;
