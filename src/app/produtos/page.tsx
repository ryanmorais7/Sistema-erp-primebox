import Link from "next/link";
import { Pencil, Check, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { alternarAtivoProduto } from "./actions";
import { tipoProdutoLabels } from "@/lib/validations/produto";
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

// Lista produtos ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function calcularMargem(preco: number, custo: number) {
  if (!(preco > 0)) return null;
  const margemReais = preco - custo;
  const margemPercentual = (margemReais / preco) * 100;
  return { margemReais, margemPercentual };
}

export default async function ProdutosPage() {
  const produtos = await prisma.produto.findMany({
    include: { medida: true },
    orderBy: { nome: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Produtos"
        action={
          <Button render={<Link href="/produtos/novo" />} nativeButton={false}>
            Novo produto
          </Button>
        }
      />

      {produtos.length === 0 ? (
        <p className="text-muted-foreground">Nenhum produto cadastrado ainda.</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Medida</TableHead>
                <TableHead>Tecido/Cor</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Margem/Lucro</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtos.map((produto) => {
                const margem = calcularMargem(Number(produto.preco), Number(produto.custo));
                return (
                <TableRow key={produto.id}>
                  <TableCell className="font-medium">{produto.nome}</TableCell>
                  <TableCell>{tipoProdutoLabels[produto.tipo]}</TableCell>
                  <TableCell>{produto.medida.nome}</TableCell>
                  <TableCell>
                    {[produto.tecido, produto.cor].filter(Boolean).join(" / ") || "—"}
                  </TableCell>
                  <TableCell>{formatadorMoeda.format(Number(produto.preco))}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {margem
                      ? `${formatadorMoeda.format(margem.margemReais)} (${margem.margemPercentual.toFixed(1)}%)`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {produto.ativo ? (
                      <Badge className="bg-positive-soft text-positive">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button
                      render={<Link href={`/produtos/${produto.id}/editar`} />}
                      nativeButton={false}
                      variant="outline"
                      size="icon-sm"
                      aria-label="Editar produto"
                      title="Editar"
                    >
                      <Pencil />
                    </Button>
                    <form
                      action={async () => {
                        "use server";
                        await alternarAtivoProduto(produto.id, !produto.ativo);
                      }}
                    >
                      <Button
                        type="submit"
                        variant="outline"
                        size="icon-sm"
                        aria-label={produto.ativo ? "Desativar produto" : "Ativar produto"}
                        title={produto.ativo ? "Desativar" : "Ativar"}
                      >
                        {produto.ativo ? <X /> : <Check />}
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
