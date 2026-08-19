"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShoppingCart } from "lucide-react";

import { criarPedidoDoEstoque } from "@/app/(app)/estoque/actions";
import {
  pedidoEstoqueSchema,
  type PedidoEstoqueFormValues,
} from "@/lib/validations/pedidoEstoque";
import { precoParaNumero, formatarPrecoBr } from "@/lib/validations/moeda";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampoObrigatorio } from "@/components/ui/campo-obrigatorio";
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

type CriarPedidoEstoqueFormProps = {
  produtoId: string;
  produtoNome: string;
  precoUnitario: number;
  saldoAtual: number;
  clientes: Cliente[];
};

const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function CriarPedidoEstoqueForm({
  produtoId,
  produtoNome,
  precoUnitario,
  saldoAtual,
  clientes,
}: CriarPedidoEstoqueFormProps) {
  const router = useRouter();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PedidoEstoqueFormValues>({
    resolver: zodResolver(pedidoEstoqueSchema),
    defaultValues: {
      clienteId: "",
      quantidade: undefined as unknown as number,
      precoUnitario: formatarPrecoBr(precoUnitario),
    },
  });

  const clienteOptions: ClienteOption[] = clientes.map((cliente) => ({
    value: cliente.id,
    label: cliente.nomeFantasia || cliente.razaoSocial,
  }));

  const [quantidade, precoDigitado] = useWatch({ control, name: ["quantidade", "precoUnitario"] });
  const preco = precoDigitado ? precoParaNumero(precoDigitado) : 0;
  const subtotal = Number.isFinite(preco) ? preco * (Number(quantidade) || 0) : 0;

  async function aoSubmeter(dados: PedidoEstoqueFormValues) {
    setErroGeral(null);
    const resultado = await criarPedidoDoEstoque(produtoId, dados);

    if (!resultado.success) {
      setErroGeral(resultado.error);
      for (const [campo, mensagem] of Object.entries(resultado.camposComErro ?? {})) {
        setError(campo as keyof PedidoEstoqueFormValues, { message: mensagem });
      }
      return;
    }

    router.push(resultado.pedidoId ? `/pedidos/${resultado.pedidoId}` : "/pedidos");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{produtoNome}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Saldo disponível: <span className="font-medium text-[#0F6E56]">{saldoAtual}</span>
          </p>

          <div className="flex flex-col gap-2">
            <Label>
              Cliente
              <CampoObrigatorio />
            </Label>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="quantidade">Quantidade</Label>
              <Controller
                control={control}
                name="quantidade"
                render={({ field: qtdField }) => (
                  <Input
                    id="quantidade"
                    type="number"
                    min={1}
                    max={saldoAtual}
                    step={1}
                    value={Number.isFinite(qtdField.value) ? qtdField.value : ""}
                    onChange={(e) => qtdField.onChange(e.target.valueAsNumber)}
                    onBlur={qtdField.onBlur}
                  />
                )}
              />
              {errors.quantidade && (
                <p className="text-sm text-destructive">{errors.quantidade.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="precoUnitario">
                Preço unit. (R$)
                <CampoObrigatorio />
              </Label>
              <Input id="precoUnitario" placeholder="0,00" {...register("precoUnitario")} />
              {errors.precoUnitario && (
                <p className="text-sm text-destructive">{errors.precoUnitario.message}</p>
              )}
            </div>
          </div>

          <p className="text-sm font-medium">
            Total: <span className="text-lg">{formatadorMoeda.format(subtotal)}</span>
          </p>
        </CardContent>
      </Card>

      {erroGeral && <p className="text-sm text-destructive">{erroGeral}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/estoque")}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#C9622B] text-white hover:bg-[#C9622B]/90"
        >
          <ShoppingCart />
          {isSubmitting ? "Criando..." : "Criar pedido"}
        </Button>
      </div>
    </form>
  );
}
