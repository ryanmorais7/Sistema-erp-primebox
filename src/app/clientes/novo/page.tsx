import { ClienteForm } from "@/components/clientes/cliente-form";
import { PageHeader } from "@/components/layout/page-header";

export default function NovoClientePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Novo cliente" />
      <ClienteForm />
    </div>
  );
}
