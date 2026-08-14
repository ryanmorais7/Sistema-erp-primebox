import Link from "next/link";
import {
  FileDown,
  MessageCircle,
  Truck,
  Box,
  Scissors,
  Wrench,
  CircleCheck,
  Warehouse,
} from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verificarSessao } from "@/lib/dal";
import { calcularSaldosProdutos } from "@/lib/estoque";
import { ImprimirButton } from "@/components/pedidos/imprimir-button";
import { AutoImprimir } from "@/components/pedidos/auto-imprimir";
import { tipoProdutoLabels } from "@/lib/validations/produto";
import { gerarOrdemProducao } from "@/app/(app)/producao/actions";
import { atenderItemDoEstoque } from "@/app/(app)/estoque/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusOrdemProducaoLabels = {
  AGUARDANDO: "Aguardando",
  EM_PRODUCAO: "Em produção",
  CONCLUIDO: "Concluído",
} as const;

const statusExpedicaoLabels = {
  AGUARDANDO: "Aguardando",
  EM_ROTA: "Em rota",
  ENTREGUE: "Entregue",
} as const;

const statusPedidoLabels = {
  EM_CARTEIRA: "Em carteira",
  FATURADO: "Faturado",
} as const;

const badgeStatusPedidoClasses: Record<string, string> = {
  FATURADO: "bg-positive-soft text-positive",
  EM_CARTEIRA: "bg-accent text-accent-foreground",
};
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Depende de dado ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatadorData = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });

function formatarDocumento(cnpj: string | null, cpf: string | null) {
  if (cnpj) return `CNPJ ${cnpj}`;
  if (cpf) return `CPF ${cpf}`;
  return null;
}

function formatarEndereco(cliente: {
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
}) {
  const partes = [
    [cliente.endereco, cliente.numero].filter(Boolean).join(", "),
    cliente.bairro,
    [cliente.cidade, cliente.estado].filter(Boolean).join("/"),
    cliente.cep,
  ].filter(Boolean);
  return partes.length ? partes.join(", ") : null;
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
};

export default async function VisualizarPedidoPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { print } = await searchParams;
  const sessao = await verificarSessao();

  const [pedido, saldosProdutos] = await Promise.all([
    prisma.pedido.findUnique({
      where: { id },
      include: {
        cliente: true,
        itens: { include: { produto: { include: { medida: true } }, ordemProducao: true } },
        expedicao: true,
      },
    }),
    calcularSaldosProdutos(),
  ]);

  if (!pedido) {
    notFound();
  }

  const endereco = formatarEndereco(pedido.cliente);
  const documento = formatarDocumento(pedido.cliente.cnpj, pedido.cliente.cpf);
  const nomeExibido = pedido.cliente.nomeFantasia || pedido.cliente.razaoSocial;
  const linhaSecundariaCliente = [
    pedido.cliente.nomeFantasia ? pedido.cliente.razaoSocial : null,
    documento,
    pedido.cliente.telefone,
  ]
    .filter(Boolean)
    .join(" · ");

  const custoTotal = pedido.itens.reduce(
    (total, item) => total + Number(item.custoUnitario) * item.quantidade,
    0,
  );
  const valorTotal = Number(pedido.valorTotal);
  const margemTotal = valorTotal - custoTotal;
  const margemPercentual = valorTotal > 0 ? (margemTotal / valorTotal) * 100 : 0;

  return (
    <div className="flex flex-col gap-6 print:gap-4">
      <AutoImprimir ativo={print === "1"} />
      <div className="flex items-start justify-between print:hidden">
        <div>
          <p className="font-mono text-[0.7rem] tracking-widest text-brand uppercase">
            PrimeBox ERP
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Pedido #{pedido.numero}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" disabled>
            <FileDown />
            Baixar PDF
            <Badge variant="secondary" className="ml-1">
              em breve
            </Badge>
          </Button>
          <Button type="button" variant="outline" disabled>
            <MessageCircle />
            Enviar WhatsApp
            <Badge variant="secondary" className="ml-1">
              em breve
            </Badge>
          </Button>
          <ImprimirButton />
        </div>
      </div>

      <div className="rounded-lg border p-6 print:border-none print:p-0">
        <div className="flex items-start justify-between border-b pb-4 print:pb-2">
          <div className="flex items-center gap-2">
            <div
              className="flex size-8 items-center justify-center rounded-lg"
              style={{
                background:
                  "linear-gradient(155deg, color-mix(in oklch, var(--brand) 100%, white 22%), var(--brand) 55%, color-mix(in oklch, var(--brand) 100%, black 22%))",
              }}
            >
              <Box className="size-4 text-white" strokeWidth={1.8} />
            </div>
            <p className="font-heading text-lg font-semibold">PrimeBox</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm">Pedido #{pedido.numero}</p>
            <p className="text-sm text-muted-foreground">
              {formatadorData.format(pedido.createdAt)}
            </p>
            <Badge
              className={`mt-1 ${badgeStatusPedidoClasses[pedido.status] ?? ""}`}
              variant="secondary"
            >
              {statusPedidoLabels[pedido.status]}
            </Badge>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Cliente
          </p>
          <p className="font-medium">{nomeExibido}</p>
          {linhaSecundariaCliente && (
            <p className="text-sm text-muted-foreground">{linhaSecundariaCliente}</p>
          )}
          {endereco && <p className="text-sm text-muted-foreground">{endereco}</p>}
        </div>

        <div className="mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Medida</TableHead>
                <TableHead>Tecido/Cor</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                <TableHead className="text-right">Preço unit.</TableHead>
                <TableHead className="text-right print:hidden">Custo unit.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right print:hidden">Margem/Lucro</TableHead>
                <TableHead className="text-right print:hidden">Produção</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedido.itens.map((item) => {
                const saldoEstoque = saldosProdutos.get(item.produtoId) ?? 0;
                const saldoSuficiente = saldoEstoque >= item.quantidade;
                return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.produto.nome}
                    <span className="block text-xs text-muted-foreground">
                      {tipoProdutoLabels[item.produto.tipo]}
                    </span>
                    <span
                      className={`block text-xs font-medium print:hidden ${
                        saldoSuficiente ? "text-[#0F6E56]" : "text-destructive/70"
                      }`}
                    >
                      {saldoEstoque} em estoque
                    </span>
                  </TableCell>
                  <TableCell>{item.produto.medida.nome}</TableCell>
                  <TableCell>
                    {[item.produto.tecido, item.produto.cor].filter(Boolean).join(" / ") || "—"}
                  </TableCell>
                  <TableCell className="text-right">{item.quantidade}</TableCell>
                  <TableCell className="text-right">
                    {formatadorMoeda.format(Number(item.precoUnitario))}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground print:hidden">
                    {formatadorMoeda.format(Number(item.custoUnitario))}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatadorMoeda.format(Number(item.precoUnitario) * item.quantidade)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground print:hidden">
                    {formatadorMoeda.format(
                      (Number(item.precoUnitario) - Number(item.custoUnitario)) * item.quantidade,
                    )}
                  </TableCell>
                  <TableCell className="text-right print:hidden">
                    {item.ordemProducao ? (
                      <Link
                        href="/producao"
                        className="inline-flex w-fit items-center gap-1 rounded-full bg-[#DFEAE6] px-2 py-0.5 text-xs font-medium text-[#0F6E56] hover:underline"
                      >
                        <CircleCheck className="size-3.5" />
                        OP #{item.ordemProducao.numero} ·{" "}
                        {statusOrdemProducaoLabels[item.ordemProducao.status]}
                      </Link>
                    ) : item.atendidoEstoque ? (
                      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#DFEAE6] px-2 py-0.5 text-xs font-medium text-[#0F6E56]">
                        <Warehouse className="size-3.5" />
                        Atendido do estoque
                      </span>
                    ) : (
                      <div className="flex flex-col items-end gap-1.5">
                        {saldoSuficiente && (
                          <form
                            action={async () => {
                              "use server";
                              await atenderItemDoEstoque(item.id);
                            }}
                          >
                            <Button
                              type="submit"
                              size="sm"
                              className="bg-[#DFEAE6] text-[#0F6E56] hover:bg-[#DFEAE6]/80"
                            >
                              <Warehouse />
                              Atender do estoque
                            </Button>
                          </form>
                        )}
                        <form
                          action={async () => {
                            "use server";
                            await gerarOrdemProducao(item.id);
                          }}
                        >
                          <Button
                            type="submit"
                            size="sm"
                            className="bg-[#C9622B] text-white hover:bg-[#C9622B]/90"
                          >
                            <Wrench />
                            Gerar OP
                          </Button>
                        </form>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex justify-end border-t pt-4">
          <p className="text-lg font-semibold">
            Total: {formatadorMoeda.format(Number(pedido.valorTotal))}
          </p>
        </div>

        <div className="mt-10 flex justify-end">
          <div className="flex flex-col items-end gap-1">
            <div className="w-56 border-b border-foreground/40" />
            <p className="text-sm font-semibold">{sessao.nome}</p>
            <p className="font-mono text-[0.65rem] tracking-widest text-muted-foreground uppercase">
              Representante
            </p>
          </div>
        </div>
      </div>

      <div>
        <div className="relative my-8 print:my-6">
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-muted-foreground/50" />
          <p className="relative mx-auto flex w-fit items-center gap-1.5 bg-background px-3 font-mono text-[0.65rem] tracking-widest text-muted-foreground uppercase">
            <Scissors className="size-3" />
            Cortar aqui · Canhoto fica com a PrimeBox
          </p>
        </div>

        <div className="rounded-lg border print:break-inside-avoid">
          <div className="flex flex-wrap items-start justify-between gap-4 p-4">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Cliente
              </p>
              <p className="font-medium">{nomeExibido}</p>
            </div>
            <p className="max-w-xs text-right text-sm text-muted-foreground">
              Confirmo o recebimento dos produtos citados acima, em perfeitas condições.
            </p>
          </div>
          <div className="grid grid-cols-[1fr_auto_auto] border-t">
            <div className="flex flex-col gap-6 p-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Assinatura do cliente
              </p>
              <div className="border-b border-foreground/40" />
            </div>
            <div className="flex flex-col gap-6 border-l p-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Data
              </p>
              <p className="text-sm text-muted-foreground">___ / ___ / ______</p>
            </div>
            <div className="flex flex-col gap-6 border-l p-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Pedido nº
              </p>
              <p className="text-sm font-semibold">#{pedido.numero}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-4 print:hidden">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Rentabilidade (uso interno, não aparece na impressão)
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Custo total</p>
            <p className="font-medium">{formatadorMoeda.format(custoTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Receita total</p>
            <p className="font-medium">{formatadorMoeda.format(valorTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Margem/Lucro</p>
            <p className="font-medium">
              {formatadorMoeda.format(margemTotal)} ({margemPercentual.toFixed(1)}%)
            </p>
          </div>
        </div>
      </div>

      {pedido.observacoes && (
        <div className="rounded-lg border p-4 print:hidden">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Observações (uso interno, não aparece na impressão)
          </p>
          <p className="mt-1 text-sm whitespace-pre-wrap">{pedido.observacoes}</p>
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg border p-4 print:hidden">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Expedição
        </p>
        {pedido.expedicao ? (
          <Button
            render={<Link href="/expedicao" />}
            nativeButton={false}
            variant="outline"
            size="sm"
          >
            <Truck />
            Exp. #{pedido.expedicao.numero} · {statusExpedicaoLabels[pedido.expedicao.status]}
          </Button>
        ) : (
          <Button
            render={<Link href={`/pedidos/${pedido.id}/expedicao/nova`} />}
            nativeButton={false}
            variant="outline"
            size="sm"
          >
            <Truck />
            Gerar expedição
          </Button>
        )}
      </div>
    </div>
  );
}
