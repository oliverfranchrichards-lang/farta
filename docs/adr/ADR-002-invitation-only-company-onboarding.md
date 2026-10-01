# ADR-002 — Onboarding de Customer somente por convite

## Context

O bootstrap inicial do Supabase associava uma conta nova à primeira empresa ativa. Isso viola isolamento de tenant: o browser podia originar uma identidade que recebia acesso a uma empresa sem autorização explícita.

## Decision

Novas identidades Auth recebem somente um `Profile` `CUSTOMER` em estado `PENDING`, sem `company_id` e sem `company_membership`.

O vínculo é criado apenas ao aceitar um convite de empresa:

- token opaco aleatório de 256 bits, armazenado somente como hash SHA-256;
- convite ligado a e-mail normalizado, empresa, expiração de 7 dias e uso único;
- aceite deriva usuário, e-mail, empresa e role no banco;
- aceite é transacional e idempotente para o mesmo usuário;
- uma conta `CUSTOMER` permanece vinculada a uma única empresa no MVP;
- somente `PLATFORM_ADMIN` pode emitir convites na fundação atual.

Empresas armazenam dados cadastrais, fiscais, contatos legal/operacional e parâmetros comerciais. Endereços operacionais e de entrega continuam pertencendo ao estabelecimento.

## Alternatives

- Associar à primeira empresa ativa: rejeitado por vazamento de tenant.
- Confiar em `company_id` no metadata do Auth: rejeitado porque metadata do browser não é uma autoridade de autorização.
- Cadastro público pendente de aprovação: não adotado; o produto decidiu convite obrigatório.

## Consequences

- Contas criadas sem convite não acessam catálogo, preços, carrinhos ou pedidos.
- Usuários existentes não são desvinculados pela migration e devem ser auditados administrativamente se necessário.
- A próxima tela administrativa deve criar empresas, estabelecimentos e convites usando Server Actions protegidas; não deve inserir em tabelas diretamente.

## Migration Impact

As migrations `20260924000700_company_onboarding_invitations.sql` e `20260924000800_expire_company_invitations.sql` expandem `companies`, permitem `profiles` pendentes, criam `company_invitations`, restringem o catálogo a perfis ativos e substituem o trigger de bootstrap.
