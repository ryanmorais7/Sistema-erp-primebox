import { Fragment } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type PassoNavegacao = { numero: 1 | 2 | 3; label: string; href?: string };

type NavegacaoPassosProps = {
  passos: PassoNavegacao[];
  atual: 1 | 2 | 3;
};

// Indicador "① Mês › ② Dia › ③ OP do dia" no topo das 3 telas da
// navegação — sem registro do design visual original aprovado (não
// encontrado no contexto disponível), então esta é uma versão própria
// usando as cores já existentes no resto do sistema (copper #C9622B).
export function NavegacaoPassos({ passos, atual }: NavegacaoPassosProps) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      {passos.map((passo, indice) => {
        const ehAtual = passo.numero === atual;
        const conteudo = (
          <>
            <span
              className={`flex size-4 items-center justify-center rounded-full text-[0.65rem] font-semibold ${
                ehAtual ? "bg-white/25" : "border border-muted-foreground/40"
              }`}
            >
              {passo.numero}
            </span>
            {passo.label}
          </>
        );
        return (
          <Fragment key={passo.numero}>
            {indice > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />}
            {ehAtual ? (
              <span
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium text-white"
                style={{ backgroundColor: "#C9622B" }}
              >
                {conteudo}
              </span>
            ) : passo.href ? (
              <Link
                href={passo.href}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
              >
                {conteudo}
              </Link>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-muted-foreground/50">
                {conteudo}
              </span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
