"use client";

import { useState } from "react";
import { Box } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const formatadorData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
// UTC fixo: dataProgramada é uma coluna @db.Date (só data, sem hora), e
// formatar no fuso local poderia voltar um dia (meia-noite UTC vira dia
// anterior em fusos negativos como o do Brasil).
const formatadorDataProgramada = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

export type LinhaFolha = {
  id: string;
  quantidade: number;
  produtoTexto: string;
  clienteLabel: string;
  observacao: string;
  corGrupo: "peach" | "teal";
  dataProgramadaIso: string | null;
};

type FolhaProducaoProps = {
  linhas: LinhaFolha[];
  totalPecas: number;
  fonteFolha: string;
};

const corGrupoClasses: Record<string, string> = {
  peach: "bg-accent/40",
  teal: "bg-positive-soft/60",
};

export function FolhaProducao({ linhas, totalPecas, fonteFolha }: FolhaProducaoProps) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const linhasSelecionadas = linhas.filter((linha) => selecionados.has(linha.id));
  const temSelecao = selecionados.size > 0;

  // Sem seleção: se todas as linhas pendentes tiverem a mesma data
  // programada, usa ela; senão cai pro "Impresso em hoje" (comportamento
  // antigo). Com seleção, a data mostrada é a das linhas selecionadas —
  // só quando todas compartilham a mesma; misturando datas diferentes
  // na seleção também cai pro "Impresso em hoje".
  function dataComumOuNula(conjunto: LinhaFolha[]): string | null {
    const distintas = new Set(conjunto.map((linha) => linha.dataProgramadaIso).filter(Boolean));
    return distintas.size === 1 ? [...distintas][0]! : null;
  }
  const dataProgramadaExibida = temSelecao
    ? dataComumOuNula(linhasSelecionadas)
    : dataComumOuNula(linhas);

  // Datas distintas presentes na folha (pra oferecer um atalho "selecionar
  // dia X" — sem isso, juntar todas as linhas de um mesmo dia que vieram
  // de OPs/clientes diferentes exigiria clicar linha por linha).
  const datasNaFolha = [
    ...new Set(
      linhas.map((linha) => linha.dataProgramadaIso).filter((v): v is string => v != null),
    ),
  ].sort();

  function alternarLinha(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) {
        novo.delete(id);
      } else {
        novo.add(id);
      }
      return novo;
    });
  }

  function selecionarDia(dataIso: string) {
    const idsDoDia = linhas.filter((linha) => linha.dataProgramadaIso === dataIso).map((linha) => linha.id);
    setSelecionados(new Set(idsDoDia));
  }

  function limparSelecao() {
    setSelecionados(new Set());
  }

  const totalPecasExibido = temSelecao
    ? linhasSelecionadas.reduce((total, linha) => total + linha.quantidade, 0)
    : totalPecas;

  return (
    <div className="rounded-lg border p-6 print:border-none print:p-0">
      <div className="flex items-start justify-between border-b pb-4 print:pb-2">
        <div className="flex items-center gap-2">
          <div
            className="flex size-8 items-center justify-center rounded-lg"
            style={{
              background:
                "linear-gradient(155deg, color-mix(in oklch, var(--brand) 100%, white 22%), var(--brand) 55%, color-mix(in oklch, var(--brand) 100%, black 22%))",
            }}
          >
            <Box className="size-4 text-white" strokeWidth={1.8} />
          </div>
          <p className="font-heading text-lg font-semibold">PrimeBox</p>
        </div>
        <p className="font-heading text-lg font-semibold text-brand">Produção</p>
        <div className="text-right">
          {dataProgramadaExibida ? (
            <p className="font-mono text-sm font-semibold">
              Programado pra {formatadorDataProgramada.format(new Date(dataProgramadaExibida))}
            </p>
          ) : (
            <p className="font-mono text-sm font-semibold print:hidden">
              Impresso em {formatadorData.format(new Date())}
            </p>
          )}
          <p className="font-mono text-[0.65rem] tracking-widest text-muted-foreground uppercase">
            Uso interno · Fábrica
          </p>
        </div>
      </div>

      <div className="mt-6">
        {linhas.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            Nenhuma peça pendente de produção no momento.
          </p>
        ) : (
          <>
            {linhas.length > 1 && (
              <div className="mb-2 flex flex-wrap items-center gap-2 print:hidden">
                <p className="text-xs text-muted-foreground">
                  Clique numa ou mais linhas pra imprimir só elas.
                </p>
                {datasNaFolha.length > 1 &&
                  datasNaFolha.map((dataIso) => (
                    <Button
                      key={dataIso}
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => selecionarDia(dataIso)}
                    >
                      Selecionar dia {formatadorDataProgramada.format(new Date(dataIso))}
                    </Button>
                  ))}
                {temSelecao && (
                  <Button type="button" variant="outline" size="xs" onClick={limparSelecao}>
                    Limpar seleção ({selecionados.size})
                  </Button>
                )}
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow className="bg-foreground hover:bg-foreground print:bg-foreground">
                  <TableHead className="text-background">Quant.</TableHead>
                  <TableHead className="text-background">Produto</TableHead>
                  <TableHead className="text-background">Cliente</TableHead>
                  <TableHead className="text-background">Observação</TableHead>
                  <TableHead className="text-background text-center">Feito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((linha) => {
                  const estaSelecionada = selecionados.has(linha.id);
                  const escondidaNaImpressao = temSelecao && !estaSelecionada;
                  return (
                    <TableRow
                      key={linha.id}
                      onClick={() => alternarLinha(linha.id)}
                      className={cn(
                        corGrupoClasses[linha.corGrupo],
                        "cursor-pointer print:cursor-auto",
                        estaSelecionada && "outline outline-2 -outline-offset-2 outline-brand print:outline-none",
                        escondidaNaImpressao && "print:hidden",
                      )}
                    >
                      <TableCell className={`font-mono font-semibold ${fonteFolha}`}>
                        {linha.quantidade}
                      </TableCell>
                      <TableCell className={`font-medium ${fonteFolha}`}>{linha.produtoTexto}</TableCell>
                      <TableCell className="text-muted-foreground">{linha.clienteLabel}</TableCell>
                      <TableCell className="text-brand">{linha.observacao}</TableCell>
                      <TableCell>
                        <div className="mx-auto size-7 rounded-sm border-2 border-foreground/70" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </div>

      {linhas.length > 0 && (
        <div className="mt-4 flex items-center gap-3 border-t pt-4">
          <p className="text-2xl font-bold">{totalPecasExibido}</p>
          <p className="text-sm text-muted-foreground">
            {temSelecao ? "Peças selecionadas" : "Total de peças nesta OP"}
          </p>
        </div>
      )}
    </div>
  );
}
