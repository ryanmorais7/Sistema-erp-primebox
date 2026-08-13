# ADR-031: Importar planilha Excel para gerar Pedidos

- **Status:** Aceito
- **Data:** 2026-08-13

## Contexto

Pedro (dono) planeja produção numa planilha Excel própria, agrupando
vários clientes numa mesma "OP" (ex: "OP 13-08 JUNIOR" com itens do
Fabiano e da Meu Conforto juntos, colunas QUANT/PRODUTO/CLIENTE/
OBSERVAÇÃO). Ele pediu um jeito prático de levar isso pro sistema em
vez de digitar tudo de novo manualmente.

Antes de implementar, verifiquei o estado real de produção: **zero
produtos cadastrados** e só 1 cliente — nem "Fabiano" nem "Meu
Conforto" existiam, e nenhum produto da planilha batia com o catálogo.
Como Produto exige tipo, medida, preço e custo (que a planilha não
tem), e o sistema não tem um conceito de "OP multi-cliente" (OP é
sempre gerada a partir de um item de um Pedido, que é sempre de 1
cliente só — ver schema desde ADR-006/ADR-010), perguntei ao Ryan como
ele queria que isso funcionasse.

## Decisão

**Um Pedido por cliente encontrado na planilha**, mantendo o fluxo já
existente (Pedido → botão "Gerar OP" por item, manual, como sempre
foi) — a importação não gera OP automaticamente, só os Pedidos com
seus itens.

**Tela de conferência antes de confirmar:** ao enviar o .xlsx,
`analisarPlanilha` (`src/app/(app)/pedidos/importar/actions.ts`) lê a
planilha e cruza cliente/produto contra o cadastro existente (por
nome, case-insensitive). Clientes e produtos que não batem aparecem
numa tela de revisão pedindo os dados que faltam pra cadastrar
(telefone pro cliente; tipo, medida, preço e custo pro produto) antes
de qualquer gravação no banco. Só depois disso `confirmarImportacao`
cria tudo (clientes novos, produtos novos, um Pedido por cliente com
seus itens) numa única `$transaction`.

### Formato da planilha

Detecção por nome de cabeçalho (`src/lib/planilhaOp.ts`), não posição
fixa de coluna — aceita QUANT/QUANTIDADE/QTD, PRODUTO, CLIENTE,
OBSERVAÇÃO/OBS em qualquer ordem, com ou sem acento, em qualquer
coluna. Título da OP (linha antes do cabeçalho, ex: "OP 13-08 JUNIOR")
é só exibido como referência, não é salvo em lugar nenhum ainda —
se precisar rastrear isso depois é conversa nova. Leitura para na
primeira linha sem produto nem cliente (linha de total, como o "30"
que Pedro tem no fim da planilha dele).

### Dependência: `xlsx` via CDN da SheetJS, não do npm

O pacote `xlsx` publicado no registro npm trava na versão 0.18.5, que
tem 2 CVEs conhecidas (prototype pollution, ReDoS) sem correção
publicada ali — a SheetJS parou de publicar no npm e distribui as
versões corrigidas só pelo próprio CDN. Instalado com
`npm install https://cdn.sheetjs.com/xlsx-latest/xlsx-latest.tgz`
(0.20.3), que não aparece nas vulnerabilidades do `npm audit`.

## Consequências

- Testado fim a fim contra o banco local: planilha com 6 itens / 2
  clientes novos / 6 produtos novos gerou exatamente 2 Pedidos, com
  quantidade, preço, custo e valorTotal corretos, e observação
  agrupada por pedido (join das observações não vazias dos itens
  daquele cliente).
- Cliente/produto são casados por nome exato (case-insensitive, sem
  acento). Se Pedro digitar o nome do cliente diferente do cadastro
  ("Fabiano" vs "Fabiano Ltda"), a importação trata como cliente novo
  — não tem fuzzy matching. Aceitável por ora; se virar problema
  recorrente, dá pra revisar.
- Produto novo entra ligado a **1** Medida (schema atual não permite
  mais de uma); se a planilha tiver o mesmo nome de produto com
  medidas diferentes em linhas diferentes, precisa vir como nomes
  distintos na planilha.
- Botão "Importar planilha" adicionado em `/pedidos`, ao lado de
  "Novo pedido".
