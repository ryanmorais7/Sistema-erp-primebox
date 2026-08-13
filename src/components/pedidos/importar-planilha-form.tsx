"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Upload, ArrowLeft } from "lucide-react";

import { analisarPlanilha, confirmarImportacao } from "@/app/(app)/pedidos/importar/actions";
import {
  confirmarImportacaoSchema,
  type ConfirmarImportacaoValues,
} from "@/lib/validations/importarPlanilha";
import { TIPOS_PRODUTO, tipoProdutoLabels } from "@/lib/validations/produto";
import { mascararTelefone } from "@/lib/mascaras";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Medida = { id: string; nome: string };

type AnaliseSucesso = {
  titulo: string | null;
  itens: { quantidade: number; produto: string; cliente: string; observacao: string }[];
  clientesNovos: string[];
  produtosNovos: string[];
};

export function ImportarPlanilhaForm({ medidas }: { medidas: Medida[] }) {
  const router = useRouter();
  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [erroAnalise, setErroAnalise] = useState<string | null>(null);
  const [analise, setAnalise] = useState<AnaliseSucesso | null>(null);
  const [erroConfirmacao, setErroConfirmacao] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ConfirmarImportacaoValues>({
    resolver: zodResolver(confirmarImportacaoSchema),
    defaultValues: { itens: [], clientesNovos: [], produtosNovos: [] },
  });

  const camposClientes = useFieldArray({ control, name: "clientesNovos" });
  const camposProdutos = useFieldArray({ control, name: "produtosNovos" });

  async function aoEnviarArquivo(formData: FormData) {
    setAnalisando(true);
    setErroAnalise(null);
    const resultado = await analisarPlanilha(formData);
    setAnalisando(false);
    if (!resultado.success) {
      setErroAnalise(resultado.error);
      return;
    }

    const itens = resultado.itens.map((item) => ({
      quantidade: item.quantidade,
      produto: item.produto,
      cliente: item.cliente,
      observacao: item.observacao,
    }));
    setAnalise({
      titulo: resultado.titulo,
      itens,
      clientesNovos: resultado.clientesNovos,
      produtosNovos: resultado.produtosNovos,
    });
    reset({
      itens: itens.map((item) => ({
        quantidade: item.quantidade,
        produtoTexto: item.produto,
        clienteTexto: item.cliente,
        observacao: item.observacao,
      })),
      clientesNovos: resultado.clientesNovos.map((texto) => ({ texto, telefone: "" })),
      produtosNovos: resultado.produtosNovos.map((texto) => ({
        texto,
        tipo: "BASE" as const,
        medidaId: "",
        preco: "",
        custo: "0",
      })),
    });
  }

  async function aoConfirmar(dados: ConfirmarImportacaoValues) {
    setErroConfirmacao(null);
    const resultado = await confirmarImportacao(dados);
    if (!resultado.success) {
      setErroConfirmacao(resultado.error);
      return;
    }
    router.push("/pedidos");
    router.refresh();
  }

  if (!analise) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enviar planilha</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Envie o arquivo Excel com as colunas QUANT, PRODUTO, CLIENTE e OBSERVAÇÃO (em qualquer
            aba). Um pedido é criado pra cada cliente encontrado, com os itens dele. Clientes e
            produtos que ainda não existem no sistema são conferidos na próxima tela antes de
            confirmar.
          </p>
          <form action={aoEnviarArquivo} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:max-w-sm">
              <Label htmlFor="arquivo">
                Arquivo
                <CampoObrigatorio />
              </Label>
              <input
                ref={inputArquivoRef}
                id="arquivo"
                name="arquivo"
                type="file"
                accept=".xlsx,.xls"
                required
                className="sr-only"
                onChange={(e) => setNomeArquivo(e.target.files?.[0]?.name ?? null)}
              />
              <button
                type="button"
                onClick={() => inputArquivoRef.current?.click()}
                className="flex h-8 w-full items-center rounded-lg border border-input bg-transparent px-2.5 text-left text-sm transition-colors outline-none hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className={nomeArquivo ? "text-foreground" : "text-muted-foreground"}>
                  {nomeArquivo ?? "Clique aqui pra escolher um arquivo"}
                </span>
              </button>
            </div>
            {erroAnalise && <p className="text-sm text-destructive">{erroAnalise}</p>}
            <Button type="submit" disabled={analisando} className="self-start">
              <Upload />
              {analisando ? "Analisando..." : "Analisar planilha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(aoConfirmar)} className="flex flex-col gap-6">
      {analise.titulo && (
        <p className="text-sm text-muted-foreground">
          Planilha: <span className="font-medium text-foreground">{analise.titulo}</span> ·{" "}
          {analise.itens.length} item(ns) · {new Set(analise.itens.map((i) => i.cliente)).size}{" "}
          cliente(s)
        </p>
      )}

      {camposClientes.fields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Clientes novos encontrados na planilha</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {camposClientes.fields.map((campo, index) => (
              <div key={campo.id} className="grid gap-3 sm:grid-cols-[1fr_16rem]">
                <div className="flex flex-col gap-2">
                  <Label>Nome (da planilha)</Label>
                  <Input value={campo.texto} disabled />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`cliente-telefone-${index}`}>
                    Telefone
                    <CampoObrigatorio />
                  </Label>
                  <Controller
                    control={control}
                    name={`clientesNovos.${index}.telefone`}
                    render={({ field }) => (
                      <Input
                        id={`cliente-telefone-${index}`}
                        value={field.value}
                        onChange={(e) => field.onChange(mascararTelefone(e.target.value))}
                        onBlur={field.onBlur}
                        placeholder="(00) 00000-0000"
                        inputMode="numeric"
                      />
                    )}
                  />
                  {errors.clientesNovos?.[index]?.telefone && (
                    <p className="text-sm text-destructive">
                      {errors.clientesNovos[index]?.telefone?.message}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {camposProdutos.fields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Produtos novos encontrados na planilha</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {camposProdutos.fields.map((campo, index) => (
              <div
                key={campo.id}
                className="grid gap-3 border-b pb-4 last:border-b-0 last:pb-0 sm:grid-cols-5"
              >
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label>Nome (da planilha)</Label>
                  <Input value={campo.texto} disabled />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>
                    Tipo
                    <CampoObrigatorio />
                  </Label>
                  <Controller
                    control={control}
                    name={`produtosNovos.${index}.tipo`}
                    render={({ field }) => (
                      <Select
                        items={tipoProdutoLabels}
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
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
                </div>
                <div className="flex flex-col gap-2">
                  <Label>
                    Medida
                    <CampoObrigatorio />
                  </Label>
                  <Controller
                    control={control}
                    name={`produtosNovos.${index}.medidaId`}
                    render={({ field }) => (
                      <Select
                        items={Object.fromEntries(medidas.map((m) => [m.id, m.nome]))}
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione" />
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
                  {errors.produtosNovos?.[index]?.medidaId && (
                    <p className="text-sm text-destructive">
                      {errors.produtosNovos[index]?.medidaId?.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label>
                    Preço (R$)
                    <CampoObrigatorio />
                  </Label>
                  <Input placeholder="0,00" {...register(`produtosNovos.${index}.preco`)} />
                  {errors.produtosNovos?.[index]?.preco && (
                    <p className="text-sm text-destructive">
                      {errors.produtosNovos[index]?.preco?.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Custo (R$)</Label>
                  <Input placeholder="0,00" {...register(`produtosNovos.${index}.custo`)} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Itens que serão importados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analise.itens.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.cliente}</TableCell>
                  <TableCell>{item.produto}</TableCell>
                  <TableCell className="text-right">{item.quantidade}</TableCell>
                  <TableCell className="text-muted-foreground">{item.observacao || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {erroConfirmacao && <p className="text-sm text-destructive">{erroConfirmacao}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => setAnalise(null)}>
          <ArrowLeft />
          Voltar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Importando..." : "Confirmar e criar pedidos"}
        </Button>
      </div>
    </form>
  );
}
