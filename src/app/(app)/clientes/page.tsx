import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { excluirCliente } from "./actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BotaoExcluir } from "@/components/ui/botao-excluir";
import { BadgeStatusClicavel } from "@/components/clientes/badge-status-clicavel";
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
          <Table className="table-fixed text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[25%] px-2 py-1.5">Razão social</TableHead>
                <TableHead className="w-[15%] px-2 py-1.5">Documento</TableHead>
                <TableHead className="w-[12%] px-2 py-1.5">Telefone</TableHead>
                <TableHead className="w-[12%] px-2 py-1.5">Bairro</TableHead>
                <TableHead className="w-[13%] px-2 py-1.5">Cidade/UF</TableHead>
                <TableHead className="w-[9%] px-2 py-1.5">Status</TableHead>
                <TableHead className="w-[14%] px-2 py-1.5 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className="px-2 py-1.5 font-medium whitespace-normal break-words">
                    <Link href={`/clientes/${cliente.id}/editar`} className="hover:underline">
                      {cliente.nomeFantasia || cliente.razaoSocial}
                    </Link>
                  </TableCell>
                  <TableCell className="px-2 py-1.5 whitespace-normal break-words">
                    {formatarDocumento(cliente.cnpj, cliente.cpf)}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 whitespace-normal break-words">
                    {cliente.telefone}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 whitespace-normal break-words">
                    {cliente.bairro || "—"}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 whitespace-normal break-words">
                    {cliente.cidade ? `${cliente.cidade}/${cliente.estado ?? ""}` : "—"}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <BadgeStatusClicavel
                      clienteId={cliente.id}
                      nome={cliente.nomeFantasia || cliente.razaoSocial}
                      ativo={cliente.ativo}
                    />
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/relatorios/clientes?clienteId=${cliente.id}`}
                        className="font-medium text-[#C9622B] hover:underline"
                      >
                        Relatório
                      </Link>
                      <BotaoExcluir
                        acao={excluirCliente.bind(null, cliente.id)}
                        confirmacao={`Excluir "${cliente.nomeFantasia || cliente.razaoSocial}" permanentemente? Essa ação não pode ser desfeita.`}
                        label="Excluir cliente"
                      />
                    </div>
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
