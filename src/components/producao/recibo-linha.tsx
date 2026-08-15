import { Box, Scissors } from "lucide-react";
import { ImprimirButton } from "@/components/pedidos/imprimir-button";
import { AutoImprimir } from "@/components/pedidos/auto-imprimir";

const formatadorMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

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
  produtoNome: string;
  medidaNome?: string | null;
  tecidoCor?: string | null;
  quantidade: number;
  precoUnitario?: number | null;
  observacao?: string | null;
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
  produtoNome,
  medidaNome,
  tecidoCor,
  quantidade,
  precoUnitario,
  observacao,
  representanteNome,
  autoImprimir,
}: ReciboLinhaProps) {
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

        <div className="mt-6 grid gap-2 rounded-lg border p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Produto</p>
            <p className="font-medium">{produtoNome}</p>
            {(medidaNome || tecidoCor) && (
              <p className="text-sm text-muted-foreground">
                {[medidaNome, tecidoCor].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <div className="sm:text-right">
            <p className="text-xs text-muted-foreground">Quantidade</p>
            <p className="font-medium">{quantidade}</p>
            {precoUnitario != null && (
              <p className="text-sm text-muted-foreground">
                {formatadorMoeda.format(precoUnitario)}/un ·{" "}
                {formatadorMoeda.format(precoUnitario * quantidade)}
              </p>
            )}
          </div>
        </div>

        {observacao && (
          <p className="mt-4 text-sm whitespace-pre-wrap text-muted-foreground">{observacao}</p>
        )}
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

        <div className="mt-10 flex justify-end print:break-inside-avoid">
          <div className="flex flex-col items-end gap-1">
            <div className="w-56 border-b border-foreground/40" />
            <p className="text-sm font-semibold">{representanteNome}</p>
            <p className="font-mono text-[0.65rem] tracking-widest text-muted-foreground uppercase">
              Representante
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
