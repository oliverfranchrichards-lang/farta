# PROD-PRICE-001 — especificação visual

**OWNER:** PRODUCT-DESIGN-DIRECTOR  
**STATUS:** READY FOR IMPLEMENTATION

## Catálogo

Unidade e Caixa aparecem como SKUs independentes no grid existente; não criar página de detalhe. Cada card mostra nome, embalagem em Badge/label semântico, “Preço aproximado por unidade/caixa”, valor, “Mínimo: N [unidades/caixas]” e controle de quantidade. Nunca usar somente cor para distinguir embalagem.

Usar tokens do Design System Farta: superfícies/textos semânticos, escala de espaçamento de 4px, cards radius 16px sem sombra, controles e foco com mínimo 44px. Manter grid e carrinho lateral sticky atuais.

## Estados e acessibilidade

- loading/skeleton sem deslocamento;
- preço ausente/indisponível com mensagem clara;
- quantidade abaixo do mínimo com erro inline e aria-live;
- sucesso de adicionar sem bloquear o catálogo;
- falha de mutation com retry;
- teclado alcança seletor, quantidade e botão;
- `aria-label` identifica SKU, unidade/caixa, mínimo e valor aproximado;
- respeitar contraste, foco visível e reduced motion.

## Carrinho

Exibir embalagem escolhida, quantidade editável, mínimo e subtotal aproximado. Rotular subtotal/total como aproximado até a análise de preço. Não introduzir novo padrão visual fora do Design System.

## Design QA

Validar desktop/mobile, 200% zoom, teclado, leitor de tela, estados de erro/loading/sucesso e que a distinção Unidade/Caixa permanece compreensível sem cor. Rejeitar implementação que oculte mínimo ou apresente valor aproximado como preço final.