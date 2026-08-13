import { z } from "zod";
import { TIPOS_PRODUTO } from "./produto";

// Aceita qualquer texto (inclusive vazio) — vira 0 automaticamente ao
// passar por precoParaNumero() na confirmação. Preço/custo nunca travam
// a importação, diferente do cadastro manual de produto.
const valorLivreSchema = z.string().trim();

const somenteDigitos = (valor: string) => valor.replace(/\D/g, "");

export const clienteNovoSchema = z.object({
  texto: z.string().trim().min(1),
  // Nenhum campo aqui trava a confirmação — a planilha do Pedro não traz
  // telefone, e o usuário pode ajustar depois em /clientes.
  telefone: z.string().trim().transform(somenteDigitos),
});

export const produtoNovoSchema = z.object({
  texto: z.string().trim().min(1),
  // Tipo, medida, preço e custo ficam pré-preenchidos com um valor padrão
  // (ver importar-planilha-form.tsx) mas nada aqui é obrigatório pra
  // confirmar — dá pra ajustar tudo depois em /produtos.
  tipo: z.enum(TIPOS_PRODUTO),
  medidaId: z.string().trim(),
  preco: valorLivreSchema,
  custo: valorLivreSchema,
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
