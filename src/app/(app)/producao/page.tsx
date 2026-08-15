import Link from "next/link";
import { ArrowRight, Box, X, Plus, List, Receipt, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  iniciarProducao,
  concluirProducao,
  cancelarOrdemProducao,
} from "./actions";
import {
  iniciarProducaoAvulsa,
  concluirProducaoAvulsa,
  cancelarItemOrdemAvulsa,
} from "./ordem-avulsa/actions";
import { gerarExpedicaoAvulsa } from "@/app/(app)/expedicao/actions";
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
// UTC fixo: dataProgramada é uma coluna @db.Date (só data, sem hora), e
// formatar no fuso local poderia voltar um dia (meia-noite UTC vira dia
// anterior em fusos negativos como o do Brasil).
const formatadorDataProgramada = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});
function formatarDataProgramada(data: Date) {
  return formatadorDataProgramada.format(data);
}

function textoProduto(item: {
  nome: string;
  tipo: TipoProduto;
  tecido: string | null;
  cor: string | null;
  medida: { nome: string };
}) {
  const prefixo = item.tipo === "BASE" ? tipoProdutoLabels[item.tipo] : item.medida.nome;
  // Planilhas importadas às vezes já trazem o prefixo no nome (ex: "Base
  // queen sat 07") — evita duplicar ("Base Base queen sat 07").
  const nomeJaTemPrefixo = item.nome.toLowerCase().startsWith(prefixo.toLowerCase());
  const base = nomeJaTemPrefixo ? item.nome : `${prefixo} ${item.nome}`;
  const tecidoCor = [item.tecido, item.cor].filter(Boolean).join(" ");
  return tecidoCor ? `${base} · ${tecidoCor}` : base;
}

type Cartao = {
  id: string;
  origem: "formal" | "avulsa";
  numeroLabel: string;
  status: "AGUARDANDO" | "EM_PRODUCAO" | "CONCLUIDO";
  quantidade: number;
  produtoTexto: string;
  clienteLabel: string;
  clienteHref: string | null;
  observacao: string;
  grupo: string;
  createdAt: Date;
  temExpedicao: boolean;
  dataProgramada: Date | null;
}

function normalizar(texto: string) {
  return texto.trim().toLowerCase();
}

export default async function ProducaoPage() {
  const [ordens, itensAvulsos] = await Promise.all([
    prisma.ordemProducao.findMany({
      include: {
        itemPedido: {
          include: { produto: { include: { medida: true } }, pedido: { include: { cliente: true } } },
        },
      },
      orderBy: { numero: "asc" },
    }),
    prisma.itemOrdemAvulsa.findMany({
      include: {
        produto: { include: { medida: true } },
        ordemAvulsa: true,
        cliente: true,
        expedicao: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const cartoesFormais: Cartao[] = ordens.map((ordem) => ({
    id: ordem.id,
    origem: "formal",
    numeroLabel: `OP #${ordem.numero}`,
    status: ordem.status,
    quantidade: ordem.itemPedido.quantidade,
    produtoTexto: textoProduto(ordem.itemPedido.produto),
    clienteLabel:
      ordem.itemPedido.pedido.cliente.nomeFantasia || ordem.itemPedido.pedido.cliente.razaoSocial,
    clienteHref: `/pedidos/${ordem.itemPedido.pedido.id}`,
    observacao: ordem.itemPedido.pedido.observacoes || "",
    grupo: ordem.itemPedido.pedido.clienteId,
    createdAt: ordem.createdAt,
    temExpedicao: false,
    dataProgramada: null,
  }));

  const cartoesAvulsos: Cartao[] = itensAvulsos.map((item) => ({
    id: item.id,
    origem: "avulsa",
    numeroLabel: `OP Avulsa #${item.ordemAvulsa.numero}`,
    status: item.status,
    quantidade: item.quantidade,
    produtoTexto: textoProduto(item.produto),
    clienteLabel: item.clienteTexto,
    clienteHref: item.clienteId ? `/clientes/${item.clienteId}/editar` : null,
    observacao: item.observacao || "",
    grupo: item.clienteId ?? `avulsa:${normalizar(item.clienteTexto)}`,
    createdAt: item.createdAt,
    temExpedicao: !!item.expedicao,
    dataProgramada: item.dataProgramada,
  }));

  const todosCartoes = [...cartoesFormais, ...cartoesAvulsos].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  // Agrupa por cliente (ou pelo texto livre da linha avulsa) e ordena por
  // ordem de chegada (FIFO), pra alternar cor por grupo na folha impressa.
  const pendentesBrutos = todosCartoes.filter((cartao) => cartao.status !== "CONCLUIDO");
  const primeiraOcorrenciaPorGrupo = new Map<string, number>();
  pendentesBrutos.forEach((cartao, index) => {
    if (!primeiraOcorrenciaPorGrupo.has(cartao.grupo)) {
      primeiraOcorrenciaPorGrupo.set(cartao.grupo, index);
    }
  });
  const pendentes = [...pendentesBrutos].sort(
    (a, b) => primeiraOcorrenciaPorGrupo.get(a.grupo)! - primeiraOcorrenciaPorGrupo.get(b.grupo)!,
  );

  const linhas: { cartao: Cartao; corGrupo: "peach" | "teal" }[] = [];
  let grupoAnterior: string | null = null;
  let indiceGrupo = -1;
  for (const cartao of pendentes) {
    if (cartao.grupo !== grupoAnterior) {
      indiceGrupo++;
      grupoAnterior = cartao.grupo;
    }
    linhas.push({ cartao, corGrupo: indiceGrupo % 2 === 0 ? "peach" : "teal" });
  }

  const totalPecas = pendentes.reduce((total, cartao) => total + cartao.quantidade, 0);

  const corGrupoClasses: Record<string, string> = {
    peach: "bg-accent/40",
    teal: "bg-positive-soft/60",
  };

  return (
    <div className="flex flex-col gap-6 print:gap-4">
      <div className="print:hidden">
        <PageHeader
          title="Produção"
          action={
            <div className="flex gap-2">
              <Button render={<Link href="/pedidos" />} nativeButton={false} variant="outline">
                <List />
                Ver fila de pedidos formais
              </Button>
              <Button
                render={<Link href="/producao/nova" />}
                nativeButton={false}
                className="bg-[#C9622B] text-white hover:bg-[#C9622B]/90"
              >
                <Plus />
                Criar OP
              </Button>
              <ImprimirButton />
            </div>
          }
        />
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
                {linhas.map(({ cartao, corGrupo }) => (
                  <TableRow key={`${cartao.origem}-${cartao.id}`} className={corGrupoClasses[corGrupo]}>
                    <TableCell className="font-mono font-semibold">{cartao.quantidade}</TableCell>
                    <TableCell className="font-medium">{cartao.produtoTexto}</TableCell>
                    <TableCell className="text-muted-foreground italic">
                      {cartao.clienteLabel}
                    </TableCell>
                    <TableCell className="text-brand">{cartao.observacao}</TableCell>
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
          const cartoesDaColuna = todosCartoes.filter((cartao) => cartao.status === coluna.status);
          return (
            <div key={coluna.status} className="rounded-lg border">
              <div className="flex items-center justify-between border-b p-3">
                <p className="font-heading text-sm font-semibold">{coluna.titulo}</p>
                <Badge variant="secondary">{cartoesDaColuna.length}</Badge>
              </div>
              <div className="flex flex-col gap-3 p-3">
                {cartoesDaColuna.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma ordem aqui.</p>
                ) : (
                  cartoesDaColuna.map((cartao) => (
                    <div key={`${cartao.origem}-${cartao.id}`} className="rounded-lg border p-3">
                      <div className="flex items-center gap-1.5">
                        <p className="font-mono text-xs text-muted-foreground">
                          {cartao.numeroLabel}
                        </p>
                        {cartao.origem === "avulsa" && (
                          <Badge variant="secondary" className="h-4 px-1.5 text-[0.6rem]">
                            avulsa
                          </Badge>
                        )}
                      </div>
                      {cartao.clienteHref ? (
                        <Link href={cartao.clienteHref} className="font-medium hover:underline">
                          {cartao.clienteLabel}
                        </Link>
                      ) : (
                        <p className="font-medium">{cartao.clienteLabel}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {cartao.quantidade}x {cartao.produtoTexto}
                      </p>
                      {cartao.dataProgramada && (
                        <p className="text-xs font-medium text-brand">
                          Programado pra {formatarDataProgramada(cartao.dataProgramada)}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          render={
                            <Link
                              href={
                                cartao.origem === "formal"
                                  ? `/producao/recibo/formal/${cartao.id}`
                                  : `/producao/recibo/avulsa/${cartao.id}`
                              }
                              target="_blank"
                            />
                          }
                          nativeButton={false}
                          variant="outline"
                          size="sm"
                        >
                          <Receipt />
                          Gerar recibo
                        </Button>

                        {coluna.status === "AGUARDANDO" && (
                          <form
                            action={async () => {
                              "use server";
                              if (cartao.origem === "formal") {
                                await iniciarProducao(cartao.id);
                              } else {
                                await iniciarProducaoAvulsa(cartao.id);
                              }
                            }}
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
                              if (cartao.origem === "formal") {
                                await concluirProducao(cartao.id);
                              } else {
                                await concluirProducaoAvulsa(cartao.id);
                              }
                            }}
                          >
                            <Button type="submit" variant="outline" size="sm">
                              Concluir
                              <ArrowRight />
                            </Button>
                          </form>
                        )}

                        {coluna.status === "CONCLUIDO" &&
                          cartao.origem === "avulsa" &&
                          !cartao.temExpedicao && (
                            <form
                              action={async () => {
                                "use server";
                                await gerarExpedicaoAvulsa(cartao.id);
                              }}
                            >
                              <Button
                                type="submit"
                                size="sm"
                                className="bg-[#C9622B] text-white hover:bg-[#C9622B]/90"
                              >
                                <Truck />
                                Gerar expedição
                              </Button>
                            </form>
                          )}

                        {!(cartao.origem === "avulsa" && cartao.temExpedicao) && (
                          <form
                            action={async () => {
                              "use server";
                              if (cartao.origem === "formal") {
                                await cancelarOrdemProducao(cartao.id);
                              } else {
                                await cancelarItemOrdemAvulsa(cartao.id);
                              }
                            }}
                          >
                            <Button type="submit" variant="destructive" size="sm">
                              <X />
                              {coluna.status === "CONCLUIDO" ? "Cancelar OP (estorna estoque)" : "Cancelar OP"}
                            </Button>
                          </form>
                        )}
                      </div>
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
