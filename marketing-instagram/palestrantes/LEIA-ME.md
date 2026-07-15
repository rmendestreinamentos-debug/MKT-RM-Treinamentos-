# `palestrantes/` — os rostos do line-up

Retratos dos palestrantes confirmados. **Não é o acervo** (`fotos/`, que é o banco do
evento, tem triagem e regra de não repetir) **nem `imagens/`** (o despejo avulso do
dono). Aqui é um cadastro: uma foto por pessoa, o nome do arquivo é o nome dela.

No JSON basta o nome do arquivo:
`{ "nome": "Rafael Mendes", "foto": "Rafael Mendes.jpg" }`

## O problema desta pasta (e por que existe o `recorte/`)
As fotos vêm de fontes diferentes e **não combinam entre si**: um fundo de palco preto,
um estúdio cinza, um branco chapado, um marrom — e o Lásaro já vem **recortado em PNG**.

Mas o problema maior não é o fundo ser diferente: é que a peça de line-up **cola os
corpos ombro a ombro**. Com foto crua, o retângulo do fundo apareceria e a colagem
morreria ali. Por isso existe `palestrantes/recorte/`, gerado por
`motor/tirar-fundo.js` — e é de lá que o motor lê. Valores de tolerância por foto e o
limite do algoritmo: **`RECORTES.md`**.

O caminho definitivo é o do Lásaro: **PNG já recortado à mão**. Com todos assim, o
recorte automático sai de cena. Quando puder, peça os recortes ao designer.
