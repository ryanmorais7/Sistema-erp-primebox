"use client";

import { useEffect } from "react";

export function AutoImprimir({ ativo }: { ativo: boolean }) {
  useEffect(() => {
    if (ativo) {
      window.print();
    }
  }, [ativo]);

  return null;
}
