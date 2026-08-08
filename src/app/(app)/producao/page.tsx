import Link from "next/link";
import { ArrowRight, Box } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { iniciarProducao, concluirProducao } from "./actions";
import { PageHeader } from "@/components/layout/page-header";
import { ImprimirButton } from "@/components/pedidos/imprimir-button";
import { tipoProdutoLabels } from "@/lib/validations/produto";
import type { TipoProduto } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Lista ordens de produção ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

const colunas = [
  { status: "AGUARDANDO", titulo: "Aguardando" },
  { status: "EM_PRODUCAO", titulo: "Em produção" },
  { status: "CONCLUIDO", titulo: "Concluído" },
] as const;

const formatadorData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });

function textoProduto(item: {
  nome: string;
  tipo: TipoProduto;
  tecido: string | null;
  cor: string | null;
  medida: { nome: string };
}) {
  const base =
    item.tipo === "BASE"
      ? `${tipoProdutoLabels[item.tipo]} ${item.nome}`
      : `${item.medida.nome} ${item.nome}`;
  const tecidoCor = [item.tecido, item.cor].filter(Boolean).join(" ");
  return tecidoCor ? `${base} · ${tecidoCor}` : base;
}

export default async function ProducaoPage() {
  const ordens = await prisma.ordemProducao.findMany({
    include: { itemPedido: { include: { produto: { include: { medida: true } }, pedido: { include: { cliente: true } } } } },
    orderBy: { numero: "asc" },
  });

  // "ordens" já vem ordenado por numero asc, então o primeiro encontro de
  // cada cliente aqui é a OP mais antiga dele — usado pra ordenar os
  // grupos por ordem de chegada (FIFO), não alfabeticamente.
  const pendentesBrutas = ordens.filter((ordem) => ordem.status !== "CONCLUIDO");
  const primeiraOrdemPorCliente = new Map<string, number>();
  for (const ordem of pendentesBrutas) {
    const clienteId = ordem.itemPedido.pedido.clienteId;
    if (!primeiraOrdemPorCliente.has(clienteId)) {
      primeiraOrdemPorCliente.set(clienteId, ordem.numero);
    }
  }

  const pendentes = [...pendentesBrutas].sort((a, b) => {
    const primeiraA = primeiraOrdemPorCliente.get(a.itemPedido.pedido.clienteId)!;
    const primeiraB = primeiraOrdemPorCliente.get(b.itemPedido.pedido.clienteId)!;
    return primeiraA - primeiraB || a.numero - b.numero;
  });

  const linhas: { ordem: (typeof pendentes)[number]; corGrupo: "peach" | "teal" }[] = [];
  let clienteAnterior: string | null = null;
  let indiceGrupo = -1;
  for (const ordem of pendentes) {
    const clienteId = ordem.itemPedido.pedido.clienteId;
    if (clienteId !== clienteAnterior) {
      indiceGrupo++;
      clienteAnterior = clienteId;
    }
    linhas.push({ ordem, corGrupo: indiceGrupo % 2 === 0 ? "peach" : "teal" });
  }

  const totalPecas = pendentes.reduce((total, ordem) => total + ordem.itemPedido.quantidade, 0);

  const corGrupoClasses: Record<string, string> = {
    peach: "bg-accent/40",
    teal: "bg-positive-soft/60",
  };

  return (
    <div className="flex flex-col gap-6 print:gap-4">
      <div className="print:hidden">
        <PageHeader title="Produção" action={<ImprimirButton />} />
      </div>

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
            <p className="font-mono text-sm font-semibold">OP {formatadorData.format(new Date())}</p>
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
            <Table>
              <TableHeader>
                <TableRow className="bg-foreground hover:bg-foreground print:bg-foreground">
                  <TableHead className="text-background">Quant.</TableHead>
                  <TableHead className="text-background">Produto</TableHead>
                  <TableHead className="text-background">Cliente</TableHead>
                  <TableHead className="text-background">Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map(({ ordem, corGrupo }) => (
                  <TableRow key={ordem.id} className={corGrupoClasses[corGrupo]}>
                    <TableCell className="font-mono font-semibold">
                      {ordem.itemPedido.quantidade}
                    </TableCell>
                    <TableCell className="font-medium">
                      {textoProduto(ordem.itemPedido.produto)}
                    </TableCell>
                    <TableCell className="text-muted-foreground italic">
                      {ordem.itemPedido.pedido.cliente.nomeFantasia ||
                        ordem.itemPedido.pedido.cliente.razaoSocial}
                    </TableCell>
                    <TableCell className="text-brand">
                      {ordem.itemPedido.pedido.observacoes || ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {linhas.length > 0 && (
          <div className="mt-4 flex items-center gap-3 border-t pt-4">
            <p className="text-2xl font-bold">{totalPecas}</p>
            <p className="text-sm text-muted-foreground">Total de peças nesta OP</p>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3 print:hidden">
        {colunas.map((coluna) => {
          const ordensDaColuna = ordens.filter((ordem) => ordem.status === coluna.status);
          return (
            <div key={coluna.status} className="rounded-lg border">
              <div className="flex items-center justify-between border-b p-3">
                <p className="font-heading text-sm font-semibold">{coluna.titulo}</p>
                <Badge variant="secondary">{ordensDaColuna.length}</Badge>
              </div>
              <div className="flex flex-col gap-3 p-3">
                {ordensDaColuna.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma ordem aqui.</p>
                ) : (
                  ordensDaColuna.map((ordem) => (
                    <div key={ordem.id} className="rounded-lg border p-3">
                      <p className="font-mono text-xs text-muted-foreground">OP #{ordem.numero}</p>
                      <Link
                        href={`/pedidos/${ordem.itemPedido.pedido.id}`}
                        className="font-medium hover:underline"
                      >
                        {ordem.itemPedido.pedido.cliente.nomeFantasia ||
                          ordem.itemPedido.pedido.cliente.razaoSocial}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {ordem.itemPedido.quantidade}x {ordem.itemPedido.produto.nome}
                      </p>

                      {coluna.status === "AGUARDANDO" && (
                        <form
                          action={async () => {
                            "use server";
                            await iniciarProducao(ordem.id);
                          }}
                          className="mt-3"
                        >
                          <Button type="submit" variant="outline" size="sm">
                            Iniciar produção
                            <ArrowRight />
                          </Button>
                        </form>
                      )}

                      {coluna.status === "EM_PRODUCAO" && (
                        <form
                          action={async () => {
                            "use server";
                            await concluirProducao(ordem.id);
                          }}
                          className="mt-3"
                        >
                          <Button type="submit" variant="outline" size="sm">
                            Concluir
                            <ArrowRight />
                          </Button>
                        </form>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
