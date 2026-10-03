# Google OAuth — configuração e validação

O código do Farta já contém o início seguro do fluxo OAuth. O provedor permanece desligado até que a configuração abaixo seja concluída.

## Google Cloud

1. Criar ou selecionar um projeto no Google Cloud.
2. Configurar a tela de consentimento OAuth e publicar o app quando estiver pronto para usuários externos.
3. Criar uma credencial **OAuth Client ID** do tipo **Web application**.
4. Adicionar como origens autorizadas todos os ambientes utilizados:
   - `http://localhost:3000`
   - URL de produção da Vercel
   - URL ngrok apenas durante testes

## Supabase

Em **Authentication → Providers → Google**:

- habilitar Google;
- informar Client ID e Client Secret do Google Cloud;
- usar como callback OAuth do provedor:
  `https://usfpyyilyzceuowbkgfa.supabase.co/auth/v1/callback`.

Em **Authentication → URL Configuration**:

- definir o Site URL do ambiente ativo;
- permitir os callbacks da aplicação:
  - `http://localhost:3000/auth/callback`
  - URL de produção + `/auth/callback`
  - URL ngrok + `/auth/callback`, se necessário.

O Client Secret fica exclusivamente no Supabase. Ele não deve ser colocado em `.env`, no frontend ou no GitHub.

## Aplicação

Definir `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` somente depois de concluir a configuração do Google e do Supabase. O código usa `signInWithOAuth`, preserva o token de convite e retorna pelo `/auth/callback`.

Com a flag ausente ou `false`, o botão permanece desabilitado e nenhum redirecionamento é realizado.

## Regras de segurança

- Google não define papel, empresa ou permissão.
- Usuário novo começa como `CUSTOMER/PENDING` e precisa aceitar convite para acessar uma empresa.
- O e-mail do Google deve ser igual ao e-mail do convite.
- O callback usa `/auth/after-login` para aplicar o roteamento por papel/status.
- Contas existentes por e-mail/senha não devem ganhar um segundo perfil. Quando o Supabase retornar conflito de identidade, o usuário é orientado a entrar com a senha e o fluxo inicia `linkIdentity` para vincular o Google à sessão já autenticada.

## Teste mínimo antes de produção

- login Google novo com convite válido;
- Google sem convite, permanecendo sem acesso ao catálogo;
- e-mail diferente do convite;
- cancelamento/erro do consentimento;
- conta existente por e-mail/senha;
- callbacks local, Vercel e ngrok;
- inspeção dos logs para confirmar que nenhum segredo foi exposto.
