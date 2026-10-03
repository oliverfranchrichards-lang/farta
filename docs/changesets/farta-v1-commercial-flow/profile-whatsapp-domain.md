# PROFILE-WHATSAPP-001 — Contato manual no MVP

## Decisão de escopo

O MVP suportará somente contato manual usando o campo existente `profiles.phone`. Não haverá API oficial do WhatsApp, provider, webhook, fila de envio, automação, confirmação de entrega de mensagem ou armazenamento de credenciais.

O produto poderá oferecer uma ação de contato que abre o aplicativo/site do WhatsApp do usuário, preferencialmente com uma mensagem pré-preenchida. A ação não representa que uma mensagem foi enviada pelo Farta. O envio acontece manualmente no cliente do usuário e permanece fora do controle do sistema.

Não criar `whatsapp_phone` nesta etapa. Reutilizar `profiles.phone`, desde que o valor seja normalizado e validado no servidor antes de ser usado em link externo.

## Modelo de contato

- `profiles.phone` é a fonte única do número de contato.
- Armazenar uma representação canônica compatível com E.164 quando possível, incluindo código do país.
- Máscara visual pode ser aplicada somente na UI; não usar a máscara como valor de integração.
- Não registrar número completo em logs de erro, analytics ou audit metadata sem necessidade.
- Número ausente, inválido ou não confirmado não deve produzir link de contato.
- Não inferir país silenciosamente quando o número não possuir informação suficiente; solicitar correção no perfil ou aplicar a regra de país definida pelo produto.

## Quem pode visualizar e usar o telefone

### CUSTOMER

- Pode visualizar e editar o próprio telefone, conforme as regras de perfil.
- Pode usar o contato operacional da plataforma/empresa quando esse contato for explicitamente disponibilizado.
- Não pode consultar telefone de outro cliente da mesma empresa somente por compartilhar a empresa.
- Pode visualizar seus pedidos conforme o escopo aprovado: todos os pedidos da própria empresa, mas o telefone de outros membros não faz parte do detalhe do pedido.

### INTERNAL_OPERATOR

- Pode visualizar o telefone do contato associado ao pedido da própria empresa quando necessário para análise, confirmação manual ou operação.
- Pode abrir uma ação “Contatar cliente” somente para pedido pertencente à sua empresa e em estado permitido pelo fluxo.
- Não pode consultar ou usar telefones de outra empresa.
- O acesso deve ser registrado em auditoria quando ocorrer dentro de uma tela de pedido.

### DRIVER

- Pode visualizar somente o telefone do destinatário/contato operacional de uma entrega atribuída ao próprio perfil.
- Não pode consultar telefone de clientes, operadores ou pedidos não atribuídos.
- O telefone deve aparecer apenas quando necessário para concluir a entrega, com minimização de dados.

### PLATFORM_ADMIN

- Pode visualizar contato dentro do escopo administrativo autorizado.
- O uso deve ser restrito à finalidade operacional/suporte e auditável.
- Não deve receber uma lista global de telefones sem necessidade de negócio.

### Usuário não autenticado

- Não pode visualizar telefone nem gerar link de contato.
- Link de pedido não autenticado deve redirecionar para login e, depois, repetir a verificação de ownership/role.

## Link manual para WhatsApp

Quando o telefone estiver válido, a UI pode gerar um link externo equivalente a `https://wa.me/<numero>` com texto pré-preenchido. O texto pode conter apenas dados mínimos, por exemplo número do pedido e uma saudação.

Regras do texto:

- não incluir token, senha, segredo, endereço completo ou custo/margem interna;
- não incluir dados de outro tenant;
- o pedido pode ser referenciado por número público/operacional, desde que não seja tratado como autorização;
- o link só deve ser montado após a autorização do usuário para aquele contexto;
- o servidor ou UI deve codificar corretamente o texto da URL;
- abrir o link não altera status do pedido nem cria notificação de envio.

O ID do pedido na URL nunca concede acesso. Antes de exibir dados para formar o texto, o sistema deve verificar sessão, role, empresa e relação com o pedido/entrega. Para um link recebido externamente, o fluxo é: login → verificação de perfil ativo → verificação de ownership/role → exibição do pedido ou acesso negado.

## Estados e erros de domínio

Esta slice não cria status de “mensagem enviada”. A ação é manual e pode ter apenas estados efêmeros de interface:

- `CONTACT_AVAILABLE`: telefone válido e contexto autorizado;
- `CONTACT_UNAVAILABLE`: telefone ausente, inválido ou não confirmado;
- `CONTACT_OPENING`: navegador/app sendo aberto;
- `CONTACT_OPENED`: link aberto; não significa envio;
- `CONTACT_BLOCKED`: usuário não possui permissão;
- `CONTACT_FAILED`: falha ao montar/abrir link.

Mensagens mínimas:

- telefone ausente: “Este contato ainda não possui telefone cadastrado.”;
- telefone inválido: “O telefone cadastrado precisa ser atualizado antes do contato.”;
- sem autorização: “Você não tem permissão para acessar este contato.”;
- pedido inexistente: “Pedido não encontrado.”;
- pedido de outro tenant: responder como acesso negado, sem confirmar existência;
- link indisponível: “Não foi possível abrir o contato. Copie o telefone e tente manualmente.”

Não expor detalhes internos de erro, resposta de provider ou stack trace, pois não existe provider nesta fase.

## Regras de negócio

1. Nenhum envio automático de WhatsApp pertence ao MVP.
2. Nenhuma credencial ou token de WhatsApp deve ser configurado ou armazenado.
3. A ausência de telefone não bloqueia criação, análise ou confirmação de pedido; bloqueia apenas a ação manual de contato.
4. A ação manual não muda estado de pedido, entrega ou notificação.
5. Telefone e link externo são dados pessoais e devem seguir minimização e escopo por role.
6. A autorização é verificada no servidor para qualquer action/endpoint que retorne contato ou detalhe de pedido.
7. Alterar o `orderId` manualmente nunca amplia acesso.
8. Operador só contata cliente da própria empresa; driver só contata destinatário de entrega atribuída.
9. O sistema não deve declarar “WhatsApp enviado”, “entregue” ou “lido”.
10. O usuário deve poder copiar o número e iniciar contato manualmente se o aplicativo não abrir.

## Critérios de aceite

1. Perfil com telefone válido exibe ação manual de contato somente nos contextos autorizados.
2. Perfil sem telefone não exibe link quebrado e informa como atualizar o contato.
3. Telefone inválido não é usado para gerar URL externa.
4. Operador A não acessa telefone/pedido da empresa B.
5. Driver não acessa telefone de entrega não atribuída.
6. Cliente não acessa telefone de outro cliente da empresa.
7. Usuário não autenticado não obtém telefone ao manipular URL.
8. Link de pedido exige login e revalida role/ownership.
9. Abrir/copiar contato não altera status do pedido e não cria falso registro de envio.
10. Texto pré-preenchido não contém secrets, tokens, margem, custo ou dados de outro tenant.
11. O sistema continua funcionando quando WhatsApp não está instalado; o usuário recebe alternativa manual.
12. Logs e auditoria não vazam número completo desnecessariamente.

## Handoff

**TASK_ID:** PROFILE-WHATSAPP-001  
**STATUS:** DOMAIN_SCOPE_APPROVED — escopo funcional definido, sem implementação.  
**SUMMARY:** contato manual usando `profiles.phone`, sem API/provider; links externos opcionais; autorização por empresa, role e atribuição; link de pedido autenticado e seguro.  
**DECISIONS:** reutilizar `profiles.phone`; não criar `whatsapp_phone`; não automatizar mensagens; ausência de telefone não bloqueia pedido; operador acessa contatos da própria empresa; driver somente da entrega atribuída.  
**FILES_CHANGED:** somente `docs/changesets/farta-v1-commercial-flow/profile-whatsapp-domain.md`.  
**SCHEMA_CHANGED:** não.  
**MIGRATIONS:** nenhuma criada/aplicada.  
**SECURITY_IMPACT:** dados pessoais minimizados; RLS/ownership por empresa; proteção contra ID manipulado; sem tokens/segredos em links ou logs.  
**TESTS_EXECUTED:** análise do modelo `profiles.phone`, roles, pedidos, entregas e requisitos de link seguro; nenhum teste runtime por não haver implementação.  
**TEST_RESULTS:** contrato pronto para revisão de Security, Backend e UX.  
**RISKS:** regra de país para números sem código; confirmação do texto pré-preenchido; política de retenção/auditoria do acesso a telefone.  
**OPEN_ISSUES:** definir apenas máscara/regra de país e quais estados de pedido exibem a ação ao operador; nenhuma decisão de provider é necessária nesta V1.  
**NEXT_DEPENDENCY:** SECURITY valida minimização/RLS; BACKEND implementa normalização e autorização server-side; PRODUCT-DESIGN-DIRECTOR define ação/feedback; QA testa isolamento e links manipulados.
