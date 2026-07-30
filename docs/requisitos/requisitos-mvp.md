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
| Cadastro de Clientes | Implementado | Listagem (`/clientes`), criação (`/clientes/novo`) e edição (`/clientes/[id]/editar`), com ativar/desativar (soft delete). Validação com Zod (exige CNPJ ou CPF, formatos de telefone/CEP/UF) e React Hook Form |
| Cadastro de Produtos | Em andamento | Modelo de dados definido e migrado (ADR-002), incluindo tabela `Medida` já semeada com as 5 medidas padrão; telas ainda não implementadas |
| Pedido | Não iniciado | |
| Impressão de pedido | Não iniciado | |

## Decisões de modelagem relevantes

- Ver [ADR-001](../decisoes/ADR-001-stack-tecnologica.md) — stack tecnológica.
- Ver [ADR-002](../decisoes/ADR-002-modelo-cliente-produto.md) — modelo de Cliente, Produto e Medida.
