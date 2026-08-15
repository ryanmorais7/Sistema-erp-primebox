import Link from "next/link";
import { ArrowRight, ArrowLeft, X, Plus, List, Receipt, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  iniciarProducao,
  concluirProducao,
  cancelarOrdemProducao,
  voltarOrdemProducao,
} from "./actions";
import {
  iniciarProducaoAvulsa,
  concluirProducaoAvulsa,
  cancelarItemOrdemAvulsa,
  voltarProducaoAvulsa,
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
                              <Button type="submit" variant="outline" size="sm">
                                <ArrowLeft />
                                Voltar
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
