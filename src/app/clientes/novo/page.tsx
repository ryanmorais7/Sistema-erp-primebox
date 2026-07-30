import { ClienteForm } from "@/components/clientes/cliente-form";

export default function NovoClientePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Novo cliente</h1>
      <ClienteForm />
    </div>
  );
}
