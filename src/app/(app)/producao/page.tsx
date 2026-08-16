import Link from "next/link";
import { List, Plus, ArrowRight, Folder, Printer } from "lucide-react";
import { buscarCartoesProducao } from "@/lib/producaoCartoes";
import { PageHeader } from "@/components/layout/page-header";
import { NavegacaoPassos } from "@/components/producao/navegacao-passos";
import { AgendaSemanalCard } from "@/components/producao/agenda-semanal-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
  searchParams: Promise<{ semanaInicio?: string }>;
};

export default async function ProducaoMesPage({ searchParams }: PageProps) {
  const { semanaInicio } = await searchParams;

  const hojeChave = formatadorChaveDiaBr.format(new Date());
  const [anoHoje, mesHoje, diaHoje] = hojeChave.split("-").map(Number);

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

  // Janela de meses pra escolher (mês atual + os 2 anteriores + o
  // seguinte) — não é mais grade do ano inteiro com navegação de ano.
  const janelaMeses = [-2, -1, 0, 1].map((offset) => {
    let mes = mesHoje + offset;
    let ano = anoHoje;
    while (mes < 1) {
      mes += 12;
      ano -= 1;
    }
    while (mes > 12) {
      mes -= 12;
      ano += 1;
    }
    return { mes, ano };
  });
  const resumoPorMesJanela = new Map<string, { pecas: number; ops: Set<string> }>();
  for (const cartao of cartoes) {
    const [anoCartao, mesCartao] = cartao.diaChave.split("-").map(Number);
    const chave = `${anoCartao}-${mesCartao}`;
    const naJanela = janelaMeses.some((m) => m.ano === anoCartao && m.mes === mesCartao);
    if (!naJanela) continue;
    const atual = resumoPorMesJanela.get(chave) ?? { pecas: 0, ops: new Set<string>() };
    atual.pecas += cartao.quantidade;
    atual.ops.add(cartao.grupoOpId);
    resumoPorMesJanela.set(chave, atual);
  }

  return (
    <div className="flex flex-col gap-6 print:gap-4">
      <div className="flex flex-col gap-6 print:hidden">
        <NavegacaoPassos
          atual={1}
          passos={[
            { numero: 1, label: "Mês" },
            { numero: 2, label: "Dia" },
            { numero: 3, label: "OP do dia" },
          ]}
        />

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
              <Button render={<Link href="/producao/imprimir" />} nativeButton={false}>
                <Printer />
                Imprimir
              </Button>
            </div>
          }
        />
      </div>

      <div className="flex flex-col gap-6 print:hidden">
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
            <a
              href="#semana"
              className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline"
            >
              Ver
              <ArrowRight className="size-3.5" />
            </a>
          </div>
        )}

        <div
          className="flex flex-wrap items-center justify-between gap-4 rounded-lg p-5 text-white"
          style={{ backgroundColor: "#1C2321" }}
        >
          <div>
            <p className="font-heading text-lg font-semibold">
              Hoje · {formatadorDataLonga.format(new Date())}
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

        <Card>
          <CardContent className="flex flex-col gap-3">
            <div>
              <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                Passo 1 · Escolher o mês
              </p>
              <p className="font-heading text-lg font-semibold">Produção · {anoHoje}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {janelaMeses.map(({ mes, ano }) => {
                const resumo = resumoPorMesJanela.get(`${ano}-${mes}`);
                const ehMesAtual = ano === anoHoje && mes === mesHoje;
                return (
                  <Link
                    key={`${ano}-${mes}`}
                    href={`/producao/${ano}/${String(mes).padStart(2, "0")}`}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors ${
                      ehMesAtual
                        ? "border-brand bg-[#C9622B]/10"
                        : "text-muted-foreground hover:border-brand hover:bg-accent/30"
                    }`}
                  >
                    <Folder
                      className={ehMesAtual ? "size-6 text-brand" : "size-6 text-muted-foreground/50"}
                      fill={ehMesAtual ? "currentColor" : "none"}
                      strokeWidth={ehMesAtual ? 0 : 1.5}
                    />
                    <p className={`text-sm font-medium ${ehMesAtual ? "text-foreground" : ""}`}>
                      {NOMES_MES[mes - 1]}
                    </p>
                    {resumo && resumo.ops.size > 0 && (
                      <p className="text-xs text-brand">
                        {resumo.ops.size} {resumo.ops.size === 1 ? "OP" : "OPs"}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div id="semana" className="scroll-mt-4">
          <AgendaSemanalCard cartoes={cartoes} hrefBase="/producao" semanaInicioParam={semanaInicio} />
        </div>
      </div>
    </div>
  );
}
