# Supabase local development

The project is initialized for Supabase CLI migrations and seed data.

## Local prerequisites

- Supabase CLI 2.117+
- Docker Desktop running (required by `supabase start`)

Useful commands:

```powershell
npx.cmd supabase@latest start
npx.cmd supabase@latest db reset
npx.cmd supabase@latest stop
```

The local stack is independent from the hosted project. Remote linking and deployment require the project URL and an authenticated Supabase CLI session; those credentials are not committed to the repository.

## Migration policy

Migrations are ordered, reviewed SQL files under `supabase/migrations`. RLS policies and constraints belong in the migrations, while seed data belongs in `supabase/seed.sql`. Do not edit an applied migration; add a new one.
