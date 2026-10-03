# ADMIN-PRODUCTS-001 — Domínio mínimo de administração de catálogo

## Status

**STATUS:** DOMAIN_SCOPE_READY — análise sem alteração de código, schema ou migration.  
**OWNER:** PRODUCT-DOMAIN + PLATFORM_ADMIN.  
**DEPENDENCIES:** Database Architect, Security, Backend, Design e QA.

## Estado atual

O schema já possui `categories`, `products`, `product_variants` e `product_images`, todas entidades globais. Existem status `ACTIVE`/`INACTIVE`, unicidade global para categoria (`name`) e SKU (`sku_code`), e vínculo de imagem a produto ou variante. Não foram encontrados CRUDs/telas/actions administrativas de catálogo no painel atual.

`prices`, carrinhos, pedidos e estoque não fazem parte do CRUD mínimo desta task. Preços continuam tenant-scoped e não podem ser expostos ou editados por este fluxo sem contrato específico.

## Escopo aprovado para a V1

### Categorias

O `PLATFORM_ADMIN` pode:

- listar categorias;
- criar categoria com nome único;
- editar nome e ordem de exibição;
- ativar/inativar categoria;
- visualizar estado e data de atualização.

Não excluir fisicamente categoria referenciada por produto. Categoria inativa não pode ser usada para novos produtos/catalogação, mas deve permanecer nos registros históricos.

### Produtos

O `PLATFORM_ADMIN` pode:

- listar produtos com categoria, marca, status e data;
- criar produto com nome, marca opcional, descrição opcional e categoria ativa;
- editar esses campos;
- ativar/inativar produto;
- abrir produto para gerenciar variantes e imagem.

Não incluir fornecedor, estoque, custo, margem, promoção, avaliações, importação em massa ou exclusão física nesta task.

### Variantes/SKUs

O `PLATFORM_ADMIN` pode:

- criar variante vinculada a um produto;
- editar nome, `sku_code`, `sale_unit` e atributos comerciais existentes;
- ativar/inativar variante;
- listar variantes do produto.

`sku_code` permanece único globalmente. Unidade e caixa são SKUs comerciais independentes conforme `product-price-contract.md`; não criar conversão física nem fator de embalagem nesta task.

### Imagens

O `PLATFORM_ADMIN` pode associar uma imagem primária e imagens adicionais a produto ou variante, conforme o modelo existente `product_images`.

O upload deve validar, antes de persistir referência:

- MIME permitido;
- tamanho máximo;
- arquivo realmente armazenado;
- `alt_text` obrigatório;
- associação exclusiva a produto ou variante;
- apenas uma imagem primária por produto/variante;
- ordem de exibição determinística.

Storage bucket, limites e política de exclusão/substituição devem ser aprovados por DevOps/Security antes da implementação. Não inventar CDN, processamento de imagem, recorte automático ou múltiplos tamanhos nesta task.

## Autorização

- Somente perfil ativo `PLATFORM_ADMIN` pode criar, editar, ativar/inativar ou associar imagens.
- `CUSTOMER`, `INTERNAL_OPERATOR` e `DRIVER` possuem apenas leitura do catálogo ativo conforme suas policies; não podem mutar catálogo.
- Identificador recebido do browser deve ser validado no servidor.
- Toda mutação deve usar action/RPC server-side com autorização explícita, nunca confiar somente na rota ou botão oculto.
- Falhas de autorização devem retornar acesso negado sem revelar detalhes internos ou existência de recurso privado.
- Operações administrativas devem gerar auditoria compatível com o padrão existente, sem registrar segredos ou arquivo binário.

## Invariantes

1. Nome de categoria não pode duplicar outro nome global.
2. Categoria referenciada não pode ser apagada fisicamente.
3. Produto sempre possui categoria válida; produto ativo só pode usar categoria ativa.
4. Variante sempre pertence a um produto existente.
5. `sku_code` é único globalmente, estável para histórico e não pode ser atribuído a outra variante.
6. Produto/variante inativo não pode ser selecionado para novos carrinhos/pedidos.
7. Inativar produto deve impedir compra de suas variantes sem alterar pedidos históricos.
8. Inativar categoria não modifica produtos históricos nem snapshots de pedido.
9. Imagem aponta para produto XOR variante, nunca ambos ou nenhum.
10. Apenas uma imagem primária ativa pode existir por produto/variante.
11. Atualizações não podem substituir snapshots de `order_items`.
12. Nenhuma operação administrativa pode alterar preços, estoque, reservas ou pedidos por efeito colateral silencioso.

## Conflitos e decisões

### Status de categoria com produtos ativos

**CONTEXT:** categoria pode ser inativada enquanto possui produtos ativos.  
**OPTION_A:** bloquear inativação até inativar/mover todos os produtos.  
**OPTION_B:** permitir inativação e tornar produtos não selecionáveis automaticamente.  
**RECOMMENDATION:** A para consistência operacional; se B for escolhida, a transição precisa ser explícita e auditada. Esta decisão deve ser fechada antes da migration.

### Imagem em Storage

**CONTEXT:** a tabela possui `storage_object_path`, mas o escopo atual não comprova bucket/policy/upload implementados.  
**RECOMMENDATION:** tratar Storage como dependência técnica; não persistir referência antes do upload validado e revisar RLS/bucket com Security/DevOps.

### Alteração de SKU

**CONTEXT:** pedidos históricos referenciam `sku_id` e snapshots.  
**RECOMMENDATION:** permitir editar descrição/unidade apenas com cuidado; `sku_code` deve ser imutável depois de usado em pedido ou exigir novo SKU/inativação, preservando histórico.

## Critérios de aceite

1. Usuário `PLATFORM_ADMIN` cria, edita, lista e ativa/inativa categorias.
2. Nome duplicado de categoria é rejeitado no servidor.
3. Admin cria e edita produto com categoria, marca, descrição e status.
4. Produto sem categoria válida não é criado.
5. Admin cria e edita variantes; SKU duplicado é rejeitado.
6. Unidade/caixa são tratados como variantes independentes sem conversão.
7. Produto/variante inativo não aparece como comprável para cliente.
8. Cliente, operador e driver não conseguem executar mutações administrativas por rota, action ou request manual.
9. Upload inválido de imagem é rejeitado; referência órfã não é criada.
10. Imagem primária respeita exclusividade e alt text.
11. Pedidos existentes continuam abrindo com snapshots intactos após edição/inativação.
12. Nenhuma mutação altera preços, estoque ou pedidos.
13. Auditoria registra autor, entidade, ação, resultado e timestamp sem dados sensíveis desnecessários.

## Riscos

- Inativar categoria com produtos ativos pode gerar catálogo incoerente se não houver regra escolhida.
- Permitir troca de SKU usado em pedidos pode comprometer histórico e reconciliação.
- Referenciar Storage sem upload/policy consistente deixa imagens quebradas ou públicas indevidamente.
- Tornar produto global não autoriza compartilhar preços, custos, margens ou estoque.
- Exclusão física removeria referências históricas; preferir inativação.

## Handoff

**TASK_ID:** ADMIN-PRODUCTS-001  
**STATUS:** DOMAIN_SCOPE_READY — escopo mínimo definido, sem implementação.  
**SUMMARY:** CRUD mínimo de categorias, produtos, variantes e imagens, exclusivo para `PLATFORM_ADMIN`, com ACTIVE/INACTIVE e preservação histórica.  
**DECISIONS:** sem fornecedor/estoque/preço/promoção/importação; sem exclusão física; sem conversão unidade/caixa; SKU global.  
**FILES_CHANGED:** somente `docs/changesets/farta-v1-commercial-flow/admin-products-domain.md`.  
**SCHEMA_CHANGED:** não.  
**MIGRATIONS:** nenhuma criada/aplicada.  
**SECURITY_IMPACT:** autorização server-side exclusiva de admin, RLS, Storage e auditoria precisam ser revisados.  
**TESTS_EXECUTED:** inspeção estática do schema/policies/modelo; nenhum teste runtime por ausência de implementação.  
**TEST_RESULTS:** contrato pronto para Database Architect, Security, Backend, Design e QA.  
**RISKS:** regra para categoria com produtos ativos; imutabilidade de SKU utilizado; bucket/policy de Storage.  
**OPEN_ISSUES:** aprovar esses três pontos técnicos antes das migrations.  
**NEXT_DEPENDENCY:** Database Architect data-impact → Security/RLS/Storage → Backend actions → Frontend admin → Design QA → QA negativo e regressão.
