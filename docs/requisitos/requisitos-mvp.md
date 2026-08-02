# Requisitos do MVP — PrimeBox ERP (Fase 1)

## Escopo

1. Cadastro de Clientes
2. Cadastro de Produtos (bases/colchões: tipo, medida, tecido, cor, preço)
3. Pedido (cliente + itens + quantidade + valor total + status: em
   carteira / faturado)
4. Impressão de pedido (PDF ou tela formatada para impressão)

## Fora de escopo nesta fase

Ordem de Produção, estoque, financeiro, boleto, nota fiscal. Qualquer
pedido de funcionalidade fora desta lista deve ser sinalizado antes de
ser implementado.

## Status de implementação

| Item | Status | Observações |
|---|---|---|
| Cadastro de Clientes | Implementado e validado em produção | Listagem (`/clientes`), criação (`/clientes/novo`) e edição (`/clientes/[id]/editar`), com ativar/desativar (soft delete). Validação com Zod (exige CNPJ ou CPF, formatos de telefone/CEP/UF) e React Hook Form |
| Cadastro de Produtos | Implementado e validado localmente | Listagem (`/produtos`), criação (`/produtos/novo`) e edição (`/produtos/[id]/editar`), com ativar/desativar. Tipo e medida via seleção (medida vem da tabela `Medida`); preço aceita formato brasileiro (ex: 1.899,90). Campo de custo de produção com margem estimada calculada ao vivo; coluna "Margem" na listagem |
| Pedido | Implementado e validado localmente | Listagem (`/pedidos`), criação (`/pedidos/novo`) e edição (`/pedidos/[id]/editar`) com itens dinâmicos (cliente + produto + quantidade + preço unitário editável + custo unitário editável). Combobox de busca por nome do cliente. Campo de observações (anotações de pagamento). Ações de faturar e excluir (só para pedidos em carteira); pedido faturado redireciona para a visualização. Valor total sempre recalculado no servidor a partir dos preços informados |
| Rentabilidade (custo x preço) | Implementado e validado localmente | Margem por item e total no formulário de pedido, e card "Rentabilidade" na visualização do pedido (`/pedidos/[id]`) com custo total, receita total e margem em R$ e %. Sempre `print:hidden` — não aparece na versão impressa para o lojista |
| Impressão de pedido | Implementado | Tela de visualização (`/pedidos/[id]`) com botão "Imprimir" (CSS de impressão do navegador, sem geração de PDF no servidor) |
| Identidade visual (sidebar + paleta) | Implementado | Sidebar em grupos Comercial/Relatórios/Fábrica/Financeiro com selos "em breve" para itens fora de escopo; Painel (`/`) com dados reais de pedidos/clientes e tabela de pedidos recentes; filtro por abas em Pedidos; paleta creme/cobre/verde-azulado e tipografia Space Grotesk/Inter/IBM Plex Mono |
| Relatório por cliente | Implementado | `/relatorios/clientes` — busca por nome, histórico completo de pedidos e totais agrupados por mês/ano |
| Relatório de faturamento por dia | Implementado | `/relatorios/faturamento` — seleciona uma data, mostra pedidos faturados naquele dia por cliente e o total |

## Decisões de modelagem relevantes

- Ver [ADR-001](../decisoes/ADR-001-stack-tecnologica.md) — stack tecnológica.
- Ver [ADR-002](../decisoes/ADR-002-modelo-cliente-produto.md) — modelo de Cliente, Produto e Medida.
- Ver [ADR-003](../decisoes/ADR-003-deploy-producao.md) — deploy e banco de produção.
- Ver [ADR-004](../decisoes/ADR-004-identidade-visual.md) — paleta de cores e navegação (primeira versão).
- Ver [ADR-005](../decisoes/ADR-005-refinamento-paleta-tipografia.md) — refinamento de paleta e tipografia.
- Ver [ADR-006](../decisoes/ADR-006-modelo-pedido.md) — modelo de Pedido e ItemPedido.
- Ver [ADR-007](../decisoes/ADR-007-impressao-pedido.md) — impressão de pedido.
- Ver [ADR-008](../decisoes/ADR-008-ajustes-visuais-prototipo.md) — ajustes visuais a partir do protótipo de referência.
- Ver [ADR-009](../decisoes/ADR-009-feedback-pedro.md) — ajustes a partir do feedback do Pedro (preço editável, observações, relatórios, autocomplete).
- Ver [ADR-014](../decisoes/ADR-014-rentabilidade.md) — rentabilidade (custo x preço) do produto e do pedido.

Com isso, os 4 itens do escopo do MVP (Fase 1) estão implementados, e
já foram refinados com o uso real do Pedro, incluindo o
acompanhamento de rentabilidade (custo x preço) por produto e por
pedido.
