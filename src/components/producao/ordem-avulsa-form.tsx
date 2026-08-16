"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Factory } from "lucide-react";

import { criarOrdemAvulsa } from "@/app/(app)/producao/ordem-avulsa/actions";
import {
  criarOrdemAvulsaSchema,
  type CriarOrdemAvulsaValues,
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

type OrdemAvulsaFormProps = {
  produtos: Produto[];
  clientes: Cliente[];
  medidas: Medida[];
  dataProgramadaInicial?: string;
};

const linhaVazia = {
  produtoId: "",
  produtoTexto: "",
  quantidade: undefined as unknown as number,
  clienteTexto: "",
  clienteId: undefined,
  observacao: "",
  precoUnitario: "",
};

export function OrdemAvulsaForm({
  produtos,
  clientes,
  medidas,
  dataProgramadaInicial,
}: OrdemAvulsaFormProps) {
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
    defaultValues: { dataProgramada: dataProgramadaInicial ?? "", linhas: [linhaVazia] },
  });

  // Pedro tá acostumado com Excel e às vezes aperta Enter sem querer
  // enquanto preenche — sem isso, o navegador submete o formulário
  // como se tivesse clicado em "Criar OP".
  function bloquearEnter(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  }

  const { fields, append, remove } = useFieldArray({ control, name: "linhas" });
  const linhasObservadas = useWatch({ control, name: "linhas" });

  // Enter no Preço da última linha adiciona uma linha nova e já foca a
  // Qtd. dela — Pedro tá acostumado a preencher planilha em sequência,
  // sem precisar clicar em "+ Adicionar linha" toda hora.
  const qtdRefs = useRef<(HTMLInputElement | null)[]>([]);
  const proximoFocoRef = useRef<number | null>(null);
  useEffect(() => {
    if (proximoFocoRef.current !== null) {
      qtdRefs.current[proximoFocoRef.current]?.focus();
      proximoFocoRef.current = null;
    }
  }, [fields.length]);
  function adicionarLinhaEFocar() {
    proximoFocoRef.current = fields.length;
    append(linhaVazia);
  }

  // Com uma linha só não dá pra remover (precisa sobrar pelo menos uma) —
  // em vez de deixar o botão de lixeira desabilitado (parecendo quebrado),
  // vira um botão "Limpar" que zera os campos dessa linha.
  function limparLinha(index: number) {
    setValue(`linhas.${index}.produtoId`, "");
    setValue(`linhas.${index}.produtoTexto`, "");
    setValue(`linhas.${index}.quantidade`, undefined as unknown as number);
    setValue(`linhas.${index}.clienteTexto`, "");
    setValue(`linhas.${index}.clienteId`, undefined);
    setValue(`linhas.${index}.observacao`, "");
    setValue(`linhas.${index}.precoUnitario`, "");
  }

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

  return (
    <form
      onSubmit={handleSubmit(aoSubmeter)}
      onKeyDown={bloquearEnter}
      className="flex flex-col gap-6"
    >
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-col gap-2 sm:max-w-xs">
            <Label className="text-xs">Data programada (opcional, vale pra OP inteira)</Label>
            <Input type="date" {...register("dataProgramada")} />
          </div>

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
                      ref={(el) => {
                        qtdField.ref(el);
                        qtdRefs.current[index] = el;
                      }}
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
                        if (produto && !linhasObservadas?.[index]?.precoUnitario) {
                          setValue(
                            `linhas.${index}.precoUnitario`,
                            formatarPrecoBr(produto.preco),
                          );
                        }
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
                      placeholder="0,00"
                      inputMode="numeric"
                      value={precoField.value ?? ""}
                      onChange={(e) => precoField.onChange(mascararMoeda(e.target.value))}
                      onBlur={precoField.onBlur}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && index === fields.length - 1) {
                          e.preventDefault();
                          adicionarLinhaEFocar();
                        }
                      }}
                    />
                  )}
                />
              </div>

              <div className="flex items-end pb-0.5">
                {fields.length === 1 ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => limparLinha(index)}>
                    Limpar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => remove(index)}
                    aria-label="Remover linha"
                    title="Remover linha"
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={adicionarLinhaEFocar}
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
