-- AlterTable
ALTER TABLE "OrdemAvulsa" ADD COLUMN     "concluidaConfirmada" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "concluidaConfirmada" BOOLEAN NOT NULL DEFAULT false;
