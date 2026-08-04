# Fotos do deck da Imersão Master MAT

Jogue as fotos aqui. O JSON da peça cita só o nome do arquivo com a pasta na frente:

```json
"foto": "imersao-master-mat/palco.jpg"
```

O motor procura primeiro em `slides/imagens/`, depois em `marketing-instagram/imagens/`
e por último no acervo `marketing-instagram/fotos/` — então o nome não precisa ser único
no projeto inteiro, mas dentro desta pasta precisa.

## O que serve aqui
Cada slide compõe até duas imagens, e elas pedem formatos diferentes:

- **`foto`** — o assunto/personagem. **Vertical ou quadrada**, com a pessoa inteira
  visível: no layout `foto` ela entra emoldurada, e nos outros sangra atrás do texto.
- **`cenario`** — opcional, e é o que dá ar de cena montada em vez de "foto com texto por
  cima". Ele sangra na página inteira e a `foto` vira o personagem num painel à direita.
  Aqui pede **horizontal**: sala, palco vazio, escritório, plateia de longe.

O texto do slide vive na **metade esquerda**, então foto com o assunto encostado à
esquerda perde pro véu. Assunto à direita é o que funciona.

⚠️ **A resolução importa.** O entregável é PNG exportado em Full HD; foto abaixo de
~1600px no lado maior sai mole no projetor, e isso o console não acusa.
