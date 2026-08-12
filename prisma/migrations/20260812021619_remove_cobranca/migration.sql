/*
  Warnings:

  - You are about to drop the `Cobranca` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Cobranca" DROP CONSTRAINT "Cobranca_pedidoId_fkey";

-- DropTable
DROP TABLE "Cobranca";

-- DropEnum
DROP TYPE "StatusCobranca";
