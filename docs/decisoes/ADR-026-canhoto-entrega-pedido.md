# ADR-026: Recibo do pedido com canhoto de entrega (substitui ADR-023)

- **Status:** Aceito
- **Data:** 2026-08-08

## Contexto

Depois de ver o resultado do ADR-023 (2 colunas lado a lado, PrimeBox e
Cliente, cada uma com nome/assinatura/data) e depois também de uma
segunda tentativa (2 vias completas empilhadas, uma pra cada lado), Ryan
decidiu por um terceiro formato — o modelo real usado nesse tipo de
entrega: um recibo completo que fica com o cliente, com um canhoto
destacável (menor, no rodapé) que o entregador traz de volta assinado
como prova de entrega. Ryan mandou o PDF exato a ser seguido.

## Decisão

### Estrutura final

1. **Corpo do recibo** (fica com o cliente): cabeçalho com logo, número e
   data do pedido, e um selo de **status de pagamento** (Pago/Pendente/
   Atrasado, calculado pela cobrança do pedido — mesma lógica do
   `statusExibicaoCobranca` já usada na tela de cobrança). Não mostra
   mais o status operacional do pedido (Em carteira/Faturado) nessa
   posição — foi substituído pelo status de pagamento, que é o que
   importa pro cliente.
2. Bloco de cliente com endereço, itens, total — igual ao que já havia.
3. **Assinatura do representante da PrimeBox**: linha em branco +
   nome + rótulo "Representante", alinhado à direita, abaixo do total.
   O nome vem da **sessão de quem está logado** (`verificarSessao()`),
   não de um campo fixo no pedido — quem imprime é quem assina. Não
   criei um campo "vendedor responsável" no Pedido porque não foi pedido
   e a pessoa que imprime normalmente é quem está fechando a entrega.
4. **Linha de corte** ("✂ Cortar aqui · Canhoto fica com a PrimeBox").
5. **Canhoto**: caixa compacta com nome do cliente, texto de confirmação,
   e uma grade de 3 colunas (assinatura do cliente / data / número do
   pedido). Essa é a parte que o cliente assina na hora da entrega e o
   entregador destaca e traz de volta.

Isso é o oposto da minha primeira tentativa (que tinha o cliente
assinando a via que ficava com a PrimeBox) — aqui é o cliente que assina
o canhoto pequeno que volta pra PrimeBox, e o representante da PrimeBox
"assina" (via nome impresso) o recibo grande que fica com o cliente.

### Removido

O bloco de 2 colunas (ou 2 vias completas) do ADR-023 foi totalmente
substituído — não existe mais no código.

## Consequências

- Card de status agora mostra Pago/Pendente/Atrasado em vez de Em
  carteira/Faturado nesse local específico (o status operacional do
  pedido continua visível em outros lugares, como a lista de pedidos).
- O nome do representante muda conforme quem estiver logado ao imprimir
  — não é fixo por pedido. Se no futuro for necessário fixar quem fechou
  a venda (por exemplo, se outra pessoa reimprimir depois), seria
  necessário um campo novo no `Pedido` — não implementado agora.
