-- AlterTable
ALTER TABLE "ItemPedido" ADD COLUMN     "custoUnitario" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "custo" DECIMAL(10,2) NOT NULL DEFAULT 0;
