"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImprimirButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      <Printer />
      Imprimir
    </Button>
  );
}
