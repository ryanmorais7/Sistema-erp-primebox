# ADR-021: Convite por link para definir senha

- **Status:** Aceito
- **Data:** 2026-08-07

## Contexto

A conta `ADMINISTRADOR` criada no [ADR-020](./ADR-020-login-autenticacao.md) usava
um e-mail fictício e uma senha gerada por mim, porque na hora ainda não
tínhamos o e-mail real do dono (Ryan chama de "Pedro" na nossa conversa, mas
esse nome não aparece em nenhum lugar do sistema, só o papel "Administrador").
Agora que Ryan vai pedir o e-mail verdadeiro, faz mais sentido a própria
pessoa escolher a senha, em vez de repassar uma senha gerada por terceiro.

## Decisão

### Convite por link, não "esqueci minha senha"

Continua não existindo um fluxo de recuperação de senha por e-mail
automático (ADR-020 já tinha descartado isso, e nada mudou quanto a isso).
O que existe agora é um **convite unidirecional**: alguém com acesso ao
banco (Ryan, via script) gera um link de uso único, manda pra pessoa por
fora do sistema (WhatsApp, e-mail manual), e a pessoa usa esse link uma vez
pra escolher a própria senha. Não tem envio de e-mail automático — não faz
sentido montar essa infraestrutura pra 2-3 contas.

### Modelo de dados

```prisma
model Usuario {
  ...
  senhaHash            String?      // agora pode ser nulo: conta convidada, sem senha ainda
  tokenConviteHash     String?      @unique
  tokenConviteExpiraEm DateTime?
  ...
}
```

`senhaHash` deixou de ser obrigatório porque uma conta recém-convidada
existe no banco antes de ter senha. O login (`src/app/login/actions.ts`)
agora verifica isso e devolve uma mensagem específica ("essa conta ainda
não tem senha definida") em vez de "e-mail ou senha inválidos".

### Token: hash guardado, nunca o valor puro

Segue o mesmo princípio da senha (nunca guardar o segredo em texto puro),
mas com hash rápido (SHA-256, `src/lib/convite.ts`) em vez de bcrypt — o
token tem 256 bits de entropia (`crypto.randomBytes(32)`), então não precisa
de um hash lento pra dificultar força bruta como a senha precisa. Se o
banco vazar, ninguém consegue reconstruir o token a partir do hash guardado.

Validade de 7 dias (`tokenConviteExpiraEm`), mesma duração da sessão de
login, por simplicidade — não tem significado especial além disso.

### Rota pública `/definir-senha`

Fora do grupo `(app)`, junto de `/login`, liberada no `proxy.ts`. Faz a
validação do token no próprio carregamento da página (Server Component): se
o token não existe, já expirou, ou o usuário está inativo, mostra "Link
inválido" em vez do formulário — não espera o usuário tentar submeter pra
descobrir que o link não presta mais.

Ao definir a senha com sucesso, a action já cria a sessão e redireciona pra
`/` — a pessoa não precisa logar de novo logo em seguida.

### Reuso do token e conta antiga

O token é apagado do banco (`tokenConviteHash: null`) assim que a senha é
definida — um link só funciona uma vez. A conta fictícia
`administrador@primebox.com.br` criada no ADR-020 é removida quando o
convite real é gerado (`convidar-administrador.ts`, script descartável, no
mesmo padrão do `cria-usuarios.ts` — não vai pro git).

## Consequências

- Continua sem "esqueci minha senha" self-service — perder o link de
  convite ou a senha depois de definida exige rodar um script de novo (ou,
  no caso de senha esquecida depois de já estar em uso, seria necessário
  adicionar um fluxo de reset separado — não existe hoje).
- O link de convite depende de um canal externo (WhatsApp/e-mail manual)
  pra chegar até a pessoa — se vazar antes de ser usado, quem pegar o link
  primeiro define a senha daquela conta. Aceitável pro tamanho da equipe
  hoje, mas é por isso que o token expira em 7 dias em vez de ficar valendo
  pra sempre.
