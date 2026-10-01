# Runbook de publicação — Farta

Use este fluxo sempre que o usuário disser “fazer deploy para o GitHub”, “subir para o GitHub” ou “publicar as alterações”.

## Escopo fixo

- App: raiz `prostock-web`.
- Remote oficial: `https://github.com/oliverfranchrichards-lang/farta.git`.
- Branch oficial: `main`.
- Nunca alterar o remote sem autorização explícita.

## Verificação inicial

```powershell
git status --short
git remote -v
git branch --show-current
```

Confirmar que `.env.local`, chaves privadas, tokens, secrets, logs locais e artefatos de máquina não serão enviados.

## Validação

Antes do commit, executar:

```powershell
npm.cmd run check
```

Corrigir erros de lint, TypeScript ou build antes de publicar. Warnings preexistentes devem ser reportados.

## Commit e publicação

```powershell
git add -A
git status --short
git commit -m "mensagem curta descrevendo a entrega"
git branch -M main
git remote get-url origin
git push -u origin main
```

Se o remote não existir, adicionar somente o remote oficial:

```powershell
git remote add origin https://github.com/oliverfranchrichards-lang/farta.git
```

Se houver commits remotos ausentes localmente, não usar `--force`; verificar a divergência e pedir orientação.

## Confirmação final

```powershell
git status --short
git log --oneline -2
git remote -v
```

Informar commit, branch, remote, estado do working tree e qualquer arquivo local deixado fora.

## Vercel

O push dispara o deploy se o projeto Vercel estiver conectado ao repositório e à branch `main`.

Confirmar: Framework Preset `Next.js`, Root Directory na raiz do repositório, Build Command `npm run build` e Output Directory vazio.

Variáveis obrigatórias na Vercel:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL
```

`NEXT_PUBLIC_SITE_URL` deve ser o domínio real da Vercel em produção, nunca `localhost` ou um túnel ngrok permanente.

## Supabase em produção

Em `Authentication → URL Configuration`, configurar o Site URL e o Redirect URL do domínio Vercel, por exemplo:

```text
https://projeto.vercel.app
https://projeto.vercel.app/**
```

Não executar `supabase config push` automaticamente se o diff incluir alterações não relacionadas de Auth, MFA, OTP ou limites de e-mail. Revisar antes.

## Interrupções obrigatórias

Parar e informar o usuário somente se houver secrets expostos, remote divergente, conflito de histórico, falha de validação ou ausência de autenticação no GitHub.