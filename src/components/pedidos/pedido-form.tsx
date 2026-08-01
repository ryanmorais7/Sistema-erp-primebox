"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";

import { atualizarPedido, criarPedido } from "@/app/pedidos/actions";
import { pedidoSchema, type PedidoFormValues } from "@/lib/validations/pedido";
import { precoParaNumero, formatarPrecoBr } from "@/lib/validations/moeda";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";

type Cliente = { id: string; razaoSocial: string; nomeFantasia: string | null };
type ClienteOption = { value: string; label: string };
type Produto = { id: string; nome: string; preco: number };

type PedidoFormProps = {
  pedidoId?: string;
  clientes: Cliente[];
  produtos: Produto[];
  valoresIniciais?: PedidoFormValues;
};

const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const valoresPadrao: PedidoFormValues = {
  clienteId: "",
  observacoes: "",
  itens: [{ produtoId: "", quantidade: 1, precoUnitario: "" }],
};

export function PedidoForm({ pedidoId, clientes, produtos, valoresIniciais }: PedidoFormProps) {
  const router = useRouter();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PedidoFormValues>({
    resolver: zodResolver(pedidoSchema),
    defaultValues: valoresIniciais ?? valoresPadrao,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "itens" });
  const itensObservados = useWatch({ control, name: "itens" });

  const produtosPorId = new Map(produtos.map((produto) => [produto.id, produto]));
  const clienteOptions: ClienteOption[] = clientes.map((cliente) => ({
    value: cliente.id,
    label: cliente.nomeFantasia || cliente.razaoSocial,
  }));
  const produtosItems = Object.fromEntries(produtos.map((produto) => [produto.id, produto.nome]));

  function calcularSubtotal(item: { precoUnitario?: string; quantidade?: number } | undefined) {
    const preco = item?.precoUnitario ? precoParaNumero(item.precoUnitario) : 0;
    const quantidade = Number(item?.quantidade) || 0;
    return Number.isFinite(preco) ? preco * quantidade : 0;
  }

  const valorTotalEstimado = (itensObservados ?? []).reduce(
    (total, item) => total + calcularSubtotal(item),
    0,
  );

  async function aoSubmeter(dados: PedidoFormValues) {
    setErroGeral(null);
    const resultado = pedidoId ? await atualizarPedido(pedidoId, dados) : await criarPedido(dados);

    if (!resultado.success) {
      setErroGeral(resultado.error);
      for (const [campo, mensagem] of Object.entries(resultado.camposComErro ?? {})) {
        setError(campo as keyof PedidoFormValues, { message: mensagem });
      }
      return;
    }

    router.push("/pedidos");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Label>Cliente *</Label>
            <Controller
              control={control}
              name="clienteId"
              render={({ field }) => (
                <Combobox
                  items={clienteOptions}
                  value={clienteOptions.find((opcao) => opcao.value === field.value) ?? null}
                  onValueChange={(item) => field.onChange(item ? item.value : "")}
                >
                  <ComboboxInput placeholder="Digite o nome do cliente..." />
                  <ComboboxContent>
                    <ComboboxEmpty>Nenhum cliente encontrado.</ComboboxEmpty>
                    <ComboboxList>
                      {(item: ClienteOption) => (
                        <ComboboxItem key={item.value} value={item}>
                          {item.label}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              )}
            />
            {errors.clienteId && (
              <p className="text-sm text-destructive">{errors.clienteId.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itens</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {errors.itens?.root && (
            <p className="text-sm text-destructive">{errors.itens.root.message}</p>
          )}
          {errors.itens && !Array.isArray(errors.itens) && !errors.itens.root && (
            <p className="text-sm text-destructive">{errors.itens.message as string}</p>
          )}

          {fields.map((field, index) => {
            const subtotal = calcularSubtotal(itensObservados?.[index]);

            return (
              <div
                key={field.id}
                className="grid gap-3 border-b pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[1fr_5rem_7rem_7rem_auto] sm:items-end"
              >
                <div className="flex flex-col gap-2">
                  <Label>Produto *</Label>
                  <Controller
                    control={control}
                    name={`itens.${index}.produtoId`}
                    render={({ field: selectField }) => (
                      <Select
                        items={produtosItems}
                        value={selectField.value}
                        onValueChange={(value) => {
                          selectField.onChange(value);
                          const produto = produtosPorId.get(value ?? "");
                          if (produto) {
                            setValue(
                              `itens.${index}.precoUnitario`,
                              formatarPrecoBr(produto.preco),
                            );
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione o produto" />
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
                  {errors.itens?.[index]?.produtoId && (
                    <p className="text-sm text-destructive">
                      {errors.itens[index]?.produtoId?.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Qtd. *</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    {...register(`itens.${index}.quantidade`, { valueAsNumber: true })}
                  />
                  {errors.itens?.[index]?.quantidade && (
                    <p className="text-sm text-destructive">
                      {errors.itens[index]?.quantidade?.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Preço unit. *</Label>
                  <Input placeholder="0,00" {...register(`itens.${index}.precoUnitario`)} />
                  {errors.itens?.[index]?.precoUnitario && (
                    <p className="text-sm text-destructive">
                      {errors.itens[index]?.precoUnitario?.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Subtotal</Label>
                  <p className="flex h-8 items-center text-sm text-muted-foreground">
                    {formatadorMoeda.format(subtotal)}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  disabled={fields.length === 1}
                  onClick={() => remove(index)}
                  aria-label="Remover item"
                  title="Remover item"
                >
                  <Trash2 />
                </Button>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => append({ produtoId: "", quantidade: 1, precoUnitario: "" })}
          >
            <Plus />
            Adicionar item
          </Button>

          <div className="flex justify-end border-t pt-4">
            <p className="text-sm font-medium">
              Total: <span className="text-lg">{formatadorMoeda.format(valorTotalEstimado)}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Label htmlFor="observacoes">Forma de pagamento, boleto, vencimento, etc.</Label>
            <Textarea
              id="observacoes"
              rows={3}
              placeholder="Ex: 30/60 dias, boleto emitido em 05/08, aguardando compensação"
              {...register("observacoes")}
            />
          </div>
        </CardContent>
      </Card>

      {erroGeral && <p className="text-sm text-destructive">{erroGeral}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/pedidos")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
