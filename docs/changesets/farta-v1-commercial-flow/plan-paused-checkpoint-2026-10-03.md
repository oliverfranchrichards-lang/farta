# Farta V1 — checkpoint do plano pausado

**Data:** 2026-10-03  
**Status:** PAUSADO A PEDIDO DO USUÁRIO  
**Retomada:** usar este arquivo como ponto de partida antes de continuar o desenvolvimento da V1.

## Estado no momento da pausa

O núcleo funcional do MVP está implementado. Foram concluídos os fluxos de catálogo global, preços por empresa, carrinho, pedidos, revisão operacional, produtos/categorias/variantes, banners, chat direto, detalhes/exportação operacional e as respectivas migrations/RLS/UI.

Gates técnicos executados com sucesso:

- `npm.cmd run check` (lint, typecheck e build);
- `npx.cmd supabase db lint --linked`;
- `npx.cmd supabase db push --linked`;
- `npx.cmd supabase gen types typescript --linked`.

Commit local de referência: `ce71565 feat: expand catalog administration and commercial flows`.

## Trabalho pendente para fechar a V1

1. QA autenticado de todos os perfis: cliente, operador interno, entregador e administrador.
2. Testes negativos de RLS, isolamento entre empresas, permissões por papel, URLs diretas, SKU inativo, variante sem preço e idempotência.
3. QA visual e de acessibilidade, especialmente foco/teclado/restauração do painel lateral de preços, responsividade e contraste.
4. Preparação de produção: variáveis da Vercel, redirects do Supabase Auth, smoke test no domínio publicado e publicação do commit no GitHub.
5. Atualização dos documentos antigos de plano/estado, que ainda possuem status de planejamento e não refletem a implementação atual.

## Fora do escopo atual da V1

- API de WhatsApp/e-mail;
- chat em tempo real;
- promoções e descontos;
- agendamento avançado de banners;
- gateway de pagamento;
- integração externa de ERP/estoque.

## Regra de retomada

Antes de executar qualquer item acima, ler este checkpoint e validar o estado real do repositório, Supabase e deploy. O redesign solicitado pelo usuário é uma frente separada e pode ser executado enquanto este plano permanece pausado, sem alterar os requisitos de negócio registrados aqui.
