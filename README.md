# PrimeBox ERP

Sistema de gestão exclusivo da PrimeBox (fábrica de bases e colchões,
venda B2B a lojistas). Ver escopo do MVP em
[docs/requisitos/requisitos-mvp.md](docs/requisitos/requisitos-mvp.md) e
decisões de arquitetura em [docs/decisoes](docs/decisoes).

## Stack

Next.js (App Router) + TypeScript, Tailwind CSS + shadcn/ui, Prisma +
PostgreSQL, React Hook Form + Zod. Ver
[ADR-001](docs/decisoes/ADR-001-stack-tecnologica.md).

## Rodando localmente

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie `.env.example` para `.env` e ajuste `DATABASE_URL` para apontar
   para um PostgreSQL local (ou de sua preferência).

3. Aplique as migrations e rode o seed inicial (medidas padrão):

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. Suba o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

   Acesse [http://localhost:3000](http://localhost:3000).

## Scripts úteis

- `npm run db:migrate` — aplica migrations do Prisma em desenvolvimento.
- `npm run db:seed` — popula dados iniciais (ex.: medidas padrão).
- `npm run db:studio` — abre o Prisma Studio para inspecionar o banco.
