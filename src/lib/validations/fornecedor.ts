import { z } from "zod";
import { precoSchema } from "./moeda";

export const fornecedorSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do fornecedor").max(150, "Nome muito longo"),
});

export type FornecedorFormValues = z.infer<typeof fornecedorSchema>;

export const precoMateriaPrimaSchema = z.object({
  fornecedorId: z.string().trim().min(1, "Selecione o fornecedor"),
  valor: precoSchema,
});

export type PrecoMateriaPrimaFormValues = z.infer<typeof precoMateriaPrimaSchema>;

export { precoParaNumero, formatarPrecoBr } from "./moeda";
