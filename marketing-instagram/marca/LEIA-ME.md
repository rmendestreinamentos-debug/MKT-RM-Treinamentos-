# Logos da marca

O motor monta o selo de cada peça nesta ordem (para no primeiro que existir):

1. **Logo da peça** — o arquivo nomeado no campo `logo` do JSON de conteúdo
   (ex.: `"logo": "rm-summit.png"` procura `marca/rm-summit.png`).
2. **Logo da casa** — `marca/logo.png` (ou `marca/logo.svg`). Use pro logo
   principal do Rafael Mendes Advogados, que vale quando a peça não declara logo.
3. **Inicial estilizada** — se nenhum arquivo existir, o motor desenha a
   primeira letra do nome num quadrado dourado. Fallback automático, sem quebrar.

## Como adicionar
- Jogue o arquivo aqui em `marca/`. Formatos aceitos: **PNG, SVG, JPG, WEBP**.
- PNG com **fundo transparente** fica melhor (o selo é um quadrado 74×74 arredondado).
- Logo da casa → salve como `logo.png`.
- Logo de um produto → salve com um nome curto (ex.: `master-mat.png`) e aponte
  no JSON: `"logo": "master-mat.png"`.

Não precisa mexer em código: o motor lê os arquivos daqui a cada geração.
