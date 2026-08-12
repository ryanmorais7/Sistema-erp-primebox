import Link from "next/link";
import { ArrowLeftRight, Pencil, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { alternarAtivoMateriaPrima } from "./actions";
import { alternarAtivoProduto } from "@/app/(app)/produtos/actions";
import { calcularSaldosProdutos, calcularSaldosMateriasPrimas } from "@/lib/estoque";
import { PageHeader } from "@/components/layout/page-header";
import { SecaoRecolhivel } from "@/components/estoque/secao-recolhivel";
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

// Consulta dados ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

function NivelBadge({ saldo, minimo }: { saldo: number; minimo: number }) {
  const baixo = saldo < minimo;
  return (
    <Badge variant={baixo ? "destructive" : "secondary"}>{baixo ? "Baixo" : "OK"}</Badge>
  );
}

const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function EstoquePage() {
  const [produtos, materiasPrimas, saldosProdutos, saldosMateriasPrimas, precos] =
    await Promise.all([
      prisma.produto.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
      prisma.materiaPrima.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
      calcularSaldosProdutos(),
      calcularSaldosMateriasPrimas(),
      prisma.precoMateriaPrima.findMany({ include: { fornecedor: true } }),
    ]);

  const melhorPrecoPorMateriaPrima = new Map<string, { valor: number; fornecedor: string }>();
  const cotacoesPorMateriaPrima = new Map<string, number>();
  for (const preco of precos) {
    const valor = Number(preco.valor);
    const atual = melhorPrecoPorMateriaPrima.get(preco.materiaPrimaId);
    if (!atual || valor < atual.valor) {
      melhorPrecoPorMateriaPrima.set(preco.materiaPrimaId, {
        valor,
        fornecedor: preco.fornecedor.nome,
      });
    }
    cotacoesPorMateriaPrima.set(
      preco.materiaPrimaId,
      (cotacoesPorMateriaPrima.get(preco.materiaPrimaId) ?? 0) + 1,
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title="Estoque"
        action={
          <div className="flex gap-2">
            <Button
              render={<Link href="/estoque/fornecedores" />}
              nativeButton={false}
              variant="outline"
            >
              Fornecedores
            </Button>
            <Button render={<Link href="/estoque/materia-prima/novo" />} nativeButton={false}>
              Nova matéria-prima
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-6">
        <div>
          <SecaoRecolhivel titulo="Produtos prontos" contador={produtos.length}>
            {produtos.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nenhum produto ativo cadastrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Mínimo</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtos.map((produto) => {
                    const saldo = saldosProdutos.get(produto.id) ?? 0;
                    const minimo = Number(produto.estoqueMinimo);
                    return (
                      <TableRow key={produto.id}>
                        <TableCell className="font-medium">{produto.nome}</TableCell>
                        <TableCell className="text-right">{saldo}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {minimo}
                        </TableCell>
                        <TableCell>
                          <NivelBadge saldo={saldo} minimo={minimo} />
                        </TableCell>
                        <TableCell className="flex justify-end gap-2">
                          <Button
                            render={<Link href={`/estoque/movimentar/produto/${produto.id}`} />}
                            nativeButton={false}
                            variant="outline"
                            size="icon-sm"
                            aria-label="Registrar movimentação"
                            title="Registrar movimentação"
                          >
                            <ArrowLeftRight />
                          </Button>
                          <form
                            action={async () => {
                              "use server";
                              await alternarAtivoProduto(produto.id, false);
                            }}
                          >
                            <Button
                              type="submit"
                              variant="outline"
                              size="icon-sm"
                              aria-label="Desativar produto"
                              title="Desativar"
                            >
                              <X />
                            </Button>
                          </form>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </SecaoRecolhivel>
        </div>

        <div>
          <SecaoRecolhivel titulo="Matéria-prima" contador={materiasPrimas.length}>
            {materiasPrimas.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Nenhuma matéria-prima cadastrada ainda.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Valor do item</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materiasPrimas.map((materiaPrima) => {
                    const saldo = saldosMateriasPrimas.get(materiaPrima.id) ?? 0;
                    const minimo = Number(materiaPrima.estoqueMinimo);
                    const baixo = saldo < minimo;
                    const melhorPreco = melhorPrecoPorMateriaPrima.get(materiaPrima.id);
                    const totalCotacoes = cotacoesPorMateriaPrima.get(materiaPrima.id) ?? 0;
                    return (
                      <TableRow
                        key={materiaPrima.id}
                        className={baixo ? "bg-destructive/5 hover:bg-destructive/10" : undefined}
                      >
                        <TableCell className="font-medium">
                          {materiaPrima.nome}
                          <span className="block text-xs text-muted-foreground">
                            unidade: {materiaPrima.unidade}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {melhorPreco ? (
                            <>
                              {formatadorMoeda.format(melhorPreco.valor)}/{materiaPrima.unidade}
                              <span className="block text-xs text-muted-foreground">
                                {melhorPreco.fornecedor}
                                {totalCotacoes > 1 && ` · ${totalCotacoes} fornecedores`}
                              </span>
                            </>
                          ) : (
                            <Link
                              href={`/estoque/materia-prima/${materiaPrima.id}/editar`}
                              className="text-muted-foreground underline hover:text-foreground"
                            >
                              Cotar
                            </Link>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {saldo} {materiaPrima.unidade}
                        </TableCell>
                        <TableCell>
                          <NivelBadge saldo={saldo} minimo={minimo} />
                        </TableCell>
                        <TableCell className="flex justify-end gap-2">
                          <Button
                            render={
                              <Link href={`/estoque/movimentar/materia-prima/${materiaPrima.id}`} />
                            }
                            nativeButton={false}
                            variant="outline"
                            size="icon-sm"
                            aria-label="Registrar movimentação"
                            title="Registrar movimentação"
                          >
                            <ArrowLeftRight />
                          </Button>
                          <Button
                            render={
                              <Link href={`/estoque/materia-prima/${materiaPrima.id}/editar`} />
                            }
                            nativeButton={false}
                            variant="outline"
                            size="icon-sm"
                            aria-label="Editar matéria-prima"
                            title="Editar"
                          >
                            <Pencil />
                          </Button>
                          <form
                            action={async () => {
                              "use server";
                              await alternarAtivoMateriaPrima(materiaPrima.id, false);
                            }}
                          >
                            <Button
                              type="submit"
                              variant="outline"
                              size="icon-sm"
                              aria-label="Desativar matéria-prima"
                              title="Desativar"
                            >
                              <X />
                            </Button>
                          </form>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </SecaoRecolhivel>
        </div>
      </div>
    </div>
  );
}
