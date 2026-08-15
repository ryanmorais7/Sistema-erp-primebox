import Link from "next/link";
import { ArrowRight, ArrowLeft, X, Plus, List, Receipt, Truck, CalendarClock, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  iniciarProducao,
  concluirProducao,
  cancelarGrupoOrdemProducao,
  voltarOrdemProducao,
  alternarPagamentoPedido,
} from "./actions";
import {
  iniciarProducaoAvulsa,
  concluirProducaoAvulsa,
  cancelarGrupoAvulsa,
  voltarProducaoAvulsa,
  alternarPagamentoAvulsa,
} from "./ordem-avulsa/actions";
import { gerarExpedicaoAvulsa } from "@/app/(app)/expedicao/actions";
import { PageHeader } from "@/components/layout/page-header";
import { ImprimirButton } from "@/components/pedidos/imprimir-button";
import { FolhaProducao, type LinhaFolha } from "@/components/producao/folha-producao";
import { tipoProdutoLabels } from "@/lib/validations/produto";
import type { TipoProduto } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Lista ordens de produção ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

const colunas = [
  { status: "AGUARDANDO", titulo: "Aguardando" },
  { status: "EM_PRODUCAO", titulo: "Em produção" },
  { status: "CONCLUIDO", titulo: "Concluído" },
] as const;

// UTC fixo: dataProgramada é uma coluna @db.Date (só data, sem hora), e
// formatar no fuso local poderia voltar um dia (meia-noite UTC vira dia
// anterior em fusos negativos como o do Brasil).
const formatadorDataProgramada = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

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
  // Id da OP inteira (OrdemAvulsa ou Pedido) — usado pra agrupar vários
  // itens da mesma OP num card só no board (ver ADR-033). Diferente de
  // `grupo` acima, que agrupa por cliente só pra alternar cor na folha.
  grupoOpId: string;
  createdAt: Date;
  temExpedicao: boolean;
  dataProgramada: Date | null;
  // Controle de pagamento — independente do status Em carteira/Faturado
  // do Pedido (que é sobre faturamento, não sobre o dinheiro ter
  // entrado). Existe pros dois lados, ver ADR-033.
  pago: boolean;
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
    grupoOpId: ordem.itemPedido.pedidoId,
    createdAt: ordem.createdAt,
    temExpedicao: false,
    dataProgramada: ordem.dataProgramada,
    pago: ordem.itemPedido.pago,
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
    grupoOpId: item.ordemAvulsaId,
    createdAt: item.createdAt,
    temExpedicao: !!item.expedicao,
    dataProgramada: item.dataProgramada,
    pago: item.pago,
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

  // Poucas linhas: fonte grande, dá pra ler de longe no chão de fábrica.
  // Muitas linhas: reduz proporcionalmente pra caber numa página só.
  const fonteFolha =
    linhas.length <= 4 ? "text-xl" : linhas.length <= 7 ? "text-base" : linhas.length <= 10 ? "text-sm" : "text-xs";

  const linhasFolha: LinhaFolha[] = linhas.map(({ cartao, corGrupo }) => ({
    id: `${cartao.origem}-${cartao.id}`,
    quantidade: cartao.quantidade,
    produtoTexto: cartao.produtoTexto,
    clienteLabel: cartao.clienteLabel,
    observacao: cartao.observacao,
    corGrupo,
    dataProgramadaIso: cartao.dataProgramada ? cartao.dataProgramada.toISOString() : null,
  }));

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

      <FolhaProducao linhas={linhasFolha} totalPecas={totalPecas} fonteFolha={fonteFolha} />

      <div className="grid gap-4 lg:grid-cols-3 print:hidden">
        {colunas.map((coluna) => {
          const cartoesDaColuna = todosCartoes.filter((cartao) => cartao.status === coluna.status);

          // Agrupa por OP inteira (OrdemAvulsa/Pedido) — vários itens da
          // mesma OP viram um card só, com uma linha por item dentro,
          // igual o Kanban sempre deveria ter feito (ver ADR-033).
          const gruposMap = new Map<string, Cartao[]>();
          for (const cartao of cartoesDaColuna) {
            const grupo = gruposMap.get(cartao.grupoOpId) ?? [];
            grupo.push(cartao);
            gruposMap.set(cartao.grupoOpId, grupo);
          }
          const grupos = [...gruposMap.values()];

          return (
            <div key={coluna.status} className="rounded-lg border">
              <div className="flex items-center justify-between border-b p-3">
                <p className="font-heading text-sm font-semibold">{coluna.titulo}</p>
                <Badge variant="secondary">{cartoesDaColuna.length}</Badge>
              </div>
              <div className="flex flex-col gap-3 p-3">
                {grupos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma ordem aqui.</p>
                ) : (
                  grupos.map((itensDoGrupo) => {
                    const primeiro = itensDoGrupo[0];
                    const totalPecasGrupo = itensDoGrupo.reduce(
                      (total, cartao) => total + cartao.quantidade,
                      0,
                    );
                    const clientesDistintos = [
                      ...new Set(itensDoGrupo.map((cartao) => cartao.clienteLabel)),
                    ];
                    const multiplosClientes = clientesDistintos.length > 1;
                    const clienteLabelGrupo = multiplosClientes
                      ? clientesDistintos.join(" · ")
                      : clientesDistintos[0];
                    const clienteHrefGrupo = multiplosClientes ? null : primeiro.clienteHref;
                    const idsDoGrupo = itensDoGrupo.map((cartao) => cartao.id);

                    return (
                      <div key={primeiro.grupoOpId} className="rounded-lg border p-3">
                        <div className="flex items-center gap-1.5">
                          <p className="font-mono text-xs text-muted-foreground">
                            {primeiro.numeroLabel}
                          </p>
                          {primeiro.origem === "avulsa" && (
                            <Badge variant="secondary" className="h-4 px-1.5 text-[0.6rem]">
                              avulsa
                            </Badge>
                          )}
                        </div>
                        {clienteHrefGrupo ? (
                          <Link href={clienteHrefGrupo} className="font-medium hover:underline">
                            {clienteLabelGrupo}
                          </Link>
                        ) : (
                          <p className="font-medium">{clienteLabelGrupo}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {itensDoGrupo.length} {itensDoGrupo.length === 1 ? "item" : "itens"} ·{" "}
                          {totalPecasGrupo} peças
                        </p>

                        <div className="mt-2 flex flex-col gap-2">
                          {itensDoGrupo.map((cartao) => (
                            <div
                              key={`${cartao.origem}-${cartao.id}`}
                              className="rounded-md bg-muted/40 p-2"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                                <p className="text-sm">
                                  {cartao.quantidade}x {cartao.produtoTexto}
                                  {multiplosClientes && (
                                    <span className="text-muted-foreground">
                                      {" "}
                                      · {cartao.clienteLabel}
                                    </span>
                                  )}
                                </p>
                                {cartao.dataProgramada && (
                                  <Badge
                                    variant="outline"
                                    className="h-4 gap-1 border-brand/40 px-1.5 text-[0.6rem] text-brand"
                                  >
                                    <CalendarClock className="size-2.5" />
                                    {formatadorDataProgramada.format(cartao.dataProgramada)}
                                  </Badge>
                                )}
                              </div>

                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                <form
                                  action={async () => {
                                    "use server";
                                    if (cartao.origem === "formal") {
                                      await alternarPagamentoPedido(cartao.id, !cartao.pago);
                                    } else {
                                      await alternarPagamentoAvulsa(cartao.id, !cartao.pago);
                                    }
                                  }}
                                >
                                  <Button
                                    type="submit"
                                    size="xs"
                                    className={
                                      cartao.pago
                                        ? "bg-positive-soft text-positive hover:bg-positive-soft/80"
                                        : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                                    }
                                  >
                                    {cartao.pago ? "Pago" : "Pendente"}
                                  </Button>
                                </form>

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
                                    <Button type="submit" variant="outline" size="xs">
                                      Iniciar produção
                                      <ArrowRight />
                                    </Button>
                                  </form>
                                )}

                                {(coluna.status === "EM_PRODUCAO" || coluna.status === "CONCLUIDO") &&
                                  !(cartao.origem === "avulsa" && cartao.temExpedicao) && (
                                    <form
                                      action={async () => {
                                        "use server";
                                        if (cartao.origem === "formal") {
                                          await voltarOrdemProducao(cartao.id);
                                        } else {
                                          await voltarProducaoAvulsa(cartao.id);
                                        }
                                      }}
                                    >
                                      <Button type="submit" variant="outline" size="xs">
                                        <ArrowLeft />
                                        Voltar
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
                                    <Button type="submit" variant="outline" size="xs">
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
                                        size="xs"
                                        className="bg-[#C9622B] text-white hover:bg-[#C9622B]/90"
                                      >
                                        <Truck />
                                        Gerar expedição
                                      </Button>
                                    </form>
                                  )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                          <Button
                            render={
                              <Link
                                href={
                                  primeiro.origem === "formal"
                                    ? `/producao/recibo/formal-grupo/${primeiro.grupoOpId}`
                                    : `/producao/recibo/avulsa-grupo/${primeiro.grupoOpId}`
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
                            <Button
                              render={
                                <Link
                                  href={
                                    primeiro.origem === "formal"
                                      ? `/producao/formal/grupo/${primeiro.grupoOpId}/editar`
                                      : `/producao/avulsa/grupo/${primeiro.grupoOpId}/editar`
                                  }
                                />
                              }
                              nativeButton={false}
                              variant="outline"
                              size="sm"
                            >
                              <Pencil />
                              Editar
                            </Button>
                          )}

                          <form
                            action={async () => {
                              "use server";
                              if (primeiro.origem === "formal") {
                                await cancelarGrupoOrdemProducao(idsDoGrupo);
                              } else {
                                await cancelarGrupoAvulsa(idsDoGrupo);
                              }
                            }}
                          >
                            <Button type="submit" variant="destructive" size="sm">
                              <X />
                              {coluna.status === "CONCLUIDO" ? "Cancelar OP (estorna estoque)" : "Cancelar OP"}
                            </Button>
                          </form>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
