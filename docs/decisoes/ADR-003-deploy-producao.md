# ADR-003: Deploy e banco de dados de produção

- **Status:** Aceito
- **Data:** 2026-07-30

## Contexto

O PrimeBox ERP precisa ficar acessível pela internet para uso diário da
fábrica (múltiplos computadores/lojistas), não só na máquina local de
desenvolvimento.

## Decisão

- **Hospedagem:** Vercel, conectada ao repositório
  [Sistema-erp-primebox](https://github.com/ryanmorais7/Sistema-erp-primebox)
  no GitHub. Cada push na branch `master` gera um novo deploy.
- **Banco de produção:** Neon (Postgres serverless), provisionado via
  integração do Marketplace da Vercel, que injeta a `DATABASE_URL`
  automaticamente nas variáveis de ambiente do projeto. Separado do
  Postgres local usado em desenvolvimento — nunca compartilham dados.
- **Migrations automáticas no deploy:** o script `build` do
  `package.json` roda `prisma migrate deploy && prisma db seed` antes de
  `next build`, para que toda alteração de schema aplicada localmente
  (via `npm run db:migrate`) seja replicada automaticamente no banco de
  produção a cada deploy, sem passo manual.

## Consequências

- Ninguém precisa rodar migration manualmente contra o banco de
  produção — basta commitar a migration gerada localmente e dar push.
- O seed (medidas padrão) roda a cada deploy; como usa `upsert`, é
  seguro repetir sem duplicar dados.
- Se uma migration falhar em produção, o build da Vercel falha junto
  (comportamento intencional: evita subir código incompatível com o
  schema do banco).
