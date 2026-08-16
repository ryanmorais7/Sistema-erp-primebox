import { z } from "zod";
import { TIPOS_PRODUTO } from "./produto";

// Aceita qualquer texto (inclusive vazio) — vira 0 automaticamente ao
// passar por precoParaNumero() na confirmação.
const valorLivreSchema = z.string().trim();

const somenteDigitos = (valor: string) => valor.replace(/\D/g, "");

// Cliente da planilha sem cadastro correspondente — por padrão fica
// avulso (cadastrar=false), igual o formulário manual de Criar OP
// (ClienteTextoField só formaliza se o usuário pedir explicitamente).
export const clienteNovoProducaoSchema = z.object({
  texto: z.string().trim().min(1),
  cadastrar: z.boolean(),
  telefone: z.string().trim().transform(somenteDigitos),
});

export const produtoNovoProducaoSchema = z.object({
  texto: z.string().trim().min(1),
  tipo: z.enum(TIPOS_PRODUTO),
  medidaId: z.string().trim(),
  preco: valorLivreSchema,
  custo: valorLivreSchema,
});

export const itemImportadoProducaoSchema = z.object({
  quantidade: z.number().int().positive(),
  produtoTexto: z.string().trim().min(1),
  clienteTexto: z.string().trim().min(1),
  observacao: z.string().optional(),
});

export const confirmarImportacaoProducaoSchema = z.object({
  dataProgramada: z.string().optional(),
  itens: z.array(itemImportadoProducaoSchema).min(1),
  clientesNovos: z.array(clienteNovoProducaoSchema),
  produtosNovos: z.array(produtoNovoProducaoSchema),
});

export type ClienteNovoProducaoValues = z.input<typeof clienteNovoProducaoSchema>;
export type ProdutoNovoProducaoValues = z.input<typeof produtoNovoProducaoSchema>;
export type ItemImportadoProducaoValues = z.input<typeof itemImportadoProducaoSchema>;
export type ConfirmarImportacaoProducaoValues = z.input<typeof confirmarImportacaoProducaoSchema>;
