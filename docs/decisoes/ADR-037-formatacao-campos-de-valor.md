# ADR-037: campos de valor formatam sozinhos no blur, sem exigir vírgula/centavos digitados

- **Status:** Aceito
- **Data:** 2026-08-20

## Contexto

Ryan reportou que em Pedidos (e potencialmente em outros módulos), os
campos de valor (Preço unit., Custo unit.) exigiam digitar ",00"
manualmente — digitar só "100" não virava "R$ 100,00" sozinho.

## Investigação (causa raiz)

Mapeados os 17 campos de valor (R$) do sistema inteiro — Pedidos,
Produção/OP (formal e avulsa), Estoque, Produtos, e os dois
formulários de importação de planilha — e encontradas **duas famílias
de bug diferentes**, nenhuma delas fazendo o que o pedido descreve:

1. **7 campos** (Produção: editar OP formal/avulsa, criar OP avulsa)
   usavam `mascararMoeda()` (`src/lib/mascaras.ts`) — uma máscara estilo
   POS/maquininha que trata cada dígito digitado como **centavo**,
   deslocando da direita pra esquerda: digitar "1", "0", "0" mostrava
   "0,01" → "0,10" → "1,00". Pra chegar em "100,00" o usuário precisava
   digitar "10000" (5 dígitos), não "100" — o mesmo sintoma do bug
   relatado, só que ainda mais agressivo (a pessoa digitando "100" via
   "R$ 1,00", não "R$ 100,00").
2. **10 campos** (Pedidos, Produtos, Estoque, os dois formulários de
   importar planilha) eram `<Input>` com `{...register(...)}` puro,
   **sem nenhuma máscara ou formatação** — o texto digitado ficava
   exatamente como foi digitado, pra sempre (só uma função
   `formatarPrecoBr()` existia, mas nunca era chamada em nenhum
   `onBlur`/`onChange`, só usada no servidor pra montar o
   `defaultValues` inicial das telas de edição).

Também achado: `formatarPrecoBr()` (`src/lib/validations/moeda.ts`) já
existia mas tinha um bug próprio — só trocava `.` por `,`
(`toFixed(2).replace(".", ",")`), sem inserir separador de milhar. Um
valor de R$ 1.234,56 virava "1234,56", não "1.234,56".

`precoParaNumero()` (mesmo arquivo), usada pro cálculo ao vivo de
Subtotal/Margem/Total em todos os formulários, já interpretava "100"
corretamente como 100 reais (não como centavos) — o problema era
inteiramente de **exibição**, nunca de cálculo.

## Decisão

- **`formatarPrecoBr()` corrigida** pra usar
  `numero.toLocaleString("pt-BR", { minimumFractionDigits: 2,
  maximumFractionDigits: 2 })` — agora inclui separador de milhar
  corretamente (1234.56 → "1.234,56").
- **Nova função `normalizarPrecoDigitado(texto): string | null`**
  (`src/lib/validations/moeda.ts`) — combina `precoParaNumero` +
  `formatarPrecoBr`; devolve `null` (não formata) quando o campo está
  vazio ou o texto não é um número válido, pra não forçar "0,00" ou
  "NaN" enquanto o campo ainda não tem conteúdo utilizável.
- **Todos os 17 campos passaram a chamar `normalizarPrecoDigitado` no
  `onBlur`**, nunca no `onChange` — o usuário digita livremente
  (número puro, com vírgula, ou com ponto, tanto faz) e só ao sair do
  campo o valor é reformatado pro padrão brasileiro. Isso bate com o
  pedido explícito: "ao sair do campo (blur)... o valor deve ser
  exibido formatado", nunca reformatação enquanto digita.
- **`mascararMoeda()` removida** de `src/lib/mascaras.ts` — ficou sem
  nenhum uso depois da correção dos 7 campos que dependiam dela. Não é
  o comportamento que o sistema quer em nenhum lugar.
- **`inputMode="numeric"` trocado por `inputMode="decimal"`** em todos
  os campos de valor — no teclado numérico do celular, `numeric` não
  mostra a tecla de vírgula/ponto; `decimal` mostra, já que agora o
  campo aceita digitar o separador decimal diretamente.
- **Dois padrões de wiring**, dependendo de como cada formulário já
  usava React Hook Form:
  - Campos que já usavam `Controller` (os 7 antigos com
    `mascararMoeda`): `onChange` passa o texto puro; `onBlur` chama
    `field.onBlur()` (mantém o comportamento padrão do RHF) e depois
    `field.onChange(normalizado)` se `normalizarPrecoDigitado` não
    devolveu `null`.
  - Campos com `{...register(nome)}` puro (os 10 restantes): passado
    um `onBlur` dentro das opções do `register(nome, { onBlur: (e) =>
    ... })` (RHF v7 aceita `onBlur` nas opções de registro), chamando
    `setValue(nome, normalizado)` quando válido.

## O que NÃO mudou

- `precoParaNumero`/`precoSchema`/`custoSchema` continuam exatamente
  como estavam — já interpretavam texto digitado corretamente. Nenhuma
  mudança de validação ou de regra de negócio, só de exibição.
- Um valor sem nenhum separador continua sendo lido como reais inteiros
  (ex.: "10000" digitado sem pontuação vira R$ 10.000,00, nunca R$
  100,00 "por engano de formatação") — comportamento que já existia em
  `precoParaNumero` e continua garantindo que o sistema nunca
  "adivinha" uma intenção diferente do que foi literalmente digitado.

## Consequências

- Testado localmente, nos 4 módulos citados no pedido — Pedidos
  (Preço unit./Custo unit., digitando "100" e "150,5", conferindo
  Subtotal/Margem/Total recalculados), Produtos (Custo/Preço, incluindo
  o caso de milhar "1500" → "1.500,00"), Produção (Criar OP avulsa) e
  Estoque (Criar pedido do estoque) — todos formatando corretamente no
  blur, `tsc`/`eslint` limpos.
- `docs/requisitos/requisitos-mvp.md` e
  `docs/requisitos/requisitos-fase2.md`/`requisitos-fase3.md` (Estoque)
  precisam registrar que os campos de valor formatam automaticamente.
