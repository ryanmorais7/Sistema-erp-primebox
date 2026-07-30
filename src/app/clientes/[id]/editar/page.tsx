import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ClienteForm } from "@/components/clientes/cliente-form";
import type { ClienteFormValues } from "@/lib/validations/cliente";

// Depende de dado ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditarClientePage({ params }: PageProps) {
  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({ where: { id } });

  if (!cliente) {
    notFound();
  }

  const valoresIniciais: ClienteFormValues = {
    razaoSocial: cliente.razaoSocial,
    nomeFantasia: cliente.nomeFantasia ?? "",
    cnpj: cliente.cnpj ?? "",
    cpf: cliente.cpf ?? "",
    telefone: cliente.telefone,
    email: cliente.email ?? "",
    contatoNome: cliente.contatoNome ?? "",
    endereco: cliente.endereco ?? "",
    numero: cliente.numero ?? "",
    bairro: cliente.bairro ?? "",
    cidade: cliente.cidade ?? "",
    estado: cliente.estado ?? "",
    cep: cliente.cep ?? "",
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Editar cliente</h1>
      <ClienteForm clienteId={cliente.id} valoresIniciais={valoresIniciais} />
    </div>
  );
}
