# ADR-024: Login case-insensitive + ajustes no recibo do pedido

- **Status:** Aceito
- **Data:** 2026-08-08

## Bug: Pedro não conseguia logar pelo PC

O e-mail do administrador foi salvo em produção como
`Pedrosergio1976@yahoo.com.br` (com "P" maiúsculo, exatamente como Ryan
digitou ao pedir o convite). O login sempre convertia o e-mail digitado
pra minúsculo antes de buscar no banco (`resultado.data.email.toLowerCase()`),
então uma busca exata só batia se o valor salvo já estivesse em minúsculo.

No celular funcionava porque o teclado mobile auto-capitaliza a primeira
letra de um campo novo, então "pedrosergio..." virava "Pedrosergio..." ao
digitar — batendo por acaso com o valor salvo. No PC, sem essa
auto-capitalização, a busca com e-mail 100% minúsculo não encontrava o
registro, e a mensagem genérica ("E-mail ou senha inválidos") parecia
erro de senha.

**Correção:** a busca do usuário no login agora usa
`mode: "insensitive"` do Prisma (`findFirst` em vez de `findUnique`, já
que essa opção não existe em busca por índice único) — o login funciona
com qualquer combinação de maiúsculas/minúsculas no e-mail, independente
de como o valor foi salvo no banco. Corrigi também o dado da conta do
Pedro em produção pra minúsculo, por consistência.

## Ajustes no recibo do pedido

A pedido do Ryan, depois de ver o resultado do ADR-023 (comprovante de
recebimento em 2 vias):

- Adicionado o ícone da caixa laranja (mesmo estilo da tela de login) ao
  lado do nome "PrimeBox" no cabeçalho do recibo.
- Removida a numeração "1ª via" / "2ª via" — ficou só "Via PrimeBox" e
  "Via Cliente".
- A via do Cliente agora mostra um badge com o status de pagamento
  (Pago/Pendente/Atrasado), calculado a partir da cobrança do pedido
  (`statusExibicaoCobranca`, a mesma lógica já usada na tela de cobrança).
  Pedido sem cobrança gerada ainda aparece como "Pendente".
