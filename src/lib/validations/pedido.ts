import { z } from "zod";
import { precoSchema, custoSchema } from "./moeda";

export const itemPedidoSchema = z.object({
  // Produto por texto livre (igual à OP avulsa/Produção) — produtoId é
  // preenchido ao selecionar uma sugestão, mas o servidor resolve de
  // novo por nome exato ou cadastra um produto novo se precisar (ver
  // resolverProdutoFormal), então não trava o envio se o usuário digitou
  // e não clicou em nada.
  produtoTexto: z.string().trim().min(1, "Informe o produto"),
  produtoId: z.string().trim().optional(),
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
      // Compara por texto (não por produtoId) — produtoId pode ainda
      // não estar preenchido se o usuário só digitou e não confirmou a
      // sugestão, mas o texto digitado já é o sinal real de duplicidade.
      (itens) =>
        new Set(itens.map((item) => item.produtoTexto.trim().toLowerCase())).size ===
        itens.length,
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

// Edição em lote — todas as linhas (OrdemProducao) do card agrupado de
// um mesmo Pedido, de uma vez. Cliente não entra aqui porque é do
// Pedido inteiro, não de uma linha (mostrado só leitura no formulário).
// Campo "itemId" (não "id") pra não colidir com a chave interna que
// useFieldArray injeta como "id" em cada linha.
export const editarGrupoPedidoSchema = z.object({
  linhas: z.array(editarItemPedidoSchema.extend({ itemId: z.string() })).min(1),
});

export type LinhaGrupoPedidoValues = z.infer<typeof editarGrupoPedidoSchema>["linhas"][number];
export type EditarGrupoPedidoValues = z.infer<typeof editarGrupoPedidoSchema>;
