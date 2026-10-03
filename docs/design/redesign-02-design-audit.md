# Redesign 02 — auditoria do design aprovado

**Data:** 03/10/2026  
**Fonte visual:** `C:/Users/olive/.pencil/documents/620c7e4a-0c42-4316-bb18-490255c78e3f/pencil-new.pen`  
**Escopo desta entrega:** auditoria e rastreabilidade. Nenhum código, migration, contrato ou componente de produção foi alterado.

## 1. Resultado da leitura

O arquivo `.pen` está acessível, válido como JSON e contém 21 frames de referência. Todos os IDs solicitados nas instruções foram encontrados:

| Grupo | IDs encontrados | Dimensões principais |
|---|---|---|
| Autenticação | `sKLrk`, `KOx2B`, `RbFrT` | 1303 × 900 |
| Admin — empresas e acesso | `Xkwdd`, `l6fLqB`, `BgB9z`, `ILrZa` | 1303 × 900 |
| Admin — catálogo | `HMEgx`, `kZj4J`, `tDBsF`, `Risda`, `E07F4`, `ywSb3` | 1303 × 900; variantes/imagens até 973; drawer até 1019 |
| Admin — pedidos | `WU6Sk`, `S6mgJ`, `rm9SZ` | 1303 × 1100–1187 |
| Cliente — compra | `Sdnoa`, `G4VM0i`, `L9mHNx` | 1440 × 1420 |
| Cliente — revisão | `QFXql` | 1440 × 1610 |
| Cliente — perfil | `vyXQN` | 1303 × 900 |

`L9mHNx` está marcado como reutilizável. Os frames `l6fLqB` e `BgB9z` representam estados da mesma tela de estabelecimentos, não duas rotas.

Assets referenciados pelo design também estão disponíveis na pasta do documento: quatro imagens `images/generated*.png`, uma imagem em `images/localhost/`, duas fontes WOFF2 locais e referências remotas do Unsplash. As referências remotas não devem substituir os dados/imagens reais do catálogo.

## 2. Foundations extraídas

### Cores recorrentes

| Token visual inferido | Valor observado | Uso predominante |
|---|---|---|
| Verde profundo | `#1B3B2E` / `#1b3b2e` | Sidebar, ações primárias, marca |
| Verde de título | `#1B2D25`, `#19392A` | Títulos e saudação |
| Verde médio | `#2D5645`, `#365548` | Item ativo da navegação |
| Verde de texto/ícone | `#203D30`, `#244B32` | Ícones, links e controles do cliente |
| Fundo página | `#FAF9F6` / `#FAF8F4` | Canvas principal |
| Superfície | `#FFFFFF` | Topbars, cards, tabelas, drawers |
| Superfície suave | `#F5F6F2`, `#EDF3E7`, `#E9EFD9`, `#EEF2E8` | Busca, contexto, banners e notices |
| Texto secundário | `#6B786F`, `#667369`, `#728073` | Descrições e metadados |
| Texto auxiliar | `#78857B`, `#8A958E` | Placeholders, footers |
| Acento | `#F2994A`, `#F5C66C` | Auth/marketing e item ativo do cliente |
| Alerta | `#B26B21`, `#B94B3D`, `#FFF6E8` | Warnings e desativação |
| Overlay | `#14231DCC` / `#14231D99` | Modal/drawer |

Há variações de maiúsculas/minúsculas e várias cores auxiliares no arquivo. A implementação deve consolidá-las em tokens, sem copiar cada ocorrência como cor isolada.

### Tipografia

- **Inter** domina admin e cliente: 11–15px para metadados/corpo, 18–20px para títulos de cards, 30–34px para títulos de página, pesos normal/500/600/650/700.
- **Helvetica** aparece nos formulários de autenticação e textos de apoio.
- **Gilroy** aparece nos títulos grandes da autenticação.
- **Georgia/Gabarito** aparecem em poucas ocorrências e não formam um padrão consistente.
- O repositório já possui tokens globais com Gilroy/Helvetica e o design aprovado introduz Inter como fonte dominante. Essa decisão precisa ser fechada na implementação da base visual; não deve haver carregamento duplicado ou fallback silencioso.

### Espaçamento, forma e layout

- Admin: sidebar fixa de **240px**, padding interno de **32px**, gap vertical de **28px**, navegação com gap de **8px**; content de **1063px** na referência de 1303px.
- Cliente: sidebar de **220px**, padding de **24px**, gap vertical de **28px**; topbar de **88px** com padding horizontal de **32px**.
- Admin topbar: **72px**, padding horizontal de **40px**.
- Perfil: topbar de **68px**, conteúdo com largura de **833px** e padding vertical de **34px**.
- Cards e superfícies usam raios recorrentes de 7–12px; cards de perfil e painéis usam principalmente 12px. A exceção de pílula/contador deve permanecer semântica.
- O desenho usa composição por Flexbox/stack (`vertical`, `fill_container`, `space_between`) e não deve ser reproduzido com coordenadas absolutas no produto.
- Frames administrativos têm altura natural maior que a viewport em pedidos; devem rolar. Não comprimir conteúdo para 900px.

## 3. Inventário visual por módulo

### Autenticação

Os três frames compartilham o mesmo split-screen: bloco de marca/benefício verde à esquerda (~586px) e formulário branco centralizado à direita (~717px). A mensagem de marca é repetida, com título grande branco, acento laranja e apoio em branco translúcido. Os estados visíveis são login, recuperação e cadastro, incluindo SSO, mostrar senha, loading/erro implícitos nos campos e links de retorno.

### Admin — shell e empresas

`Xkwdd` define o shell administrativo: sidebar verde, marca, quatro itens de navegação, perfil inferior, topbar branca com breadcrumb e saída, conteúdo de título/descrição, CTA, filtros e tabela de empresas. A tabela tem header suave, quatro linhas de exemplo e footer de paginação.

`l6fLqB` é o estado de estabelecimentos com modal de confirmação aberto: tabela, busca/filtro e modal com overlay, título, texto explicativo, warning reversível, cancelar e desativar.

`BgB9z` é o estado base da mesma tela, sem modal, com CTA de novo estabelecimento e atalho de convites. A inspeção confirma: `BgB9z` = estado normal; `l6fLqB` = confirmação de desativação.

`ILrZa` organiza convites em formulário superior, seleção visual de perfil, contagem e cards de convites, seguido por busca/filtro e tabela. Há estados textuais ACCEPTED, PENDING e EXPIRED no exemplo; devem ser derivados dos enums existentes, não das labels do canvas.

### Admin — produtos e categorias

`HMEgx` define a listagem de produtos com título, descrição, ações, métricas-resumo, filtros e tabela redesenhada.

`kZj4J` define a listagem de categorias com resumo, filtros, tabela e ação de criação/gestão.

`tDBsF`, `Risda` e `ywSb3` são estados/abas da mesma edição de produto: informações principais, variantes/SKUs e imagens. Elementos marcados `enabled:false` representam abas/estados alternativos e não devem ser renderizados simultaneamente.

`E07F4` sobrepõe drawer lateral de variante com overlay escuro. O drawer contém dados da variante, SKU, unidade, venda mínima, status, preço por empresa e a opção “Todas recebem esse preço”. O overlay não muda o contrato da variante nem transforma a tela em outra rota.

### Admin — pedidos

`WU6Sk` é a fila: eyebrow “OPERAÇÃO”, título, descrição, três métricas, filtros, notice e tabela de pedidos. `S6mgJ` abre drawer de detalhes para “Aguardando cliente”, incluindo contato, itens, total e ações de footer. `rm9SZ` abre drawer de “Aguardando análise”, incluindo contato/WhatsApp, preços finais, observação, itens, total e exportações Excel/PDF.

Os frames são de referência visual para estados da fila; a disponibilidade de cada botão continua sendo determinada pelo status e pela autorização real do backend.

### Cliente — comprar, carrinho e perfil

`Sdnoa`, `G4VM0i` e `L9mHNx` são a mesma rota de catálogo em três estados: carrinho vazio, carrinho preenchido e carrinho com muitos itens. O shell tem sidebar de 220px, menus Início/Comprar/Pedidos/Mensagens, seletor de estabelecimento, busca, notificações e perfil. O conteúdo tem saudação, banner, categorias, grade de produtos e resumo do pedido compartilhado.

`L9mHNx` mostra contador de **6 produtos distintos** no atalho do carrinho. A quantidade de volumes aparece separadamente no resumo; essa semântica deve ser preservada.

`QFXql` é a revisão completa do carrinho: voltar às compras, contexto da loja/equipe, lista completa, controles de quantidade, entrega/endereço/janela, observações, resumo e envio para análise.

`vyXQN` é a tela de perfil/configurações. Apesar do nome conter “Admin”, o próprio arquivo de instruções determina que ela representa a conta do cliente. Mostra dados da conta, telefone/WhatsApp com aviso de contato manual e ação de sair.

## 4. Matriz frame → rota → funcionamento atual

| Frame/estado | Rota provável existente | Página/componente atual | Ações/serviços já localizados | Permissão/escopo |
|---|---|---|---|---|
| `sKLrk` Login | `/auth/login` | `login/page.tsx`, `login-content.tsx` | `signIn`, redirect `/auth/after-login`, convite opcional | Sessão pública |
| `KOx2B` Recuperação | `/auth/forgot-password` | `forgot-password/page.tsx` | `resetPassword`/ações de auth | Sessão pública |
| `RbFrT` Cadastro | `/auth/signup` | `signup/page.tsx`, `signup-content.tsx` | `signUp`, confirmação e convite | Sessão pública |
| `Xkwdd` Empresas | `/admin/empresas` | `admin/empresas/page.tsx` | `listCompanies`, criação/navegação | `PLATFORM_ADMIN` |
| `BgB9z` Estabelecimentos normal | `/admin/empresas/[companyId]/estabelecimentos` | `estabelecimentos/page.tsx` | listagem, novo, convite, editar/inativar | `PLATFORM_ADMIN` |
| `l6fLqB` Confirmação de desativação | mesma rota | componente de estabelecimentos | ação de status + confirmação | `PLATFORM_ADMIN` + regra backend |
| `ILrZa` Convites | `/admin/empresas/[companyId]/convites` | `convites/page.tsx`, `invite-form.tsx` | `createCompanyInvitation`, listagem | `PLATFORM_ADMIN` |
| `HMEgx` Produtos | `/admin/produtos` | `produtos/page.tsx`, `products-admin.tsx` | `listAdminProducts`, filtros/status | `PLATFORM_ADMIN` |
| `kZj4J` Categorias | `/admin/categorias` | `categorias/page.tsx`, `categories-admin.tsx` | criar/editar/inativar/excluir, reatribuição | `PLATFORM_ADMIN` |
| `tDBsF` Produto — informações | `/admin/produtos/[productId]` | `page.tsx`, `product-editor.tsx` | editar produto e variantes | `PLATFORM_ADMIN` |
| `Risda` Produto — variantes | mesma rota, aba/estado | `product-editor.tsx` | salvar SKU, unidade, mínimo, status, preço | `PLATFORM_ADMIN` |
| `E07F4` Variante — drawer | mesma rota, drawer aberto | `product-editor.tsx` | preço por empresa, “todas”, salvar/fechar | `PLATFORM_ADMIN` |
| `ywSb3` Produto — imagens | mesma rota, aba/estado | `product-editor.tsx` | upload, alt text, primária | `PLATFORM_ADMIN` |
| `WU6Sk` Fila de pedidos | `/admin/pedidos` | `admin/pedidos/page.tsx`, `orders-queue.tsx` | métricas, filtros, status | `PLATFORM_ADMIN` |
| `S6mgJ` Detalhe aguardando cliente | `/admin/pedidos`, drawer | `orders-queue.tsx` | detalhes, itens, contato, fechar | `PLATFORM_ADMIN` |
| `rm9SZ` Detalhe aguardando análise | `/admin/pedidos`, drawer | `orders-queue.tsx` | preços finais, observação, exportar, status | `PLATFORM_ADMIN` |
| `Sdnoa` Catálogo vazio | `/catalogo` | `catalogo/page.tsx`, `catalogo.module.css` | contexto/estabelecimento, busca, banners, categorias, add | `CUSTOMER` |
| `G4VM0i` Catálogo com itens | `/catalogo` | mesmos componentes | carrinho compartilhado e quantidade | `CUSTOMER` + estabelecimento |
| `L9mHNx` Catálogo cheio | `/catalogo` | mesmos componentes | resumo limitado e contador de distintos | `CUSTOMER` + estabelecimento |
| `QFXql` Revisão do carrinho | `/pedido` | `pedido/page.tsx`, `pedido.module.css` | quantidade/remover, endereço, janela, observação, enviar análise | `CUSTOMER` + estabelecimento |
| `vyXQN` Perfil do cliente | `/perfil` | `perfil/page.tsx`, `profile-form.tsx` | dados reais, WhatsApp manual, logout | Usuário autenticado; confirmar regra por perfil |

## 5. Conflitos e dúvidas que precisam ser resolvidos antes da implementação

1. **Navegação administrativa no canvas:** em alguns frames, o item visual chamado “Entregas” possui label “Produtos” e o item chamado “Usuários” possui label “Banners”. Isso conflita com a navegação real do repositório (`Empresas`, `Produtos`, `Banners`, `Pedidos`). Deve-se preservar os destinos reais e corrigir apenas o texto/ícone visual para não criar navegação enganosa.
2. **Pedidos duplicados por escopo:** o design usa “Admin”, enquanto o produto também possui `/operacao/pedidos` e `/operacao/entregas` para operador interno/entregador. Os frames `WU6Sk`/`S6mgJ`/`rm9SZ` foram mapeados para `/admin/pedidos` por corresponderem ao shell/role de admin. Não reutilizar esse drawer para conceder ações a operador sem validar permissões e status.
3. **Nome “Admin” do perfil:** `vyXQN` deve ser implementado em `/perfil` para cliente conforme a instrução, mesmo que o nome do frame seja legado. Confirmar que os perfis administrativos não recebam ações de cliente indevidas.
4. **Preço “Todas recebem esse preço”:** o desenho mostra uma opção global, mas o contrato atual é preço por empresa autorizada. A UI deve refletir o RPC/validação já existente e nunca ignorar empresas ou permissões. Não criar nova operação em lote além da já implementada.
5. **Conteúdo de exemplo:** nomes, e-mails, preços, pedidos, imagens e datas do canvas são dados de apresentação. Devem ser substituídos por dados reais carregados pelas actions existentes.
6. **Assets remotos:** o `.pen` referencia Unsplash e assets locais do Pencil. O app já possui imagens reais/Supabase e configuração de `next/image`; não importar dependência ou URL só para coincidir com o exemplo.
7. **Fonte:** Inter é dominante no `.pen`, mas o app usa tokens Gilroy/Helvetica. É necessário decidir e registrar a fonte de produção antes de remodelar o shell; fontes locais do Pencil não devem ser copiadas sem licença/origem confirmada.
8. **Acessibilidade do drawer/modal:** o design explicita overlay e fechamento, mas o arquivo visual não especifica foco, retorno do foco, bloqueio de rolagem ou navegação por teclado. Esses requisitos da instrução têm prioridade sobre a aparência.
9. **Estados não desenhados:** loading, erro de API, vazio, permissão negada, sessão expirada, botão desabilitado e submissão duplicada não podem ser removidos durante o redesign. O canvas fornece apenas alguns estados de sucesso/uso.
10. **Responsividade:** não há frames mobile/tablet. Implementar a hierarquia visual em breakpoints menores sem inventar rotas ou funcionalidades; tabelas e drawers precisam de rolagem localizada.

## 6. Ordem recomendada de lotes

1. **Base compartilhada:** confirmar tokens/fonte, logo e assets, shell admin/cliente, topbar, sidebar, perfil, foco e estados base.
2. **Autenticação:** login, recuperação, cadastro, convite, loading/erro e redirects.
3. **Admin — empresas/estabelecimentos/convites:** listagem, filtros, modal de desativação e permissões.
4. **Admin — produtos/categorias:** listagens, tabs de edição, variantes, drawer de preço e imagens.
5. **Admin — pedidos:** fila, métricas, drawers de cliente/análise e exportações.
6. **Cliente — catálogo:** estados vazio/preenchido/muitos itens, contexto de estabelecimento, banners, categorias, busca e carrinho compartilhado.
7. **Cliente — revisão/entrega:** `/pedido`, endereço, janela, observações e envio para análise.
8. **Cliente — perfil:** dados reais, WhatsApp manual e logout.
9. **Regressão e validação visual:** screenshots nas dimensões de referência, depois desktop menor/tablet/celular; build, lint, typecheck, testes de fluxo e verificação de rede/console.

Cada lote deve preservar handlers/actions existentes, ser validado funcionalmente e só então avançar. O redesign não está autorizado a alterar banco, migrations, contratos ou regras de negócio.

## 7. Estado técnico observado

- Framework: Next.js `16.3.6`, React `19.2.8`, TypeScript `5`.
- Estilos: CSS Modules por tela/componente e `src/app/globals.css` com tokens legados/compatibilidade.
- Backend: Supabase via `@supabase/ssr`/`@supabase/supabase-js`; server actions e RPCs existentes.
- Shell: `AppShell`, `PrimaryNav` e `SignOutButton`; o shell atual diferencia customer, operator, driver e platform admin por pathname/perfil.
- Ações de domínio localizadas em `src/modules/auth`, `admin`, `orders`, `customer`, `banners`, `chat` e `invitations`.
- Gate executado durante esta auditoria: `npm.cmd run check` passou em lint, typecheck e build; o build gerou 28 rotas e o proxy do Next.js.
- `git status` já continha alterações locais não relacionadas ao redesign (`plan-paused-checkpoint-2026-10-03.md` e `supabase-push.log`); não foram modificadas.

## 8. Conclusão para aprovação

O design aprovado é implementável como uma remodelagem visual incremental, sem nova aplicação e sem mudança de backend. O principal risco não é a disponibilidade das telas, mas a reconciliação entre a nomenclatura do canvas e os contratos reais: navegação admin, escopo de pedidos, preço por empresa, perfil do cliente e estados não desenhados.

Antes de codificar o primeiro lote, a decisão necessária é confirmar a fundação (Inter versus tokens tipográficos atuais) e aceitar as correções de nomenclatura/semântica listadas acima. Depois disso, o primeiro lote recomendado é o shell compartilhado + autenticação, seguido de validação visual e funcional.
