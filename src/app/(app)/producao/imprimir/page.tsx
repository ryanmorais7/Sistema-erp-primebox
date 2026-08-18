import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buscarCartoesProducao, coresAlternadasPorCliente } from "@/lib/producaoCartoes";
import { FolhaProducao, type LinhaFolha } from "@/components/producao/folha-producao";
import { ImprimirButton } from "@/components/pedidos/imprimir-button";

// Lista ordens de produção ao vivo do banco; nunca deve ser pré-renderizada no build.
export const dynamic = "force-dynamic";

// Folha de impressão/seleção de Produção — tela própria, fora do
// dashboard principal (/producao), pra não competir como bloco
// "principal" da tela de mês. Só chega aqui quem clica em "Imprimir".
export default async function ProducaoImprimirPage() {
  const cartoes = await buscarCartoesProducao();

  // Ordenado por data programada e, dentro do mesmo dia (ou "sem
  // data"), por cliente — sem isso, a lista cai na ordem de criação
  // pura e itens de clientes diferentes ficam intercalados na folha
  // impressa, com só a cor alternada (fraca) tentando separar. Pedro
  // relatou "um produto de um cliente se mistura com o outro" — a
  // causa raiz era essa falta de agrupamento visual real.
  const pendentes = cartoes
    .filter((cartao) => cartao.status !== "CONCLUIDO")
    .sort((a, b) => {
      const dataA = a.dataProgramada ? a.dataProgramada.getTime() : Infinity;
      const dataB = b.dataProgramada ? b.dataProgramada.getTime() : Infinity;
      if (dataA !== dataB) return dataA - dataB;
      return (
        a.clienteLabel.localeCompare(b.clienteLabel) || a.createdAt.getTime() - b.createdAt.getTime()
      );
    });
  const coresPorCliente = coresAlternadasPorCliente(pendentes);
  const totalPecas = pendentes.reduce((total, cartao) => total + cartao.quantidade, 0);
  const fonteFolha =
    pendentes.length <= 4 ? "text-xl" : pendentes.length <= 7 ? "text-base" : pendentes.length <= 10 ? "text-sm" : "text-xs";
  const linhas: LinhaFolha[] = pendentes.map((cartao) => ({
    id: `${cartao.origem}-${cartao.id}`,
    quantidade: cartao.quantidade,
    produtoTexto: cartao.produtoTexto,
    clienteLabel: cartao.clienteLabel,
    observacao: cartao.observacao,
    corGrupo: coresPorCliente.get(`${cartao.origem}-${cartao.id}`) ?? "peach",
    dataProgramadaIso: cartao.dataProgramada ? cartao.dataProgramada.toISOString() : null,
    opGrupoId: cartao.grupoOpId,
    opNumeroLabel: cartao.numeroLabel,
  }));

  return (
    <div className="flex flex-col gap-6 print:gap-4">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/producao"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          <ArrowLeft className="size-4" />
          Voltar pra Produção
        </Link>
        <ImprimirButton />
      </div>
      <FolhaProducao linhas={linhas} totalPecas={totalPecas} fonteFolha={fonteFolha} />
    </div>
  );
}
