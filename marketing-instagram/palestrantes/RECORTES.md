# Recortes — os valores em uso

O KV do line-up **cola os corpos ombro a ombro**. Isso não se faz com foto: se faz com
recorte. `motor/tirar-fundo.js` gera os PNGs em `palestrantes/recorte/`, e é de lá que
o motor lê (a foto crua traria o retângulo do fundo junto).

```
node motor/tirar-fundo.js "<arquivo>" [tol] [erode] [global] [abre] [--fundo=x0,y0,x1,y1]
```

| Parâmetro | O que faz |
|---|---|
| `tol` | distância de cor aceita **entre vizinhos** ao crescer a partir da borda |
| `erode` | come pixels da silhueta; tira a franja de fundo que fica grudada na roupa |
| `global` | distância máxima até a **cor da semente** de onde a região nasceu |
| `abre` | raio da abertura que solta poeira pendurada no corpo por um filete |
| `--fundo` | retângulo, em % da imagem, declarado fundo **à força** |

**Não existe número que sirva a todas as fotos.** Os valores em uso:

| Arquivo | tol | erode | global | abre | Extra |
|---|---|---|---|---|---|
| `Rafa Brito.jpg` | 5 | 2 | 18 | 6 | camiseta branca em fundo branco — o pior caso |
| `Lásaro Carmo.png` | 4 | 1 | 70 | 6 | **já vem recortado**; o script respeita o alpha |
| `Rafael Mendes.jpg` | 5 | 3 | 14 | 6 | `--fundo=12,36,30,56` (o foco de palco) |
| `Rafael Gonçalves.jpeg` | 8 | 3 | 24 | 8 | terno cinza em fundo cinza |
| `Samer Agi.jpeg` | 14 | 3 | 70 | 6 | fundo com degradê, pede tolerância alta |
| `Janaína Bastos.jpeg` | 12 | 4 | 45 | 8 | fundo branco; o `erode` alto é o que tira a cadeira |
| `João Menna.jpeg` | — | — | — | — | **não recorta.** Ver abaixo |

⚠️ **O fundo ESCURO é que revela o recorte porco, não o claro.** O Gonçalves rodou meses
com `tol 4 / global 12`: sobravam blocos do fundo cinza colados no ombro e na mandíbula, e
ninguém viu — porque a única peça que o usava era o line-up, de fundo preto, onde cinza
escuro sobre preto não aparece. Bastou ele cair na JANELA DOURADA do carrossel "pela
primeira vez" pra tudo saltar aos olhos. Recorte aprovado em peça escura **não está
aprovado**: confira sobre magenta, não sobre o fundo da peça.

## As três armadilhas que já custaram caro

**A trava `global` é o que impede o algoritmo de comer a pessoa.** Comparar cada pixel só
com o VIZINHO deixa o crescimento *caminhar*: onde um terno escuro encosta num palco
escuro, ele entra pelo corpo passo a passo, cada passo dentro da tolerância, e come um
ombro inteiro. `global` prende cada pixel à cor da borda de onde a região dele nasceu.
Roupa da cor do fundo → **baixar** `global` (12 a 18), não mexer em `tol`.

**A borda de BAIXO não é semeada.** Retrato é cortado na cintura pela própria moldura da
foto: a barra de baixo *é* a pessoa. Semear ali plantava a semente dentro da roupa e o
crescimento subia comendo a camisa — saía um rasgo serrilhado na barra de todo mundo.

**O `--fundo` existe porque nem tudo é parâmetro.** Na foto do Rafael há um foco de palco
desfocado ao lado do rosto; o halo dele encosta no degradê que chega ao paletó, e assim o
foco vira *uma peça só* com a pessoa — sobrevive à seleção do maior blob, e nenhuma
tolerância o separa sem comer o terno junto. Aí se aponta onde é fundo. Só vale em área
que a pessoa não ocupa: o retângulo vira semente e cresce de dentro.

## O limite, dito na cara — e o João Menna é ele
Isto **não é segmentação por IA** — é crescimento de região a partir da borda. Serve em
fundo liso, sofre em fundo de cena, e **um PNG recortado à mão resolve de vez** — é o caso
do Lásaro, e é o padrão a pedir ao designer.

O **João Menna** é o caso que o algoritmo não vence, e não adianta procurar o número: o
cabelo é preto, o terno é azul quase preto e o fundo de estúdio é preto. Cabelo e roupa
estão DENTRO da tolerância de qualquer semente que remova o fundo — três tentativas, três
resultados. Tolerância baixa deixa um bloco de fundo colado na cabeça; tolerância alta come
o cabelo, o paletó e um pedaço da bochecha. **Peça o PNG sem fundo ao designer.** Enquanto
ele não vier, o slide dele roda com `"recorte": false` e a foto fica presa dentro da janela,
sem estourar — publicável, mas visivelmente diferente dos outros cinco.

⚠️ Depois de recortar, **sempre OLHAR o PNG** sobre um fundo berrante (magenta). Buraco na
roupa, rasgo na barra e halo no cabelo não aparecem no console — só na imagem.
