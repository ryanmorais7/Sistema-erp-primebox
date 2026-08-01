import { FileDown, MessageCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ImprimirButton } from "@/components/pedidos/imprimir-button";
import { tipoProdutoLabels } from "@/lib/validations/produto";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  return partes.length ? partes.join(" — ") : null;
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function VisualizarPedidoPage({ params }: PageProps) {
  const { id } = await params;

  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: { cliente: true, itens: { include: { produto: { include: { medida: true } } } } },
  });

  if (!pedido) {
    notFound();
  }

  const endereco = formatarEndereco(pedido.cliente);
  const documento = formatarDocumento(pedido.cliente.cnpj, pedido.cliente.cpf);

  return (
    <div className="flex flex-col gap-6 print:gap-4">
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
          <div>
            <p className="font-heading text-lg font-semibold">PrimeBox</p>
            <p className="text-sm text-muted-foreground">Sistema de gestão — uso interno</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm">Pedido #{pedido.numero}</p>
            <p className="text-sm text-muted-foreground">
              {formatadorData.format(pedido.createdAt)}
            </p>
            {pedido.status === "FATURADO" ? (
              <Badge className="mt-1 bg-positive-soft text-positive">Faturado</Badge>
            ) : (
              <Badge className="mt-1" variant="secondary">
                Em carteira
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Cliente
          </p>
          <p className="font-medium">{pedido.cliente.nomeFantasia || pedido.cliente.razaoSocial}</p>
          {pedido.cliente.nomeFantasia && (
            <p className="text-sm text-muted-foreground">{pedido.cliente.razaoSocial}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {[documento, pedido.cliente.telefone].filter(Boolean).join(" · ")}
          </p>
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
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedido.itens.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.produto.nome}
                    <span className="block text-xs text-muted-foreground">
                      {tipoProdutoLabels[item.produto.tipo]}
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
                  <TableCell className="text-right">
                    {formatadorMoeda.format(Number(item.precoUnitario) * item.quantidade)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex justify-end border-t pt-4">
          <p className="text-lg font-semibold">
            Total: {formatadorMoeda.format(Number(pedido.valorTotal))}
          </p>
        </div>
      </div>

      {pedido.observacoes && (
        <div className="rounded-lg border p-4 print:hidden">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Observações (uso interno — não aparece na impressão)
          </p>
          <p className="mt-1 text-sm whitespace-pre-wrap">{pedido.observacoes}</p>
        </div>
      )}
    </div>
  );
}
