import Link from "next/link";
import { List, Plus, ChevronLeft, ChevronRight, ArrowRight, CalendarRange } from "lucide-react";
import { buscarCartoesProducao } from "@/lib/producaoCartoes";
import { PageHeader } from "@/components/layout/page-header";
import { ImprimirButton } from "@/components/pedidos/imprimir-button";
import { Button } from "@/components/ui/button";

// Lista ordens de produção ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;

const formatadorChaveDiaBr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
const formatadorDataLonga = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "long",
});

type PageProps = {
  searchParams: Promise<{ ano?: string }>;
};

export default async function ProducaoMesPage({ searchParams }: PageProps) {
  const { ano: anoParam } = await searchParams;

  const hojeChave = formatadorChaveDiaBr.format(new Date());
  const [anoHoje, mesHoje, diaHoje] = hojeChave.split("-").map(Number);
  const ano = anoParam ? Number(anoParam) : anoHoje;

  const cartoes = await buscarCartoesProducao();

  // Alerta: OPs concluídas em qualquer dia, ainda sem expedição gerada —
  // o Pedro só usa esse status (amarelo); não existe conceito de atraso.
  const concluidasSemExpedicao = cartoes.filter(
    (cartao) => cartao.status === "CONCLUIDO" && !cartao.temExpedicao,
  );

  // Card "Hoje"
  const cartoesHoje = cartoes.filter((cartao) => cartao.diaChave === hojeChave);
  const clientesHoje = new Set(cartoesHoje.map((cartao) => cartao.clienteLabel)).size;
  const pecasHoje = cartoesHoje.reduce((total, cartao) => total + cartao.quantidade, 0);

  // Grade de meses do ano selecionado — resumo (peças + OPs) de cada mês.
  const resumoPorMes = new Map<number, { pecas: number; ops: Set<string> }>();
  for (const cartao of cartoes) {
    const [anoCartao, mesCartao] = cartao.diaChave.split("-").map(Number);
    if (anoCartao !== ano) continue;
    const atual = resumoPorMes.get(mesCartao) ?? { pecas: 0, ops: new Set<string>() };
    atual.pecas += cartao.quantidade;
    atual.ops.add(cartao.grupoOpId);
    resumoPorMes.set(mesCartao, atual);
  }

  return (
    <div className="flex flex-col gap-6">
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

      {concluidasSemExpedicao.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-[0_2px_8px_rgba(28,35,33,0.06)]">
          <div className="flex items-center gap-3">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: "#D6A537" }} />
            <p className="text-sm">
              <span className="font-semibold">
                {concluidasSemExpedicao.length} OP{concluidasSemExpedicao.length > 1 ? "s" : ""}
              </span>{" "}
              concluída{concluidasSemExpedicao.length > 1 ? "s" : ""} · esperando você confirmar e
              gerar expedição
            </p>
          </div>
          <Link
            href="/producao/kanban"
            className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline"
          >
            Ver
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}

      <div
        className="flex flex-wrap items-center justify-between gap-4 rounded-lg p-5 text-white"
        style={{ backgroundColor: "#1C2321" }}
      >
        <div>
          <p className="font-mono text-xs tracking-widest text-white/50 uppercase">Hoje</p>
          <p className="font-heading text-lg font-semibold capitalize">
            {formatadorDataLonga.format(new Date())}
          </p>
          <p className="mt-1 text-sm text-white/70">
            {cartoesHoje.length === 0
              ? "Nenhuma OP programada para hoje."
              : `${clientesHoje} cliente${clientesHoje === 1 ? "" : "s"} · ${pecasHoje} peças programadas para hoje`}
          </p>
        </div>
        <Button
          render={<Link href={`/producao/${anoHoje}/${String(mesHoje).padStart(2, "0")}/${String(diaHoje).padStart(2, "0")}`} />}
          nativeButton={false}
          className="bg-[#C9622B] text-white hover:bg-[#C9622B]/90"
        >
          Ir para hoje
          <ArrowRight />
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button render={<Link href={`/producao?ano=${ano - 1}`} />} nativeButton={false} variant="outline" size="icon-sm" aria-label="Ano anterior">
            <ChevronLeft />
          </Button>
          <p className="font-heading text-lg font-semibold">{ano}</p>
          <Button render={<Link href={`/producao?ano=${ano + 1}`} />} nativeButton={false} variant="outline" size="icon-sm" aria-label="Próximo ano">
            <ChevronRight />
          </Button>
        </div>
        <Button render={<Link href="/producao/semana" />} nativeButton={false} variant="outline" size="sm">
          <CalendarRange />
          Ver semana
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {NOMES_MES.map((nome, indice) => {
          const numeroMes = indice + 1;
          const resumo = resumoPorMes.get(numeroMes);
          const ehMesAtual = ano === anoHoje && numeroMes === mesHoje;
          return (
            <Link
              key={nome}
              href={`/producao/${ano}/${String(numeroMes).padStart(2, "0")}`}
              className={`flex flex-col gap-1 rounded-lg border p-4 transition-colors hover:border-brand hover:bg-accent/30 ${
                ehMesAtual ? "border-brand" : ""
              }`}
            >
              <p className="font-heading text-sm font-semibold">{nome}</p>
              {resumo ? (
                <p className="text-xs text-muted-foreground">
                  {resumo.ops.size} {resumo.ops.size === 1 ? "OP" : "OPs"} · {resumo.pecas} peças
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhuma OP</p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
