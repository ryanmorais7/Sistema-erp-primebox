"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";

import { atualizarItemOrdemAvulsa } from "@/app/(app)/producao/ordem-avulsa/actions";
import {
  editarItemAvulsaSchema,
  type EditarItemAvulsaValues,
} from "@/lib/validations/ordemAvulsa";
import { formatarPrecoBr } from "@/lib/validations/moeda";
import { mascararMoeda } from "@/lib/mascaras";
import { ClienteTextoField } from "@/components/producao/cliente-texto-field";
import { ProdutoTextoField } from "@/components/producao/produto-texto-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampoObrigatorio } from "@/components/ui/campo-obrigatorio";

type Produto = { id: string; nome: string; preco: number };
type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null };
type Medida = { id: string; nome: string };

type EditarItemAvulsaFormProps = {
  itemId: string;
  valoresIniciais: EditarItemAvulsaValues;
  produtos: Produto[];
  clientes: Cliente[];
  medidas: Medida[];
};

export function EditarItemAvulsaForm({
  itemId,
  valoresIniciais,
  produtos,
  clientes,
  medidas,
}: EditarItemAvulsaFormProps) {
  const router = useRouter();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditarItemAvulsaValues>({
    resolver: zodResolver(editarItemAvulsaSchema),
    defaultValues: valoresIniciais,
  });

  const linhaObservada = useWatch({ control });

  async function aoSubmeter(dados: EditarItemAvulsaValues) {
    setErroGeral(null);
    const resultado = await atualizarItemOrdemAvulsa(itemId, dados);
    if (!resultado.success) {
      setErroGeral(resultado.error);
      return;
    }
    router.push("/producao/kanban");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-col gap-2 sm:max-w-xs">
            <Label className="text-xs">Data programada (opcional)</Label>
            <Input type="date" {...register("dataProgramada")} />
          </div>

          <div className="grid gap-3 sm:grid-cols-[5rem_1fr_1fr_1fr_7rem] sm:items-start">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">
                Qtd.
                <CampoObrigatorio />
              </Label>
              <Controller
                control={control}
                name="quantidade"
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
              {errors.quantidade && (
                <p className="text-xs text-destructive">{errors.quantidade.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">
                Produto
                <CampoObrigatorio />
              </Label>
              <Controller
                control={control}
                name="produtoTexto"
                render={({ field: textoField }) => (
                  <ProdutoTextoField
                    texto={textoField.value ?? ""}
                    produtoId={linhaObservada?.produtoId ?? ""}
                    produtos={produtos}
                    medidas={medidas}
                    onChange={(texto, produto) => {
                      textoField.onChange(texto);
                      setValue("produtoId", produto?.id ?? "");
                      if (produto && !linhaObservada?.precoUnitario) {
                        setValue("precoUnitario", formatarPrecoBr(produto.preco));
                      }
                    }}
                  />
                )}
              />
              {errors.produtoTexto && (
                <p className="text-xs text-destructive">{errors.produtoTexto.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">
                Cliente
                <CampoObrigatorio />
              </Label>
              <Controller
                control={control}
                name="clienteTexto"
                render={({ field: textoField }) => (
                  <ClienteTextoField
                    texto={textoField.value}
                    clienteId={linhaObservada?.clienteId ?? null}
                    clientes={clientes}
                    onChange={(texto, clienteId) => {
                      textoField.onChange(texto);
                      setValue("clienteId", clienteId ?? undefined);
                    }}
                  />
                )}
              />
              {errors.clienteTexto && (
                <p className="text-xs text-destructive">{errors.clienteTexto.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Observação</Label>
              <Input placeholder="Opcional" {...register("observacao")} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Preço (R$)</Label>
              <Controller
                control={control}
                name="precoUnitario"
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
            </div>
          </div>
        </CardContent>
      </Card>

      {erroGeral && <p className="text-sm text-destructive">{erroGeral}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/producao/kanban")}>
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
