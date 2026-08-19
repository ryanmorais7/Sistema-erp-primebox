"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";

export function AjudaCriarOp() {
  const [aberto, setAberto] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
      >
        <HelpCircle className="size-3.5" />
        Como funciona?
      </button>
      {aberto && (
        <p className="mt-2 text-sm text-muted-foreground">
          Adicione quantas linhas precisar, na ordem que preferir — a OP salva mantém exatamente
          essa ordem e o texto do Produto exatamente como foi digitado (sem trocar por um nome de
          catálogo). Se o cliente não tiver cadastro (ex: &quot;Avulso&quot;), vira uma OP avulsa,
          fora do fluxo formal de Pedidos. Se você escolher ou cadastrar um cliente, essa linha
          vira um Pedido formal de verdade, do jeito de sempre.
        </p>
      )}
    </div>
  );
}
