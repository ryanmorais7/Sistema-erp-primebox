import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calcularSaldoMateriaPrima } from "@/lib/estoque";
import { registrarMovimentoMateriaPrima } from "@/app/(app)/estoque/actions";
import { MovimentoForm } from "@/components/estoque/movimento-form";
import { PageHeader } from "@/components/layout/page-header";

// Depende de dado ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string }>;
};

export default async function MovimentarMateriaPrimaPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { tipo } = await searchParams;

  const materiaPrima = await prisma.materiaPrima.findUnique({ where: { id } });
  if (!materiaPrima) {
    notFound();
  }

  const saldoAtual = await calcularSaldoMateriaPrima(id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Movimentar estoque: ${materiaPrima.nome}`} />
      <MovimentoForm
        titulo="Registrar movimentação"
        saldoAtual={saldoAtual}
        unidade={materiaPrima.unidade}
        tipoInicial={tipo === "SAIDA" ? "SAIDA" : tipo === "ENTRADA" ? "ENTRADA" : undefined}
        aoRegistrar={registrarMovimentoMateriaPrima.bind(null, id)}
      />
    </div>
  );
}
