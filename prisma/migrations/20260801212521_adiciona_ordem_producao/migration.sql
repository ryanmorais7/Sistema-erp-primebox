-- CreateEnum
CREATE TYPE "StatusOrdemProducao" AS ENUM ('AGUARDANDO', 'EM_PRODUCAO', 'CONCLUIDO');

-- CreateTable
CREATE TABLE "OrdemProducao" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "itemPedidoId" TEXT NOT NULL,
    "status" "StatusOrdemProducao" NOT NULL DEFAULT 'AGUARDANDO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrdemProducao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrdemProducao_numero_key" ON "OrdemProducao"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "OrdemProducao_itemPedidoId_key" ON "OrdemProducao"("itemPedidoId");

-- AddForeignKey
ALTER TABLE "OrdemProducao" ADD CONSTRAINT "OrdemProducao_itemPedidoId_fkey" FOREIGN KEY ("itemPedidoId") REFERENCES "ItemPedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;
