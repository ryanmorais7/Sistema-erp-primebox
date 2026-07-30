import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Medidas padrão do mercado de bases/colchões (ver ADR-002).
// Cadastradas como dados, não como enum, para permitir adicionar ou
// desativar uma medida no futuro sem alteração de código.
const medidasPadrao = [
  { nome: "Solteiro", ordem: 1 },
  { nome: "Casal", ordem: 2 },
  { nome: "Queen", ordem: 3 },
  { nome: "King", ordem: 4 },
  { nome: "Super King", ordem: 5 },
];

async function main() {
  for (const medida of medidasPadrao) {
    await prisma.medida.upsert({
      where: { nome: medida.nome },
      update: { ordem: medida.ordem },
      create: medida,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (erro) => {
    console.error(erro);
    await prisma.$disconnect();
    process.exit(1);
  });
