-- A PrimeBox fabrica só Base, Unibox (box + colchão juntos) e Baú —
-- colchão avulso não é um produto que a fábrica produz. Este catálogo
-- foi confirmado com o Pedro depois do MVP inicial (ver ADR-015).
--
-- CreateEnum (novo, com os dados existentes preservados)
CREATE TYPE "TipoProduto_new" AS ENUM ('BASE', 'UNIBOX', 'BAU');

ALTER TABLE "Produto"
  ALTER COLUMN "tipo" TYPE "TipoProduto_new"
  USING (
    CASE "tipo"::text
      WHEN 'COLCHAO' THEN 'UNIBOX'
      WHEN 'CONJUNTO_BOX' THEN 'UNIBOX'
      ELSE "tipo"::text
    END
  )::"TipoProduto_new";

DROP TYPE "TipoProduto";
ALTER TYPE "TipoProduto_new" RENAME TO "TipoProduto";
