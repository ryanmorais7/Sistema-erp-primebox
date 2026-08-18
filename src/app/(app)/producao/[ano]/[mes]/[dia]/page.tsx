import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, X, Receipt, CheckCircle2, Box, Plus } from "lucide-react";
import { cancelarGrupoOrdemProducao, desconfirmarConclusaoGrupo } from "../../../actions";
import {
  cancelarGrupoAvulsa,
  desconfirmarConclusaoGrupoAvulsa,
} from "../../../ordem-avulsa/actions";
import { buscarCartoesProducao, coresAlternadasPorCliente, type Cartao } from "@/lib/producaoCartoes";
import { NavegacaoPassos } from "@/components/producao/navegacao-passos";
import { AgendaSemanalCard } from "@/components/producao/agenda-semanal-card";
import { ConfirmarConclusaoButton } from "@/components/producao/confirmar-conclusao-button";
import { ImprimirButton } from "@/components/pedidos/imprimir-button";
import { Button } from "@/components/ui/button";

// Lista ordens de produção ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type PageProps = {
  params: Promise<{ ano: string; mes: string; dia: string }>;
  searchParams: Promise<{ semanaInicio?: string }>;
};

type Grupo = {
  grupoOpId: string;
  primeiro: Cartao;
  itens: Cartao[];
  totalPecas: number;
  totalPreco: number;
  concluidaConfirmada: boolean;
  algumAguardando: boolean;
};

export default async function ProducaoOpDoDiaPage({ params, searchParams }: PageProps) {
  const { ano, mes, dia } = await params;
  const { semanaInicio } = await searchParams;
  const numeroMes = Number(mes);
  const numeroDia = Number(dia);
  if (!numeroMes || numeroMes < 1 || numeroMes > 12 || !numeroDia) {
    notFound();
  }
  const diaChave = `${ano}-${mes}-${dia}`;

  const todosCartoes = await buscarCartoesProducao();
  // Agrupado por cliente (mesma correção da folha de impressão geral,
  // ver /producao/imprimir) — sem isso, a folha impressa (Versão B)
  // intercala clientes na ordem de criação, com só a cor alternada
  // tentando separar visualmente. Efeito colateral bom: os cards da
  // Versão A (interativa) também passam a aparecer agrupados por
  // cliente, em vez da ordem de criação.
  const cartoesDoDia = todosCartoes
    .filter((cartao) => cartao.diaChave === diaChave)
    .sort(
      (a, b) =>
        a.clienteLabel.localeCompare(b.clienteLabel) || a.createdAt.getTime() - b.createdAt.getTime(),
    );

  const gruposMap = new Map<string, Cartao[]>();
  for (const cartao of cartoesDoDia) {
    const grupo = gruposMap.get(cartao.grupoOpId) ?? [];
    grupo.push(cartao);
    gruposMap.set(cartao.grupoOpId, grupo);
  }

  const grupos: Grupo[] = [...gruposMap.values()].map((itens) => ({
    grupoOpId: itens[0].grupoOpId,
    primeiro: itens[0],
    itens,
    totalPecas: itens.reduce((total, cartao) => total + cartao.quantidade, 0),
    totalPreco: itens.reduce(
      (total, cartao) => total + (cartao.precoUnitario ?? 0) * cartao.quantidade,
      0,
    ),
    concluidaConfirmada: itens[0].concluidaConfirmada,
    algumAguardando: itens.some((cartao) => cartao.status === "AGUARDANDO"),
  }));

  const totalPecasDoDia = cartoesDoDia.reduce((total, cartao) => total + cartao.quantidade, 0);
  const coresDoDia = coresAlternadasPorCliente(cartoesDoDia);

  const dataFormatada = `${dia}/${mes}`;

  return (
    <div className="flex flex-col gap-6 print:gap-4">
      <div className="flex flex-col gap-4 print:hidden">
        <NavegacaoPassos
          atual={3}
          passos={[
            { numero: 1, label: "Mês", href: "/producao" },
            { numero: 2, label: "Dia", href: `/producao/${ano}/${mes}` },
            { numero: 3, label: "OP do dia" },
          ]}
        />
        <div className="flex items-center justify-between">
          <Link
            href={`/producao/${ano}/${mes}`}
            className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            <ArrowLeft className="size-4" />
            Voltar pros dias
          </Link>
          <ImprimirButton />
        </div>
      </div>

      {/* Cabeçalho de marca — igual na tela e na impressão. */}
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
          <div className="text-right">
            <p className="font-heading text-lg font-semibold">OP do dia {dataFormatada}</p>
            <p className="font-mono text-[0.65rem] tracking-widest text-muted-foreground uppercase">
              Uso interno · Fábrica
            </p>
          </div>
        </div>

        {grupos.length === 0 ? (
          <div className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm text-muted-foreground print:hidden">
              Nenhuma OP programada para este dia.
            </p>
            <p className="hidden text-sm text-muted-foreground print:block">
              Nenhuma peça programada nesse dia.
            </p>
            <Button
              render={<Link href={`/producao/nova?data=${ano}-${mes}-${dia}`} />}
              nativeButton={false}
              className="bg-[#C9622B] text-white hover:bg-[#C9622B]/90 print:hidden"
            >
              <Plus />
              Criar OP para este dia
            </Button>
          </div>
        ) : (
          <>
            {/* Versão A — interativa, com Recibo/Editar/Cancelar por OP. Nunca aparece impressa. */}
            <div className="mt-4 flex flex-col gap-4 print:hidden">
              {grupos.map((grupo) => {
                const coresDoGrupo = coresAlternadasPorCliente(grupo.itens);
                return (
                  <div
                    key={grupo.grupoOpId}
                    className="rounded-lg border p-4"
                    style={
                      grupo.concluidaConfirmada
                        ? { backgroundColor: "#FDF0D2", borderColor: "#F0B429" }
                        : undefined
                    }
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">
                        {grupo.primeiro.numeroLabel} · {grupo.itens.length}{" "}
                        {grupo.itens.length === 1 ? "item" : "itens"} · {grupo.totalPecas} peças
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {grupo.concluidaConfirmada && (
                          <form
                            action={async () => {
                              "use server";
                              if (grupo.primeiro.origem === "formal") {
                                await desconfirmarConclusaoGrupo(grupo.grupoOpId);
                              } else {
                                await desconfirmarConclusaoGrupoAvulsa(grupo.grupoOpId);
                              }
                            }}
                          >
                            <button
                              type="submit"
                              aria-label="Desmarcar como concluída"
                              title="Clique pra desmarcar como concluída"
                              className="flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium hover:brightness-95"
                              style={{ backgroundColor: "#FDF0D2", borderColor: "#F0B429", color: "#8A6A16" }}
                            >
                              <CheckCircle2 className="size-3.5" />
                              Concluída
                            </button>
                          </form>
                        )}
                        {!grupo.concluidaConfirmada && (
                          <ConfirmarConclusaoButton
                            grupoOpId={grupo.grupoOpId}
                            origem={grupo.primeiro.origem}
                          />
                        )}
                        <Button
                          render={
                            <Link
                              href={
                                grupo.primeiro.origem === "formal"
                                  ? `/producao/recibo/formal-grupo/${grupo.grupoOpId}`
                                  : `/producao/recibo/avulsa-grupo/${grupo.grupoOpId}`
                              }
                              target="_blank"
                            />
                          }
                          nativeButton={false}
                          variant="outline"
                          size="sm"
                        >
                          <Receipt />
                          Recibo
                        </Button>
                        {grupo.algumAguardando && (
                          <Button
                            render={
                              <Link
                                href={
                                  grupo.primeiro.origem === "formal"
                                    ? `/producao/formal/grupo/${grupo.grupoOpId}/editar`
                                    : `/producao/avulsa/grupo/${grupo.grupoOpId}/editar`
                                }
                              />
                            }
                            nativeButton={false}
                            variant="outline"
                            size="sm"
                          >
                            Editar
                          </Button>
                        )}
                        <form
                          action={async () => {
                            "use server";
                            const ids = grupo.itens.map((cartao) => cartao.id);
                            if (grupo.primeiro.origem === "formal") {
                              await cancelarGrupoOrdemProducao(ids);
                            } else {
                              await cancelarGrupoAvulsa(ids);
                            }
                          }}
                        >
                          <Button type="submit" variant="destructive" size="sm">
                            <X />
                            Cancelar OP
                          </Button>
                        </form>
                      </div>
                    </div>

                    <div className="mt-3 overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                            <th className="p-2 text-left font-medium">Qtd.</th>
                            <th className="p-2 text-left font-medium">Produto</th>
                            <th className="p-2 text-left font-medium">Cliente</th>
                            <th className="p-2 text-left font-medium">Observação</th>
                            <th className="p-2 text-right font-medium">Preço unit.</th>
                            <th className="p-2 text-right font-medium">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grupo.itens.map((cartao) => {
                            const chaveCartao = `${cartao.origem}-${cartao.id}`;
                            const corLinha = coresDoGrupo.get(chaveCartao);
                            return (
                              <tr
                                key={chaveCartao}
                                className={`border-b last:border-0 ${corLinha === "teal" ? "bg-positive-soft/60" : "bg-accent/40"}`}
                              >
                                <td className="p-2 font-mono font-semibold">{cartao.quantidade}</td>
                                <td className="p-2 font-medium">{cartao.produtoTexto}</td>
                                <td className="p-2 text-muted-foreground italic">{cartao.clienteLabel}</td>
                                <td className="p-2 text-muted-foreground">{cartao.observacao}</td>
                                <td className="p-2 text-right font-mono text-muted-foreground">
                                  {cartao.precoUnitario != null
                                    ? formatadorMoeda.format(cartao.precoUnitario)
                                    : "—"}
                                </td>
                                <td className="p-2 text-right font-mono font-medium">
                                  {cartao.precoUnitario != null
                                    ? formatadorMoeda.format(cartao.precoUnitario * cartao.quantidade)
                                    : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <p className="text-2xl font-bold">{grupo.totalPecas}</p>
                        <p className="text-sm text-muted-foreground">Total de peças nesta OP</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                          Total da OP
                        </p>
                        <p className="font-mono text-xl font-medium">
                          {formatadorMoeda.format(grupo.totalPreco)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Versão B — folha impressa. Lista corrida, sem agrupamento por
                OP e sem Recibo/Expedição/Editar/Cancelar (ver ADR-033). */}
            <div className="hidden print:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-foreground text-background">
                    <th className="p-2 text-left font-medium">Quant.</th>
                    <th className="p-2 text-left font-medium">Produto</th>
                    <th className="p-2 text-left font-medium">Cliente</th>
                    <th className="p-2 text-left font-medium">Observação</th>
                    <th className="p-2 text-center font-medium">Feito</th>
                  </tr>
                </thead>
                <tbody>
                  {cartoesDoDia.map((cartao) => {
                    const chaveCartao = `${cartao.origem}-${cartao.id}`;
                    const corLinha = coresDoDia.get(chaveCartao);
                    return (
                      <tr
                        key={chaveCartao}
                        className={corLinha === "teal" ? "bg-positive-soft/60" : "bg-accent/40"}
                      >
                        <td className="p-2 font-mono font-semibold">{cartao.quantidade}</td>
                        <td className="p-2 font-medium">{cartao.produtoTexto}</td>
                        <td className="p-2 text-muted-foreground">{cartao.clienteLabel}</td>
                        <td className="p-2 text-brand">{cartao.observacao}</td>
                        <td className="p-2 text-center">
                          <div className="mx-auto size-7 rounded-sm border-2 border-foreground/70" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-4 flex items-center gap-3 border-t pt-4">
                <p className="text-2xl font-bold">{totalPecasDoDia}</p>
                <p className="text-sm text-muted-foreground">Total de peças nesse dia</p>
              </div>
            </div>
          </>
        )}
      </div>

      <div id="semana" className="scroll-mt-4 print:hidden">
        <AgendaSemanalCard
          cartoes={todosCartoes}
          hrefBase={`/producao/${ano}/${mes}/${dia}`}
          semanaInicioParam={semanaInicio}
        />
      </div>
    </div>
  );
}
