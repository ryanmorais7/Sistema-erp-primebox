"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Upload, ArrowLeft, Factory, CircleCheck } from "lucide-react";

import {
  analisarPlanilhaProducao,
  confirmarImportacaoProducao,
} from "@/app/(app)/producao/importar/actions";
import { inferirMedidaId } from "@/lib/planilhaOp";
import {
  confirmarImportacaoProducaoSchema,
  type ConfirmarImportacaoProducaoValues,
} from "@/lib/validations/importarPlanilhaProducao";
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
  TableFooter,
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

type OpCriada = { tipo: "formal" | "avulsa"; numeroLabel: string; clienteNome: string; itens: number };

export function ImportarPlanilhaProducaoForm({ medidas }: { medidas: Medida[] }) {
  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [erroAnalise, setErroAnalise] = useState<string | null>(null);
  const [analise, setAnalise] = useState<AnaliseSucesso | null>(null);
  const [erroConfirmacao, setErroConfirmacao] = useState<string | null>(null);
  const [opsCriadas, setOpsCriadas] = useState<OpCriada[] | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ConfirmarImportacaoProducaoValues>({
    resolver: zodResolver(confirmarImportacaoProducaoSchema),
    defaultValues: { dataProgramada: "", itens: [], clientesNovos: [], produtosNovos: [] },
  });

  const camposClientes = useFieldArray({ control, name: "clientesNovos" });
  const camposProdutos = useFieldArray({ control, name: "produtosNovos" });
  const clientesNovosObservados = watch("clientesNovos");

  async function aoEnviarArquivo(formData: FormData) {
    setAnalisando(true);
    setErroAnalise(null);
    const resultado = await analisarPlanilhaProducao(formData);
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
      dataProgramada: "",
      itens: itens.map((item) => ({
        quantidade: item.quantidade,
        produtoTexto: item.produto,
        clienteTexto: item.cliente,
        observacao: item.observacao,
      })),
      // Não cadastrado por padrão — fica avulso, igual o formulário
      // manual (só formaliza se o Pedro marcar explicitamente).
      clientesNovos: resultado.clientesNovos.map((texto) => ({
        texto,
        cadastrar: false,
        telefone: "",
      })),
      produtosNovos: resultado.produtosNovos.map((texto) => ({
        texto,
        tipo: "BASE" as const,
        medidaId: inferirMedidaId(texto, medidas) ?? medidas[0]?.id ?? "",
        preco: "0",
        custo: "0",
      })),
    });
  }

  async function aoConfirmar(dados: ConfirmarImportacaoProducaoValues) {
    setErroConfirmacao(null);
    const resultado = await confirmarImportacaoProducao(dados);
    if (!resultado.success) {
      setErroConfirmacao(resultado.error);
      return;
    }
    setOpsCriadas(resultado.ops);
  }

  if (opsCriadas) {
    const totalItens = opsCriadas.reduce((total, op) => total + op.itens, 0);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleCheck className="size-5 text-positive" />
            OPs criadas com sucesso
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col gap-1 text-sm">
            {opsCriadas.map((op, index) => (
              <li key={index}>
                <span className="font-medium">{op.numeroLabel}</span> — {op.clienteNome} (
                {op.itens} item(ns)) {op.tipo === "avulsa" && <span className="text-muted-foreground">· avulsa</span>}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">{totalItens} peça(s) programadas ao todo.</p>
          <div className="flex flex-wrap gap-3">
            <Button render={<Link href="/producao" />} nativeButton={false}>
              <Factory />
              Ver Produção
            </Button>
          </div>
        </CardContent>
      </Card>
    );
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
            aba) — mesmo formato das planilhas &quot;OP dd-mm&quot; de sempre. Cada linha vira uma
            linha de Criar OP: se o cliente bater com um cadastro existente vira Pedido formal; senão
            fica avulso. Clientes e produtos que ainda não existem são conferidos na próxima tela
            antes de confirmar.
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

      <Card>
        <CardContent className="flex flex-col gap-2 pt-6 sm:max-w-xs">
          <Label className="text-xs">Data programada (opcional, vale pra tudo que for importado)</Label>
          <Input type="date" {...register("dataProgramada")} />
        </CardContent>
      </Card>

      {camposClientes.fields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Clientes não cadastrados encontrados na planilha</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">
              Deixe desmarcado pra ficar avulso (sem cadastro, do jeito mais rápido). Marque
              &quot;Cadastrar&quot; só se quiser que essa OP vire um Pedido formal de verdade.
            </p>
            {camposClientes.fields.map((campo, index) => (
              <div key={campo.id} className="grid gap-3 border-b pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[1fr_auto_16rem] sm:items-end">
                <div className="flex flex-col gap-2">
                  <Label>Nome (da planilha)</Label>
                  <Input value={campo.texto} disabled />
                </div>
                <label className="flex items-center gap-2 pb-1.5 text-sm">
                  <input type="checkbox" className="size-4" {...register(`clientesNovos.${index}.cadastrar`)} />
                  Cadastrar
                </label>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`cliente-telefone-${index}`}>Telefone (opcional)</Label>
                  <Controller
                    control={control}
                    name={`clientesNovos.${index}.telefone`}
                    render={({ field }) => (
                      <Input
                        id={`cliente-telefone-${index}`}
                        value={field.value}
                        disabled={!clientesNovosObservados?.[index]?.cadastrar}
                        onChange={(e) => field.onChange(mascararTelefone(e.target.value))}
                        onBlur={field.onBlur}
                        placeholder="(00) 00000-0000"
                        inputMode="numeric"
                      />
                    )}
                  />
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
                  <Label>Tipo</Label>
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
                  <Label>Medida</Label>
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
                  <Label>Preço (R$)</Label>
                  <Input placeholder="0,00" {...register(`produtosNovos.${index}.preco`)} />
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
                <TableHead>Observação (opcional)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analise.itens.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.cliente}</TableCell>
                  <TableCell>{item.produto}</TableCell>
                  <TableCell className="text-right">{item.quantidade}</TableCell>
                  <TableCell>
                    <Input
                      placeholder="Sem observação"
                      className="h-7"
                      {...register(`itens.${index}.observacao`)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="font-medium">
                  Total
                </TableCell>
                <TableCell className="text-right font-medium">
                  {analise.itens.reduce((total, item) => total + item.quantidade, 0)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {erroConfirmacao && <p className="text-sm text-destructive">{erroConfirmacao}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => setAnalise(null)}>
          <ArrowLeft />
          Voltar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-[#C9622B] text-white hover:bg-[#C9622B]/90">
          <Factory />
          {isSubmitting ? "Criando..." : "Confirmar e criar OPs"}
        </Button>
      </div>
    </form>
  );
}
