-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "tentativasFalhas" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Usuario" ADD COLUMN "bloqueadoAte" TIMESTAMP(3);
