import { z } from "zod";
import { precoSchema } from "./moeda";

export const pedidoEstoqueSchema = z.object({
  clienteId: z.string().trim().min(1, "Selecione um cliente"),
  quantidade: z
    .number()
    .int("Quantidade deve ser um número inteiro")
    .positive("Quantidade deve ser maior que zero"),
  precoUnitario: precoSchema,
});

export type PedidoEstoqueFormValues = z.infer<typeof pedidoEstoqueSchema>;
