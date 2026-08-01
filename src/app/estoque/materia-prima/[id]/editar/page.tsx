import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MateriaPrimaForm } from "@/components/estoque/materia-prima-form";
import { PageHeader } from "@/components/layout/page-header";
import { formatarPrecoBr } from "@/lib/validations/moeda";
import type { MateriaPrimaFormValues } from "@/lib/validations/materiaPrima";

// Depende de dado ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditarMateriaPrimaPage({ params }: PageProps) {
  const { id } = await params;

  const materiaPrima = await prisma.materiaPrima.findUnique({ where: { id } });

  if (!materiaPrima) {
    notFound();
  }

  const valoresIniciais: MateriaPrimaFormValues = {
    nome: materiaPrima.nome,
    unidade: materiaPrima.unidade,
    estoqueMinimo: formatarPrecoBr(Number(materiaPrima.estoqueMinimo)),
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Editar matéria-prima" />
      <MateriaPrimaForm materiaPrimaId={materiaPrima.id} valoresIniciais={valoresIniciais} />
    </div>
  );
}
