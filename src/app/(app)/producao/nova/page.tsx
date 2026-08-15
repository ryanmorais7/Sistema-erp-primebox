import { prisma } from "@/lib/prisma";
import { OrdemAvulsaForm } from "@/components/producao/ordem-avulsa-form";
import { PageHeader } from "@/components/layout/page-header";

// Depende de dado ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ data?: string }>;
};

export default async function NovaOrdemAvulsaPage({ searchParams }: PageProps) {
  const { data } = await searchParams;
  const dataProgramadaInicial = data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : undefined;

  const [produtos, clientes, medidas] = await Promise.all([
    prisma.produto.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, preco: true },
    }),
    prisma.cliente.findMany({
      where: { ativo: true },
      orderBy: { razaoSocial: "asc" },
      select: { id: true, razaoSocial: true, nomeFantasia: true },
    }),
    prisma.medida.findMany({
      where: { ativo: true },
      orderBy: { ordem: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  const produtosComPrecoNumero = produtos.map((produto) => ({
    ...produto,
    preco: Number(produto.preco),
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Criar OP" />
      <p className="text-sm text-muted-foreground">
        Adicione quantas linhas precisar. Produto pode ser digitado livremente. Se não bater com o
        catálogo, é cadastrado sozinho ao salvar. Se o cliente não tiver cadastro (ex:
        &quot;Avulso&quot;), vira uma OP avulsa, fora do fluxo formal de Pedidos. Se você escolher ou
        cadastrar um cliente, essa linha vira um Pedido formal de verdade, do jeito de sempre.
      </p>
      <OrdemAvulsaForm
        produtos={produtosComPrecoNumero}
        clientes={clientes}
        medidas={medidas}
        dataProgramadaInicial={dataProgramadaInicial}
      />
    </div>
  );
}
