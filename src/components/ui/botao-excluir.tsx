"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ResultadoExclusao = { success: true } | { success: false; error: string };

export function BotaoExcluir({
  acao,
  confirmacao,
  label = "Excluir",
}: {
  acao: () => Promise<ResultadoExclusao>;
  confirmacao: string;
  label?: string;
}) {
  const [excluindo, setExcluindo] = useState(false);

  async function aoClicar() {
    if (!window.confirm(confirmacao)) return;
    setExcluindo(true);
    const resultado = await acao();
    setExcluindo(false);
    if (!resultado.success) {
      window.alert(resultado.error);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label={label}
      title={label}
      disabled={excluindo}
      onClick={aoClicar}
    >
      <Trash2 />
    </Button>
  );
}
