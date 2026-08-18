"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SUGESTOES = ["Pix", "Cartão de Crédito", "Boleto", "Cheque"];

type FormaPagamentoFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export function FormaPagamentoField({ value, onChange }: FormaPagamentoFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Input
        placeholder="Ex: Pix, Boleto 30/60 dias, etc."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="flex flex-wrap gap-1.5">
        {SUGESTOES.map((sugestao) => (
          <Button
            key={sugestao}
            type="button"
            variant="outline"
            size="xs"
            onClick={() => onChange(sugestao)}
          >
            {sugestao}
          </Button>
        ))}
      </div>
    </div>
  );
}
