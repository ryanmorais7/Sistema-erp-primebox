# ADR-028: Recibo de OP consolidado em Produção

- **Status:** Aceito
- **Data:** 2026-08-08

## Contexto

A tela de Produção (`/producao`) já mostrava as ordens de produção em
formato kanban (Aguardando/Em produção/Concluído), mas não tinha nada
imprimível — pra passar a lista de peças pro time de fábrica, alguém
precisava anotar ou repassar manualmente item por item. Ryan mandou um
modelo (PDF) de como esse recibo deveria ficar: uma lista única com tudo
que precisa ser produzido, agrupado por cliente, pra entregar impresso na
fábrica.

## Decisão

### O que entra na lista

Todas as `OrdemProducao` com status `AGUARDANDO` ou `EM_PRODUCAO` (ou
seja, tudo que ainda não foi concluído) — não existe um registro "OP" no
banco separado, a lista é montada na hora, a partir das ordens de
produção já existentes. O título "OP {dia}/{mês}" é só a data de quando
a lista foi impressa, não um número de OP fixo salvo em algum lugar.

### Coluna "Produto" (texto único, não 3 colunas separadas)

Pra caber compacto numa folha de fábrica, uma única coluna resume medida
+ nome + tecido/cor:

- Produtos que não são `BASE` (ex: Unibox/colchão): `{medida} {nome}` —
  ex: "Casal Saturno 06".
- Produtos `BASE`: `{tipo} {nome}` — ex: "Base 138" — porque bases nesse
  catálogo costumam ter o nome numérico (largura) em vez de usar as
  medidas padrão (Casal/Queen/etc).
- Em ambos os casos, se tiver tecido e/ou cor, entra no final depois de
  " · " — ex: "Base 138 · Sapê bege".

Validei essa fórmula reconstruindo o exemplo exato que o Ryan mandou —
bateu linha por linha.

### Agrupamento por cliente, ordenado por chegada (FIFO)

As linhas são agrupadas por cliente (todas as peças do mesmo pedido/
cliente ficam juntas), e os grupos aparecem na ordem em que a primeira OP
daquele cliente foi criada — não em ordem alfabética. Dentro do grupo,
ordenado pela ordem de criação da OP.

Grupos consecutivos alternam entre dois fundos sutis (pêssego/`accent` e
verde-água/`positive-soft`) pra facilitar visualmente separar onde um
cliente termina e o próximo começa numa lista longa. É uma alternância
simples a cada troca de cliente — não tentei replicar exatamente o
padrão de cores do PDF de exemplo (que parecia ter uma lógica mais
manual/caso a caso), mas o efeito prático é o mesmo.

### Observação vem do pedido, não do item

Não existe campo de observação por item — o texto que aparece na coluna
"Observação" é o campo `observacoes` do pedido inteiro. Se o pedido tiver
mais de um item, a mesma observação repete em todas as linhas dele. Isso
é uma limitação aceitável por enquanto (a maioria dos pedidos com nota
tem só 1 item).

### Layout reaproveitado do recibo de pedido

Cabeçalho (logo, "Produção" centralizado em laranja, "OP {data}" +
"Uso interno · Fábrica" à direita) segue o mesmo estilo visual já
estabelecido nos outros documentos impressos do sistema. A tabela usa um
cabeçalho escuro (fundo `--foreground`, texto `--background`) — visual
diferente do resto do sistema de propósito, pra destacar que é um
documento de fábrica, não uma tela comum.

O botão "Imprimir" reaproveita o componente já existente
(`ImprimirButton`). A lista de OPs pendentes aparece tanto na tela quanto
na impressão (fica visível pra conferência antes de imprimir); o board
kanban abaixo dela é só de tela (`print:hidden`), porque ali é onde as
ações de "iniciar produção"/"concluir" continuam acontecendo.

## Consequências

- Nenhuma tabela nova no banco — é tudo derivado das `OrdemProducao`
  existentes.
- Se dois pedidos diferentes do mesmo cliente tiverem status diferentes
  (um aguardando, outro em produção), as peças ainda aparecem juntas na
  lista (agrupamento é só por cliente, não por status) — a lista de
  impressão mistura "aguardando" e "em produção" de propósito, porque pra
  quem está produzindo isso tudo ainda precisa ser feito.
