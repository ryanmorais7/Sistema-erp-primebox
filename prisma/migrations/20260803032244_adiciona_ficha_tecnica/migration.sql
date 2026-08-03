-- CreateTable
CREATE TABLE "ConsumoMateriaPrima" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "materiaPrimaId" TEXT NOT NULL,
    "quantidade" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsumoMateriaPrima_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsumoMateriaPrima_produtoId_materiaPrimaId_key" ON "ConsumoMateriaPrima"("produtoId", "materiaPrimaId");

-- AddForeignKey
ALTER TABLE "ConsumoMateriaPrima" ADD CONSTRAINT "ConsumoMateriaPrima_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumoMateriaPrima" ADD CONSTRAINT "ConsumoMateriaPrima_materiaPrimaId_fkey" FOREIGN KEY ("materiaPrimaId") REFERENCES "MateriaPrima"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
