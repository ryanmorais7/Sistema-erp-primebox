import Link from "next/link";
import { ClipboardList, Pencil, Check, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { alternarAtivoCliente, excluirCliente } from "./actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BotaoExcluir } from "@/components/ui/botao-excluir";
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

const abas: { label: string; status?: "ATIVO" | "INATIVO" }[] = [
  { label: "Todos" },
  { label: "Ativos", status: "ATIVO" },
  { label: "Inativos", status: "INATIVO" },
];

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string }>;
};

export default async function ClientesPage({ searchParams }: PageProps) {
  const { q, status } = await searchParams;
  const busca = q?.trim() ?? "";
  const statusValido = status === "ATIVO" || status === "INATIVO" ? status : undefined;

  const clientes = await prisma.cliente.findMany({
    where: {
      ativo: statusValido ? statusValido === "ATIVO" : undefined,
      ...(busca
        ? {
            OR: [
              { razaoSocial: { contains: busca, mode: "insensitive" } },
              { nomeFantasia: { contains: busca, mode: "insensitive" } },
            ],
          }
        : {}),
    },
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 self-start rounded-lg bg-muted p-1">
          {abas.map((aba) => {
            const ativa = aba.status === statusValido;
            const params = new URLSearchParams();
            if (aba.status) params.set("status", aba.status);
            if (busca) params.set("q", busca);
            const query = params.toString();
            const href = query ? `/clientes?${query}` : "/clientes";
            return (
              <Button
                key={aba.label}
                render={<Link href={href} />}
                nativeButton={false}
                variant={ativa ? "default" : "ghost"}
                size="sm"
              >
                {aba.label}
              </Button>
            );
          })}
        </div>

        <form action="/clientes" className="flex max-w-xs gap-2">
          {statusValido && <input type="hidden" name="status" value={statusValido} />}
          <Input type="text" name="q" placeholder="Buscar por nome..." defaultValue={busca} />
          <Button type="submit" variant="outline">
            Buscar
          </Button>
        </form>
      </div>

      {clientes.length === 0 ? (
        <p className="text-muted-foreground">
          {busca || statusValido
            ? "Nenhum cliente encontrado com esse filtro."
            : "Nenhum cliente cadastrado ainda."}
        </p>
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
                      render={<Link href={`/relatorios/clientes?clienteId=${cliente.id}`} />}
                      nativeButton={false}
                      variant="outline"
                      size="icon-sm"
                      aria-label="Ver pedidos do cliente"
                      title="Ver pedidos"
                    >
                      <ClipboardList />
                    </Button>
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
                    <BotaoExcluir
                      acao={excluirCliente.bind(null, cliente.id)}
                      confirmacao={`Excluir "${cliente.nomeFantasia || cliente.razaoSocial}" permanentemente? Essa ação não pode ser desfeita.`}
                      label="Excluir cliente"
                    />
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
