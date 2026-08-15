import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { buscarCartoesProducao } from "@/lib/producaoCartoes";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

// Lista ordens de produção ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;

type PageProps = {
  params: Promise<{ ano: string; mes: string }>;
};

export default async function ProducaoDiasDoMesPage({ params }: PageProps) {
  const { ano, mes } = await params;
  const prefixo = `${ano}-${mes}`;
  const numeroMes = Number(mes);

  const cartoes = await buscarCartoesProducao();
  const cartoesDoMes = cartoes.filter((cartao) => cartao.diaChave.startsWith(prefixo));

  const resumoPorDia = new Map<string, { pecas: number; ops: Set<string>; clientes: Set<string> }>();
  for (const cartao of cartoesDoMes) {
    const atual = resumoPorDia.get(cartao.diaChave) ?? {
      pecas: 0,
      ops: new Set<string>(),
      clientes: new Set<string>(),
    };
    atual.pecas += cartao.quantidade;
    atual.ops.add(cartao.grupoOpId);
    atual.clientes.add(cartao.clienteLabel);
    resumoPorDia.set(cartao.diaChave, atual);
  }
  const diasComOp = [...resumoPorDia.keys()].sort();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${NOMES_MES[numeroMes - 1]} de ${ano}`}
        action={
          <Button render={<Link href="/producao" />} nativeButton={false} variant="outline">
            <ChevronLeft />
            Voltar pros meses
          </Button>
        }
      />

      {diasComOp.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma OP programada nesse mês.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {diasComOp.map((diaChave) => {
            const resumo = resumoPorDia.get(diaChave)!;
            const dia = diaChave.slice(-2);
            return (
              <Link
                key={diaChave}
                href={`/producao/${ano}/${mes}/${dia}`}
                className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:border-brand hover:bg-accent/30"
              >
                <p className="font-heading text-sm font-semibold">Dia {dia}</p>
                <p className="text-sm text-muted-foreground">
                  {resumo.ops.size} {resumo.ops.size === 1 ? "OP" : "OPs"} · {resumo.clientes.size}{" "}
                  {resumo.clientes.size === 1 ? "cliente" : "clientes"} · {resumo.pecas} peças
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
