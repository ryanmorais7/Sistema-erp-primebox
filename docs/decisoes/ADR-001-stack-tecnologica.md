# ADR-001: Stack Tecnológica do PrimeBox ERP

- **Status:** Aceito
- **Data:** 2026-07-30

## Contexto

O PrimeBox ERP é um sistema de gestão exclusivo da PrimeBox (fábrica de
bases e colchões, B2B). O MVP (Fase 1) precisa ser construído com
velocidade razoável, mas sem abrir mão de organização e qualidade, já que
o sistema deve crescer em fases futuras (produção, estoque, financeiro,
nota fiscal).

## Decisão

- **Next.js (App Router) full-stack, TypeScript**: front-end e back-end
  no mesmo projeto/deploy, tipagem estática ponta a ponta.
- **Tailwind CSS + shadcn/ui**: componentes acessíveis e customizáveis,
  sem dependência de uma lib de UI fechada. Estrutura de tema já pensada
  para suportar dark mode desde o início, mesmo que não implementado
  ainda na Fase 1.
- **Prisma + PostgreSQL**: ORM tipado integrado ao TypeScript, migrations
  versionadas; PostgreSQL como banco relacional robusto para dados de
  gestão (clientes, produtos, pedidos).
- **React Hook Form + Zod**: formulários performáticos com validação
  declarativa compartilhável entre client e server.

## Consequências

- Todo o time (hoje, só eu/Claude como par de desenvolvimento) trabalha
  em TypeScript de ponta a ponta — sem necessidade de sincronizar tipos
  manualmente entre front e back.
- Decisões de modelagem de dados exigem migration do Prisma; qualquer
  alteração de schema deve ser explicada antes de ser aplicada (ver
  processo de trabalho combinado com Ryan).
- Nenhuma marca além de PrimeBox deve aparecer na interface ou nos dados
  do sistema.
