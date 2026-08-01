import { MateriaPrimaForm } from "@/components/estoque/materia-prima-form";
import { PageHeader } from "@/components/layout/page-header";

export default function NovaMateriaPrimaPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Nova matéria-prima" />
      <MateriaPrimaForm />
    </div>
  );
}
