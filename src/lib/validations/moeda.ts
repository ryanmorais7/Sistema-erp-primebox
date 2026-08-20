import { z } from "zod";

// Aceita "," ou "." como separador decimal (usuário pode digitar em
// qualquer um dos dois formatos). O último separador na string é
// sempre o decimal; qualquer separador anterior é de milhar. Se os
// dígitos após esse separador forem 3 ou mais, na verdade não era um
// separador decimal e sim de milhar (ex: "1.500" = 1500, não 1,5).
export function precoParaNumero(preco: string): number {
  const limpo = preco.trim().replace(/[^0-9.,]/g, "");
  const indiceSeparadorDecimal = Math.max(limpo.lastIndexOf("."), limpo.lastIndexOf(","));

  if (indiceSeparadorDecimal === -1) {
    return Number(limpo);
  }

  const parteInteira = limpo.slice(0, indiceSeparadorDecimal).replace(/[.,]/g, "");
  const parteDecimal = limpo.slice(indiceSeparadorDecimal + 1).replace(/[.,]/g, "");

  if (parteDecimal.length >= 3) {
    return Number(parteInteira + parteDecimal);
  }

  return Number(`${parteInteira || "0"}.${parteDecimal}`);
}

// Milhar com ponto, decimal com vírgula, sempre 2 casas — ex: 1234.5 =>
// "1.234,50". Antes só trocava o separador decimal (toFixed + replace),
// sem separador de milhar — corrigido junto com a normalização no blur
// dos campos de valor (ver ADR sobre formatação de campos de valor).
export function formatarPrecoBr(preco: number): string {
  return preco.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Normaliza o texto digitado num campo de valor pro padrão brasileiro
// (ex: "100" => "100,00", "150,5" => "150,50", "1500" => "1.500,00") —
// usada no onBlur dos campos de Preço/Custo/Valor pra formatar sem
// exigir que o usuário digite a vírgula e as duas casas decimais. Some
// (retorna null) quando o campo está vazio ou o texto não é um número
// válido, pra não forçar "0,00" ou "NaN" enquanto o campo ainda não tem
// conteúdo utilizável — a validação de obrigatoriedade continua sendo
// feita pelo Zod (precoSchema/custoSchema) no submit.
export function normalizarPrecoDigitado(texto: string): string | null {
  if (!texto.trim()) return null;
  const numero = precoParaNumero(texto);
  if (!Number.isFinite(numero)) return null;
  return formatarPrecoBr(numero);
}

export const precoSchema = z
  .string()
  .trim()
  .min(1, "Informe o preço")
  .refine((valor) => {
    const numero = precoParaNumero(valor);
    return Number.isFinite(numero) && numero > 0;
  }, "Informe um preço válido (ex: 1500,00 ou 1.500,00)");

// Para custo: aceita zero (produto ainda sem custo cadastrado), ao
// contrário do preço de venda, que nunca deveria ser zero.
export const custoSchema = z
  .string()
  .trim()
  .min(1, "Informe o custo (pode ser 0 se ainda não souber)")
  .refine((valor) => {
    const numero = precoParaNumero(valor);
    return Number.isFinite(numero) && numero >= 0;
  }, "Informe um valor válido (ex: 0, 250,00 ou 1.500,00)");
