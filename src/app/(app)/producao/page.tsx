import Link from "next/link";
import { List, Plus, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { buscarCartoesProducao, type Cartao } from "@/lib/producaoCartoes";
import { PageHeader } from "@/components/layout/page-header";
import { NavegacaoPassos } from "@/components/producao/navegacao-passos";
import { ImprimirButton } from "@/components/pedidos/imprimir-button";
import { FolhaProducao, type LinhaFolha } from "@/components/producao/folha-producao";
import { Button } from "@/components/ui/button";

// Lista ordens de produção ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;

const NOMES_MES_MINUSCULO = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
] as const;

const DIAS_SEMANA = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"] as const;

const formatadorChaveDiaBr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
const formatadorDataLonga = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "long",
});

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
  searchParams: Promise<{ ano?: string; semanaInicio?: string }>;
};

export default async function ProducaoMesPage({ searchParams }: PageProps) {
  const { ano: anoParam, semanaInicio } = await searchParams;

  const hojeChave = formatadorChaveDiaBr.format(new Date());
  const [anoHoje, mesHoje, diaHoje] = hojeChave.split("-").map(Number);
  const ano = anoParam ? Number(anoParam) : anoHoje;

  const segundaBase =
    semanaInicio && /^\d{4}-\d{2}-\d{2}$/.test(semanaInicio) ? semanaInicio : hojeChave;
  const segunda = segundaDaSemana(segundaBase);
  const diasDaSemana = Array.from({ length: 6 }, (_, indice) => somarDias(segunda, indice));

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

  // Agenda semanal (segunda a sábado)
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
  const tituloSemana = mesmoMes
    ? `${inicioSemana.dia} a ${fimSemana.dia} de ${NOMES_MES_MINUSCULO[inicioSemana.mes - 1]}`
    : `${inicioSemana.dia} de ${NOMES_MES_MINUSCULO[inicioSemana.mes - 1]} a ${fimSemana.dia} de ${NOMES_MES_MINUSCULO[fimSemana.mes - 1]}`;

  // Folha de impressão/seleção — mesma lógica que já vivia no Kanban
  // (agora desativado, ver ADR-033): todos os itens pendentes (não
  // concluídos) do sistema inteiro, agrupados por OP só pra alternar
  // cor de fundo (peach/teal), sem cabeçalho de grupo — lista corrida,
  // formato "planilha" pedido pelo Pedro.
  const pendentesBrutos = cartoes.filter((cartao) => cartao.status !== "CONCLUIDO");
  const primeiraOcorrenciaPorGrupo = new Map<string, number>();
  pendentesBrutos.forEach((cartao, index) => {
    if (!primeiraOcorrenciaPorGrupo.has(cartao.grupoOpId)) {
      primeiraOcorrenciaPorGrupo.set(cartao.grupoOpId, index);
    }
  });
  const pendentes = [...pendentesBrutos].sort(
    (a, b) =>
      primeiraOcorrenciaPorGrupo.get(a.grupoOpId)! - primeiraOcorrenciaPorGrupo.get(b.grupoOpId)!,
  );
  const linhasComCor: { cartao: Cartao; corGrupo: "peach" | "teal" }[] = [];
  let grupoAnteriorFolha: string | null = null;
  let indiceGrupoFolha = -1;
  for (const cartao of pendentes) {
    if (cartao.grupoOpId !== grupoAnteriorFolha) {
      indiceGrupoFolha++;
      grupoAnteriorFolha = cartao.grupoOpId;
    }
    linhasComCor.push({ cartao, corGrupo: indiceGrupoFolha % 2 === 0 ? "peach" : "teal" });
  }
  const totalPecasFolha = pendentes.reduce((total, cartao) => total + cartao.quantidade, 0);
  const fonteFolha =
    linhasComCor.length <= 4
      ? "text-xl"
      : linhasComCor.length <= 7
        ? "text-base"
        : linhasComCor.length <= 10
          ? "text-sm"
          : "text-xs";
  const linhasFolha: LinhaFolha[] = linhasComCor.map(({ cartao, corGrupo }) => ({
    id: `${cartao.origem}-${cartao.id}`,
    quantidade: cartao.quantidade,
    produtoTexto: cartao.produtoTexto,
    clienteLabel: cartao.clienteLabel,
    observacao: cartao.observacao,
    corGrupo,
    dataProgramadaIso: cartao.dataProgramada ? cartao.dataProgramada.toISOString() : null,
    opGrupoId: cartao.grupoOpId,
    opNumeroLabel: cartao.numeroLabel,
  }));

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
    <div className="flex flex-col gap-6 print:gap-4">
      <div className="flex flex-col gap-6 print:hidden">
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

        <NavegacaoPassos
          atual={1}
          passos={[
            { numero: 1, label: "Mês" },
            { numero: 2, label: "Dia" },
            { numero: 3, label: "OP do dia" },
          ]}
        />
      </div>

      <FolhaProducao linhas={linhasFolha} totalPecas={totalPecasFolha} fonteFolha={fonteFolha} />

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

      <div id="semana" className="flex flex-col gap-3 scroll-mt-4">
        <div className="flex items-center justify-between">
          <p className="font-heading text-lg font-semibold">Semana · {tituloSemana}</p>
          <div className="flex items-center gap-2">
            <Button
              render={<Link href={`/producao?semanaInicio=${somarDias(segunda, -7)}#semana`} />}
              nativeButton={false}
              variant="outline"
              size="sm"
            >
              <ChevronLeft />
              Semana anterior
            </Button>
            <Button
              render={<Link href={`/producao?semanaInicio=${somarDias(segunda, 7)}#semana`} />}
              nativeButton={false}
              variant="outline"
              size="sm"
            >
              Próxima semana
              <ChevronRight />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {diasDaSemana.map((chave, indice) => {
            const { mes, dia } = partesDaChave(chave);
            const ehHoje = chave === hojeChave;
            const resumo = resumoPorDia.get(chave);
            const temAlgo = !!resumo && resumo.pecas > 0;
            const corBolinha = resumo?.temConcluidaSemExpedicao ? "#D6A537" : "#E4DFD4";
            const mesPadded = String(mes).padStart(2, "0");
            const diaPadded = String(dia).padStart(2, "0");
            const [anoChave] = chave.split("-");

            return (
              <Link
                key={chave}
                href={`/producao/${anoChave}/${mesPadded}/${diaPadded}`}
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
    </div>
  );
}
