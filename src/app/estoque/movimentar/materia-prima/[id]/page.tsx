import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calcularSaldoMateriaPrima } from "@/lib/estoque";
import { registrarMovimentoMateriaPrima } from "@/app/estoque/actions";
import { MovimentoForm } from "@/components/estoque/movimento-form";
import { PageHeader } from "@/components/layout/page-header";

// Depende de dado ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MovimentarMateriaPrimaPage({ params }: PageProps) {
  const { id } = await params;

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
        aoRegistrar={registrarMovimentoMateriaPrima.bind(null, id)}
      />
    </div>
  );
}
