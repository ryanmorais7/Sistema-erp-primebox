import { z } from "zod";

const somenteDigitos = (valor: string) => valor.replace(/\D/g, "");

export const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

function capitalizarPalavras(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letra) => letra.toUpperCase());
}

const cnpjOpcional = z
  .string()
  .optional()
  .transform((valor) => (valor ? somenteDigitos(valor) : undefined))
  .refine((valor) => !valor || valor.length === 14, {
    message: "CNPJ deve ter 14 dígitos",
  });

const cpfOpcional = z
  .string()
  .optional()
  .transform((valor) => (valor ? somenteDigitos(valor) : undefined))
  .refine((valor) => !valor || valor.length === 11, {
    message: "CPF deve ter 11 dígitos",
  });

export const clienteSchema = z
  .object({
    razaoSocial: z.string().trim().min(3, "Informe a razão social"),
    nomeFantasia: z.string().trim().optional(),
    cnpj: cnpjOpcional,
    cpf: cpfOpcional,
    telefone: z
      .string()
      .trim()
      .transform(somenteDigitos)
      .refine((valor) => valor.length >= 10, "Telefone inválido"),
    email: z
      .string()
      .trim()
      .optional()
      .refine((valor) => !valor || z.string().email().safeParse(valor).success, {
        message: "E-mail inválido",
      }),
    contatoNome: z.string().trim().optional(),
    endereco: z.string().trim().optional(),
    numero: z.string().trim().optional(),
    bairro: z.string().trim().optional(),
    cidade: z
      .string()
      .trim()
      .optional()
      .transform((valor) => (valor ? capitalizarPalavras(valor) : valor)),
    estado: z
      .string()
      .trim()
      .toUpperCase()
      .optional()
      .refine(
        (valor) => !valor || (UFS as readonly string[]).includes(valor),
        "Selecione uma UF válida",
      ),
    cep: z
      .string()
      .trim()
      .optional()
      .transform((valor) => (valor ? somenteDigitos(valor) : undefined))
      .refine((valor) => !valor || valor.length === 8, "CEP deve ter 8 dígitos"),
  })
  .refine((dados) => Boolean(dados.cnpj || dados.cpf), {
    message: "Informe CNPJ ou CPF",
    path: ["cnpj"],
  });

export type ClienteFormValues = z.input<typeof clienteSchema>;
export type ClienteFormData = z.output<typeof clienteSchema>;
