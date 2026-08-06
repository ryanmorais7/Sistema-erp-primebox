"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { atualizarMateriaPrima, criarMateriaPrima } from "@/app/(app)/estoque/actions";
import {
  materiaPrimaSchema,
  type MateriaPrimaFormValues,
} from "@/lib/validations/materiaPrima";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const valoresPadrao: MateriaPrimaFormValues = {
  nome: "",
  unidade: "",
  estoqueMinimo: "0",
};

type MateriaPrimaFormProps = {
  materiaPrimaId?: string;
  valoresIniciais?: MateriaPrimaFormValues;
};

export function MateriaPrimaForm({ materiaPrimaId, valoresIniciais }: MateriaPrimaFormProps) {
  const router = useRouter();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MateriaPrimaFormValues>({
    resolver: zodResolver(materiaPrimaSchema),
    defaultValues: valoresIniciais ?? valoresPadrao,
  });

  async function aoSubmeter(dados: MateriaPrimaFormValues) {
    setErroGeral(null);
    const resultado = materiaPrimaId
      ? await atualizarMateriaPrima(materiaPrimaId, dados)
      : await criarMateriaPrima(dados);

    if (!resultado.success) {
      setErroGeral(resultado.error);
      for (const [campo, mensagem] of Object.entries(resultado.camposComErro ?? {})) {
        setError(campo as keyof MateriaPrimaFormValues, { message: mensagem });
      }
      return;
    }

    router.push("/estoque");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados da matéria-prima</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" placeholder="Ex: Tecido Suede Bege" {...register("nome")} />
            {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="unidade">Unidade *</Label>
            <Input id="unidade" placeholder="m, kg, un..." {...register("unidade")} />
            {errors.unidade && (
              <p className="text-sm text-destructive">{errors.unidade.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="estoqueMinimo">Estoque mínimo *</Label>
            <Input id="estoqueMinimo" placeholder="0" {...register("estoqueMinimo")} />
            {errors.estoqueMinimo && (
              <p className="text-sm text-destructive">{errors.estoqueMinimo.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {erroGeral && <p className="text-sm text-destructive">{erroGeral}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/estoque")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
