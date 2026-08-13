import { z } from "zod";
import { custoSchema } from "./moeda";
import { TIPOS_PRODUTO } from "./produto";

const somenteDigitos = (valor: string) => valor.replace(/\D/g, "");

export const clienteNovoSchema = z.object({
  texto: z.string().trim().min(1),
  telefone: z
    .string()
    .trim()
    .transform(somenteDigitos)
    .refine((valor) => valor.length >= 10 && valor.length <= 11, "Telefone inválido"),
});

export const produtoNovoSchema = z.object({
  texto: z.string().trim().min(1),
  tipo: z.enum(TIPOS_PRODUTO),
  medidaId: z.string().trim().min(1, "Selecione a medida"),
  // Preço/custo podem ficar 0 na importação (ajustados depois em
  // /produtos) — diferente do cadastro normal, aqui não trava a
  // confirmação por falta de preço.
  preco: custoSchema,
  custo: custoSchema,
});

export const itemImportadoSchema = z.object({
  quantidade: z.number().int().positive(),
  produtoTexto: z.string().trim().min(1),
  clienteTexto: z.string().trim().min(1),
  observacao: z.string().optional(),
});

export const confirmarImportacaoSchema = z.object({
  itens: z.array(itemImportadoSchema).min(1),
  clientesNovos: z.array(clienteNovoSchema),
  produtosNovos: z.array(produtoNovoSchema),
});

export type ClienteNovoValues = z.input<typeof clienteNovoSchema>;
export type ProdutoNovoValues = z.input<typeof produtoNovoSchema>;
export type ItemImportadoValues = z.input<typeof itemImportadoSchema>;
export type ConfirmarImportacaoValues = z.input<typeof confirmarImportacaoSchema>;
