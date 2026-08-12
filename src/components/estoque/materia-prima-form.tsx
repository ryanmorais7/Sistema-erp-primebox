"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Plus } from "lucide-react";

import { atualizarMateriaPrima, criarMateriaPrima } from "@/app/(app)/estoque/actions";
import {
  materiaPrimaSchema,
  UNIDADES_MATERIA_PRIMA,
  type MateriaPrimaFormValues,
} from "@/lib/validations/materiaPrima";
import { precoParaNumero } from "@/lib/validations/moeda";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampoObrigatorio } from "@/components/ui/campo-obrigatorio";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatarQuantidade(numero: number): string {
  const arredondado = Math.round(numero * 1000) / 1000;
  return Number.isInteger(arredondado) ? String(arredondado) : arredondado.toString().replace(".", ",");
}

const valoresPadrao: MateriaPrimaFormValues = {
  nome: "",
  unidade: "un",
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
    control,
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
            <Label htmlFor="nome">
              Nome
              <CampoObrigatorio />
            </Label>
            <Input id="nome" placeholder="Ex: Tecido Suede Bege" {...register("nome")} />
            {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="unidade">
              Unidade
              <CampoObrigatorio />
            </Label>
            <Controller
              control={control}
              name="unidade"
              render={({ field }) => (
                <Select
                  items={Object.fromEntries(UNIDADES_MATERIA_PRIMA.map((u) => [u, u]))}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full" id="unidade">
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES_MATERIA_PRIMA.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.unidade && (
              <p className="text-sm text-destructive">{errors.unidade.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="estoqueMinimo">
              Estoque mínimo
              <CampoObrigatorio />
            </Label>
            <Controller
              control={control}
              name="estoqueMinimo"
              render={({ field }) => {
                function ajustar(delta: number) {
                  const atual = field.value ? precoParaNumero(field.value) : 0;
                  const novo = Math.max(0, (Number.isFinite(atual) ? atual : 0) + delta);
                  field.onChange(formatarQuantidade(novo));
                }
                return (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => ajustar(-1)}
                      aria-label="Diminuir estoque mínimo"
                    >
                      <Minus />
                    </Button>
                    <Input
                      id="estoqueMinimo"
                      placeholder="0"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      className="text-center"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => ajustar(1)}
                      aria-label="Aumentar estoque mínimo"
                    >
                      <Plus />
                    </Button>
                  </div>
                );
              }}
            />
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
