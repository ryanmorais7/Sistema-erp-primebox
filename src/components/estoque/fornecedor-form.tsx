"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { atualizarFornecedor, criarFornecedor } from "@/app/estoque/actions";
import { fornecedorSchema, type FornecedorFormValues } from "@/lib/validations/fornecedor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const valoresPadrao: FornecedorFormValues = {
  nome: "",
};

type FornecedorFormProps = {
  fornecedorId?: string;
  valoresIniciais?: FornecedorFormValues;
};

export function FornecedorForm({ fornecedorId, valoresIniciais }: FornecedorFormProps) {
  const router = useRouter();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FornecedorFormValues>({
    resolver: zodResolver(fornecedorSchema),
    defaultValues: valoresIniciais ?? valoresPadrao,
  });

  async function aoSubmeter(dados: FornecedorFormValues) {
    setErroGeral(null);
    const resultado = fornecedorId
      ? await atualizarFornecedor(fornecedorId, dados)
      : await criarFornecedor(dados);

    if (!resultado.success) {
      setErroGeral(resultado.error);
      for (const [campo, mensagem] of Object.entries(resultado.camposComErro ?? {})) {
        setError(campo as keyof FornecedorFormValues, { message: mensagem });
      }
      return;
    }

    router.push("/estoque/fornecedores");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados do fornecedor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" placeholder="Ex: Espumas Nordeste" {...register("nome")} />
            {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
          </div>
        </CardContent>
      </Card>

      {erroGeral && <p className="text-sm text-destructive">{erroGeral}</p>}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/estoque/fornecedores")}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
