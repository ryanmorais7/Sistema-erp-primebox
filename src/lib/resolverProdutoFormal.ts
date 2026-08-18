import { prisma } from "@/lib/prisma";
import { precoParaNumero } from "@/lib/validations/moeda";
import { inferirMedidaId, formatarNomeBonito } from "@/lib/planilhaOp";

function normalizar(texto: string) {
  return texto.trim().toLowerCase();
}

// Resolve o produto de uma linha (id, nome exato, ou cadastra um novo a
// partir do texto digitado) — usado por qualquer fluxo formal que
// aceite produto por texto livre (edição de OP em Produção, e o
// formulário de Pedido).
export async function resolverProdutoFormal(
  produtoTexto: string,
  produtoId: string | undefined,
  precoUnitario: string,
  custoUnitario: string,
): Promise<{ id: string } | { erro: string }> {
  const nomeNormalizado = normalizar(produtoTexto);
  let produto = produtoId ? await prisma.produto.findUnique({ where: { id: produtoId } }) : null;
  if (!produto) {
    produto = await prisma.produto.findFirst({
      where: { ativo: true, nome: { equals: nomeNormalizado, mode: "insensitive" } },
    });
  }
  if (produto) {
    return { id: produto.id };
  }

  const medidas = await prisma.medida.findMany({ where: { ativo: true } });
  const medidaId = inferirMedidaId(produtoTexto, medidas) ?? medidas[0]?.id;
  if (!medidaId) {
    return { erro: "Não há nenhuma medida cadastrada no sistema pra usar como padrão." };
  }
  const criado = await prisma.produto.create({
    data: {
      nome: formatarNomeBonito(produtoTexto),
      tipo: "BASE",
      medidaId,
      preco: precoParaNumero(precoUnitario),
      custo: precoParaNumero(custoUnitario),
    },
  });
  return { id: criado.id };
}
