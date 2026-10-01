# REDESIGN-001 — baseline protegido

**Data:** 29/09/2026  
**Branch:** `master`  
**Escopo:** baseline funcional e visual antes da migração para a identidade Farta.

## Estado do repositório

O worktree já continha alterações e arquivos não rastreados de autenticação,
catálogo, pedidos, administração, operação, Supabase e preparação de produção.
Essas alterações pertencem ao trabalho anterior e não foram removidas.

## Validações antes do redesign

- `npm.cmd run lint`: PASS
- `npm.cmd run typecheck`: PASS
- `npm.cmd run build`: PASS
- `supabase db lint --linked`: PASS
- migrações remotas sincronizadas até `20260929000300`.

## Captura funcional de referência

A rota `/auth/login` foi inspecionada antes da alteração visual em viewport
desktop `1440×892` e mobile `390×844`. Foram confirmados os controles de e-mail,
senha, mostrar senha, recuperação, login e criação de conta. A captura é uma
referência de conteúdo e comportamento, não uma meta estética.

## Funcionalidades que devem permanecer

- login, cadastro, recuperação e redefinição de senha;
- logout e proteção de rotas por perfil;
- convites de empresa e aceite de convite;
- catálogo por empresa, preços por empresa e carrinho compartilhado por estabelecimento;
- confirmação de pedido com reserva de estoque;
- acompanhamento de pedidos e histórico de status;
- fila administrativa e operação por empresa;
- atribuição de entregador, envio para rota e confirmação de entrega;
- confirmação final de recebimento pelo cliente;
- administração de empresas, estabelecimentos e convites;
- notificações e isolamento multiempresa.

## Restrições do redesign

Esta fase pode alterar somente apresentação, estrutura semântica necessária,
CSS, tokens, assets e navegação visual. Não pode alterar rotas funcionais,
payloads, RPCs, regras de negócio, permissões, banco, RLS ou contratos de dados.

## Problemas visuais conhecidos

- branding e nome ProStock ainda aparecem em componentes compartilhados;
- layouts, espaçamentos e cabeçalhos variam entre módulos;
- há CSS global, CSS Modules e estilos inline legados;
- auth, catálogo, checkout, pedidos, operação e administração não compartilham
  completamente a mesma gramática visual;
- estados vazios, loading, erro e feedback precisam de uma linguagem única;
- a fila operacional ganhou recentemente o controle visual de atribuição de
  entregador e precisa entrar no padrão Farta.
