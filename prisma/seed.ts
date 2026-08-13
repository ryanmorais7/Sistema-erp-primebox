import bcrypt from "bcryptjs";
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

// Clientes e produtos de exemplo pro ambiente de teste (branch/preview
// "teste") — nunca roda em produção (ver checagem de VERCEL_ENV mais
// abaixo). Dá pro Ryan já ter o que testar sem precisar cadastrar nada
// na mão toda vez que o ambiente de teste é recriado.
const clientesExemplo = [
  { razaoSocial: "Fabiano Colchões Ltda", nomeFantasia: "Fabiano Colchões", telefone: "11987650001" },
  { razaoSocial: "Meu Conforto Móveis Ltda", nomeFantasia: "Meu Conforto", telefone: "11987650002" },
  { razaoSocial: "Colchões Bom Sono Ltda", nomeFantasia: "Bom Sono", telefone: "11987650003" },
  { razaoSocial: "Dorma Bem Colchões Ltda", nomeFantasia: "Dorma Bem", telefone: "11987650004" },
  { razaoSocial: "Sono Fácil Enxovais Ltda", nomeFantasia: "Sono Fácil", telefone: "11987650005" },
  { razaoSocial: "Casa do Colchão Comércio Ltda", nomeFantasia: "Casa do Colchão", telefone: "11987650006" },
];

const produtosExemplo = [
  { nome: "Base Solteiro Suede Cinza", tipo: "BASE" as const, medida: "Solteiro", tecido: "Suede", cor: "Cinza", preco: 350, custo: 150 },
  { nome: "Base Casal Courino Preto", tipo: "BASE" as const, medida: "Casal", tecido: "Courino", cor: "Preto", preco: 450, custo: 200 },
  { nome: "Base Queen Linho Bege", tipo: "BASE" as const, medida: "Queen", tecido: "Linho", cor: "Bege", preco: 550, custo: 250 },
  { nome: "Unibox King Suede Marrom", tipo: "UNIBOX" as const, medida: "King", tecido: "Suede", cor: "Marrom", preco: 850, custo: 400 },
  { nome: "Baú Casal Veludo Azul", tipo: "BAU" as const, medida: "Casal", tecido: "Veludo", cor: "Azul", preco: 700, custo: 350 },
  { nome: "Base Super King Linho Grafite", tipo: "BASE" as const, medida: "Super King", tecido: "Linho", cor: "Grafite", preco: 950, custo: 450 },
];

async function main() {
  for (const medida of medidasPadrao) {
    await prisma.medida.upsert({
      where: { nome: medida.nome },
      update: { ordem: medida.ordem },
      create: medida,
    });
  }

  // Só popula dados de exemplo no ambiente de preview (branch "teste"),
  // nunca em produção — lá é só a Medida acima, como sempre foi.
  if (process.env.VERCEL_ENV === "preview") {
    const senhaHash = await bcrypt.hash("Teste@Primebox2026", 10);
    await prisma.usuario.upsert({
      where: { email: "ryan.testes@primebox.local" },
      update: { senhaHash, ativo: true },
      create: {
        nome: "Ryan Morais - Testes",
        email: "ryan.testes@primebox.local",
        senhaHash,
        papel: "DESENVOLVEDOR",
        ativo: true,
      },
    });

    for (const cliente of clientesExemplo) {
      const existente = await prisma.cliente.findFirst({ where: { razaoSocial: cliente.razaoSocial } });
      if (!existente) {
        await prisma.cliente.create({ data: cliente });
      }
    }

    const medidas = await prisma.medida.findMany();
    const medidaPorNome = new Map(medidas.map((m) => [m.nome, m.id]));

    for (const produto of produtosExemplo) {
      const medidaId = medidaPorNome.get(produto.medida);
      if (!medidaId) continue;
      const existente = await prisma.produto.findFirst({ where: { nome: produto.nome } });
      if (!existente) {
        await prisma.produto.create({
          data: {
            nome: produto.nome,
            tipo: produto.tipo,
            medidaId,
            tecido: produto.tecido,
            cor: produto.cor,
            preco: produto.preco,
            custo: produto.custo,
          },
        });
      }
    }
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
