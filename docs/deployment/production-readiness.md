# Preparação de produção — ProStock

## Variáveis obrigatórias

Configurar no provedor de hospedagem (por exemplo, Vercel) os valores abaixo.
Nunca versionar o arquivo `.env.local` nem a chave service role.

| Variável | Exposição | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | pública | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | pública | chave anon para o cliente Supabase |
| `NEXT_PUBLIC_SITE_URL` | pública | URL HTTPS final da aplicação |
| `SUPABASE_SERVICE_ROLE_KEY` | somente servidor | somente se algum job administrativo futuro exigir |

`NEXT_PUBLIC_SITE_URL` deve apontar para o domínio HTTPS definitivo. Em produção,
o código falha explicitamente quando essa variável não existe ou não é uma URL
HTTP(S) válida, evitando links de confirmação apontando para localhost.

## Supabase antes do go-live

1. Confirmar que todas as migrações foram aplicadas com `supabase db lint --linked`.
2. Configurar o domínio final em Authentication → URL Configuration:
   - Site URL: domínio HTTPS da aplicação;
   - Redirect URLs: `/auth/callback` e `/auth/reset-password` no mesmo domínio.
3. Manter confirmação de e-mail conforme a política operacional definida para a V1.
4. Ativar SSL enforcement e revisar logs de Auth, PostgREST e banco.
5. Confirmar que nenhuma variável `NEXT_PUBLIC_*` contém a service role key.

## Deploy da aplicação

Executar no CI antes de publicar:

```text
npm ci
npm run lint
npm run typecheck
npm run build
```

O processo de produção deve executar `npm run start` usando as variáveis do
ambiente de produção. O cache `.next` não deve ser reutilizado entre builds com
variáveis ou versões diferentes.

## Pós-deploy mínimo

- Abrir `/auth/login` e confirmar que a aplicação responde em HTTPS.
- Validar login de cliente, operador interno, entregador e administrador.
- Confirmar que logout remove a sessão e que rotas protegidas redirecionam para login.
- Executar um pedido de teste até a confirmação de recebimento.
- Repetir um teste negativo de isolamento entre duas empresas.
- Monitorar erros de autorização, falhas de RPC e crescimento de `audit_logs`.

## Cabeçalhos aplicados

O Next.js remove o cabeçalho `x-powered-by` e aplica globalmente:

- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy` restritiva;
- `Strict-Transport-Security` somente em produção.

