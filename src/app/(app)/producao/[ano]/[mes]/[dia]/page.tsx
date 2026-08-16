import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { X, ChevronLeft, Receipt, Truck, Pencil, CheckCircle2, Box, Plus, Square, CheckSquare } from "lucide-react";
import { cancelarGrupoOrdemProducao, marcarItemFeito, desmarcarItemFeito } from "../../../actions";
import {
  cancelarGrupoAvulsa,
  marcarItemFeitoAvulsa,
  desmarcarItemFeitoAvulsa,
} from "../../../ordem-avulsa/actions";
import { gerarExpedicao, gerarExpedicaoAvulsa } from "@/app/(app)/expedicao/actions";
import { buscarCartoesProducao, type Cartao } from "@/lib/producaoCartoes";
import { PageHeader } from "@/components/layout/page-header";
import { NavegacaoPassos } from "@/components/producao/navegacao-passos";
import { ImprimirButton } from "@/components/pedidos/imprimir-button";
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

const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;

type PageProps = {
  params: Promise<{ ano: string; mes: string; dia: string }>;
};

type Grupo = {
  grupoOpId: string;
  primeiro: Cartao;
  itens: Cartao[];
  clienteLabel: string;
  clienteHref: string | null;
  multiplosClientes: boolean;
  totalPecas: number;
  todosConcluidos: boolean;
  algumAguardando: boolean;
};

export default async function ProducaoOpDoDiaPage({ params }: PageProps) {
  const { ano, mes, dia } = await params;
  const numeroMes = Number(mes);
  const numeroDia = Number(dia);
  if (!numeroMes || numeroMes < 1 || numeroMes > 12 || !numeroDia) {
    notFound();
  }
  const diaChave = `${ano}-${mes}-${dia}`;

  const todosCartoes = await buscarCartoesProducao();
  const cartoesDoDia = todosCartoes.filter((cartao) => cartao.diaChave === diaChave);

  const gruposMap = new Map<string, Cartao[]>();
  for (const cartao of cartoesDoDia) {
    const grupo = gruposMap.get(cartao.grupoOpId) ?? [];
    grupo.push(cartao);
    gruposMap.set(cartao.grupoOpId, grupo);
  }

  const grupos: Grupo[] = [...gruposMap.values()].map((itens) => {
    const primeiro = itens[0];
    const clientesDistintos = [...new Set(itens.map((cartao) => cartao.clienteLabel))];
    const multiplosClientes = clientesDistintos.length > 1;
    return {
      grupoOpId: primeiro.grupoOpId,
      primeiro,
      itens,
      clienteLabel: multiplosClientes ? clientesDistintos.join(" · ") : clientesDistintos[0],
      clienteHref: multiplosClientes ? null : primeiro.clienteHref,
      multiplosClientes,
      totalPecas: itens.reduce((total, cartao) => total + cartao.quantidade, 0),
      todosConcluidos: itens.every((cartao) => cartao.status === "CONCLUIDO"),
      algumAguardando: itens.some((cartao) => cartao.status === "AGUARDANDO"),
    };
  });

  const totalPecasDoDia = cartoesDoDia.reduce((total, cartao) => total + cartao.quantidade, 0);

  // Poucas linhas: fonte grande, dá pra ler de longe no chão de fábrica.
  const fonteFolha =
    cartoesDoDia.length <= 4
      ? "text-xl"
      : cartoesDoDia.length <= 7
        ? "text-base"
        : cartoesDoDia.length <= 10
          ? "text-sm"
          : "text-xs";

  const dataFormatada = `${dia}/${mes}`;
  const tituloData = `${Number(dia)} de ${NOMES_MES[numeroMes - 1]} de ${ano}`;

  return (
    <div className="flex flex-col gap-6 print:gap-4">
      {/* Tela interativa — nunca aparece na impressão. */}
      <div className="flex flex-col gap-6 print:hidden">
        <NavegacaoPassos
          atual={3}
          passos={[
            { numero: 1, label: "Mês", href: "/producao" },
            { numero: 2, label: "Dia", href: `/producao/${ano}/${mes}` },
            { numero: 3, label: "OP do dia" },
          ]}
        />
        <PageHeader
          title={`OP do dia · ${tituloData}`}
          action={
            <div className="flex gap-2">
              <Button
                render={<Link href={`/producao/${ano}/${mes}`} />}
                nativeButton={false}
                variant="outline"
              >
                <ChevronLeft />
                Voltar pro mês
              </Button>
              <ImprimirButton />
            </div>
          }
        />

        {grupos.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-6">
            <p className="text-sm text-muted-foreground">Nenhuma OP programada para este dia.</p>
            <Button
              render={<Link href={`/producao/nova?data=${ano}-${mes}-${dia}`} />}
              nativeButton={false}
              className="bg-[#C9622B] text-white hover:bg-[#C9622B]/90"
            >
              <Plus />
              Criar OP para este dia
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {grupos.map((grupo) => (
              <div
                key={grupo.grupoOpId}
                className="rounded-lg border p-4"
                style={grupo.todosConcluidos ? { backgroundColor: "#FBF2D3" } : undefined}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-mono text-xs text-muted-foreground">
                        {grupo.primeiro.numeroLabel}
                      </p>
                      {grupo.primeiro.origem === "avulsa" && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[0.6rem]">
                          avulsa
                        </Badge>
                      )}
                    </div>
                    {grupo.clienteHref ? (
                      <Link href={grupo.clienteHref} className="font-medium hover:underline">
                        {grupo.clienteLabel}
                      </Link>
                    ) : (
                      <p className="font-medium">{grupo.clienteLabel}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {grupo.itens.length} {grupo.itens.length === 1 ? "item" : "itens"} ·{" "}
                      {grupo.totalPecas} peças
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {grupo.todosConcluidos && (
                      <span
                        className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
                        style={{ backgroundColor: "#F7E5B8", color: "#8A6A16" }}
                      >
                        <CheckCircle2 className="size-3.5" />
                        Concluída
                      </span>
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
                      Gerar recibo
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
                        <Pencil />
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
                        <th className="p-2 text-center font-medium">Feito</th>
                        <th className="p-2 text-center font-medium">Recibo</th>
                        <th className="p-2 text-center font-medium">Expedição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.itens.map((cartao) => {
                        // Avulsa com expedição já gerada não pode desmarcar
                        // "Feito" (mesma trava que já existia no botão Voltar).
                        const feitoTravado = cartao.origem === "avulsa" && cartao.temExpedicao;
                        const feito = cartao.status === "CONCLUIDO";
                        return (
                          <tr key={`${cartao.origem}-${cartao.id}`} className="border-b last:border-0">
                            <td className="p-2 font-mono font-semibold">{cartao.quantidade}</td>
                            <td className="p-2 font-medium">{cartao.produtoTexto}</td>
                            <td className="p-2 text-muted-foreground">{cartao.clienteLabel}</td>
                            <td className="p-2 text-muted-foreground">{cartao.observacao}</td>
                            <td className="p-2 text-center">
                              {feito && feitoTravado ? (
                                <CheckSquare className="mx-auto size-4 text-muted-foreground" />
                              ) : (
                                <form
                                  action={async () => {
                                    "use server";
                                    if (cartao.origem === "formal") {
                                      if (feito) await desmarcarItemFeito(cartao.id);
                                      else await marcarItemFeito(cartao.id);
                                    } else {
                                      if (feito) await desmarcarItemFeitoAvulsa(cartao.id);
                                      else await marcarItemFeitoAvulsa(cartao.id);
                                    }
                                  }}
                                >
                                  <button
                                    type="submit"
                                    aria-label={feito ? "Desmarcar como feito" : "Marcar como feito"}
                                    title={feito ? "Desmarcar como feito" : "Marcar como feito"}
                                    className="inline-flex"
                                  >
                                    {feito ? (
                                      <CheckSquare className="size-4 text-brand" />
                                    ) : (
                                      <Square className="size-4 text-muted-foreground" />
                                    )}
                                  </button>
                                </form>
                              )}
                            </td>
                            <td className="p-2 text-center">
                              <Link
                                href={
                                  cartao.origem === "formal"
                                    ? `/producao/recibo/formal/${cartao.id}`
                                    : `/producao/recibo/avulsa/${cartao.id}`
                                }
                                target="_blank"
                                aria-label="Gerar recibo desta linha"
                                title="Gerar recibo desta linha"
                                className="inline-flex"
                              >
                                <Receipt className="size-4 text-brand" />
                              </Link>
                            </td>
                            <td className="p-2 text-center">
                              {cartao.temExpedicao ? (
                                <span className="text-xs text-muted-foreground">Já gerada</span>
                              ) : (
                                <form
                                  action={async () => {
                                    "use server";
                                    if (cartao.origem === "formal") {
                                      await gerarExpedicao(cartao.grupoOpId, "");
                                    } else {
                                      await gerarExpedicaoAvulsa(cartao.id);
                                    }
                                  }}
                                >
                                  <button
                                    type="submit"
                                    aria-label="Gerar expedição desta linha"
                                    title="Gerar expedição desta linha"
                                    className="inline-flex"
                                  >
                                    <Truck className="size-4" style={{ color: "#0F6E56" }} />
                                  </button>
                                </form>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Folha impressa — template separado, só com os campos combinados
          com o Pedro (Quant., Produto, Cliente, Observação, Feito). Nunca
          contém as colunas/ações de cima (ver ADR-033). */}
      <div className="hidden rounded-lg border p-6 print:block print:border-none print:p-0">
        <div className="flex items-start justify-between border-b pb-2">
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
            <p className="font-mono text-sm font-semibold">Programado pra {dataFormatada}</p>
            <p className="font-mono text-[0.65rem] tracking-widest text-muted-foreground uppercase">
              Uso interno · Fábrica
            </p>
          </div>
        </div>

        {cartoesDoDia.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">Nenhuma peça programada nesse dia.</p>
        ) : (
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
              {grupos.map((grupo) => (
                <Fragment key={grupo.grupoOpId}>
                  <TableRow className="bg-foreground/5 print:bg-foreground/5">
                    <TableCell colSpan={5} className="py-1.5 text-xs font-semibold tracking-wide">
                      {grupo.primeiro.numeroLabel} · {grupo.itens.length}{" "}
                      {grupo.itens.length === 1 ? "item" : "itens"} · {grupo.totalPecas} peças
                    </TableCell>
                  </TableRow>
                  {grupo.itens.map((cartao) => (
                    <TableRow key={`${cartao.origem}-${cartao.id}`}>
                      <TableCell className={`font-mono font-semibold ${fonteFolha}`}>
                        {cartao.quantidade}
                      </TableCell>
                      <TableCell className={`font-medium ${fonteFolha}`}>{cartao.produtoTexto}</TableCell>
                      <TableCell className="text-muted-foreground">{cartao.clienteLabel}</TableCell>
                      <TableCell className="text-brand">{cartao.observacao}</TableCell>
                      <TableCell>
                        <div className="mx-auto size-7 rounded-sm border-2 border-foreground/70" />
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}

        {cartoesDoDia.length > 0 && (
          <div className="mt-4 flex items-center gap-3 border-t pt-4">
            <p className="text-2xl font-bold">{totalPecasDoDia}</p>
            <p className="text-sm text-muted-foreground">Total de peças nesse dia</p>
          </div>
        )}
      </div>
    </div>
  );
}
