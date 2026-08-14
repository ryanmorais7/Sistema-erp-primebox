-- DropForeignKey
ALTER TABLE "Expedicao" DROP CONSTRAINT "Expedicao_pedidoId_fkey";

-- AlterTable
ALTER TABLE "Expedicao" ADD COLUMN     "itemOrdemAvulsaId" TEXT,
ALTER COLUMN "pedidoId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "OrdemAvulsa" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrdemAvulsa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemOrdemAvulsa" (
    "id" TEXT NOT NULL,
    "ordemAvulsaId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "clienteTexto" TEXT NOT NULL,
    "clienteId" TEXT,
    "observacao" TEXT,
    "precoUnitario" DECIMAL(10,2),
    "status" "StatusOrdemProducao" NOT NULL DEFAULT 'AGUARDANDO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemOrdemAvulsa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrdemAvulsa_numero_key" ON "OrdemAvulsa"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Expedicao_itemOrdemAvulsaId_key" ON "Expedicao"("itemOrdemAvulsaId");

-- AddForeignKey
ALTER TABLE "ItemOrdemAvulsa" ADD CONSTRAINT "ItemOrdemAvulsa_ordemAvulsaId_fkey" FOREIGN KEY ("ordemAvulsaId") REFERENCES "OrdemAvulsa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemOrdemAvulsa" ADD CONSTRAINT "ItemOrdemAvulsa_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemOrdemAvulsa" ADD CONSTRAINT "ItemOrdemAvulsa_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expedicao" ADD CONSTRAINT "Expedicao_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expedicao" ADD CONSTRAINT "Expedicao_itemOrdemAvulsaId_fkey" FOREIGN KEY ("itemOrdemAvulsaId") REFERENCES "ItemOrdemAvulsa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

