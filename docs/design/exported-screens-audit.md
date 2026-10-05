# Auditoria das telas exportadas do Pencil

**Fonte:** `C:\Users\olive\.pencil\documents\620c7e4a-0c42-4316-bb18-490255c78e3f\screens`

## Conclusão

Os PNGs e HTMLs exportados são a referência visual executável do redesign. A implementação anterior convergiu apenas parcialmente em espaçamento e estados; ela não reproduzia ainda a geometria, a escala tipográfica, a largura dos shells e a composição dos frames. Esta auditoria substitui aproximações anteriores como fonte de implementação visual.

## Foundations observadas

- Fonte dominante: `Inter`, com peso 400 para corpo, 600 para controles e 700 para títulos/ênfases.
- Superfície principal: `#FAF9F6`.
- Superfície secundária: `#F5F6F2`.
- Verde estrutural: `#19392A` e `#203D30`.
- Verde de estado/ação: `#159447`.
- Texto secundário: variações de `#728075`, `#758276` e `#7B887E`.
- Bordas: `#E4E9DF`, `#D9DED9` e `#DCE4D7`.
- Destaques quentes: `#F2A34A`, `#F5C66C` e `#B26B21`.
- Erro: `#C7363F` / `#CF685D`.
- Cards: raio recorrente de 10–12px; controles 8–10px; pills 9999px.
- Busca e superfícies suaves usam preenchimento creme, não somente borda.

## Geometria por contexto

| Contexto | Frame | Geometria observada |
|---|---|---|
| Auth | `sKLrk`, `KOx2B`, `RbFrT` | viewport 1303×900; split verde/esquerdo e formulário/direito; formulário com card central, Google no topo e labels persistentes |
| Cliente | `Sdnoa`, `G4VM0i`, `L9mHNx`, `gsj1I` | viewport 1440×1420; sidebar ~243px; topbar ~90px; grid de 3 cards mais resumo fixo à direita |
| Checkout | `QFXql` | viewport 1440×1610; tabela de itens à esquerda, resumo à direita e entrega/observação em sequência vertical |
| Admin | `Xkwdd`, `l6fLqB`, `BgB9z`, `ILrZa`, `HMEgx`, `kZj4J`, `tDBsF`, `Risda`, `E07F4`, `ywSb3`, `WU6Sk` | viewport 1303px; sidebar ~313px; topbar ~72px; conteúdo com margem ~40px e tabelas de linhas altas |
| Drawers | `S6mgJ`, `rm9SZ` | drawer direito de 543px, overlay verde translúcido e conteúdo rolável |

## Divergências críticas encontradas

1. Os exports HTML definem sidebar administrativa de 240px e cliente de 220px; a implementaÃ§Ã£o agora segue essas larguras, mantendo 76px no breakpoint tablet.
2. O header anterior usava 88px para todos os contextos; o admin exportado usa aproximadamente 72px e o cliente aproximadamente 90px.
3. A tipografia anterior misturava Gilroy/Helvetica/Recoleta; os exports usam Inter como sistema principal, com serif somente em destaques específicos.
4. A paleta anterior tinha `#1B3B2E`, `#FAF8F4` e `#F4F1EB`; os exports usam a base `#19392A`, `#FAF9F6` e `#F5F6F2`.
5. Catálogo e checkout anteriores tinham a mesma informação real, mas não a composição do export: saudação/banner/categorias na ordem correta, grid de três colunas, resumo lateral e cartões de superfície suave.
6. A tela administrativa de empresas anterior não reproduzia a altura das linhas, o toolbar horizontal, a largura do shell nem os ícones/ações da referência.
7. O redesign de pedidos anterior aproximou os frames, mas ainda depende das foundations antigas; deve ser reavaliado após a troca dos tokens.

## Ordem de implementação fiel

1. Foundations e shells: tokens, logo correta, sidebar, topbar, navegação e responsividade.
2. Auth: split-screen, card, Google desabilitado/funcional conforme configuração existente, erros e loading.
3. Cliente: catálogo nos estados vazio/preenchido/muitos itens, checkout e perfil.
4. Admin: empresas/estabelecimentos/convites e catálogo administrativo usando as geometrias exportadas.
5. Operação: fila, drawers, entregas e mensagens.
6. QA visual comparativo usando os PNGs em 1303/1440px e breakpoints menores.

Nenhuma funcionalidade presente apenas nos exports deve ser adicionada. Os dados continuam vindo das actions e contratos existentes.
