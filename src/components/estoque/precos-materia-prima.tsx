"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";

import { salvarPrecoMateriaPrima, excluirPrecoMateriaPrima } from "@/app/(app)/estoque/actions";
import {
  precoMateriaPrimaSchema,
  type PrecoMateriaPrimaFormValues,
} from "@/lib/validations/fornecedor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Fornecedor = { id: string; nome: string };
type Preco = { id: string; fornecedorId: string; fornecedorNome: string; valor: number };

type PrecosMateriaPrimaProps = {
  materiaPrimaId: string;
  unidade: string;
  fornecedores: Fornecedor[];
  precosIniciais: Preco[];
};

const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function PrecosMateriaPrima({
  materiaPrimaId,
  unidade,
  fornecedores,
  precosIniciais,
}: PrecosMateriaPrimaProps) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PrecoMateriaPrimaFormValues>({
    resolver: zodResolver(precoMateriaPrimaSchema),
    defaultValues: { fornecedorId: "", valor: "" },
  });

  const fornecedoresItems = Object.fromEntries(
    fornecedores.map((fornecedor) => [fornecedor.id, fornecedor.nome]),
  );
  const menorValor =
    precosIniciais.length > 0 ? Math.min(...precosIniciais.map((preco) => preco.valor)) : null;

  async function aoSubmeter(dados: PrecoMateriaPrimaFormValues) {
    setErro(null);
    const resultado = await salvarPrecoMateriaPrima(materiaPrimaId, dados);
    if (!resultado.success) {
      setErro(resultado.error);
      return;
    }
    reset({ fornecedorId: "", valor: "" });
    router.refresh();
  }

  async function aoExcluir(precoId: string) {
    await excluirPrecoMateriaPrima(precoId, materiaPrimaId);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fornecedores e preços</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {precosIniciais.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum fornecedor cotado pra este item ainda.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Valor por {unidade}</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {precosIniciais.map((preco) => (
                <TableRow key={preco.id}>
                  <TableCell className="font-medium">
                    {preco.fornecedorNome}
                    {preco.valor === menorValor && precosIniciais.length > 1 && (
                      <Badge className="ml-2 bg-positive-soft text-positive">Mais barato</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatadorMoeda.format(preco.valor)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => aoExcluir(preco.id)}
                      aria-label="Remover cotação"
                      title="Remover"
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {fornecedores.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum fornecedor ativo cadastrado,{" "}
            <Link href="/estoque/fornecedores/novo" className="underline">
              cadastre um primeiro
            </Link>
            .
          </p>
        ) : (
          <form
            onSubmit={handleSubmit(aoSubmeter)}
            className="grid gap-3 border-t pt-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end"
          >
            <div className="flex flex-col gap-2">
              <Label>Fornecedor</Label>
              <Controller
                control={control}
                name="fornecedorId"
                render={({ field }) => (
                  <Select items={fornecedoresItems} value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {fornecedores.map((fornecedor) => (
                        <SelectItem key={fornecedor.id} value={fornecedor.id}>
                          {fornecedor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.fornecedorId && (
                <p className="text-sm text-destructive">{errors.fornecedorId.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Valor por {unidade} (R$)</Label>
              <Input placeholder="0,00" {...register("valor")} />
              {errors.valor && <p className="text-sm text-destructive">{errors.valor.message}</p>}
            </div>

            <Button type="submit" disabled={isSubmitting}>
              <Plus />
              Adicionar/atualizar
            </Button>
          </form>
        )}

        {erro && <p className="text-sm text-destructive">{erro}</p>}
      </CardContent>
    </Card>
  );
}
