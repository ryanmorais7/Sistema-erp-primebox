"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { confirmarConclusaoGrupo } from "@/app/(app)/producao/actions";
import { confirmarConclusaoGrupoAvulsa } from "@/app/(app)/producao/ordem-avulsa/actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogClose,
} from "@/components/ui/alert-dialog";

type ConfirmarConclusaoButtonProps = {
  grupoOpId: string;
  origem: "formal" | "avulsa";
};

// Botão "Marcar como concluída" do cabeçalho da OP — ação em lote e
// explícita (ver ADR-033): marca qualquer item que ainda não estiver
// "Feito" e só então confirma a OP inteira, sempre atrás de um modal
// de confirmação (pra não virar clique acidental).
export function ConfirmarConclusaoButton({ grupoOpId, origem }: ConfirmarConclusaoButtonProps) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmar() {
    startTransition(async () => {
      if (origem === "formal") {
        await confirmarConclusaoGrupo(grupoOpId);
      } else {
        await confirmarConclusaoGrupoAvulsa(grupoOpId);
      }
      setAberto(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={aberto} onOpenChange={setAberto}>
      <AlertDialogTrigger
        render={
          <Button type="button" variant="outline" size="sm">
            <CheckCircle2 />
            Marcar como concluída
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogTitle>Confirma que esta OP foi concluída?</AlertDialogTitle>
        <AlertDialogDescription>
          Qualquer item ainda não marcado como &quot;Feito&quot; vai ser concluído junto. Essa ação
          é o que faz a OP aparecer como concluída nos cards de dia e semana.
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button type="button" variant="outline" disabled={pending} />}>
            Cancelar
          </AlertDialogClose>
          <Button
            type="button"
            onClick={confirmar}
            disabled={pending}
            className="bg-[#C9622B] text-white hover:bg-[#C9622B]/90"
          >
            {pending ? "Confirmando..." : "Sim, concluída"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
