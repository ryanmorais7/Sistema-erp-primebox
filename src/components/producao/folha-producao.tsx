"use client";

import { useState } from "react";
import { Box } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const linhaSelecionada = linhas.find((linha) => linha.id === selecionadoId) ?? null;

  // Sem seleção: se todas as linhas pendentes tiverem a mesma data
  // programada, usa ela; senão cai pro "Impresso em hoje" (comportamento
  // antigo). Com uma linha selecionada, a data mostrada é sempre a dela
  // — clicar numa OP do dia 19 já troca o cabeçalho pra 19, sem precisar
  // que todo o resto da folha compartilhe a mesma data.
  const datasDistintas = new Set(linhas.map((linha) => linha.dataProgramadaIso).filter(Boolean));
  const dataProgramadaGeral = datasDistintas.size === 1 ? [...datasDistintas][0] : null;
  const dataProgramadaExibida = linhaSelecionada
    ? linhaSelecionada.dataProgramadaIso
    : dataProgramadaGeral;

  function selecionar(id: string) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

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
              <p className="mb-2 text-xs text-muted-foreground print:hidden">
                Clique numa linha pra imprimir só ela (clique de novo pra voltar a imprimir todas).
              </p>
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
                  const estaSelecionada = linha.id === selecionadoId;
                  const escondidaNaImpressao = selecionadoId != null && !estaSelecionada;
                  return (
                    <TableRow
                      key={linha.id}
                      onClick={() => selecionar(linha.id)}
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
          <p className="text-2xl font-bold">
            {linhaSelecionada ? linhaSelecionada.quantidade : totalPecas}
          </p>
          <p className="text-sm text-muted-foreground">
            {linhaSelecionada ? "Peças nesta OP" : "Total de peças nesta OP"}
          </p>
        </div>
      )}
    </div>
  );
}
