import Link from "next/link";
import { List, Plus, ArrowRight, Folder, Printer, Upload, TriangleAlert } from "lucide-react";
import { buscarCartoesProducao } from "@/lib/producaoCartoes";
import { listarInsumosAbaixoDoMinimo } from "@/lib/estoque";
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

  const [cartoes, insumosAbaixoDoMinimo] = await Promise.all([
    buscarCartoesProducao(),
    listarInsumosAbaixoDoMinimo(),
  ]);

  // Card "Hoje"
  const cartoesHoje = cartoes.filter((cartao) => cartao.diaChave === hojeChave);
  const clientesHoje = new Set(cartoesHoje.map((cartao) => cartao.clienteLabel)).size;
  const pecasHoje = cartoesHoje.reduce((total, cartao) => total + cartao.quantidade, 0);

  // Os 12 meses do ano corrente.
  const resumoPorMesJanela = new Map<string, { pecas: number; ops: Set<string> }>();
  for (const cartao of cartoes) {
    const [anoCartao, mesCartao] = cartao.diaChave.split("-").map(Number);
    if (anoCartao !== anoHoje) continue;
    const chave = `${anoCartao}-${mesCartao}`;
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
              <Button render={<Link href="/producao/importar" />} nativeButton={false} variant="outline">
                <Upload />
                Importar planilha
              </Button>
              <Button render={<Link href="/producao/imprimir" />} nativeButton={false}>
                <Printer />
                Imprimir
              </Button>
            </div>
          }
        />

        {/* Indicador fixo — sem botão de fechar, some sozinho quando o
            insumo voltar pra cima do mínimo cadastrado em Estoque. */}
        {insumosAbaixoDoMinimo.length > 0 && (
          <Link
            href="/estoque"
            className="flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:brightness-95"
            style={{ backgroundColor: "#FDF0D2", borderColor: "#F0B429", color: "#8A6A16" }}
          >
            <TriangleAlert className="size-4" />
            {insumosAbaixoDoMinimo.length}{" "}
            {insumosAbaixoDoMinimo.length === 1 ? "insumo" : "insumos"} abaixo do mínimo
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-6 print:hidden">
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
              <p className="font-heading text-lg font-extrabold">Produção · {anoHoje}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {NOMES_MES.map((_, indice) => {
                const mes = indice + 1;
                const ano = anoHoje;
                const resumo = resumoPorMesJanela.get(`${ano}-${mes}`);
                const temOps = !!resumo && resumo.ops.size > 0;
                const ehMesAtual = mes === mesHoje;
                const destaque = ehMesAtual || temOps;
                return (
                  <Link
                    key={`${ano}-${mes}`}
                    href={`/producao/${ano}/${String(mes).padStart(2, "0")}`}
                    className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg p-4 text-center transition-colors hover:brightness-95"
                    style={
                      destaque
                        ? { backgroundColor: "#F4E2D6", border: "2px solid #C9622B" }
                        : {
                            backgroundColor: "#FBF7F0",
                            border: "1px solid #EDE6D8",
                            borderTop: "3px solid #D9CBAE",
                          }
                    }
                  >
                    <Folder
                      className="size-6"
                      style={destaque ? { color: "#C9622B" } : { color: "#8A9187" }}
                      fill={destaque ? "#E89968" : "none"}
                      strokeWidth={1.8}
                    />
                    <p
                      className="text-[13px]"
                      style={
                        destaque
                          ? { fontWeight: 800, color: "#1C2321" }
                          : { fontWeight: 700, color: "#3D4340" }
                      }
                    >
                      {NOMES_MES[mes - 1]}
                    </p>
                    {temOps && (
                      <p className="font-mono text-xs font-semibold" style={{ color: "#C9622B" }}>
                        {resumo!.ops.size} {resumo!.ops.size === 1 ? "OP" : "OPs"}
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
