# Automação — gates de qualidade

## Automação implementada

O workflow `.github/workflows/quality.yml` executa automaticamente em todo push
para `main`/`master` e em todo pull request direcionado a essas branches.
Cada execução:

1. instala dependências com `npm ci`;
2. executa ESLint;
3. executa TypeScript sem emitir arquivos;
4. executa o build de produção do Next.js.

O workflow tem permissão somente de leitura, timeout de 15 minutos e cancela uma
execução anterior da mesma referência quando uma nova alteração chega.

## Execução local equivalente

```text
npm ci
npm run check
```

O comando `npm run check` é a fonte única do gate local e do CI.

## Próximas automações planejadas

- adicionar testes unitários dos serviços e transições de pedido;
- adicionar testes de integração das RPCs críticas e RLS;
- adicionar E2E dos fluxos de login, convite, checkout e operação;
- adicionar `supabase db lint --linked` em um job protegido por secrets do ambiente;
- publicar artefatos de build e relatórios de teste somente após esses gates passarem.

Esses itens permanecem separados para não transformar credenciais de produção em
requisito do CI básico.

