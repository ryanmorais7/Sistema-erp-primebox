import { z } from "zod";
import { precoSchema, custoSchema } from "./moeda";
import { TIPOS_PRODUTO } from "./produto";

// Preço é sempre opcional aqui (formal ou avulsa) — se vazio, quem cria
// a linha decide o fallback (preço de catálogo do produto).
const precoOpcionalSchema = z.string().trim().optional();

export const linhaOrdemAvulsaSchema = z.object({
  // Texto digitado é sempre o que vale — se não bater com um produto
  // existente (por id ou por nome) nem for criado ali no popup, o
  // servidor cadastra um produto novo sozinho a partir desse texto (ver
  // criarOrdemAvulsa), igual ao que já faz a importação de planilha.
  produtoTexto: z.string().trim().min(1, "Informe o produto"),
  produtoId: z.string().trim().optional(),
  quantidade: z
    .number()
    .int("Quantidade deve ser um número inteiro")
    .positive("Quantidade deve ser maior que zero"),
  clienteTexto: z.string().trim().min(1, "Informe o cliente (ou \"Avulso\")"),
  clienteId: z.string().trim().optional(),
  observacao: z.string().trim().optional(),
  precoUnitario: precoOpcionalSchema,
});

export const criarOrdemAvulsaSchema = z.object({
  linhas: z.array(linhaOrdemAvulsaSchema).min(1, "Adicione pelo menos uma linha"),
});

export type LinhaOrdemAvulsaValues = z.infer<typeof linhaOrdemAvulsaSchema>;
export type CriarOrdemAvulsaValues = z.infer<typeof criarOrdemAvulsaSchema>;

export const clienteRapidoSchema = z.object({
  razaoSocial: z.string().trim().min(1, "Informe o nome"),
  telefone: z
    .string()
    .trim()
    .transform((valor) => valor.replace(/\D/g, ""))
    .refine((valor) => valor.length >= 10 && valor.length <= 11, "Telefone inválido"),
});

export type ClienteRapidoValues = z.infer<typeof clienteRapidoSchema>;

export const produtoRapidoSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do produto"),
  tipo: z.enum(TIPOS_PRODUTO),
  medidaId: z.string().trim().min(1, "Selecione a medida"),
  preco: precoSchema,
  custo: custoSchema,
});

export type ProdutoRapidoValues = z.infer<typeof produtoRapidoSchema>;
