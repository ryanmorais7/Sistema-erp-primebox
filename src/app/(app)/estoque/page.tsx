import Link from "next/link";
import { PackagePlus, PackageMinus, X, ShoppingCart, PackageX } from "lucide-react";
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

// Dois ícones separados com legenda, em vez de um único ícone de setas
// cruzadas ambíguo — cada um já pré-seleciona o tipo no formulário.
function BotoesMovimento({ hrefBase }: { hrefBase: string }) {
  return (
    <div className="flex items-center gap-1">
      <Link
        href={`${hrefBase}?tipo=ENTRADA`}
        className="flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 text-[#0F6E56] transition-colors hover:bg-[#0F6E56]/10"
        title="Registrar entrada"
      >
        <PackagePlus className="size-4" />
        <span className="text-[0.6rem] leading-none font-medium">Entrada</span>
      </Link>
      <Link
        href={`${hrefBase}?tipo=SAIDA`}
        className="flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 text-[#C9622B] transition-colors hover:bg-[#C9622B]/10"
        title="Registrar saída"
      >
        <PackageMinus className="size-4" />
        <span className="text-[0.6rem] leading-none font-medium">Saída</span>
      </Link>
    </div>
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
                        <TableCell className="font-medium">
                          <Link href={`/produtos/${produto.id}/editar`} className="hover:underline">
                            {produto.nome}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">{saldo}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {minimo}
                        </TableCell>
                        <TableCell>
                          <NivelBadge saldo={saldo} minimo={minimo} />
                        </TableCell>
                        <TableCell className="flex items-center justify-end gap-2">
                          <BotoesMovimento hrefBase={`/estoque/movimentar/produto/${produto.id}`} />
                          {saldo > 0 ? (
                            <Button
                              render={<Link href={`/estoque/criar-pedido/${produto.id}`} />}
                              nativeButton={false}
                              size="sm"
                              className="bg-[#C9622B] text-white hover:bg-[#C9622B]/90"
                            >
                              <ShoppingCart />
                              Criar pedido
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              disabled
                              className="bg-[#E4DFD4] text-[#9A9890] disabled:opacity-100"
                            >
                              <PackageX />
                              Sem saldo
                            </Button>
                          )}
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
                          <Link
                            href={`/estoque/materia-prima/${materiaPrima.id}/editar`}
                            className="hover:underline"
                          >
                            {materiaPrima.nome}
                          </Link>
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
                        <TableCell className="flex items-center justify-end gap-2">
                          <BotoesMovimento
                            hrefBase={`/estoque/movimentar/materia-prima/${materiaPrima.id}`}
                          />
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
