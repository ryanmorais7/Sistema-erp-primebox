"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

type SecaoRecolhivelProps = {
  titulo: string;
  contador?: number;
  children: ReactNode;
  defaultAberta?: boolean;
};

export function SecaoRecolhivel({
  titulo,
  contador,
  children,
  defaultAberta = true,
}: SecaoRecolhivelProps) {
  const [aberta, setAberta] = useState(defaultAberta);

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between border-b p-3">
        <p className="font-heading text-sm font-semibold">
          {titulo}
          {typeof contador === "number" && (
            <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
              ({contador})
            </span>
          )}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setAberta((valor) => !valor)}
          aria-label={aberta ? "Minimizar lista" : "Maximizar lista"}
          title={aberta ? "Minimizar" : "Maximizar"}
        >
          {aberta ? <ChevronUp /> : <ChevronDown />}
        </Button>
      </div>
      {aberta && children}
    </div>
  );
}
