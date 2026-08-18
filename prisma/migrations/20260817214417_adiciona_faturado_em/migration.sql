-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "faturadoEm" TIMESTAMP(3);

-- Backfill: pedidos já faturados antes desta migração usam updatedAt
-- como melhor aproximação da data real de faturamento (era a convenção
-- anterior, ver ADR-009) — sem isso, sumiriam do relatório de
-- Faturamento por período, que passa a filtrar por faturadoEm.
UPDATE "Pedido" SET "faturadoEm" = "updatedAt" WHERE "status" = 'FATURADO' AND "faturadoEm" IS NULL;
