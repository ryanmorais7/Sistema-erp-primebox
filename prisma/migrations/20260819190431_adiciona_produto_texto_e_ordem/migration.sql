-- AlterTable: ItemPedido
ALTER TABLE "ItemPedido" ADD COLUMN     "ordem" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "produtoTexto" TEXT;

-- Backfill: registros já existentes não têm como recuperar o texto
-- exatamente como foi digitado (nunca foi guardado) — usa o nome do
-- produto vinculado como melhor aproximação (ver ADR-035).
UPDATE "ItemPedido" ip
SET "produtoTexto" = p."nome"
FROM "Produto" p
WHERE p."id" = ip."produtoId";

ALTER TABLE "ItemPedido" ALTER COLUMN "produtoTexto" SET NOT NULL;

-- Backfill de "ordem": preserva a ordem relativa atual (por id — a
-- tabela não tem createdAt) por Pedido — não é a ordem de digitação
-- original (perdida), só evita que os registros antigos fiquem todos
-- empatados em 0 depois desta migração.
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "pedidoId" ORDER BY "id" ASC) - 1 AS rn
  FROM "ItemPedido"
)
UPDATE "ItemPedido" ip
SET "ordem" = ranked.rn
FROM ranked
WHERE ranked."id" = ip."id";

-- AlterTable: ItemOrdemAvulsa
ALTER TABLE "ItemOrdemAvulsa" ADD COLUMN     "ordem" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "produtoTexto" TEXT;

UPDATE "ItemOrdemAvulsa" ia
SET "produtoTexto" = p."nome"
FROM "Produto" p
WHERE p."id" = ia."produtoId";

ALTER TABLE "ItemOrdemAvulsa" ALTER COLUMN "produtoTexto" SET NOT NULL;

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "ordemAvulsaId" ORDER BY "createdAt" ASC, "id" ASC) - 1 AS rn
  FROM "ItemOrdemAvulsa"
)
UPDATE "ItemOrdemAvulsa" ia
SET "ordem" = ranked.rn
FROM ranked
WHERE ranked."id" = ia."id";
