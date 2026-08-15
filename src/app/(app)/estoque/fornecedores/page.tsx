import Link from "next/link";
import { X, Check } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { alternarAtivoFornecedor, excluirFornecedor } from "../actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
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

// Consulta dados ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

export default async function FornecedoresPage() {
  const fornecedores = await prisma.fornecedor.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { precos: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Fornecedores"
        action={
          <Button render={<Link href="/estoque/fornecedores/novo" />} nativeButton={false}>
            Novo fornecedor
          </Button>
        }
      />

      <div className="rounded-lg border">
        {fornecedores.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Nenhum fornecedor cadastrado ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cotações cadastradas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fornecedores.map((fornecedor) => (
                <TableRow key={fornecedor.id}>
                  <TableCell className="font-medium">
                    <Link href={`/estoque/fornecedores/${fornecedor.id}/editar`} className="hover:underline">
                      {fornecedor.nome}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {fornecedor._count.precos}
                  </TableCell>
                  <TableCell>
                    {fornecedor.ativo ? (
                      <Badge variant="secondary">Ativo</Badge>
                    ) : (
                      <Badge variant="outline">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <form
                      action={async () => {
                        "use server";
                        await alternarAtivoFornecedor(fornecedor.id, !fornecedor.ativo);
                      }}
                    >
                      <Button
                        type="submit"
                        variant="outline"
                        size="icon-sm"
                        aria-label={fornecedor.ativo ? "Desativar fornecedor" : "Ativar fornecedor"}
                        title={fornecedor.ativo ? "Desativar" : "Ativar"}
                      >
                        {fornecedor.ativo ? <X /> : <Check />}
                      </Button>
                    </form>
                    <BotaoExcluir
                      acao={excluirFornecedor.bind(null, fornecedor.id)}
                      confirmacao={`Excluir "${fornecedor.nome}" permanentemente? Essa ação não pode ser desfeita.`}
                      label="Excluir fornecedor"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
