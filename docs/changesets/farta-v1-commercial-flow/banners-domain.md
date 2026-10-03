# BANNERS-001 — Contrato de domínio de banners

## Status e escopo

**STATUS:** DOMAIN_CONTRACT_READY — sem implementação.  
**OWNER:** PRODUCT-DOMAIN + PLATFORM_ADMIN.  
**DEPENDENCIES:** Database Architect, Security, DevOps/Storage, Product Design e QA.

O MVP terá banners globais para a área inicial de compras. O escopo é deliberadamente mínimo:

- status `ACTIVE` ou `INACTIVE`;
- ordenação definida pelo administrador;
- exibição em carrossel na página inicial de compras;
- controles manuais e avanço automático aproximado de 8 segundos;
- texto alternativo acessível.

Ficam fora desta task: agendamento, segmentação por empresa/usuário, tenant-specific banners, click-through/links, métricas de impressão/clique, regras de promoção, personalização, A/B testing, carrossel administrativo avançado e publicação automática.

## Estado atual auditado

Não foram encontradas tabelas, migrations, actions, rotas administrativas ou componentes de banner/carrossel no repositório. O schema possui `product_images`, mas imagem de produto não deve ser reutilizada como banner: são domínios e permissões diferentes. Também não foi comprovado bucket/policy de Supabase Storage específico para banners.

## Modelo mínimo proposto

Uma entidade global `banners` deve conter, no mínimo:

- `id` UUID;
- `storage_object_path` ou URL controlada pelo Storage;
- `alt_text` obrigatório;
- `title`/rótulo administrativo opcional, sem depender de texto embutido na imagem;
- `status` com `ACTIVE`/`INACTIVE`;
- `sort_order` inteiro não negativo;
- `created_at`, `updated_at`;
- autor de criação/atualização se o padrão de auditoria exigir.

Não incluir `company_id`, `audience`, `starts_at`, `ends_at`, `href`, `target`, `click_action` ou campos de tracking nesta V1.

### Storage

O arquivo deve ser validado antes da referência ser persistida:

- MIME permitido, preferencialmente `image/jpeg`, `image/png` ou `image/webp`;
- limite de bytes aprovado por DevOps/Design;
- dimensões e proporção aprovadas pelo Product Design Director;
- alt text obrigatório;
- objeto armazenado no bucket correto;
- caminho único e sem aceitar path arbitrário de outro tenant;
- substituição/exclusão deve remover ou desativar a referência de modo consistente.

Recomendação: bucket privado com URL assinada de curta duração, ou bucket público somente se Security aprovar que banners não contêm material restrito. A política escolhida deve ser uniforme e não pode vazar credenciais.

## Autorização e RLS

- `PLATFORM_ADMIN` ativo pode listar todos os banners, criar, editar, ativar/inativar, ordenar e substituir arquivo.
- `CUSTOMER` autenticado pode ler somente banners `ACTIVE` usados no catálogo global.
- `INTERNAL_OPERATOR` e `DRIVER` só devem receber banners se a experiência de compra for parte de seu escopo; não podem administrar.
- Usuário anônimo não recebe banner autenticado por API protegida.
- Nenhum perfil de empresa pode criar banner tenant-specific.
- Mutations devem ser actions/RPC server-side com role check; ocultar botão não é autorização.
- Storage policy deve impedir upload, substituição, exclusão e leitura indevida por roles não autorizados.
- Auditoria deve registrar autor, ação, banner, resultado e timestamp, sem registrar binário ou segredo.

## Invariantes

1. Status só pode ser `ACTIVE` ou `INACTIVE`.
2. Banner sem arquivo válido e alt text não pode ser ativado.
3. `sort_order` é inteiro não negativo e determina ordem estável.
4. Banners são globais; não existe filtro por empresa nesta V1.
5. Somente banners `ACTIVE` aparecem no carrossel.
6. Banner inativo não deve ser entregue pela consulta pública do catálogo.
7. Inativar não apaga histórico nem arquivo automaticamente.
8. Não há clique de navegação, logo o banner não pode alterar rota ou pedido.
9. Exibição não concede autorização a qualquer recurso externo.
10. Acessibilidade não depende exclusivamente de texto embutido na imagem.
11. Reordenação e alteração de status são idempotentes.
12. Arquivo de um banner não pode ser associado silenciosamente a outro registro.

## Comportamento do carrossel

- Carregar apenas banners ativos ordenados por `sort_order` e, em empate, por criação.
- Avançar automaticamente aproximadamente a cada 8 segundos quando houver mais de um banner.
- Permitir anterior/próximo e indicadores acessíveis.
- Pausar autoplay durante interação/foco quando necessário.
- Respeitar `prefers-reduced-motion`; nesse caso, não usar transição/avanço que prejudique leitura.
- Um único banner não deve mostrar controles inúteis nem iniciar timer.
- Sem banners ativos, a área deve desaparecer ou apresentar estado neutro sem bloquear o catálogo.
- Falha de imagem não pode impedir compra; usar fallback acessível e permitir continuar para os produtos.

## Critérios de aceite

1. Admin ativo cria banner com arquivo válido e alt text.
2. Arquivo inválido por MIME, tamanho ou dimensão é recusado antes de ativação.
3. Admin edita rótulo, ordem, alt text e status.
4. Usuário comum vê somente banners ativos globais.
5. Banner inativo não aparece sem exigir alteração de cache insegura.
6. Empresas diferentes recebem o mesmo conjunto de banners ativos.
7. Não existe campo ou comportamento de agendamento, segmentação ou click-through.
8. Carrossel avança aproximadamente em 8 segundos, permite controle manual e funciona por teclado/mobile.
9. `prefers-reduced-motion` e ausência de banners são tratados.
10. Um banner quebrado não bloqueia o catálogo.
11. Usuário sem `PLATFORM_ADMIN` não consegue criar/editar/ativar/inativar por request manual.
12. RLS e Storage não permitem leitura/mutação indevida.
13. Auditoria registra mutações administrativas sem conteúdo sensível.

## Migration e impacto de dados

Não existe migration atual para banners. A futura migration deverá ser aditiva e versionada, criando entidade, índices para `(status, sort_order)`, policies e grants; não modificar `products`, `product_images`, `prices`, pedidos ou estoque.

Dados iniciais são opcionais. Não inserir banners fictícios automaticamente em produção. Se o ambiente de apresentação precisar de conteúdo demo, usar seed separado e reversível, marcado como demo.

Storage exige decisão de bucket, limites e limpeza de objetos órfãos antes de aplicar migration. A criação do registro e upload devem evitar registro apontando para arquivo inexistente.

## Riscos

- Bucket público pode expor material que deveria ser interno; bucket privado exige estratégia de URL assinada/cache.
- Dimensões não definidas pelo Design podem gerar layout instável e recortes inadequados.
- Cache pode continuar servindo banner inativo se a invalidação não for planejada.
- Upload sem limpeza pode deixar objetos órfãos e aumentar custo.
- Adicionar click-through ou segmentação por conveniência quebraria o escopo aprovado e ampliaria autorização.
- Usar `product_images` para banner mistura lifecycle e RLS.

## Handoff

**TASK_ID:** BANNERS-001  
**STATUS:** DOMAIN_CONTRACT_READY — sem implementação.  
**SUMMARY:** banner global, ACTIVE/INACTIVE, ordenação e carrossel acessível; sem agendamento, segmentação, tenant-specific ou click-through.  
**DECISIONS:** somente `PLATFORM_ADMIN` administra; clientes leem ativos; Storage e dimensões precisam de aprovação técnica/design; não reutilizar product_images.  
**FILES_CHANGED:** somente `docs/changesets/farta-v1-commercial-flow/banners-domain.md`.  
**SCHEMA_CHANGED:** não.  
**MIGRATIONS:** nenhuma criada/aplicada.  
**SECURITY_IMPACT:** RLS global de leitura ativa, mutação admin-only, policy de Storage e ausência de path arbitrário/segredos.  
**TESTS_EXECUTED:** inspeção estática do schema e ausência de infraestrutura de banner; nenhum runtime por não haver implementação.  
**TEST_RESULTS:** contrato pronto para revisão técnica e de Design.  
**RISKS:** bucket/URL, limites MIME/tamanho/dimensões, cache/invalidação e objetos órfãos.  
**OPEN_ISSUES:** aprovar bucket (público/privado), limites e proporção; sem decisões abertas sobre funcionalidade comercial.  
**NEXT_DEPENDENCY:** Product Design define proporção/alt/layout → DevOps/Storage define bucket → Database Architect cria data-impact → Security aprova RLS → Backend/Frontend implementam → QA testa autorização e carrossel.
