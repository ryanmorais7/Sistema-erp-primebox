"use client";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

type ClientePopoverProps = {
  principal: string;
  extras: string[];
};

// OP avulsa com vários clientes: mostra só o primeiro nome + "N clientes",
// clicável — abre um popover com os demais. A linha inteira (fora deste
// botão) continua navegando pro recibo da OP ao clicar, então o trigger
// para a propagação do clique pra não brigar com esse comportamento.
export function ClientePopover({ principal, extras }: ClientePopoverProps) {
  return (
    <span className="inline-flex items-center gap-1">
      {principal}
      <Popover>
        <PopoverTrigger
          onClick={(e) => e.stopPropagation()}
          className="text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
        >
          + {extras.length} {extras.length === 1 ? "cliente" : "clientes"}
        </PopoverTrigger>
        <PopoverContent onClick={(e) => e.stopPropagation()}>
          <p className="mb-1 px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Demais clientes
          </p>
          <ul className="flex flex-col gap-0.5 text-sm">
            {extras.map((nome) => (
              <li key={nome} className="rounded-md px-1 py-1">
                {nome}
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </span>
  );
}
