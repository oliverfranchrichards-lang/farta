# FARTA-DESIGN-001 — Linguagem visual Farta

**Status:** especificação visual aprovada para implementação posterior. Nenhum código ou contrato funcional foi alterado nesta fase.

## Fontes e hierarquia de decisão

1. `inspirations/design_visual_inspiration.jfif` — composição desktop e linguagem de produto.
2. `inspirations/design_visual_inspiration_2.jfif` — adaptação mobile e navegação por tarefa.
3. `inspirations/Logo.jfif` — marca, símbolo, verde e laranja.
4. `https://farta-flow-hub.base44.app` — guia de identidade e componentes da referência; acessível como documentação visual interativa em 29/09/2026.
5. Sistema atual — conteúdo, rotas, permissões e comportamento que devem ser preservados.

As referências determinam a linguagem, não acrescentam módulos ou ações ao ProStock/Farta.

## Ideia central

**Farta: tudo para o seu negócio.** A interface deve transmitir controle operacional confiável, com simplicidade contemporânea e um toque humano ligado à distribuição de alimentos e suprimentos. A sensação é de uma ferramenta de trabalho segura e rápida, não de um dashboard decorativo.

## Gramática visual

### Branding

- Nome visível: **Farta**.
- Usar o arquivo `inspirations/Logo.jfif` como origem da marca até existir um asset vetorial aprovado.
- Preservar a proporção do logotipo; não recortar, esticar, recolorir ou aplicar sombra ao símbolo.
- Área de proteção mínima: altura do “F” ao redor da assinatura completa; em marca reduzida, manter o símbolo legível.
- Sidebar desktop: assinatura completa sobre fundo verde escuro. Header/mobile: assinatura reduzida quando a largura não comportar o nome.
- “Tudo para o seu negócio” é assinatura de marca, não título funcional nem nova mensagem em cada página.

### Cor

O verde Farta é a base de confiança. O laranja é um acento pontual para ação, destaque ou atenção. Neutros quentes criam a superfície clara das referências.

- Verde profundo: navegação, marca, ação primária e estado ativo.
- Laranja: CTA de maior destaque, foco comercial e acento de progresso; nunca em todos os botões.
- Neutros: fundo, cards, campos e separadores.
- Estados: sucesso, alerta, erro e informativo têm texto e label, não somente cor.
- No máximo duas cores de destaque simultâneas em uma tela, além dos neutros.

### Tipografia

- Títulos: Gilroy 700, geométrica e acolhedora.
- Interface e corpo: Helvetica/Arial como fallback neutro e legível.
- Números de KPI/preços: Recoleta 700 apenas quando houver destaque real; não usar em tabelas densas.
- Se as fontes proprietárias não estiverem licenciadas/disponíveis, usar fallback explicitamente documentado; não bloquear a aplicação nem importar uma fonte de procedência desconhecida.

### Layout e densidade

- Desktop: sidebar vertical escura de aproximadamente 248–264px; conteúdo em superfície `#FAF8F4`; header de trabalho claro com busca e conta quando estes elementos já existirem no produto.
- Conteúdo: largura máxima aproximada de 1280px, gutter 24–32px e grid com colunas flexíveis.
- Mobile: header verde compacto, conteúdo vertical em uma coluna e navegação inferior fixa para destinos já existentes; não criar destinos novos da referência.
- Cards agrupam tarefas e informações relacionadas, não cada linha de texto. Priorizar whitespace e bordas finas.
- Tabelas continuam tabelas quando comparação for importante; em mobile, transformar linhas em blocos informativos sem perder os mesmos dados e ações.

### Forma e profundidade

- Inputs e botões: radius 12px.
- Cards e painéis: radius 16px.
- Borda padrão de 1px; sombra somente em modal, dropdown ou superfície que realmente se eleva.
- Ícones lineares, 16–20px, espessura aproximada de 1.5px e sempre acompanhados de texto quando a ação não for universal.
- Uma ação primária por área. Ações destrutivas aparecem em vermelho e exigem confirmação.

### Estados e feedback

- Status sempre combina badge textual, cor semântica e, quando útil, ícone.
- Loading preserva a estrutura do conteúdo; erro explica o que ocorreu e oferece retry quando a ação existir.
- Empty state explica contexto e próximo passo.
- Alertas críticos permanecem até reconhecimento; confirmações simples podem ser toast/status inline.

## Direção desktop

A inspiração desktop apresenta: navegação vertical verde à esquerda; barra de busca clara no topo; saudação/título forte; um bloco principal com imagem ou contexto; cards compactos de categorias/produtos; coluna lateral de pedido em andamento e ajuda. Para o produto real, essa composição deve ser adaptada por arquétipo: não inserir imagem, categoria, KPI, mapa ou suporte se a rota atual não possuir o conteúdo correspondente.

## Direção mobile

As imagens mostram uma experiência por tarefa: header verde, título curto, cards brancos, filtros compactos e bottom navigation. A ordem deve ser: estado atual/próxima ação, conteúdo principal, ações secundárias. Busca e filtros podem virar campos ou folhas compactas; a tabela operacional pode virar lista sem remover ações. Touch targets mínimos de 44px e nenhum overflow horizontal.

## Fundamentos UX aplicados

- Visibilidade do estado: status do pedido, carregamento e feedback ficam próximos da ação.
- Consistência: um único botão, badge, input, card e mensagem por função.
- Correspondência com o mundo real: textos como “Em separação”, “Em rota” e “Confirmar recebimento” permanecem objetivos.
- Controle: retorno previsível, cancelamento/fechamento acessível e foco devolvido ao elemento de origem.
- Prevenção: confirmar ações destrutivas e manter campos/validações atuais.
- Reconhecimento: navegação ativa, títulos, breadcrumbs e status visuais claros.
- Eficiência: escaneabilidade em tabelas e ações junto ao contexto.
- Minimalismo: remover ornamentação e não adicionar funcionalidades da referência.
- Recuperação: erros específicos, retry e estados persistentes.
- Acessibilidade: WCAG 2.2 AA, teclado, contraste, zoom de 200%, reflow e reduced motion.

## Conflitos registrados

| CONFLICT | REFERENCE | CURRENT FUNCTION | RECOMMENDATION |
|---|---|---|---|
| Verde/laranja e tipografia Farta divergem dos tokens azul/ciano/Inter anteriores | Logo, imagens e guia web | Sistema atual usa tokens verdes legados e alguns tokens azuis | Adotar Farta como direção desta fase; manter fallbacks tipográficos e não alterar contratos funcionais. |
| Sidebar e bottom navigation aparecem na referência | Rotas atuais usam `AppShell`/`PrimaryNav` e navegação por perfil | Destinos e permissões já existem | Alterar somente a apresentação; mapear os mesmos links por perfil. |
| Referência mostra Estoque, Atendimento, Ofertas, mapa e Gestão | Telas não estão no inventário atual | Não existem funcionalidades equivalentes completas | Não criar telas, rotas ou ações; registrar como `OUT_OF_SCOPE_FINDING`. |
| Logo disponível em raster `.jfif` | Uso ideal seria SVG/PNG transparente | Asset oficial da etapa é o JFIF | Usar sem distorção agora; solicitar asset vetorial em etapa de marca futura. |

