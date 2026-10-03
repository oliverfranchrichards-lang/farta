# ORDER-REVIEW-001 — Domínio de análise de preço

## Status e escopo

**STATUS:** DOMAIN_CONTRACT_READY — contrato para implementação vertical; nenhum código, schema ou migration foi alterado.  
**OWNER:** PRODUCT-DOMAIN.  
**DEPENDENCIES:** `product-price-contract.md`, revisão de Database Architect, Security, Backend e Design.

Este documento define o fluxo comercial entre o pedido aproximado do cliente, a análise interna, a definição do preço final e a confirmação final do cliente. A reserva de estoque só ocorre depois da confirmação final.

## Máquina de estados final

### Estados novos

| Estado | Significado | Quem pode iniciar | Reserva? |
|---|---|---|---|
| `SUBMITTED_FOR_REVIEW` | Pedido registrado com valores aproximados, aguardando análise interna | CUSTOMER | Não |
| `PRICED_AWAITING_CUSTOMER_CONFIRMATION` | Operador definiu preço final e aguarda decisão do cliente | INTERNAL_OPERATOR | Não |
| `CUSTOMER_CONFIRMED` | Cliente aceitou preço final; pedido pronto para entrar na operação | CUSTOMER | Sim, atomicamente |

### Estados operacionais preservados

`PICKING → READY_FOR_DISPATCH → DISPATCHED → DELIVERED → RECEIPT_CONFIRMED`, além de `CANCELLED` conforme as regras de cancelamento vigentes.

### Fluxo completo

```text
CART/DRAFT
   │ enviar pedido para análise
   ▼
SUBMITTED_FOR_REVIEW
   ├── operador define preço final ──► PRICED_AWAITING_CUSTOMER_CONFIRMATION
   └── cancelamento permitido ───────► CANCELLED

PRICED_AWAITING_CUSTOMER_CONFIRMATION
   ├── cliente confirma ─────────────► CUSTOMER_CONFIRMED
   ├── cliente recusa/cancela ───────► CANCELLED
   └── operador solicita revisão ─────► SUBMITTED_FOR_REVIEW

CUSTOMER_CONFIRMED
   └── transação de confirmação/reserva ► PICKING

PICKING → READY_FOR_DISPATCH → DISPATCHED → DELIVERED → RECEIPT_CONFIRMED
```

`CART/DRAFT` é estado do carrinho, não precisa ser um estado persistido em `orders`. Pedidos legados em `CONFIRMED` não devem ser reinterpretados automaticamente: seu significado atual permanece confirmado/operacional, com histórico preservado.

## Regras de transição

1. `SUBMITTED_FOR_REVIEW` só pode ser criado a partir de um carrinho válido, com itens ativos, empresa/estabelecimento coerentes e preços aproximados calculados.
2. O cliente pode submeter pedido mesmo sem preço final, mas não pode iniciar separação nem consumir estoque.
3. Apenas `INTERNAL_OPERATOR` da mesma empresa ou `PLATFORM_ADMIN` pode definir preço final.
4. O operador deve definir preço final por item; o total final deve ser derivado/validado pela soma dos itens e taxas aplicáveis.
5. O operador não pode confirmar a compra em nome do cliente.
6. Somente um `CUSTOMER` ativo da mesma empresa pode confirmar ou recusar o preço final.
7. A confirmação final deve ocorrer somente em `PRICED_AWAITING_CUSTOMER_CONFIRMATION`.
8. A transição `CUSTOMER_CONFIRMED` deve reservar estoque na mesma operação transacional, ou falhar integralmente. Não pode existir pedido confirmado sem reserva válida.
9. Se qualquer item não tiver estoque suficiente na confirmação, nenhuma reserva parcial deve permanecer e o pedido não deve avançar.
10. `PICKING` só pode ocorrer depois de `CUSTOMER_CONFIRMED` e da reserva bem-sucedida.
11. Alterações de catálogo/preço vigente não modificam snapshots do pedido.
12. Reenvio para análise, definição repetida do mesmo preço e confirmação repetida devem ser idempotentes.

## Preço aproximado e preço final

### Preço aproximado

É o valor vigente no catálogo para a empresa e SKU no momento da montagem/submissão. A UI deve chamá-lo explicitamente de “Preço aproximado” ou equivalente aprovado pelo Design Director. Não representa obrigação definitiva.

O pedido deve preservar por item:

- SKU e unidade comercial escolhida;
- quantidade;
- preço aproximado unitário;
- subtotal aproximado;
- moeda;
- identificação temporal/origem do preço, se disponível.

### Preço final

É definido pelo operador após revisar o pedido. Deve ser independente do preço atual do catálogo e persistido por item, com:

- preço final unitário;
- subtotal final;
- total final do pedido;
- autor e timestamp da alteração;
- motivo/observação quando houver divergência relevante.

O preço aproximado nunca deve ser sobrescrito silenciosamente. A interface do cliente deve permitir comparar, quando útil, aproximado versus final antes da confirmação.

## Reserva e estoque

O envio para análise não cria `inventory_reservations`, não cria movimento de reserva e não reduz disponibilidade. A reserva ocorre somente na confirmação final do cliente.

A operação de confirmação deve:

1. bloquear/validar o pedido e itens relevantes;
2. verificar preço final e ownership;
3. verificar disponibilidade de todos os SKUs;
4. criar todas as reservas;
5. atualizar saldos e movimentos;
6. registrar `CUSTOMER_CONFIRMED`;
7. avançar para o primeiro estado operacional definido pela arquitetura.

Qualquer falha deve fazer rollback integral. A decisão técnica de iniciar imediatamente `PICKING` ou deixar `CUSTOMER_CONFIRMED` como fila operacional separada deve ser mantida consistente com a autorização atual do operador; a recomendação é persistir `CUSTOMER_CONFIRMED` e permitir que o operador inicie `PICKING` como ação explícita.

## Visibilidade do cliente

`CUSTOMER` pode listar e abrir todos os pedidos da própria empresa, independentemente de qual membro os criou. A autorização deve verificar:

- usuário autenticado e perfil ativo;
- membership ativa na empresa do pedido;
- pedido pertencente à mesma empresa;
- estabelecimento pertencente à mesma empresa.

O cliente não pode visualizar pedidos de outra empresa, custos/margens internas, dados de outros tenants ou ações de operador. O detalhe deve mostrar os itens e preços que pertencem àquela empresa, respeitando os snapshots.

## Invariantes

- Todo pedido em análise possui ao menos um item válido e snapshot comercial.
- Todo item mantém SKU, unidade e quantidade escolhidos no momento do pedido.
- `SUBMITTED_FOR_REVIEW` não possui reserva ativa.
- `PRICED_AWAITING_CUSTOMER_CONFIRMATION` possui preço final completo e total consistente.
- `CUSTOMER_CONFIRMED` possui confirmação auditável e reserva completa, ou não existe como estado persistido.
- Nenhum pedido entra em `PICKING` sem confirmação final e reserva.
- Total final é igual à soma dos subtotais finais mais taxas válidas.
- Preços históricos não dependem do catálogo atual.
- Uma empresa nunca lê ou altera pedido de outra empresa.
- Transições e reservas são idempotentes.
- Histórico de status e alterações de preço são append-only/auditáveis.

## Cancelamento e expiração

- Antes da confirmação final, o cliente pode cancelar conforme a política vigente, sem liberar reserva porque ainda não há reserva.
- Depois da reserva, cancelamento deve liberar todas as reservas de modo transacional e registrar movimento/histórico.
- Expiração automática da proposta de preço não deve ser criada sem regra de negócio aprovada; inicialmente o preço permanece aguardando ação explícita.
- Recusa do preço final deve registrar motivo opcional e levar a `CANCELLED` ou reabrir análise apenas por ação autorizada, nunca por alteração silenciosa.

## Idempotência e concorrência

- Duplo clique do cliente não pode gerar duas confirmações, reservas ou históricos.
- Dois operadores não podem substituir preço final sem controle de versão/lock e rastreabilidade.
- Confirmação concorrente com cancelamento deve aceitar apenas uma transição válida; a outra recebe estado atualizado.
- Repetição de request após timeout deve retornar o resultado efetivo, não duplicar efeitos.

## Critérios de aceite

1. Cliente envia carrinho e o pedido aparece em `SUBMITTED_FOR_REVIEW` sem reserva.
2. Operador da empresa visualiza itens, preço aproximado e define preço final.
3. Cliente da mesma empresa visualiza todos os pedidos da empresa, inclusive criados por outro membro.
4. Cliente de empresa diferente recebe acesso negado.
5. Cliente vê o preço final e confirma explicitamente.
6. Confirmação cria todas as reservas; falha de um item não deixa reserva parcial.
7. Pedido não inicia separação antes da confirmação final.
8. Histórico mostra autor, timestamps, estados e alteração de preço.
9. Catálogo alterado depois não modifica pedido histórico.
10. Requests repetidos e concorrentes são seguros.

## Handoff

**TASK_ID:** ORDER-REVIEW-001  
**STATUS:** DOMAIN_CONTRACT_READY — sem implementação.  
**SUMMARY:** máquina de estados final, contrato de preço aproximado/final, confirmação explícita, reserva pós-confirmação, visibilidade por empresa e invariantes definidos.  
**DECISIONS:** mínimo por SKU; reserva somente após confirmação final; cliente lê todos os pedidos da própria empresa; pedidos legados `CONFIRMED` não são reinterpretados.  
**FILES_CHANGED:** somente `docs/changesets/farta-v1-commercial-flow/order-review-domain.md`.  
**SCHEMA_CHANGED:** não.  
**MIGRATIONS:** nenhuma criada/aplicada.  
**SECURITY_IMPACT:** ownership por empresa/membership, role de operador, confirmação apenas pelo cliente autorizado, sem exposição cross-tenant.  
**TESTS_EXECUTED:** inspeção de migrations, actions, estados e RLS existentes; nenhum teste runtime, pois não houve implementação.  
**TEST_RESULTS:** contrato pronto; quality gates ficam para a slice implementada.  
**RISKS:** escolher se `CUSTOMER_CONFIRMED` aguarda ação explícita do operador ou avança automaticamente para `PICKING`; definir estratégia técnica de lock/versão e localização final dos campos de preço.  
**OPEN_ISSUES:** somente decisões técnicas de modelagem, lock/idempotência e permissões/lifecycle do chat fora desta slice.  
**NEXT_DEPENDENCY:** DATABASE-ARCHITECT aprova data-impact; SECURITY revisa policies; BACKEND-NEXT implementa RPC/transições; FRONTEND/DESIGN implementam revisão e confirmação; QA testa invariantes e cross-tenant.
