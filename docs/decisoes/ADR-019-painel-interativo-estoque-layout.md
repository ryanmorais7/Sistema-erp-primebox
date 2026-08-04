# ADR-019: Painel interativo por mês e reorganização visual do Estoque

- **Status:** Aceito
- **Data:** 2026-08-04

## Contexto

Depois de ver o gráfico de faturamento (ADR-018) e a tabela de
matéria-prima em produção, Ryan pediu duas coisas: tornar o gráfico do
Painel interativo (clicar num mês atualiza os números), e reorganizar
a tela de Estoque, que estava "poluída visualmente" com listas longas
e as duas tabelas (produto acabado, matéria-prima) parecendo uma coisa
só.

## Decisão

### Painel — clique no mês filtra os 4 cards + novo card "Faturamento do mês"

Confirmado com Ryan: ao clicar numa barra do gráfico, os **4 cards
mudam** para refletir só aquele mês (não só "Pedidos faturados" e
"Valor" — também "Pedidos em carteira" e "Clientes ativos"). Definição
de cada métrica por mês, calculada a partir de quando o pedido foi
**criado** (exceto faturamento, que usa `updatedAt`, a data de
faturamento — ver ADR-009):

- **Pedidos em carteira**: pedidos criados naquele mês que ainda estão
  em carteira hoje.
- **Valor em carteira**: soma do valor desses mesmos pedidos.
- **Pedidos faturados** / **Faturamento**: pedidos faturados naquele
  mês (por `updatedAt`), igual já era no gráfico.
- **Clientes ativos**: clientes distintos que tiveram pelo menos um
  pedido criado naquele mês — não é "clientes cadastrados no mês"
  (ficaria perto de zero na maioria dos meses), é atividade real.

O mês selecionado começa no mês atual (não existe estado "total
geral"/sem seleção) — abrir o Painel já mostra o retrato do mês
corrente, e clicar em outra barra troca o retrato pra aquele mês.

Um novo card **"Faturamento em {mês}"** aparece abaixo do gráfico, com
o valor, quantidade de pedidos, e variação percentual contra o mês
anterior (verde/vermelho, usando `--positive`/`--destructive`).

Toda a agregação por mês é feita em uma única leva de queries (pedidos
criados na janela de 6 meses + pedidos faturados na janela) e agrupada
em memória — não precisa de uma requisição nova a cada clique, a troca
de mês é 100% client-side.

### Gráfico: barra selecionada com opacidade cheia, as outras esmaecidas

Mesmo princípio de "cor segue a entidade, não o estado" — é a mesma
série (faturamento), então a seleção é comunicada por opacidade
(1.0 na barra selecionada, 0.35 nas outras), não por uma cor nova.
Sem legenda (série única, o título do card já diz o que é).

### Estoque: seções recolhíveis + colunas lado a lado

- Cada tabela (Produtos acabados, Matéria-prima) ganhou um botão
  minimizar/maximizar (`SecaoRecolhivel`), com a contagem de itens no
  cabeçalho — resolve a "lista comprida poluindo a tela".
- Layout centralizado com largura máxima (`max-w-6xl`), em vez de
  esticar borda a borda em monitores largos.
- As duas tabelas passam a ficar **lado a lado** (colunas, com um
  divisor vertical entre elas) em telas grandes, e empilhadas em telas
  pequenas — resolve a confusão de parecer uma lista só.

## Consequências

- Se o volume de pedidos crescer muito, a agregação em memória para o
  Painel pode precisar virar uma agregação no banco (mesma ressalva já
  registrada no ADR-018).
- Layout de Estoque em 2 colunas deixa cada tabela com menos largura
  disponível — aceitável porque cada `Table` já rola horizontalmente
  dentro de si mesma quando precisa (não vaza pra fora da página).
