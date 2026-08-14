"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Factory } from "lucide-react";

import { criarOrdemAvulsa } from "@/app/(app)/producao/ordem-avulsa/actions";
import {
  criarOrdemAvulsaSchema,
  type CriarOrdemAvulsaValues,
} from "@/lib/validations/ordemAvulsa";
import { precoParaNumero, formatarPrecoBr } from "@/lib/validations/moeda";
import { ClienteTextoField } from "@/components/producao/cliente-texto-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

type Produto = { id: string; nome: string; preco: number };
type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null };

type OrdemAvulsaFormProps = {
  produtos: Produto[];
  clientes: Cliente[];
};

const linhaVazia = {
  produtoId: "",
  quantidade: 1,
  clienteTexto: "",
  clienteId: undefined,
  observacao: "",
  precoUnitario: "",
};

export function OrdemAvulsaForm({ produtos, clientes }: OrdemAvulsaFormProps) {
  const router = useRouter();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CriarOrdemAvulsaValues>({
    resolver: zodResolver(criarOrdemAvulsaSchema),
    defaultValues: { linhas: [linhaVazia] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "linhas" });
  const linhasObservadas = useWatch({ control, name: "linhas" });
  const produtosItems = Object.fromEntries(produtos.map((produto) => [produto.id, produto.nome]));

  async function aoSubmeter(dados: CriarOrdemAvulsaValues) {
    setErroGeral(null);
    const resultado = await criarOrdemAvulsa(dados);
    if (!resultado.success) {
      setErroGeral(resultado.error);
      return;
    }
    router.push("/producao");
    router.refresh();
  }

  function formatarPrecoAoSair(index: number, valor: string) {
    if (!valor.trim()) return;
    const numero = precoParaNumero(valor);
    if (Number.isFinite(numero) && numero > 0) {
      setValue(`linhas.${index}.precoUnitario`, formatarPrecoBr(numero));
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          {errors.linhas?.root && (
            <p className="text-sm text-destructive">{errors.linhas.root.message}</p>
          )}

          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-3 border-b pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[5rem_1fr_1fr_1fr_7rem_auto] sm:items-start"
            >
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
                  name={`linhas.${index}.produtoId`}
                  render={({ field: selectField }) => (
                    <Select
                      items={produtosItems}
                      value={selectField.value}
                      onValueChange={(value) => {
                        selectField.onChange(value);
                        const produto = produtos.find((p) => p.id === value);
                        if (produto && !linhasObservadas?.[index]?.precoUnitario) {
                          setValue(
                            `linhas.${index}.precoUnitario`,
                            formatarPrecoBr(produto.preco),
                          );
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {produtos.map((produto) => (
                          <SelectItem key={produto.id} value={produto.id}>
                            {produto.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.linhas?.[index]?.produtoId && (
                  <p className="text-xs text-destructive">
                    {errors.linhas[index]?.produtoId?.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">
                  Cliente
                  <CampoObrigatorio />
                </Label>
                <Controller
                  control={control}
                  name={`linhas.${index}.clienteTexto`}
                  render={({ field: textoField }) => (
                    <ClienteTextoField
                      texto={textoField.value}
                      clienteId={linhasObservadas?.[index]?.clienteId ?? null}
                      clientes={clientes}
                      onChange={(texto, clienteId) => {
                        textoField.onChange(texto);
                        setValue(`linhas.${index}.clienteId`, clienteId ?? undefined);
                      }}
                    />
                  )}
                />
                {errors.linhas?.[index]?.clienteTexto && (
                  <p className="text-xs text-destructive">
                    {errors.linhas[index]?.clienteTexto?.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Observação</Label>
                <Input placeholder="Opcional" {...register(`linhas.${index}.observacao`)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Preço (R$)</Label>
                <Controller
                  control={control}
                  name={`linhas.${index}.precoUnitario`}
                  render={({ field: precoField }) => (
                    <Input
                      placeholder="Catálogo"
                      value={precoField.value ?? ""}
                      onChange={precoField.onChange}
                      onBlur={(e) => {
                        precoField.onBlur();
                        formatarPrecoAoSair(index, e.target.value);
                      }}
                    />
                  )}
                />
              </div>

              <div className="flex items-end pb-0.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  disabled={fields.length === 1}
                  onClick={() => remove(index)}
                  aria-label="Remover linha"
                  title="Remover linha"
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => append(linhaVazia)}
          >
            <Plus />
            Adicionar linha
          </Button>
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
          <Factory />
          {isSubmitting ? "Criando..." : "Criar OP"}
        </Button>
      </div>
    </form>
  );
}
