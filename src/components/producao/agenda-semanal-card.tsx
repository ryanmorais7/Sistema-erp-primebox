import Link from "next/link";
import { ChevronLeft, ChevronRight, MoreHorizontal, Plus } from "lucide-react";
import type { Cartao } from "@/lib/producaoCartoes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const NOMES_MES_MINUSCULO = [
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

type AgendaSemanalCardProps = {
  cartoes: Cartao[];
  // Rota da própria tela onde o card está embutido (mês, dia ou OP do
  // dia) — os botões de navegação de semana voltam pra ela mesma com
  // ?semanaInicio= atualizado, em vez de sempre levar pra /producao.
  hrefBase: string;
  semanaInicioParam?: string;
};

// Card persistente da agenda semanal — aparece nas 3 telas da
// navegação (Mês, Dia, OP do dia), sempre com a mesma semana (por
// padrão a atual), pra dar uma visão rápida sem sair de onde você está.
export function AgendaSemanalCard({ cartoes, hrefBase, semanaInicioParam }: AgendaSemanalCardProps) {
  const hojeChave = formatadorChaveDiaBr.format(new Date());
  const temParamExplicito = !!semanaInicioParam && /^\d{4}-\d{2}-\d{2}$/.test(semanaInicioParam);
  const segundaBase = temParamExplicito ? semanaInicioParam! : hojeChave;
  let segunda = segundaDaSemana(segundaBase);

  // Domingo a fábrica não produz — sem override explícito de semana,
  // pula direto pra próxima semana útil em vez de mostrar uma semana
  // que já terminou ontem.
  const ehDomingoHoje = dataUtcDaChave(hojeChave).getUTCDay() === 0;
  const mostrarAvisoDomingo = ehDomingoHoje && !temParamExplicito;
  if (mostrarAvisoDomingo) {
    segunda = somarDias(segunda, 7);
  }

  const diasDaSemana = Array.from({ length: 6 }, (_, indice) => somarDias(segunda, indice));

  const resumoPorDia = new Map<
    string,
    { pecas: number; clientes: Set<string>; grupos: Map<string, boolean> }
  >();
  for (const cartao of cartoes) {
    if (!diasDaSemana.includes(cartao.diaChave)) continue;
    const atual = resumoPorDia.get(cartao.diaChave) ?? {
      pecas: 0,
      clientes: new Set<string>(),
      grupos: new Map<string, boolean>(),
    };
    atual.pecas += cartao.quantidade;
    atual.clientes.add(cartao.clienteLabel);
    atual.grupos.set(cartao.grupoOpId, cartao.concluidaConfirmada);
    resumoPorDia.set(cartao.diaChave, atual);
  }

  const inicioSemana = partesDaChave(diasDaSemana[0]);
  const fimSemana = partesDaChave(diasDaSemana[diasDaSemana.length - 1]);
  const mesmoMes = inicioSemana.mes === fimSemana.mes && inicioSemana.ano === fimSemana.ano;
  const tituloSemana = mesmoMes
    ? `${inicioSemana.dia} a ${fimSemana.dia} de ${NOMES_MES_MINUSCULO[inicioSemana.mes - 1]}`
    : `${inicioSemana.dia} de ${NOMES_MES_MINUSCULO[inicioSemana.mes - 1]} a ${fimSemana.dia} de ${NOMES_MES_MINUSCULO[fimSemana.mes - 1]}`;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-mono text-[0.7rem] tracking-widest text-brand uppercase">PrimeBox ERP</p>
            <p className="font-heading text-lg font-semibold">Semana · {tituloSemana}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              render={<Link href={`${hrefBase}?semanaInicio=${somarDias(segunda, -7)}#semana`} />}
              nativeButton={false}
              variant="outline"
              size="sm"
            >
              <ChevronLeft />
              Semana anterior
            </Button>
            <Button
              render={<Link href={`${hrefBase}?semanaInicio=${somarDias(segunda, 7)}#semana`} />}
              nativeButton={false}
              variant="outline"
              size="sm"
            >
              Próxima semana
              <ChevronRight />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Mais opções"
              title="Mais opções"
            >
              <MoreHorizontal />
            </Button>
          </div>
        </div>

        {mostrarAvisoDomingo && (
          <p className="rounded-lg bg-accent/40 px-3 py-2 text-xs text-muted-foreground">
            🗓️ Hoje é domingo, a fábrica não produz — mostrando a próxima semana útil (a partir de
            segunda, {String(inicioSemana.dia).padStart(2, "0")}/{String(inicioSemana.mes).padStart(2, "0")})
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {diasDaSemana.map((chave, indice) => {
            const { mes, dia } = partesDaChave(chave);
            const ehHoje = chave === hojeChave;
            const ehPassado = chave < hojeChave;
            const ehFuturo = chave > hojeChave;
            const resumo = resumoPorDia.get(chave);
            const temAlgo = !!resumo && resumo.pecas > 0;
            const todasConfirmadas = temAlgo && [...resumo!.grupos.values()].every(Boolean);
            const mesPadded = String(mes).padStart(2, "0");
            const diaPadded = String(dia).padStart(2, "0");
            const [anoChave] = chave.split("-");
            const rotuloDia = (
              <p
                className={`font-mono text-xs whitespace-nowrap uppercase ${
                  todasConfirmadas ? "" : ehHoje ? "text-brand" : "text-muted-foreground"
                }`}
                style={todasConfirmadas ? { color: "#8A6A16" } : undefined}
              >
                {DIAS_SEMANA[indice + 1]} · {dia}
                {ehHoje ? " · hoje" : ""}
              </p>
            );

            // Concluída (confirmada) — passado, hoje ou futuro, sempre
            // que TODAS as OPs daquele dia já foram confirmadas.
            if (todasConfirmadas) {
              return (
                <Link
                  key={chave}
                  href={`/producao/${anoChave}/${mesPadded}/${diaPadded}`}
                  className="flex flex-col gap-2 rounded-lg p-4 transition-colors hover:brightness-95"
                  style={{ backgroundColor: "#FDF0D2", border: "1px solid #F0B429" }}
                >
                  {rotuloDia}
                  <p className="text-xs font-medium" style={{ color: "#8A6A16" }}>
                    ✓ Concluída
                  </p>
                  <p className="font-heading text-3xl font-semibold" style={{ color: "#1C2321" }}>
                    {resumo!.pecas}
                  </p>
                  <p className="text-xs" style={{ color: "#8A6A16" }}>
                    peças
                  </p>
                </Link>
              );
            }

            // Passado, vazio — apagado, sem link/ação nenhuma.
            if (ehPassado && !temAlgo) {
              return (
                <div key={chave} className="flex flex-col gap-2 rounded-lg border p-4 opacity-45">
                  {rotuloDia}
                  <p className="text-sm text-muted-foreground">Nada ainda</p>
                </div>
              );
            }

            // Futuro, vazio — convite pra já criar a OP, data pré-preenchida.
            if (ehFuturo && !temAlgo) {
              return (
                <Link
                  key={chave}
                  href={`/producao/nova?data=${chave}`}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-4 text-center transition-colors hover:border-brand hover:bg-accent/20"
                >
                  {rotuloDia}
                  <span className="flex size-8 items-center justify-center rounded-full border-2 border-dashed border-brand">
                    <Plus className="size-4 text-brand" />
                  </span>
                  <p className="text-xs font-medium text-brand">Criar OP</p>
                </Link>
              );
            }

            // Hoje (sem concluída pendente), ou dia com dados normais —
            // mesmo formato de sempre, só muda a borda quando é hoje.
            return (
              <Link
                key={chave}
                href={`/producao/${anoChave}/${mesPadded}/${diaPadded}`}
                className={`flex flex-col gap-2 rounded-lg p-4 transition-colors hover:border-brand hover:bg-accent/30 ${
                  ehHoje ? "border-2 border-brand" : "border"
                } ${temAlgo ? "" : "opacity-60"}`}
              >
                {rotuloDia}
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
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: "#F0B429", boxShadow: "0 0 0 3px rgba(240,180,41,0.25)" }}
          />
          card amarelo = todas as OPs daquele dia já foram confirmadas como concluídas · clique num
          dia pra abrir a OP do dia
        </div>
      </CardContent>
    </Card>
  );
}
