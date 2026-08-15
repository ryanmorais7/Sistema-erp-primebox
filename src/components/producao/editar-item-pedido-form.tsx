"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";

import { atualizarOrdemProducao } from "@/app/(app)/producao/actions";
import {
  editarItemPedidoSchema,
  type EditarItemPedidoValues,
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

type EditarItemPedidoFormProps = {
  ordemId: string;
  clienteNome: string;
  valoresIniciais: EditarItemPedidoValues;
  produtos: Produto[];
  medidas: Medida[];
};

export function EditarItemPedidoForm({
  ordemId,
  clienteNome,
  valoresIniciais,
  produtos,
  medidas,
}: EditarItemPedidoFormProps) {
  const router = useRouter();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditarItemPedidoValues>({
    resolver: zodResolver(editarItemPedidoSchema),
    defaultValues: valoresIniciais,
  });

  const linhaObservada = useWatch({ control });

  async function aoSubmeter(dados: EditarItemPedidoValues) {
    setErroGeral(null);
    const resultado = await atualizarOrdemProducao(ordemId, dados);
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
            <Label className="text-xs">Cliente</Label>
            <p className="text-sm font-medium">{clienteNome}</p>
            <p className="text-xs text-muted-foreground">
              Pra trocar o cliente, edite o pedido inteiro em Pedidos.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:max-w-xs">
            <Label className="text-xs">Data programada (opcional)</Label>
            <Input type="date" {...register("dataProgramada")} />
          </div>

          <div className="grid gap-3 sm:grid-cols-[5rem_1fr_7rem_7rem] sm:items-start">
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
                Preço (R$)
                <CampoObrigatorio />
              </Label>
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
              {errors.precoUnitario && (
                <p className="text-xs text-destructive">{errors.precoUnitario.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">
                Custo (R$)
                <CampoObrigatorio />
              </Label>
              <Controller
                control={control}
                name="custoUnitario"
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
              {errors.custoUnitario && (
                <p className="text-xs text-destructive">{errors.custoUnitario.message}</p>
              )}
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
