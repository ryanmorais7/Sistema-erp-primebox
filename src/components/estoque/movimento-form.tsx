"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  movimentoEstoqueSchema,
  tipoMovimentoLabels,
  TIPOS_MOVIMENTO,
  type MovimentoEstoqueFormValues,
  type TipoMovimento,
} from "@/lib/validations/movimentoEstoque";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampoObrigatorio } from "@/components/ui/campo-obrigatorio";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ResultadoAcao =
  | { success: true }
  | { success: false; error: string; camposComErro?: Record<string, string> };

type MovimentoFormProps = {
  titulo: string;
  saldoAtual: number;
  unidade?: string;
  tipoInicial?: TipoMovimento;
  aoRegistrar: (dados: MovimentoEstoqueFormValues) => Promise<ResultadoAcao>;
};

export function MovimentoForm({
  titulo,
  saldoAtual,
  unidade,
  tipoInicial,
  aoRegistrar,
}: MovimentoFormProps) {
  const router = useRouter();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MovimentoEstoqueFormValues>({
    resolver: zodResolver(movimentoEstoqueSchema),
    defaultValues: { tipo: tipoInicial ?? "ENTRADA", quantidade: "", observacao: "" },
  });

  async function aoSubmeter(dados: MovimentoEstoqueFormValues) {
    setErroGeral(null);
    const resultado = await aoRegistrar(dados);

    if (!resultado.success) {
      setErroGeral(resultado.error);
      for (const [campo, mensagem] of Object.entries(resultado.camposComErro ?? {})) {
        setError(campo as keyof MovimentoEstoqueFormValues, { message: mensagem });
      }
      return;
    }

    router.push("/estoque");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{titulo}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Saldo atual: <span className="font-medium text-foreground">{saldoAtual}</span>{" "}
            {unidade}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>
                Tipo
                <CampoObrigatorio />
              </Label>
              <Controller
                control={control}
                name="tipo"
                render={({ field }) => (
                  <Select
                    items={tipoMovimentoLabels}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_MOVIMENTO.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipoMovimentoLabels[tipo]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="quantidade">
                Quantidade
                <CampoObrigatorio />
              </Label>
              <Input id="quantidade" placeholder="0" {...register("quantidade")} />
              {errors.quantidade && (
                <p className="text-sm text-destructive">{errors.quantidade.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea id="observacao" rows={2} {...register("observacao")} />
          </div>
        </CardContent>
      </Card>

      {erroGeral && <p className="text-sm text-destructive">{erroGeral}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/estoque")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Registrar"}
        </Button>
      </div>
    </form>
  );
}
