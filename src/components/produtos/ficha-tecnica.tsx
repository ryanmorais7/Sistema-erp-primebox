"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";

import { salvarConsumoMateriaPrima, excluirConsumoMateriaPrima } from "@/app/produtos/actions";
import {
  consumoMateriaPrimaSchema,
  type ConsumoMateriaPrimaFormValues,
} from "@/lib/validations/fichaTecnica";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MateriaPrima = { id: string; nome: string; unidade: string };
type Consumo = {
  id: string;
  materiaPrimaId: string;
  materiaPrimaNome: string;
  unidade: string;
  quantidade: number;
};

type FichaTecnicaProps = {
  produtoId: string;
  materiasPrimas: MateriaPrima[];
  consumosIniciais: Consumo[];
};

export function FichaTecnica({ produtoId, materiasPrimas, consumosIniciais }: FichaTecnicaProps) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ConsumoMateriaPrimaFormValues>({
    resolver: zodResolver(consumoMateriaPrimaSchema),
    defaultValues: { materiaPrimaId: "", quantidade: "" },
  });

  const materiasPrimasItems = Object.fromEntries(
    materiasPrimas.map((materiaPrima) => [materiaPrima.id, materiaPrima.nome]),
  );

  async function aoSubmeter(dados: ConsumoMateriaPrimaFormValues) {
    setErro(null);
    const resultado = await salvarConsumoMateriaPrima(produtoId, dados);
    if (!resultado.success) {
      setErro(resultado.error);
      return;
    }
    reset({ materiaPrimaId: "", quantidade: "" });
    router.refresh();
  }

  async function aoExcluir(consumoId: string) {
    await excluirConsumoMateriaPrima(consumoId, produtoId);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ficha técnica</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {consumosIniciais.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma matéria-prima cadastrada pra este produto ainda. Ao concluir uma Ordem de
            Produção, o consumo cadastrado aqui dá saída automática no estoque de matéria-prima.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matéria-prima</TableHead>
                <TableHead className="text-right">Quantidade por unidade produzida</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consumosIniciais.map((consumo) => (
                <TableRow key={consumo.id}>
                  <TableCell className="font-medium">{consumo.materiaPrimaNome}</TableCell>
                  <TableCell className="text-right">
                    {consumo.quantidade} {consumo.unidade}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => aoExcluir(consumo.id)}
                      aria-label="Remover"
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

        {materiasPrimas.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhuma matéria-prima ativa cadastrada —{" "}
            <Link href="/estoque/materia-prima/novo" className="underline">
              cadastre uma primeiro
            </Link>
            .
          </p>
        ) : (
          <form
            onSubmit={handleSubmit(aoSubmeter)}
            className="grid gap-3 border-t pt-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end"
          >
            <div className="flex flex-col gap-2">
              <Label>Matéria-prima</Label>
              <Controller
                control={control}
                name="materiaPrimaId"
                render={({ field }) => (
                  <Select
                    items={materiasPrimasItems}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione a matéria-prima" />
                    </SelectTrigger>
                    <SelectContent>
                      {materiasPrimas.map((materiaPrima) => (
                        <SelectItem key={materiaPrima.id} value={materiaPrima.id}>
                          {materiaPrima.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.materiaPrimaId && (
                <p className="text-sm text-destructive">{errors.materiaPrimaId.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Quantidade</Label>
              <Input placeholder="0" {...register("quantidade")} />
              {errors.quantidade && (
                <p className="text-sm text-destructive">{errors.quantidade.message}</p>
              )}
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
