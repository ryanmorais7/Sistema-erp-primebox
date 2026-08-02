"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { atualizarProduto, criarProduto } from "@/app/produtos/actions";
import {
  produtoSchema,
  tipoProdutoLabels,
  TIPOS_PRODUTO,
  precoParaNumero,
  type ProdutoFormValues,
} from "@/lib/validations/produto";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Medida = { id: string; nome: string };

type ProdutoFormProps = {
  produtoId?: string;
  medidas: Medida[];
  valoresIniciais?: ProdutoFormValues;
};

const valoresPadrao: ProdutoFormValues = {
  nome: "",
  tipo: "BASE",
  medidaId: "",
  tecido: "",
  cor: "",
  preco: "",
  custo: "0",
};

const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function ProdutoForm({ produtoId, medidas, valoresIniciais }: ProdutoFormProps) {
  const router = useRouter();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProdutoFormValues>({
    resolver: zodResolver(produtoSchema),
    defaultValues: valoresIniciais ?? valoresPadrao,
  });

  const preco = useWatch({ control, name: "preco" });
  const custo = useWatch({ control, name: "custo" });
  const precoNumero = preco ? precoParaNumero(preco) : 0;
  const custoNumero = custo ? precoParaNumero(custo) : 0;
  const margemValida = Number.isFinite(precoNumero) && Number.isFinite(custoNumero) && precoNumero > 0;
  const margemReais = margemValida ? precoNumero - custoNumero : 0;
  const margemPercentual = margemValida ? (margemReais / precoNumero) * 100 : 0;

  async function aoSubmeter(dados: ProdutoFormValues) {
    setErroGeral(null);
    const resultado = produtoId
      ? await atualizarProduto(produtoId, dados)
      : await criarProduto(dados);

    if (!resultado.success) {
      setErroGeral(resultado.error);
      for (const [campo, mensagem] of Object.entries(resultado.camposComErro ?? {})) {
        setError(campo as keyof ProdutoFormValues, { message: mensagem });
      }
      return;
    }

    router.push("/produtos");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados do produto</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" placeholder="Ex: Colchão Espuma D33" {...register("nome")} />
            {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Tipo *</Label>
            <Controller
              control={control}
              name="tipo"
              render={({ field }) => (
                <Select items={tipoProdutoLabels} value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_PRODUTO.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipoProdutoLabels[tipo]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.tipo && <p className="text-sm text-destructive">{errors.tipo.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Medida *</Label>
            <Controller
              control={control}
              name="medidaId"
              render={({ field }) => (
                <Select
                  items={Object.fromEntries(medidas.map((medida) => [medida.id, medida.nome]))}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a medida" />
                  </SelectTrigger>
                  <SelectContent>
                    {medidas.map((medida) => (
                      <SelectItem key={medida.id} value={medida.id}>
                        {medida.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.medidaId && (
              <p className="text-sm text-destructive">{errors.medidaId.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tecido">Tecido</Label>
            <Input id="tecido" {...register("tecido")} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cor">Cor</Label>
            <Input id="cor" {...register("cor")} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="preco">Preço de venda (R$) *</Label>
            <Input id="preco" placeholder="0,00" {...register("preco")} />
            {errors.preco && <p className="text-sm text-destructive">{errors.preco.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="custo">Custo de produção (R$) *</Label>
            <Input id="custo" placeholder="0,00" {...register("custo")} />
            {errors.custo && <p className="text-sm text-destructive">{errors.custo.message}</p>}
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label>Margem estimada</Label>
            <p className="flex h-8 items-center text-sm text-muted-foreground">
              {margemValida
                ? `${formatadorMoeda.format(margemReais)} (${margemPercentual.toFixed(1)}%)`
                : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      {erroGeral && <p className="text-sm text-destructive">{erroGeral}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/produtos")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
