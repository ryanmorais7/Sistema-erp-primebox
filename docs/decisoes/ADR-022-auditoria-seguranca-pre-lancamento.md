# ADR-022: Auditoria de segurança pré-lançamento

- **Status:** Aceito
- **Data:** 2026-08-08

## Contexto

Antes de liberar o sistema pro Pedro usar de verdade, Ryan pediu uma
revisão de segurança com um checklist. O checklist partia de premissas que
não correspondem ao sistema real (falava em Supabase/RLS, papéis como
Comercial/Produção/Financeiro/Expedição, webhook de gateway de pagamento —
nada disso existe no PrimeBox ERP). Esse ADR documenta o que foi
efetivamente auditado, o que já estava correto, o que foi corrigido agora,
e o que fica pendente de decisão.

## O que já estava correto (verificado, não só assumido)

- **Nenhum `console.log`/`error`/`warn` em `src/`** — sem risco de senha
  vazar em log.
- **Toda Server Action é bloqueada sem sessão válida** — testei de verdade
  (não só lendo código): forjei o header `Next-Action` num `curl` direto
  pra uma rota protegida sem cookie de sessão. Resultado: 307 redirect pra
  `/login` antes de qualquer action rodar. Não existe `route.ts` (API
  route) que escape do `proxy.ts` — o matcher cobre tudo.
- **SQL injection: impossível hoje** — busquei `$queryRaw`/`$executeRaw`
  em todo `src/`, zero uso fora dos tipos gerados do Prisma. Tudo é
  Prisma parametrizado.
- **Validação server-side já existia** nas actions principais (cliente,
  produto, pedido, matéria-prima, fornecedor) — reconferem com Zod no
  servidor, não confiam só no formulário do navegador.
- **Nenhum secret vazando pro navegador** — busquei `SESSION_SECRET`,
  `DATABASE_URL`, `postgresql://`, senha do banco no bundle final
  (`.next/static`, o que realmente é enviado pro cliente): zero
  ocorrências. Nenhuma variável `NEXT_PUBLIC_*` existe no projeto.
- **Env vars de produção na Vercel**: todas as 19 variáveis marcadas como
  "Sensitive", nenhuma exposta por engano.
- **HTTPS**: garantido pela própria Vercel, sem URL `http://` hardcoded no
  código.

## O que foi corrigido nesta auditoria

### Rate limit de login (novo)

Não existia nenhum limite de tentativas. Adicionei `tentativasFalhas` e
`bloqueadoAte` no `Usuario` — depois de 5 senhas erradas seguidas, a conta
fica bloqueada por 15 minutos (mesmo com a senha certa), e o contador zera
em qualquer login bem-sucedido. É por conta, não por IP: como só existem
2-3 contas conhecidas, o risco real é alguém tentando adivinhar a senha de
uma conta específica, não uma varredura de IP. Optei por guardar isso no
banco em vez de em memória porque a Vercel roda em serverless — cada
requisição pode cair numa instância diferente, então um contador em
memória do processo não seria confiável.

Testado de verdade: 5 tentativas erradas seguidas, na 6ª (mesmo com a
senha certa) o login foi recusado com a mensagem de bloqueio.

### Link de convite: 7 dias → 48 horas

`src/lib/convite.ts` — reduzido pra diminuir a janela em que um link
vazado ou esquecido continua utilizável.

### Limite de tamanho em campos de texto livre

Nenhum campo (razão social, endereço, observações, nome de produto etc.)
tinha `.max()` no Zod — dava pra mandar um texto de qualquer tamanho.
Adicionei limites razoáveis (200 caracteres pra nomes/endereços, 1000 pra
observações de pedido) em `cliente.ts`, `produto.ts`, `pedido.ts`,
`materiaPrima.ts` e `fornecedor.ts`. Também limitei `quantidade` do item de
pedido a 100.000 unidades, pra evitar estourar a coluna `Decimal(10,2)`
com um erro feio do Postgres em vez de uma mensagem de validação.

### Senha: limite máximo de 72 caracteres

bcrypt trunca silenciosamente senhas acima de 72 bytes — duas senhas
longas diferentes que começam iguais nos primeiros 72 bytes gerariam o
mesmo hash. Adicionei `.max(72)` em `novaSenha` (troca de senha e
definição via convite) pra isso nunca acontecer.

## O que fica pendente — depende de decisão do Ryan, não é bug

- **RBAC por papel de verdade** (Comercial só vê X, Estoque só vê Y etc.):
  não existe hoje. Os papéis reais são `DESENVOLVEDOR`/`ADMINISTRADOR`/
  `FUNCIONARIO`, e por decisão explícita no [ADR-020](./ADR-020-login-autenticacao.md)
  não há restrição de tela entre eles ainda ("todo mundo vê tudo por
  agora"). Implementar isso é uma decisão de produto (o que cada papel
  pode ver), não algo que dá pra inventar numa auditoria de segurança.
- **Sessão expira por inatividade** (em vez de um prazo fixo de 7 dias
  desde o login): a sessão é um JWT sem tabela no banco (ADR-020,
  deliberado, pra simplicidade). Mudar pra expiração por inatividade
  exigiria guardar sessão no banco — é uma mudança de arquitetura, não um
  ajuste pontual.
- **Webhook de pagamento**: não se aplica — o sistema não integra com
  nenhum gateway de pagamento (Mercado Pago, Asaas ou outro). "Cobrança"
  hoje é só marcação manual de pago/pendente.
- **RLS do Supabase**: não se aplica — o sistema usa Neon Postgres direto
  via Prisma, não Supabase.
- **Backup do banco**: é configuração de conta no Neon (retenção de
  point-in-time recovery), não código — precisa ser conferido direto no
  dashboard do Neon (Settings → Backup/Restore), não é algo que eu
  consigo verificar ou alterar por aqui.

## Consequências

- Login agora recusa a conta por 15 min após 5 tentativas erradas —
  válido também pra você mesmo, se digitar a senha errada 5 vezes
  seguidas.
- Nenhuma mudança de comportamento visível pra quem já usa o sistema
  corretamente, exceto o link de convite valendo menos tempo.
