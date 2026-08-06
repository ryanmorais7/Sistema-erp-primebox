import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FornecedorForm } from "@/components/estoque/fornecedor-form";
import { PageHeader } from "@/components/layout/page-header";
import type { FornecedorFormValues } from "@/lib/validations/fornecedor";

// Depende de dado ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditarFornecedorPage({ params }: PageProps) {
  const { id } = await params;

  const fornecedor = await prisma.fornecedor.findUnique({ where: { id } });

  if (!fornecedor) {
    notFound();
  }

  const valoresIniciais: FornecedorFormValues = {
    nome: fornecedor.nome,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Editar fornecedor" />
      <FornecedorForm fornecedorId={fornecedor.id} valoresIniciais={valoresIniciais} />
    </div>
  );
}
