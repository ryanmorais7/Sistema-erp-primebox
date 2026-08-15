"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";

import { atualizarGrupoOrdemProducao } from "@/app/(app)/producao/actions";
import {
  editarGrupoPedidoSchema,
  type EditarGrupoPedidoValues,
} from "@/lib/validations/pedido";
import { mascararMoeda } from "@/lib/mascaras";
import { ProdutoTextoField } from "@/components/producao/produto-texto-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampoObrigatorio } from "@/components/ui/campo-obrigatorio";

type Produto = { id: string; nome: string; preco: number };
type Medida = { id: string; nome: string };

type EditarGrupoPedidoFormProps = {
  clienteNome: string;
  valoresIniciais: EditarGrupoPedidoValues;
  produtos: Produto[];
  medidas: Medida[];
};

export function EditarGrupoPedidoForm({
  clienteNome,
  valoresIniciais,
  produtos,
  medidas,
}: EditarGrupoPedidoFormProps) {
  const router = useRouter();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditarGrupoPedidoValues>({
    resolver: zodResolver(editarGrupoPedidoSchema),
    defaultValues: valoresIniciais,
  });

  const { fields } = useFieldArray({ control, name: "linhas" });
  const linhasObservadas = useWatch({ control, name: "linhas" });

  async function aoSubmeter(dados: EditarGrupoPedidoValues) {
    setErroGeral(null);
    const resultado = await atualizarGrupoOrdemProducao(dados);
    if (!resultado.success) {
      setErroGeral(resultado.error);
      return;
    }
    router.push("/producao");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-col gap-2 sm:max-w-xs">
            <Label className="text-xs">Cliente</Label>
            <p className="text-sm font-medium">{clienteNome}</p>
            <p className="text-xs text-muted-foreground">
              Pra trocar o cliente, edite o pedido inteiro em Pedidos.
            </p>
          </div>

          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-3 border-b pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[5rem_1fr_7rem_7rem_9rem] sm:items-start"
            >
              <input type="hidden" {...register(`linhas.${index}.itemId`)} />
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">
                  Qtd.
                  <CampoObrigatorio />
                </Label>
                <Controller
                  control={control}
                  name={`linhas.${index}.quantidade`}
                  render={({ field: qtdField }) => (
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={Number.isFinite(qtdField.value) ? qtdField.value : ""}
                      onChange={(e) => qtdField.onChange(e.target.valueAsNumber)}
                      onBlur={qtdField.onBlur}
                    />
                  )}
                />
                {errors.linhas?.[index]?.quantidade && (
                  <p className="text-xs text-destructive">
                    {errors.linhas[index]?.quantidade?.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">
                  Produto
                  <CampoObrigatorio />
                </Label>
                <Controller
                  control={control}
                  name={`linhas.${index}.produtoTexto`}
                  render={({ field: textoField }) => (
                    <ProdutoTextoField
                      texto={textoField.value ?? ""}
                      produtoId={linhasObservadas?.[index]?.produtoId ?? ""}
                      produtos={produtos}
                      medidas={medidas}
                      onChange={(texto, produto) => {
                        textoField.onChange(texto);
                        setValue(`linhas.${index}.produtoId`, produto?.id ?? "");
                      }}
                    />
                  )}
                />
                {errors.linhas?.[index]?.produtoTexto && (
                  <p className="text-xs text-destructive">
                    {errors.linhas[index]?.produtoTexto?.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">
                  Preço (R$)
                  <CampoObrigatorio />
                </Label>
                <Controller
                  control={control}
                  name={`linhas.${index}.precoUnitario`}
                  render={({ field: precoField }) => (
                    <Input
                      placeholder="0,00"
                      inputMode="numeric"
                      value={precoField.value ?? ""}
                      onChange={(e) => precoField.onChange(mascararMoeda(e.target.value))}
                      onBlur={precoField.onBlur}
                    />
                  )}
                />
                {errors.linhas?.[index]?.precoUnitario && (
                  <p className="text-xs text-destructive">
                    {errors.linhas[index]?.precoUnitario?.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">
                  Custo (R$)
                  <CampoObrigatorio />
                </Label>
                <Controller
                  control={control}
                  name={`linhas.${index}.custoUnitario`}
                  render={({ field: custoField }) => (
                    <Input
                      placeholder="0,00"
                      inputMode="numeric"
                      value={custoField.value ?? ""}
                      onChange={(e) => custoField.onChange(mascararMoeda(e.target.value))}
                      onBlur={custoField.onBlur}
                    />
                  )}
                />
                {errors.linhas?.[index]?.custoUnitario && (
                  <p className="text-xs text-destructive">
                    {errors.linhas[index]?.custoUnitario?.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Data programada</Label>
                <Input type="date" {...register(`linhas.${index}.dataProgramada`)} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {erroGeral && <p className="text-sm text-destructive">{erroGeral}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/producao")}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#C9622B] text-white hover:bg-[#C9622B]/90"
        >
          <Save />
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
