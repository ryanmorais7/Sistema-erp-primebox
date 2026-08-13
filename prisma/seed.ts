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

// Nomes da primeira leva de exemplo (ver commit anterior) — plausíveis
// demais pro ramo de colchões. "Meu Conforto" bateu em cheio com o
// nome real de um cliente do Pedro numa importação de teste do Ryan:
// o sistema achou que já existia (o exemplo fake) e o pedido importado
// foi parar vinculado a ele em vez de criar um cliente novo de
// verdade. Ficam registrados aqui só pra a migração de limpeza abaixo
// achar e desfazer esse cruzamento.
const NOMES_EXEMPLO_ANTIGOS = [
  "Fabiano Colchões Ltda",
  "Meu Conforto Móveis Ltda",
  "Colchões Bom Sono Ltda",
  "Dorma Bem Colchões Ltda",
  "Sono Fácil Enxovais Ltda",
  "Casa do Colchão Comércio Ltda",
];

// Clientes e produtos de exemplo pro ambiente de teste (branch/preview
// "teste") — nunca roda em produção (ver checagem de VERCEL_ENV mais
// abaixo). Nomes com prefixo "Exemplo" de propósito, pra nunca colidir
// com um nome real que o Ryan digite ou importe numa planilha de teste.
const clientesExemplo = [
  { razaoSocial: "Exemplo Cliente 1 — Fabiano Colchões", nomeFantasia: "Exemplo 1 (Fabiano)", telefone: "11987650001" },
  { razaoSocial: "Exemplo Cliente 2 — Meu Conforto", nomeFantasia: "Exemplo 2 (Meu Conforto)", telefone: "11987650002" },
  { razaoSocial: "Exemplo Cliente 3 — Bom Sono", nomeFantasia: "Exemplo 3 (Bom Sono)", telefone: "11987650003" },
  { razaoSocial: "Exemplo Cliente 4 — Dorma Bem", nomeFantasia: "Exemplo 4 (Dorma Bem)", telefone: "11987650004" },
  { razaoSocial: "Exemplo Cliente 5 — Sono Fácil", nomeFantasia: "Exemplo 5 (Sono Fácil)", telefone: "11987650005" },
  { razaoSocial: "Exemplo Cliente 6 — Casa do Colchão", nomeFantasia: "Exemplo 6 (Casa do Colchão)", telefone: "11987650006" },
];

const produtosExemplo = [
  { nome: "Exemplo Produto 1 — Base Solteiro Suede Cinza", tipo: "BASE" as const, medida: "Solteiro", tecido: "Suede", cor: "Cinza", preco: 350, custo: 150 },
  { nome: "Exemplo Produto 2 — Base Casal Courino Preto", tipo: "BASE" as const, medida: "Casal", tecido: "Courino", cor: "Preto", preco: 450, custo: 200 },
  { nome: "Exemplo Produto 3 — Base Queen Linho Bege", tipo: "BASE" as const, medida: "Queen", tecido: "Linho", cor: "Bege", preco: 550, custo: 250 },
  { nome: "Exemplo Produto 4 — Unibox King Suede Marrom", tipo: "UNIBOX" as const, medida: "King", tecido: "Suede", cor: "Marrom", preco: 850, custo: 400 },
  { nome: "Exemplo Produto 5 — Baú Casal Veludo Azul", tipo: "BAU" as const, medida: "Casal", tecido: "Veludo", cor: "Azul", preco: 700, custo: 350 },
  { nome: "Exemplo Produto 6 — Base Super King Linho Grafite", tipo: "BASE" as const, medida: "Super King", tecido: "Linho", cor: "Grafite", preco: 950, custo: 450 },
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
    // Migração única: desfaz o cruzamento de nome dos exemplos antigos
    // (ver NOMES_EXEMPLO_ANTIGOS acima) — apaga só o que ficou
    // indevidamente vinculado a eles por causa da colisão de nome, e
    // depois remove os clientes de exemplo antigos.
    const clientesAntigos = await prisma.cliente.findMany({
      where: { razaoSocial: { in: NOMES_EXEMPLO_ANTIGOS } },
      include: { pedidos: { include: { itens: { include: { ordemProducao: true } } } } },
    });
    for (const cliente of clientesAntigos) {
      for (const pedido of cliente.pedidos) {
        console.log(
          `[seed] Removendo pedido #${pedido.numero} que tinha ficado vinculado ao cliente de exemplo antigo "${cliente.razaoSocial}" por colisão de nome — refaça a importação depois desse deploy.`,
        );
        for (const item of pedido.itens) {
          if (item.ordemProducao) {
            await prisma.ordemProducao.delete({ where: { id: item.ordemProducao.id } });
          }
        }
        await prisma.itemPedido.deleteMany({ where: { pedidoId: pedido.id } });
        await prisma.pedido.delete({ where: { id: pedido.id } });
      }
      await prisma.cliente.delete({ where: { id: cliente.id } });
    }

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
