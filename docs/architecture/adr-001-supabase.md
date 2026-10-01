# ADR-001 — Supabase como plataforma de backend

**Status:** ACEITO  
**Data:** 2026-09-23

## Contexto

O ProStock precisa de PostgreSQL relacional, autenticação, storage privado, políticas de isolamento por empresa, transações e operação simples para um MVP. O front atual é Next.js App Router e ainda não possui backend ou persistência.

## Decisão

Usar Supabase como plataforma gerenciada para PostgreSQL, Auth, Storage, migrations, RLS e geração de tipos. O Next.js permanece responsável pela composição da UI, Server Components para leituras, Server Actions/Route Handlers para comandos e uma camada de aplicação que não expõe o cliente Supabase diretamente aos componentes.

Durante o desenvolvimento haverá projeto local via Supabase CLI para migrations, seed e testes reproduzíveis. Ambientes compartilhados e produção usarão projetos Supabase em nuvem separados, com variáveis de ambiente distintas.

## Estrutura de integração

- `lib/supabase/server`: cliente server-only para sessão e operações autorizadas.
- `lib/supabase/browser`: cliente limitado ao fluxo de sessão no navegador.
- `modules/*/application`: casos de uso e DTOs.
- `modules/*/domain`: regras e tipos independentes de Supabase.
- `modules/*/infrastructure`: repositórios e adapters Supabase.
- `supabase/migrations`: esquema versionado e policies.
- `supabase/seed.sql`: dados mínimos reproduzíveis para desenvolvimento.

Componentes React não importam tabelas, service role ou repositórios diretamente. A troca futura por API dedicada deve substituir adapters, não reescrever domínio e UI.

## Alternativas rejeitadas

Um backend separado (Node/Nest/Java) neste estágio aumentaria operação, deploy e superfície de integração sem benefício proporcional. Uma API direta do navegador ao banco também foi rejeitada por não fornecer uma fronteira suficiente para regras transacionais e autorização contextual.

## Consequências

**Positivas:** entrega rápida, PostgreSQL completo, Auth/Storage integrados, RLS, migrations e baixo custo operacional inicial.

**Negativas:** dependência de APIs Supabase, necessidade de disciplina para não vazar service role, atenção a limites da plataforma e eventual trabalho de extração se o domínio exigir múltiplos serviços.

## Critérios para reavaliar

Revisar esta decisão se houver necessidade comprovada de múltiplos bancos especializados, processamento assíncrono de alta escala, requisitos de residência não atendidos, limites operacionais da plataforma ou uma equipe dedicada para operar backend próprio.
