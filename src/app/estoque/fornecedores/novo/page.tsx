import { FornecedorForm } from "@/components/estoque/fornecedor-form";
import { PageHeader } from "@/components/layout/page-header";

export default function NovoFornecedorPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Novo fornecedor" />
      <FornecedorForm />
    </div>
  );
}
