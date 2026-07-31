# ADR-007: Impressão de pedido

- **Status:** Aceito
- **Data:** 2026-07-31

## Contexto

Item 4 do MVP: "Impressão de pedido (PDF ou tela formatada para
impressão)". O requisito original já deixava as duas abordagens em
aberto.

## Decisão

Optado por **tela formatada com CSS de impressão do navegador**, em vez
de gerar PDF no servidor (o que exigiria uma biblioteca nova, como
`@react-pdf/renderer` ou Puppeteer, com peso de dependência e
manutenção maiores).

- Nova rota `/pedidos/[id]` — visualização do pedido (cabeçalho
  PrimeBox, dados do cliente, tabela de itens, valor total). Acessível
  pelo ícone "Ver/imprimir" na listagem, tanto para pedidos em carteira
  quanto faturados.
- Botão "Imprimir" chama `window.print()`. Quem precisar de um arquivo
  PDF de verdade usa a opção "Salvar como PDF" do próprio diálogo de
  impressão do navegador — resultado idêntico a gerar o PDF no servidor,
  sem custo de implementação.
- Classes `print:` (Tailwind) escondem a sidebar, o cabeçalho mobile e
  os botões de ação ao imprimir, deixando só o conteúdo do pedido.
- A tela de edição (`/pedidos/[id]/editar`) agora redireciona para
  `/pedidos/[id]` quando o pedido já está faturado, em vez de duplicar
  um resumo somente leitura — a visualização/impressão passa a ser a
  única tela de "ver pedido faturado".

## Consequências

- Nenhuma dependência nova adicionada ao projeto.
- Se no futuro for necessário gerar PDF automaticamente (por exemplo,
  para anexar num e-mail sem interação do usuário), essa decisão precisa
  ser revisitada — impressão via navegador exige ação manual de quem
  está usando o sistema.
- Com isso, os 4 itens do escopo do MVP (Fase 1) estão implementados:
  Cadastro de Clientes, Cadastro de Produtos, Pedido e Impressão de
  pedido.
