import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { buscarCartoesProducao } from "@/lib/producaoCartoes";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

// Lista ordens de produção ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

const NOMES_MES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
] as const;

const DIAS_SEMANA = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"] as const;

const formatadorChaveDiaBr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

function partesDaChave(chave: string) {
  const [ano, mes, dia] = chave.split("-").map(Number);
  return { ano, mes, dia };
}

function dataUtcDaChave(chave: string): Date {
  const { ano, mes, dia } = partesDaChave(chave);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function chaveDaDataUtc(data: Date): string {
  const ano = data.getUTCFullYear();
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(data.getUTCDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

// Semana sempre segunda a sábado (sem domingo) — é como o Pedro pensa a produção.
function segundaDaSemana(chave: string): string {
  const data = dataUtcDaChave(chave);
  const diaSemana = data.getUTCDay(); // 0 = domingo ... 6 = sábado
  const diasDesdeSegunda = (diaSemana + 6) % 7;
  data.setUTCDate(data.getUTCDate() - diasDesdeSegunda);
  return chaveDaDataUtc(data);
}

function somarDias(chave: string, dias: number): string {
  const data = dataUtcDaChave(chave);
  data.setUTCDate(data.getUTCDate() + dias);
  return chaveDaDataUtc(data);
}

type PageProps = {
  searchParams: Promise<{ inicio?: string }>;
};

export default async function ProducaoSemanaPage({ searchParams }: PageProps) {
  const { inicio } = await searchParams;

  const hojeChave = formatadorChaveDiaBr.format(new Date());
  const segundaBase = inicio && /^\d{4}-\d{2}-\d{2}$/.test(inicio) ? inicio : hojeChave;
  const segunda = segundaDaSemana(segundaBase);
  const diasDaSemana = Array.from({ length: 6 }, (_, indice) => somarDias(segunda, indice));

  const cartoes = await buscarCartoesProducao();

  const resumoPorDia = new Map<
    string,
    { pecas: number; clientes: Set<string>; temConcluidaSemExpedicao: boolean }
  >();
  for (const cartao of cartoes) {
    if (!diasDaSemana.includes(cartao.diaChave)) continue;
    const atual = resumoPorDia.get(cartao.diaChave) ?? {
      pecas: 0,
      clientes: new Set<string>(),
      temConcluidaSemExpedicao: false,
    };
    atual.pecas += cartao.quantidade;
    atual.clientes.add(cartao.clienteLabel);
    if (cartao.status === "CONCLUIDO" && !cartao.temExpedicao) atual.temConcluidaSemExpedicao = true;
    resumoPorDia.set(cartao.diaChave, atual);
  }

  const inicioSemana = partesDaChave(diasDaSemana[0]);
  const fimSemana = partesDaChave(diasDaSemana[diasDaSemana.length - 1]);
  const mesmoMes = inicioSemana.mes === fimSemana.mes && inicioSemana.ano === fimSemana.ano;
  const tituloIntervalo = mesmoMes
    ? `${inicioSemana.dia} a ${fimSemana.dia} de ${NOMES_MES[inicioSemana.mes - 1]}`
    : `${inicioSemana.dia} de ${NOMES_MES[inicioSemana.mes - 1]} a ${fimSemana.dia} de ${NOMES_MES[fimSemana.mes - 1]}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Semana · ${tituloIntervalo}`}
        action={
          <div className="flex items-center gap-2">
            <Button render={<Link href="/producao" />} nativeButton={false} variant="outline" size="sm">
              <CalendarDays />
              Ver por mês
            </Button>
            <Button
              render={<Link href={`/producao/semana?inicio=${somarDias(segunda, -7)}`} />}
              nativeButton={false}
              variant="outline"
              size="sm"
            >
              <ChevronLeft />
              Semana anterior
            </Button>
            <Button
              render={<Link href={`/producao/semana?inicio=${somarDias(segunda, 7)}`} />}
              nativeButton={false}
              variant="outline"
              size="sm"
            >
              Próxima semana
              <ChevronRight />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {diasDaSemana.map((chave, indice) => {
          const { mes, dia } = partesDaChave(chave);
          const ehHoje = chave === hojeChave;
          const resumo = resumoPorDia.get(chave);
          const temAlgo = !!resumo && resumo.pecas > 0;
          const corBolinha = resumo?.temConcluidaSemExpedicao ? "#D6A537" : "#E4DFD4";
          const mesPadded = String(mes).padStart(2, "0");
          const diaPadded = String(dia).padStart(2, "0");
          const [ano] = chave.split("-");

          return (
            <Link
              key={chave}
              href={`/producao/${ano}/${mesPadded}/${diaPadded}`}
              className={`flex flex-col gap-2 rounded-lg p-4 transition-colors hover:border-brand hover:bg-accent/30 ${
                ehHoje ? "border-2 border-brand" : "border"
              } ${temAlgo ? "" : "opacity-60"}`}
            >
              <p
                className={`font-mono text-xs whitespace-nowrap uppercase ${ehHoje ? "text-brand" : "text-muted-foreground"}`}
              >
                {DIAS_SEMANA[indice + 1]} · {dia}
                {ehHoje ? " · hoje" : ""}
              </p>
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: corBolinha }} />
              {temAlgo && resumo ? (
                <div>
                  <p className="font-heading text-3xl font-semibold">{resumo.pecas}</p>
                  <p className="text-xs text-muted-foreground">peças</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {resumo.clientes.size} {resumo.clientes.size === 1 ? "cliente" : "clientes"}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nada ainda</p>
              )}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: "#D6A537" }} />
        bolinha amarela = tem OP concluída esperando confirmação naquele dia · clique num dia pra
        abrir a OP do dia
      </div>
    </div>
  );
}
