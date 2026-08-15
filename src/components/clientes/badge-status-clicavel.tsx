"use client";

import { useState } from "react";
import { alternarAtivoCliente } from "@/app/(app)/clientes/actions";
import { Badge } from "@/components/ui/badge";

type BadgeStatusClicavelProps = {
  clienteId: string;
  nome: string;
  ativo: boolean;
};

export function BadgeStatusClicavel({ clienteId, nome, ativo }: BadgeStatusClicavelProps) {
  const [pendente, setPendente] = useState(false);

  async function aoClicar() {
    const acao = ativo ? "desativar" : "ativar";
    if (!window.confirm(`Quer ${acao} "${nome}"?`)) return;
    setPendente(true);
    await alternarAtivoCliente(clienteId, !ativo);
    setPendente(false);
  }

  return (
    <button
      type="button"
      onClick={aoClicar}
      disabled={pendente}
      className="cursor-pointer disabled:opacity-50"
      title={ativo ? "Clique pra desativar" : "Clique pra ativar"}
    >
      {ativo ? (
        <Badge className="bg-positive-soft text-positive">Ativo</Badge>
      ) : (
        <Badge variant="secondary">Inativo</Badge>
      )}
    </button>
  );
}
