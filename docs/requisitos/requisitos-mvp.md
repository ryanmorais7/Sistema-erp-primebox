# Requisitos do MVP — PrimeBox ERP (Fase 1)

## Escopo

1. Cadastro de Clientes
2. Cadastro de Produtos (base, unibox, baú: tipo, medida, tecido, cor, preço)
3. Pedido (cliente + itens + quantidade + valor total + status: em
   carteira / faturado)
4. Impressão de pedido (PDF ou tela formatada para impressão)

## Fora de escopo nesta fase

Estoque, financeiro, boleto, nota fiscal. Qualquer pedido de
funcionalidade fora desta lista deve ser sinalizado antes de ser
implementado. (Ordem de Produção era fora de escopo na Fase 1, mas já
foi implementada — ver tabela abaixo.)

## Status de implementação

| Item | Status | Observações |
|---|---|---|
| Cadastro de Clientes | Implementado e validado em produção | Listagem (`/clientes`), criação (`/clientes/novo`) e edição (`/clientes/[id]/editar`), com ativar/desativar (soft delete). Validação com Zod (exige CNPJ ou CPF, formatos de telefone/CEP/UF) e React Hook Form |
| Cadastro de Produtos | Implementado e validado em produção | Listagem (`/produtos`), criação (`/produtos/novo`) e edição (`/produtos/[id]/editar`), com ativar/desativar. Tipo (Base, Unibox ou Baú — catálogo real da fábrica, ver ADR-015) e medida via seleção (medida vem da tabela `Medida`); preço aceita formato brasileiro (ex: 1.899,90). Campo de custo de produção com margem estimada calculada ao vivo; coluna "Margem" na listagem |
| Pedido | Implementado e validado localmente | Listagem (`/pedidos`), criação (`/pedidos/novo`) e edição (`/pedidos/[id]/editar`) com itens dinâmicos (cliente + produto + quantidade + preço unitário editável + custo unitário editável). Combobox de busca por nome do cliente. Campo de observações (anotações de pagamento). Ações de faturar e excluir (só para pedidos em carteira); pedido faturado redireciona para a visualização. Valor total sempre recalculado no servidor a partir dos preços informados |
| Rentabilidade (custo x preço) | Implementado e validado localmente | Margem por item e total no formulário de pedido, e card "Rentabilidade" na visualização do pedido (`/pedidos/[id]`) com custo total, receita total e margem em R$ e %. Sempre `print:hidden` — não aparece na versão impressa para o lojista |
| Impressão de pedido | Implementado | Tela de visualização (`/pedidos/[id]`) com botão "Imprimir" (CSS de impressão do navegador, sem geração de PDF no servidor). Recibo mostra status de pagamento e assinatura do representante (quem está logado); inclui canhoto destacável pro cliente assinar na entrega, que volta pra PrimeBox como comprovante — ver ADR-026 |
| Identidade visual (sidebar + paleta) | Implementado | Sidebar em grupos Comercial/Fábrica/Financeiro/Expedição/Relatórios, todos ativos (nenhum "em breve" restante); Painel (`/`) com dados reais de pedidos/clientes e tabela de pedidos recentes; filtro por abas em Pedidos; paleta creme/cobre/verde-azulado e tipografia Space Grotesk/Inter/IBM Plex Mono |
| Gráfico de faturamento no Painel | Implementado e validado localmente | Card no Painel (`/`) com barras dos últimos 6 meses (Recharts), agrupado por `updatedAt` do pedido faturado. Clicar num mês filtra os 4 cards de resumo (pedidos em carteira, faturados, clientes ativos, valor) pra aquele mês, e mostra um card "Faturamento em {mês}" com variação vs. o mês anterior — ver ADR-019. Meses sem faturamento aparecem zerados, não somem |
| Relatório por cliente | Implementado | `/relatorios/clientes` — busca por nome, histórico completo de pedidos e totais agrupados por mês/ano |
| Relatório de faturamento por dia | Implementado | `/relatorios/faturamento` — seleciona uma data, mostra pedidos faturados naquele dia por cliente e o total |
| Login e controle de acesso | Implementado e validado localmente | Tela de login responsiva em `/login`. Sessão via cookie JWT assinado (`jose`), sem biblioteca de autenticação externa. Papéis `DESENVOLVEDOR`/`ADMINISTRADOR`/`FUNCIONARIO` já modelados, mas hoje sem nenhuma restrição de tela entre eles. Troca de senha em `/trocar-senha`. Contas novas (ex: administrador) são convidadas por link em `/definir-senha` (válido 48h) em vez de receber senha pronta. Bloqueio de 15 min após 5 tentativas de senha erradas — ver ADR-020, ADR-021 e ADR-022 |
| Ordem de Produção | Implementado e validado localmente | `/producao` — board kanban (Aguardando/Em produção/Concluído) por `OrdemProducao`, gerada a partir de um item de pedido (`Gerar OP` em `/pedidos/[id]`). Recibo de OP imprimível, consolidando todas as peças pendentes (aguardando + em produção) de todos os clientes numa lista única, agrupada por cliente em ordem de chegada — ver ADR-028 |

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
- Ver [ADR-015](../decisoes/ADR-015-catalogo-produtos.md) — correção do catálogo de produtos (Base, Unibox, Baú).
- Ver [ADR-018](../decisoes/ADR-018-grafico-faturamento-painel.md) — gráfico de faturamento no Painel.
- Ver [ADR-019](../decisoes/ADR-019-painel-interativo-estoque-layout.md) — Painel interativo por mês e reorganização visual do Estoque.
- Ver [ADR-020](../decisoes/ADR-020-login-autenticacao.md) — login e controle de acesso.
- Ver [ADR-021](../decisoes/ADR-021-convite-definir-senha.md) — convite por link para definir senha.
- Ver [ADR-022](../decisoes/ADR-022-auditoria-seguranca-pre-lancamento.md) — auditoria de segurança pré-lançamento.
- Ver [ADR-023](../decisoes/ADR-023-comprovante-recebimento-pedido.md) — comprovante de recebimento (2 vias) no recibo do pedido.
- Ver [ADR-024](../decisoes/ADR-024-correcao-login-case-insensitive.md) — correção de bug de login (e-mail case-insensitive) e ajustes visuais no recibo.
- Ver [ADR-025](../decisoes/ADR-025-navegacao-rapida-painel.md) — navegação rápida a partir dos cards e da lista do Painel.
- Ver [ADR-026](../decisoes/ADR-026-canhoto-entrega-pedido.md) — recibo do pedido com canhoto de entrega (substitui ADR-023).
- Ver [ADR-027](../decisoes/ADR-027-cores-impressao.md) — correção de cor de fundo sumindo na impressão.
- Ver [ADR-028](../decisoes/ADR-028-recibo-op-producao.md) — recibo de OP consolidado em Produção.

Com isso, os 4 itens do escopo do MVP (Fase 1) estão implementados, e
já foram refinados com o uso real do Pedro, incluindo o
acompanhamento de rentabilidade (custo x preço) por produto e por
pedido e a correção do catálogo real de produtos fabricados.
