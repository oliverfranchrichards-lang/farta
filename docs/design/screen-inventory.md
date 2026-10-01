# REDESIGN-001 — inventário de telas

Status inicial: todas as rotas estão `NOT_STARTED` para o redesign. A coluna
funcional registra o que já existe e não pode ser removido durante a migração.

| Route | Page name | User profile | Desktop | Mobile | Main components | Functions present | Design status | Implementation | Design QA | Functional QA |
|---|---|---|---|---|---|---|---|---|---|---|
| `/auth/login` | Login | público | sim | sim | Auth form, branding | login, convite pendente | DONE | IMPLEMENTED | PASS | PASS |
| `/auth/signup` | Criar conta | público | sim | sim | Auth form, branding | cadastro | NOT_STARTED | NOT_STARTED | NOT_STARTED | PASS anterior |
| `/auth/forgot-password` | Recuperar senha | público | sim | sim | Auth form | solicitar recuperação | NOT_STARTED | NOT_STARTED | NOT_STARTED | PASS anterior |
| `/auth/reset-password` | Redefinir senha | autenticado | sim | sim | Auth form | atualizar senha | NOT_STARTED | NOT_STARTED | NOT_STARTED | PASS anterior |
| `/auth/invite` | Convite | público/autenticado | sim | sim | Invite state | continuar/aceitar convite | NOT_STARTED | NOT_STARTED | NOT_STARTED | PASS anterior |
| `/` | Entrada/dashboard | todos | sim | sim | AppShell, redirect | direcionamento por perfil | NOT_STARTED | NOT_STARTED | PASS anterior | PASS anterior |
| `/catalogo` | Catálogo | CUSTOMER | sim | sim | Search, filters, product cards, cart | busca, filtros, carrinho | NOT_STARTED | NOT_STARTED | PASS anterior | PASS anterior |
| `/pedido` | Checkout | CUSTOMER | sim | sim | Cart review, delivery, summary | revisar e confirmar pedido | NOT_STARTED | NOT_STARTED | PASS anterior | PASS anterior |
| `/pedidos` | Meus pedidos | CUSTOMER | sim | sim | List, filters, status | listar e filtrar pedidos | NOT_STARTED | NOT_STARTED | PASS anterior | PASS anterior |
| `/pedidos/[orderId]` | Detalhe do pedido | CUSTOMER | sim | sim | Detail, timeline, actions | acompanhar/confirmar recebimento | NOT_STARTED | NOT_STARTED | PASS anterior | PASS anterior |
| `/notificacoes` | Notificações | CUSTOMER | sim | sim | Notification list | consultar atualizações | NOT_STARTED | NOT_STARTED | PASS anterior | PASS anterior |
| `/operacao/pedidos` | Fila operacional | INTERNAL_OPERATOR | sim | sim | Data table, filters, actions | separação, pronto, atribuição, expedição | NOT_STARTED | NOT_STARTED | PASS anterior | PASS anterior |
| `/operacao/entregas` | Entregas atribuídas | DRIVER | sim | sim | Delivery queue, status | confirmar entrega atribuída | NOT_STARTED | NOT_STARTED | PASS anterior | PASS anterior |
| `/admin/empresas` | Empresas | PLATFORM_ADMIN | sim | sim | Management list | listar/criar empresa | NOT_STARTED | NOT_STARTED | PASS anterior | PASS anterior |
| `/admin/empresas/nova` | Nova empresa | PLATFORM_ADMIN | sim | sim | Form sections | criar empresa | NOT_STARTED | NOT_STARTED | PASS anterior | PASS anterior |
| `/admin/empresas/[companyId]` | Empresa | PLATFORM_ADMIN | sim | sim | Detail/edit | editar status/dados | NOT_STARTED | NOT_STARTED | PASS anterior | PASS anterior |
| `/admin/empresas/[companyId]/estabelecimentos` | Estabelecimentos | PLATFORM_ADMIN | sim | sim | List/actions | listar/ativar/desativar | NOT_STARTED | NOT_STARTED | PASS anterior | PASS anterior |
| `/admin/empresas/[companyId]/estabelecimentos/novo` | Novo estabelecimento | PLATFORM_ADMIN | sim | sim | Form | cadastrar estabelecimento | NOT_STARTED | NOT_STARTED | PASS anterior | PASS anterior |
| `/admin/empresas/[companyId]/convites` | Convites | PLATFORM_ADMIN | sim | sim | Form/list | criar/revogar convite | NOT_STARTED | NOT_STARTED | PASS anterior | PASS anterior |
| `/admin/pedidos` | Pedidos da plataforma | PLATFORM_ADMIN | sim | sim | Data table, filters | acompanhar/transicionar pedidos | NOT_STARTED | NOT_STARTED | PASS anterior | PASS anterior |
| `/acesso-negado` | Acesso negado | todos | sim | sim | Feedback state | informar bloqueio | NOT_STARTED | NOT_STARTED | PASS anterior | PASS anterior |

Rotas técnicas (`/auth/callback`, `/auth/after-login` e
`/auth/invite/accept`) não possuem tela própria; seus redirects e estados devem
continuar funcionando durante o redesign.
