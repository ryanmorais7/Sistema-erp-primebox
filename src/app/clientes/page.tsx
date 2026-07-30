import Link from "next/link";
import { Pencil, Check, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { alternarAtivoCliente } from "./actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Lista clientes ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

function formatarDocumento(cnpj: string | null, cpf: string | null) {
  if (cnpj) return `CNPJ ${cnpj}`;
  if (cpf) return `CPF ${cpf}`;
  return "—";
}

export default async function ClientesPage() {
  const clientes = await prisma.cliente.findMany({
    orderBy: { razaoSocial: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clientes"
        action={
          <Button render={<Link href="/clientes/novo" />} nativeButton={false}>
            Novo cliente
          </Button>
        }
      />

      {clientes.length === 0 ? (
        <p className="text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razão social</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className="font-medium">
                    {cliente.nomeFantasia || cliente.razaoSocial}
                  </TableCell>
                  <TableCell>{formatarDocumento(cliente.cnpj, cliente.cpf)}</TableCell>
                  <TableCell>{cliente.telefone}</TableCell>
                  <TableCell>
                    {cliente.cidade ? `${cliente.cidade}/${cliente.estado ?? ""}` : "—"}
                  </TableCell>
                  <TableCell>
                    {cliente.ativo ? (
                      <Badge className="bg-positive-soft text-positive">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button
                      render={<Link href={`/clientes/${cliente.id}/editar`} />}
                      nativeButton={false}
                      variant="outline"
                      size="icon-sm"
                      aria-label="Editar cliente"
                      title="Editar"
                    >
                      <Pencil />
                    </Button>
                    <form
                      action={async () => {
                        "use server";
                        await alternarAtivoCliente(cliente.id, !cliente.ativo);
                      }}
                    >
                      <Button
                        type="submit"
                        variant="outline"
                        size="icon-sm"
                        aria-label={cliente.ativo ? "Desativar cliente" : "Ativar cliente"}
                        title={cliente.ativo ? "Desativar" : "Ativar"}
                      >
                        {cliente.ativo ? <X /> : <Check />}
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
