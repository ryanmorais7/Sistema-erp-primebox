-- CreateEnum
CREATE TYPE "StatusExpedicao" AS ENUM ('AGUARDANDO', 'EM_ROTA', 'ENTREGUE');

-- CreateTable
CREATE TABLE "Expedicao" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "transportadora" TEXT,
    "status" "StatusExpedicao" NOT NULL DEFAULT 'AGUARDANDO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expedicao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Expedicao_numero_key" ON "Expedicao"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Expedicao_pedidoId_key" ON "Expedicao"("pedidoId");

-- AddForeignKey
ALTER TABLE "Expedicao" ADD CONSTRAINT "Expedicao_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
