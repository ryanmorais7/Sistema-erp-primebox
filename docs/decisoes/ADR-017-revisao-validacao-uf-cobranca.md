# ADR-017: Revisão de validação (UF, cidade, destaque de cobrança atrasada)

- **Status:** Aceito (parcial — 2 de 4 itens)
- **Data:** 2026-08-03

## Contexto

Ryan trouxe um documento de revisão do sistema com 4 pontos antes de
um `git push`. Dois deles eram melhorias de validação sem conflito com
nada existente; os outros dois **revertiam decisões já tomadas e
documentadas** em ADRs anteriores, sem que Ryan tivesse pedido essa
mudança de comportamento explicitamente. Confirmamos com ele antes de
mexer em qualquer coisa.

## Decisão

### Implementado

**UF como select fixo**: campo `estado` do Cliente deixou de aceitar
texto livre. `src/lib/validations/cliente.ts` agora exporta `UFS`
(as 27 siglas oficiais) e valida contra essa lista; o formulário usa
`Select` em vez de `Input`. Evita valores como "FE".

**Capitalização automática de cidade**: `cidade` passa por
`capitalizarPalavras()` no schema (primeira letra de cada palavra
maiúscula) antes de salvar — "santos" vira "Santos". Roda no
`safeParse` do server action, então já é o que vai pro banco.

**Destaque visual de cobrança atrasada**: linha inteira da tabela em
`/faturamento` recebe um tom de fundo (`bg-destructive/5`, mais forte
no hover) quando o status calculado é "Atrasado" — além do badge que
já existia. Reaproveitamos o token `--destructive` já definido no tema
(é o mesmo `#B5443A` pedido na revisão); não criamos uma variável nova
duplicada.

### Recusado (com Ryan confirmando manter o comportamento atual)

**Bloquear faturamento até toda OP estar Concluída**: a revisão pedia
essa trava. Mantivemos como está — [ADR-010](ADR-010-ordem-producao.md)
decidiu deliberadamente que faturamento e produção são independentes
("quem decide a ordem na prática é a fábrica"), e isso é consistente
com o padrão de boleto 30/60 dias já usado nos pedidos de exemplo
(fatura pra fechar a venda, produção continua depois).

**Gerar cobrança automaticamente ao faturar, com vencimento padrão**:
a revisão pedia isso, com um prazo padrão (ex: 15 dias) ou tentando ler
o campo de observações do pedido. Mantivemos como está —
[ADR-012](ADR-012-cobranca-recibo.md) decidiu que cobrança é sempre um
passo manual, com o vendedor escolhendo o vencimento real; o campo de
observações é texto livre, nunca foi estruturado pra guardar prazo de
pagamento de forma confiável.

## Consequências

- Clientes cadastrados antes desta mudança podem ter `estado` fora da
  lista de UFs válidas (se algum dado inconsistente já existir) — não
  há migração de dados aqui, só passa a validar daqui pra frente.
- Se no futuro fizer sentido mesmo travar faturamento por produção ou
  automatizar cobrança, isso exige revisitar o ADR-010/ADR-012
  explicitamente, não implementar como "correção" — são decisões de
  processo de negócio, não bugs.
