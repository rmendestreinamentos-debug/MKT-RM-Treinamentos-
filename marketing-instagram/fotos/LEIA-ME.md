# Banco de fotos

As imagens das peças ficam aqui. **Qualquer estático** aceita foto de fundo — não
só o depoimento. No JSON da peça: `"foto": "evento.jpg"` → o motor procura
`fotos/evento.jpg`, joga full-bleed e aplica o véu escuro por cima.

## O véu (o texto SEMPRE tem que ganhar da imagem)
A foto vem do seu banco, não é escolhida pelo motor — então ele não pode confiar
que a imagem seja escura justo onde o texto cai. Por isso o véu é **forte por padrão**.
Regule pela peça quando quiser mostrar mais da foto:

    "veu": "leve"    imagem aparece mais — só se ela já for escura
    "veu": "medio"   padrão
    "veu": "forte"   foto clara ou poluída; vira quase textura

## Triagem automática
Chegou lote novo? Rode a triagem antes de escolher:

    node motor/fotos.js

Ela mede, foto a foto, a resolução e a **luminância do miolo** — a faixa central onde
o título senta. Foto clara no miolo briga com o texto. A saída ranqueia as fotos, marca
as que não servem (resolução baixa, panorâmica demais, miolo estourado) e sugere o véu
de cada uma. Ver no olho 200 fotos de evento é inviável; medir é rápido.

## Como mandar as imagens
- Solte os arquivos aqui em `fotos/`. `.jpg`, `.png` ou `.webp`.
- **A extensão do arquivo tem que bater com o nome no JSON** (`foto.jpg` ≠ `foto.png`).
- Mire em ~1080×1350 ou maior. Menor que isso sobe borrado no feed.
- Foto não encontrada: o motor avisa e gera a peça sem fundo — não quebra.
- Prefira imagem com o miolo limpo ou o rosto fora do centro: o texto ocupa o meio.
- Use fotos reais do banco da casa. Não gerar foto de coisa/pessoa real por IA.
