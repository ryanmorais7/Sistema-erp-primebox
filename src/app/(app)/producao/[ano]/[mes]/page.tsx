import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { buscarCartoesProducao } from "@/lib/producaoCartoes";
import { NavegacaoPassos } from "@/components/producao/navegacao-passos";
import { AgendaSemanalCard } from "@/components/producao/agenda-semanal-card";

// Lista ordens de produção ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;

const formatadorChaveDiaBr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

type PageProps = {
  params: Promise<{ ano: string; mes: string }>;
  searchParams: Promise<{ semanaInicio?: string }>;
};

export default async function ProducaoDiasDoMesPage({ params, searchParams }: PageProps) {
  const { ano, mes } = await params;
  const { semanaInicio } = await searchParams;
  const prefixo = `${ano}-${mes}`;
  const numeroMes = Number(mes);
  const hojeChave = formatadorChaveDiaBr.format(new Date());

  const cartoes = await buscarCartoesProducao();
  const cartoesDoMes = cartoes.filter((cartao) => cartao.diaChave.startsWith(prefixo));

  const resumoPorDia = new Map<
    string,
    { pecas: number; clientes: Set<string>; numeros: string[]; grupos: Map<string, boolean> }
  >();
  for (const cartao of cartoesDoMes) {
    const atual = resumoPorDia.get(cartao.diaChave) ?? {
      pecas: 0,
      clientes: new Set<string>(),
      numeros: [],
      grupos: new Map<string, boolean>(),
    };
    atual.pecas += cartao.quantidade;
    atual.clientes.add(cartao.clienteLabel);
    if (!atual.numeros.includes(cartao.numeroLabel)) atual.numeros.push(cartao.numeroLabel);
    atual.grupos.set(cartao.grupoOpId, cartao.concluidaConfirmada);
    resumoPorDia.set(cartao.diaChave, atual);
  }
  const diasComOp = [...resumoPorDia.keys()].sort();

  return (
    <div className="flex flex-col gap-6">
      <NavegacaoPassos
        atual={2}
        passos={[
          { numero: 1, label: "Mês", href: "/producao" },
          { numero: 2, label: "Dia" },
          { numero: 3, label: "OP do dia" },
        ]}
      />

      <div>
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Passo 2 · Dentro de {NOMES_MES[numeroMes - 1]}, escolher o dia
        </p>
        <Link
          href="/producao"
          className="mt-1 flex w-fit items-center gap-1.5 font-heading text-lg font-semibold hover:underline"
        >
          <ArrowLeft className="size-4" />
          {NOMES_MES[numeroMes - 1]} · {ano}
        </Link>
      </div>

      {diasComOp.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma OP programada nesse mês.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {diasComOp.map((diaChave) => {
            const resumo = resumoPorDia.get(diaChave)!;
            const dia = diaChave.slice(-2);
            const ehHoje = diaChave === hojeChave;
            const todasConfirmadas = [...resumo.grupos.values()].every(Boolean);
            return (
              <Link
                key={diaChave}
                href={`/producao/${ano}/${mes}/${dia}`}
                className={`flex items-center justify-between rounded-lg p-4 transition-colors hover:brightness-95 ${
                  todasConfirmadas
                    ? ""
                    : ehHoje
                      ? "border-2 border-brand bg-[#C9622B]/5"
                      : "border hover:border-brand hover:bg-accent/30"
                }`}
                style={todasConfirmadas ? { backgroundColor: "#FDF0D2", border: "1px solid #F0B429" } : undefined}
              >
                <div>
                  {todasConfirmadas && (
                    <p className="mb-0.5 text-xs font-medium" style={{ color: "#8A6A16" }}>
                      ✓ Concluída
                    </p>
                  )}
                  <p className="font-heading text-sm font-semibold">
                    OP do dia {dia}/{mes}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {resumo.clientes.size} {resumo.clientes.size === 1 ? "cliente" : "clientes"} ·{" "}
                    {resumo.pecas} peças
                  </p>
                  <p className="text-xs text-brand">{resumo.numeros.join(" · ")}</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      )}

      <div id="semana" className="scroll-mt-4">
        <AgendaSemanalCard
          cartoes={cartoes}
          hrefBase={`/producao/${ano}/${mes}`}
          semanaInicioParam={semanaInicio}
        />
      </div>
    </div>
  );
}
