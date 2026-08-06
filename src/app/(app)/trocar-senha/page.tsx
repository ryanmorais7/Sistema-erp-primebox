import { TrocarSenhaForm } from "@/components/login/trocar-senha-form";
import { PageHeader } from "@/components/layout/page-header";

export default function TrocarSenhaPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Trocar senha" />
      <div className="max-w-md">
        <TrocarSenhaForm />
      </div>
    </div>
  );
}
