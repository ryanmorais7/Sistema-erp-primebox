# ADR-020: Login e controle de acesso

- **Status:** Aceito
- **Data:** 2026-08-06

## Contexto

Login/senha estava deliberadamente fora do MVP — Ryan pediu pra deixar
pra quando fosse entregar o sistema pro cliente. Chegou a hora: o
sistema inteiro estava aberto por link, sem nenhuma barreira.

## Decisão

### Sem biblioteca de autenticação externa

Nada de NextAuth/Auth.js, Clerk, etc. Essa versão do Next.js (16) tem
um guia oficial de autenticação self-rolled com `jose` (JWT) + cookie
httpOnly + Server Actions, exatamente pro caso de 2-3 usuários
internos conhecidos, sem OAuth/social login. Segui esse guia à risca
(lido direto de `node_modules/next/dist/docs`, porque essa versão do
Next tem diferenças reais em relação ao que eu já conhecia — inclusive
o arquivo que protege rotas mudou de nome).

### `middleware.ts` virou `proxy.ts`

Descoberta no caminho: a partir do Next.js 16, o arquivo de
interceptação de rotas foi renomeado de `middleware` para `proxy`
(mesma função, nome novo — a Next.js explica que "middleware" confundia
com middleware do Express). `src/proxy.ts` roda em toda rota, decripta
o cookie de sessão e redireciona pra `/login` se não houver sessão
válida, ou pra `/` se já estiver logado tentando acessar `/login`.

### Modelo de dados

```prisma
enum PapelUsuario {
  DESENVOLVEDOR
  ADMINISTRADOR
  FUNCIONARIO
}

model Usuario {
  id        String       @id @default(cuid())
  nome      String
  email     String       @unique
  senhaHash String
  papel     PapelUsuario @default(FUNCIONARIO)
  ativo     Boolean      @default(true)
  ...
}
```

Confirmado com Ryan: por agora só existem 2 contas — a dele
(`DESENVOLVEDOR`) e a do administrador/dono (`ADMINISTRADOR`). O papel
`FUNCIONARIO` já está modelado pra quando surgir a necessidade, mas
**não implementa nenhuma restrição de tela ainda** — hoje todo mundo
que loga vê tudo, inclusive custo/margem/rentabilidade (decisão
explícita: "todo mundo vê tudo por agora"). Nenhum nome de pessoa
aparece hardcoded em lugar nenhum do código — só nos dados de cada
conta.

### Sessão: cookie JWT assinado, sem tabela de sessão

`src/lib/session.ts` assina um JWT (7 dias de validade) com `jose`,
guarda `usuarioId`, `nome` e `papel` no payload, e seta como cookie
`httpOnly`, `secure` (em produção), `sameSite: lax`. Sem tabela
`Session` no banco — mais simples, e como o payload já carrega
`nome`/`papel`, a sidebar não precisa de uma consulta extra ao banco
a cada página só pra saber quem está logado.

### Rotas reorganizadas em grupo `(app)`

Todas as telas que precisam de login foram movidas pra
`src/app/(app)/` (grupo de rotas do Next — não aparece na URL), com um
`layout.tsx` próprio que chama `verificarSessao()` (redireciona se não
autenticado) e passa nome/papel pra sidebar. `/login` e
`/trocar-senha` ficam fora desse grupo — `/login` sem sidebar
nenhuma, `/trocar-senha` dentro do grupo autenticado (precisa estar
logado pra trocar a própria senha).

### Senha: bcrypt, troca própria sem "esqueci minha senha"

Hash com `bcryptjs` (JS puro, sem problema de compilação nativa no
Windows). Cada usuário troca a própria senha em `/trocar-senha`
(exige a senha atual). Não existe fluxo de "esqueci minha senha" — com
2 contas, redefinir por script quando precisar é suficiente por agora.

## Consequências

- `SESSION_SECRET` precisa estar configurado nas variáveis de ambiente
  de produção (Vercel) — sem isso, a assinatura do JWT quebra e
  ninguém consegue logar. Não tem valor padrão de propósito.
- Sem tabela de sessão, não dá pra "derrubar" uma sessão específica
  remotamente (ex: forçar logout de um dispositivo roubado) — só
  trocando `SESSION_SECRET` (derruba todo mundo) ou esperando os 7
  dias expirarem. Aceitável pro tamanho da equipe hoje.
- Quando `FUNCIONARIO` ganhar usuários de verdade, vai ser necessário
  decidir e implementar o que exatamente fica restrito — isso ainda
  não foi definido, só o papel existe no enum.
- Nenhuma Server Action foi auditada uma a uma pra verificar sessão
  internamente — a proteção principal é o `proxy.ts` nas rotas de
  página. Isso é suficiente hoje (2 usuários confiáveis, mesmo nível de
  acesso), mas se `FUNCIONARIO` ganhar restrições reais, as actions
  sensíveis vão precisar de `verificarSessao()`/checagem de papel
  próprias, não só a tela.
