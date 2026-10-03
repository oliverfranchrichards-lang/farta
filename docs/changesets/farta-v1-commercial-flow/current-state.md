# Farta v1 — estado atual

**Fase:** A — auditoria obrigatória (2026-10-01). Nenhum código/schema foi alterado.

## CURRENT_SCHEMA

- `companies`, `profiles`, `company_memberships`, `establishments` e `addresses` modelam identidade, membership e endereços. `profiles.phone` já existe; não há `whatsapp_phone`.
- `categories`, `products` e `product_variants` são globais. `product_images` usa Supabase Storage.
- `prices` é por `company_id` + SKU, com vigência temporal e status; portanto produtos são globais, mas preços são privados por empresa.
- `carts`/`cart_items` são por empresa/estabelecimento. O item guarda quantidade e preço exibido, mas não guarda Unidade/Caixa ou venda mínima.
- `orders` guarda empresa, estabelecimento, criador, endereço snapshot, totais e status. `order_items` congela nome, unidade textual, quantidade, preço e subtotal, sem separar aproximado/final.
- `order_status_history`, reservas e movimentos de estoque já existem. RLS usa `auth.uid()`, `current_profile()` e `has_active_membership()`.

## CURRENT_ORDER_FLOW

Cliente monta carrinho → `confirm_active_cart` cria diretamente `CONFIRMED`, congela preço/endereço, reserva estoque e grava histórico → operador inicia `PICKING` → `READY_FOR_DISPATCH` → `DISPATCHED` → `DELIVERED` → `RECEIPT_CONFIRMED`. A confirmação atual mistura solicitação, confirmação comercial e reserva; não existe análise de preço.

## CURRENT_PRODUCT_MODEL

O catálogo físico já é global; `sale_unit` é texto de variante e não há conversão Unidade↔Caixa nem `units_per_case`. Preço é por empresa/SKU. Imagens têm MIME, tamanho, alt text e primária.

## CURRENT_AUTHORIZATION

Policies limitam preços, carrinhos, pedidos, itens, histórico e entregas à membership da empresa. Produtos ativos são legíveis por autenticados. RPCs administrativas/operacionais validam papel e membership; novas mutações devem repetir grants mínimos, `search_path` fixo e validação server-side. ID de pedido na URL não concede acesso. Driver deve receber apenas entrega atribuída e DTO minimizado.

## CURRENT_UI

Rotas existentes: `/catalogo`, `/pedido`, `/pedidos/[orderId]`, `/operacao/pedidos`, `/operacao/entregas`, `/admin/pedidos` e admin de empresas/estabelecimentos. Design System Farta já possui tokens e componentes. Há detalhe/exportação operacional, mas não UI de análise de preço, Unidade/Caixa, banners, chat ou WhatsApp.

## MIGRATION_IMPACT

1. Evoluir produto/preço sem duplicar `prices` e preservar históricos.
2. Persistir modo comercial, mínimo e snapshots aproximado/final no carrinho/pedido.
3. Introduzir estados de análise sem reinterpretar pedidos antigos; separar reserva da primeira confirmação.
4. Manter produtos globais e preços/inventário/pedidos privados por empresa.
5. Reutilizar `profiles.phone`; provider WhatsApp, banners e chat exigem decisões antes de novas tabelas/policies.

## RISKS

Confusão Unidade/Caixa e venda mínima; pedido atual reserva cedo; sobrescrita concorrente de preço final; vazamento cross-tenant por URL/RPC/chat; provider WhatsApp inexistente; agenda de banners indefinida; histórico de endereço/status não pode depender do cadastro atual.

## DECISION_REQUIRED

### Venda mínima e caixa
- **CONTEXT:** schema só tem `quantity` e `sale_unit` textual.
- **CURRENT_BEHAVIOR:** quantidade inteira por SKU; sem conversão.
- **OPTION_A:** mínimo no modo escolhido e `units_per_case` obrigatório para Caixa.
- **OPTION_B:** mínimo sempre em unidades; Caixa apenas apresentação/preço.
- **IMPACT:** muda validação, subtotal e snapshots.
- **DECISION APPROVED:** venda mínima por SKU/modo comercial na V1; sem conversão física automática de caixa.

### WhatsApp
- **CONTEXT:** existe `profiles.phone`, mas não provider.
- **CURRENT_BEHAVIOR:** nenhum envio externo.
- **OPTION_A:** serviço/outbox sem provider real.
- **OPTION_B:** escolher provider agora.
- **IMPACT:** B exige credenciais, custo, templates e deploy.
- **DECISION APPROVED:** mensagens WhatsApp serão manuais; não implementar API/provider nesta V1.

### Chat e banners
- **CONTEXT:** não há infraestrutura; participantes e agenda não foram definidos.
- **CURRENT_BEHAVIOR:** inexistentes.
- **OPTION_A:** chat 1:1 na mesma empresa; banner ativo/inativo.
- **OPTION_B:** multiusuário e agenda temporal.
- **IMPACT:** B amplia RLS, UX, timezone e retenção.
- **DECISION APPROVED:** banners apenas ACTIVE/INACTIVE; chat direto 1:1 entre participantes autorizados.