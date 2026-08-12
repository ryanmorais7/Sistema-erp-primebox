import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MateriaPrimaForm } from "@/components/estoque/materia-prima-form";
import { PrecosMateriaPrima } from "@/components/estoque/precos-materia-prima";
import { PageHeader } from "@/components/layout/page-header";
import { formatarPrecoBr } from "@/lib/validations/moeda";
import { UNIDADES_MATERIA_PRIMA, type MateriaPrimaFormValues } from "@/lib/validations/materiaPrima";

// Depende de dado ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditarMateriaPrimaPage({ params }: PageProps) {
  const { id } = await params;

  const [materiaPrima, fornecedoresAtivos, precos] = await Promise.all([
    prisma.materiaPrima.findUnique({ where: { id } }),
    prisma.fornecedor.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.precoMateriaPrima.findMany({
      where: { materiaPrimaId: id },
      include: { fornecedor: true },
      orderBy: { valor: "asc" },
    }),
  ]);

  if (!materiaPrima) {
    notFound();
  }

  const unidadeValida = (UNIDADES_MATERIA_PRIMA as readonly string[]).includes(
    materiaPrima.unidade,
  )
    ? (materiaPrima.unidade as MateriaPrimaFormValues["unidade"])
    : UNIDADES_MATERIA_PRIMA[0];

  const valoresIniciais: MateriaPrimaFormValues = {
    nome: materiaPrima.nome,
    unidade: unidadeValida,
    estoqueMinimo: formatarPrecoBr(Number(materiaPrima.estoqueMinimo)),
  };

  const precosFormatados = precos.map((preco) => ({
    id: preco.id,
    fornecedorId: preco.fornecedorId,
    fornecedorNome: preco.fornecedor.nome,
    valor: Number(preco.valor),
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Editar matéria-prima" />
      <MateriaPrimaForm materiaPrimaId={materiaPrima.id} valoresIniciais={valoresIniciais} />
      <PrecosMateriaPrima
        materiaPrimaId={materiaPrima.id}
        unidade={materiaPrima.unidade}
        fornecedores={fornecedoresAtivos}
        precosIniciais={precosFormatados}
      />
    </div>
  );
}
