-- AlterTable
ALTER TABLE "Usuario" ALTER COLUMN "senhaHash" DROP NOT NULL;
ALTER TABLE "Usuario" ADD COLUMN "tokenConviteHash" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "tokenConviteExpiraEm" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_tokenConviteHash_key" ON "Usuario"("tokenConviteHash");
