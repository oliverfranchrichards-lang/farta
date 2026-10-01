# SECURITY-001 — Modelo de segurança do ProStock

**Status:** APROVADO PARA IMPLEMENTAÇÃO  
**Escopo:** autenticação, autorização, tenant isolation, RLS, Storage, segredos e auditoria.

## 1. Princípios

- O cliente nunca é uma fronteira de segurança.
- `company_id`, `profile_id` e papel são derivados da sessão verificada no servidor.
- Toda mutação passa por um caso de uso server-side e valida novamente ownership, estado e permissões.
- RLS é uma segunda barreira obrigatória; não substitui autorização de aplicação.
- Chaves privilegiadas ficam exclusivamente em processos server-side.
- Dados retornados ao navegador são DTOs mínimos, nunca registros irrestritos do banco.

## 2. Identidade e sessão

O Supabase Auth fornece a identidade técnica. A tabela `profiles` fornece o perfil de aplicação e deve ter relação 1:1 com o usuário autenticado.

Cada requisição autenticada resolve:

1. usuário Auth;
2. `profiles.id` e estado ativo;
3. papel global (`CUSTOMER`, `INTERNAL_OPERATOR`, `DRIVER` ou `PLATFORM_ADMIN`);
4. empresa e estabelecimento permitidos para a operação;
5. escopo interno da plataforma, quando aplicável.

Sessões inválidas, perfis inativos e memberships removidos resultam em acesso negado. Logout revoga a sessão no cliente e o servidor não confia em dados armazenados no navegador.

## 3. Autorização por papel

| Papel | Escopo principal | Operações centrais |
|---|---|---|
| CUSTOMER | uma Company e seus Establishments autorizados | catálogo, preços da empresa, carrinho, pedidos, suporte próprio |
| INTERNAL_OPERATOR | empresas e operações atribuídas | catálogo operacional, estoque, pedidos, entrega e suporte conforme permissão |
| DRIVER | entregas atribuídas | leitura e atualização das entregas próprias, ocorrências e prova |
| PLATFORM_ADMIN | plataforma inteira | configuração, suporte elevado, auditoria e administração |

Papel global não concede automaticamente acesso a toda empresa. O caso de uso deve exigir membership, atribuição ou escopo de plataforma compatível com o recurso.

## 4. Tenant isolation

- Dados de cliente são filtrados pela cadeia imutável de ownership definida em DOMAIN-001/DATA-001.
- `company_id` recebido do navegador é tratado apenas como intenção e nunca como autoridade.
- Filhos derivam o tenant do pai; duplicar tenant em tabelas só é permitido quando fizer parte de um contrato de integridade explícito.
- Toda consulta mutável deve conter uma verificação de ownership equivalente à política RLS.
- IDs públicos não são considerados segredo; proteção contra IDOR vem de authorization + RLS.

## 5. RLS e operações privilegiadas

RLS será habilitado em todas as tabelas de negócio. As policies devem cobrir leitura, inserção, atualização e exclusão separadamente, usando funções SQL estáveis para resolver perfil, memberships e escopo interno.

Operações atômicas de pedido, estoque, reserva, cancelamento e administração usam funções RPC ou Server Actions server-side com transação. A service role jamais é exposta ao browser e deve ser usada somente no mínimo de código necessário.

## 6. Storage

Buckets privados para imagens de produto, comprovantes e anexos de suporte. Caminhos devem conter o identificador do recurso pai e ser validados contra ownership antes de upload, leitura ou exclusão. Uploads validam MIME real, extensão permitida, tamanho máximo e fazem nomes não previsíveis.

## 7. Entrada, abuso e segredos

- Validar payloads no servidor com schemas versionados.
- Limitar paginação, tamanho de texto, quantidade de itens e frequência de mutações.
- Usar idempotência para comandos que criam ou confirmam recursos.
- Segredos ficam em variáveis de ambiente; somente chaves públicas podem chegar ao cliente.
- Nunca registrar tokens, senhas, dados completos de pagamento ou segredos nos logs.

## 8. Auditoria e incidentes

Operações privilegiadas e mudanças sensíveis geram `audit_logs` com ator, escopo, ação, recurso, correlation id, resultado e timestamp. Falhas de autorização não revelam se um recurso de outro tenant existe.

Eventos de segurança devem ser correlacionáveis por request/correlation id. O produto deve ter procedimento documentado para revogar sessões, rotacionar chaves, bloquear perfil e investigar acesso indevido.

## 9. Cenários negativos obrigatórios

- CUSTOMER de Company A não lê nem altera dados da Company B.
- CUSTOMER não acessa pedido, endereço, carrinho ou suporte por ID de outro tenant.
- DRIVER não atualiza entrega não atribuída.
- INTERNAL_OPERATOR não ultrapassa o escopo operacional concedido.
- Usuário inativo não executa mutações com sessão antiga.
- Cliente não consegue alterar preço, estoque, status, `company_id` ou ator de auditoria.

## 10. Gate de implementação

Antes de expor dados reais: Auth, resolução de contexto, policies RLS iniciais e testes negativos devem existir. Antes de liberar pedidos: autorização server-side, idempotência, transação e testes de concorrência devem passar.
