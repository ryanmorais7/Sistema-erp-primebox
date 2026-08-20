import { Box, Scissors } from "lucide-react";
import { ImprimirButton } from "@/components/pedidos/imprimir-button";
import { AutoImprimir } from "@/components/pedidos/auto-imprimir";

const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export type ItemRecibo = {
  produtoNome: string;
  quantidade: number;
  precoUnitario?: number | null;
  observacao?: string | null;
};

type ReciboLinhaProps = {
  titulo: string;
  numeroLabel: string;
  // Já formatada por quem chama — data de criação (timestamp real) e
  // data programada (coluna @db.Date, só data) precisam de fusos
  // horários diferentes pra não voltar um dia, então cada página decide.
  dataFormatada: string;
  clienteNome: string;
  clienteSecundaria?: string | null;
  clienteEndereco?: string | null;
  // Um recibo pode cobrir vários itens da mesma OP (ex: 3 produtos
  // diferentes pro mesmo cliente) — sempre um array, mesmo quando é 1 só.
  itens: ItemRecibo[];
  // Observação geral do pedido (Pedido.observacoes, formal) — diferente
  // da observação por item (avulsa), mostrada dentro de cada linha.
  observacaoGeral?: string | null;
  // Só existe do lado Pedido (Pedido.formaPagamento) — OP avulsa nunca
  // passa esse prop, então o bloco simplesmente não aparece (ver
  // ADR sobre forma de pagamento).
  formaPagamento?: string | null;
  representanteNome: string;
  autoImprimir: boolean;
};

export function ReciboLinha({
  titulo,
  numeroLabel,
  dataFormatada,
  clienteNome,
  clienteSecundaria,
  clienteEndereco,
  itens,
  observacaoGeral,
  formaPagamento,
  representanteNome,
  autoImprimir,
}: ReciboLinhaProps) {
  const totalQuantidade = itens.reduce((total, item) => total + item.quantidade, 0);
  const temPreco = itens.some((item) => item.precoUnitario != null);
  const totalGeral = itens.reduce(
    (total, item) => total + (item.precoUnitario ?? 0) * item.quantidade,
    0,
  );
  // Com muitos itens (planilhas grandes lançadas de uma vez), aperta só
  // o espaçamento vertical das linhas pra caber até ~15 itens numa
  // folha só sem empurrar o canhoto pra uma segunda página — a fonte
  // NUNCA diminui (continua text-sm/14px, a mesma de sempre), só o
  // padding das células. Testado com 15 itens gerando o PDF de verdade
  // (Chromium print, não só a tela): py-2 já estoura pra 2 páginas,
  // py-1.5 é o maior padding que ainda cabe numa página só.
  const compacto = itens.length > 8;
  const paddingCelula = compacto ? "px-3 py-1.5" : "p-3";
  return (
    <div className="flex flex-col gap-6 print:gap-4">
      <AutoImprimir ativo={autoImprimir} />
      <div className="flex items-start justify-between print:hidden">
        <div>
          <p className="font-mono text-[0.7rem] tracking-widest text-brand uppercase">
            PrimeBox ERP
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        </div>
        <ImprimirButton />
      </div>

      {/* Container do tamanho de uma folha A4 em coluna flexível — o
          conteúdo principal cresce (flex-1) e o canhoto (mt-auto, fora
          desse crescimento) fica sempre grudado no rodapé, mesmo com
          poucos itens. Se o conteúdo passar de uma página, o canhoto só
          aparece no fim do fluxo normal (sem position fixed/absolute),
          então nunca se repete. */}
      <div className="mx-auto flex min-h-[297mm] w-full max-w-[800px] flex-col print:min-h-[277mm]">
      <div className="flex-1">
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
            <p className="font-mono text-sm">{numeroLabel}</p>
            <p className="text-sm text-muted-foreground">{dataFormatada}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Cliente
          </p>
          <p className="font-medium">{clienteNome}</p>
          {clienteSecundaria && (
            <p className="text-sm text-muted-foreground">{clienteSecundaria}</p>
          )}
          {clienteEndereco && <p className="text-sm text-muted-foreground">{clienteEndereco}</p>}
        </div>

        {formaPagamento && (
          <div className="mt-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Forma de pagamento
            </p>
            <p className="font-medium">{formaPagamento}</p>
          </div>
        )}

        <div className={`overflow-hidden rounded-lg border ${compacto ? "mt-4" : "mt-6"}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                <th className={`${paddingCelula} text-left font-bold`}>Produto</th>
                <th className={`${paddingCelula} text-center font-bold`}>Qtd.</th>
                <th className={`${paddingCelula} text-right font-bold`}>Preço unit.</th>
                <th className={`${paddingCelula} text-right font-bold`}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, index) => (
                <tr key={index} className="border-b last:border-0">
                  <td className={paddingCelula}>
                    <p className="font-medium">{item.produtoNome}</p>
                    {item.observacao && (
                      <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
                        {item.observacao}
                      </p>
                    )}
                  </td>
                  <td className={`${paddingCelula} text-center font-medium`}>{item.quantidade}</td>
                  <td className={`${paddingCelula} text-right text-muted-foreground`}>
                    {item.precoUnitario != null ? formatadorMoeda.format(item.precoUnitario) : "—"}
                  </td>
                  <td className={`${paddingCelula} text-right font-medium`}>
                    {item.precoUnitario != null
                      ? formatadorMoeda.format(item.precoUnitario * item.quantidade)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            {itens.length > 1 && (
              <tfoot>
                <tr className="border-t-2 border-foreground/30 bg-muted/20">
                  <td className={`${paddingCelula} font-bold`}>Total</td>
                  <td className={`${paddingCelula} text-center font-bold`}>{totalQuantidade}</td>
                  <td className={paddingCelula}></td>
                  <td className={`${paddingCelula} text-right font-bold`}>
                    {temPreco ? formatadorMoeda.format(totalGeral) : "—"}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {temPreco && (
          <div className="relative mt-8 pt-6 print:mt-4 print:pt-3">
            <div className="absolute inset-x-0 top-0 border-t border-dashed border-muted-foreground/50" />
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-xs font-bold tracking-widest uppercase">
                Total dos pedidos
              </p>
              <p className="text-xl font-bold">{formatadorMoeda.format(totalGeral)}</p>
            </div>
          </div>
        )}

        {observacaoGeral && (
          <p className="mt-4 text-sm whitespace-pre-wrap text-muted-foreground">{observacaoGeral}</p>
        )}
      </div>

      <div className="mt-10 flex justify-end print:mt-6 print:break-inside-avoid">
        <div className="flex flex-col items-end gap-1">
          <div className="w-56 border-b border-foreground/40" />
          <p className="text-sm font-semibold">{representanteNome}</p>
          <p className="font-mono text-[0.65rem] tracking-widest text-muted-foreground uppercase">
            Representante
          </p>
        </div>
      </div>
      </div>

      <div className="mt-auto">
        <div className="relative my-8 print:my-4">
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
              <p className="font-medium">{clienteNome}</p>
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
                {numeroLabel.startsWith("OP") ? "OP nº" : "Pedido nº"}
              </p>
              <p className="text-sm font-semibold">{numeroLabel}</p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
