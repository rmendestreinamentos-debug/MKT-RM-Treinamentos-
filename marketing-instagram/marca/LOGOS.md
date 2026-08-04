# Logos disponíveis (manifest)

Os arquivos foram recortados (margem preta removida) e salvos com slug limpo.
O motor mostra o logo como **lockup horizontal num chip preto**: no slide escuro
o chip funde no fundo; no slide claro vira uma barra preta arredondada. Quando há
logo, o **nome em texto não aparece** (o logo já traz o nome).

| Produto | Campo no JSON da peça |
|---|---|
| RM Summit — São Paulo | `"marca": "RM Summit", "logo": "rm-summit-sp.png"` |
| RM Summit — Belo Horizonte | `"marca": "RM Summit", "logo": "rm-summit-bh.png"` |
| Master MAT (selo empilhado) | `"marca": "Master MAT", "logo": "master-mat.png"` |
| Imersão Master MAT (lockup) | `"marca": "Imersão Master MAT", "logo": "imersao-master-mat.png"` |
| Formação de Lideranças | `"marca": "Formação de Lideranças", "logo": "formacao-liderancas.png"` |
| Comercial 24hrs | `"marca": "Comercial 24hrs", "logo": "comercial-24hrs.png"` |
| Mapa da Advocacia Previdenciária | `"marca": "Mapa da Advocacia Previdenciária", "logo": "mapa-previdenciaria.png"` |
| Mapa da Advocacia Trabalhista | `"marca": "Mapa da Advocacia Trabalhista", "logo": "mapa-trabalhista.png"` |
| RM Treinamentos (a casa dos cursos) | `"marca": "RM Treinamentos", "logo": "rm-treinamentos.png"` |

## `Selo Verificado.png` — não é logo, é o selo azul do Instagram
Entrou em 2026-08-03, subido pelo dono. PNG 360×360 com transparência (paleta + `tRNS`),
a **estrela de 12 pontas** que o Instagram usa. Não se declara em peça nenhuma: quem o
puxa é o motor, no crachá do `editorial`, quando o perfil está `"verificado": true` em
`perfis.json`. Some o arquivo, o crachá cai no selo do X e o console avisa.

⚠️ **Não confundir com o selo do X**, que é outro desenho (círculo serrilhado, azul mais
fechado) e vive como SVG dentro do `motor/gerar.js`, no cabeçalho do tipo `thread`. Cada
peça imita uma plataforma; usar o selo da outra é o tipo de detalhe que entrega a arte.

## RM Treinamentos — o único logo de TINTA ESCURA sobre BRANCO
Chegou como `LOGO MASTER MAT (9).png` (nome errado do lote; a pasta `_bruto/LOGO MASTER
MAT (2)/` tem o mesmo vício e guarda logos do RM Summit). Foi copiado pro slug limpo
`rm-treinamentos.png` — o original ficou onde estava, não se apaga arquivo do dono.

Ele é o oposto de todos os outros: monograma ocre/vinho/bordô sobre **fundo branco
chapado**, com 60% de margem branca dentro do arquivo. Duas consequências:
- `logo-sem-fundo.js` **não serve** — a conta dele é `alpha = brilho`, feita pra logo claro
  sobre preto. Aqui ela apagaria as letras e deixaria o fundo opaco.
- A paleta é de fundo CLARO. Sobre preto o vinho e o bordô somem e o "Treinamentos" fica
  ilegível; sobra o ocre solto, que lê como logo quebrado.

```
node motor/logo-tinta.js rm-treinamentos.png ouro     ->  rm-treinamentos-ouro.png
node motor/logo-tinta.js rm-treinamentos.png branco   ->  rm-treinamentos-branco.png
node motor/logo-tinta.js rm-treinamentos.png cor      ->  rm-treinamentos-sem-fundo.png
```

`ouro`/`branco` são as versões **reverse** (monocromáticas), pra fundo escuro; `cor`
mantém a paleta original e serve em fundo claro. Os três saem **aparados** (de 1875×1875
pra 744×656) — sem isso a margem branca viraria espaço vazio e a marca sairia uma pulga.
⚠️ É um lockup **EMPILHADO** (proporção 1.13, monograma em cima e palavra embaixo). Na
altura de um wordmark deitado a palavra de baixo vira borrão: o motor de capa já dá 66px
a quem tem proporção abaixo de 1.6, e "discreto" nele se faz com **opacidade**, não
encolhendo mais.

## Logo da casa (Rafael Mendes Advogados) — NÃO é o default
Os produtos acima são marcas próprias e **não entram na narrativa do Rafael Mendes
Advogados**. Por isso o logo da casa NÃO virou `logo.png` (que seria carimbado
automaticamente em qualquer peça sem `logo` declarado). Ele está como slug explícito
**`rafael-mendes.png`** (branco no preto) e só aparece quando a peça pedir:
`"marca": "Rafael Mendes Advogados", "logo": "rafael-mendes.png"`.

Peça sem `logo` declarado cai na **inicial neutra** — de propósito, pra nunca marcar
um produto com a marca errada. Cada peça declara sua marca.

## Por slide
O `logo`/`marca` pode ser declarado por slide (sobrescreve o do topo do arquivo) —
útil pra fechar um carrossel com o selo de outro produto no CTA.

## Logo SOBRE FOTO: use a versão `-sem-fundo`
Os arquivos originais têm o **fundo preto chapado dentro do PNG**. Isso nunca
apareceu porque o selo sempre caiu em fundo escuro — preto sobre preto. Nas peças de
tráfego (`anuncio`, `caricato`) o selo cai **sobre a foto**, e aí o fundo do arquivo
vira um retângulo preto sem pé nem cabeça. Não dá pra resolver no CSS: o preto está
nos pixels.

```
node motor/logo-sem-fundo.js rm-summit-sp.png   ->  marca/rm-summit-sp-sem-fundo.png
```

Ele lê o brilho de cada pixel como opacidade, então a borda sai suave e o degradê do
dourado se mantém — um corte por limiar serrilharia a letra. O original **não** é
tocado: rode pro logo que precisar e declare o `-sem-fundo` na peça.

## Logo sobre PAPEL BRANCO: use a versão `-claro`
O `-sem-fundo` resolve foto escura, **não** resolve fundo branco. A conta dele é
`alpha = brilho`, e sobre branco isso dá dois defeitos ao mesmo tempo: o dourado sai
semitransparente e vira laranja lavado, e o que é PRATA no arquivo (o "MASTER" do lockup
da Imersão) sai quase 100% opaco de branco, ou seja, invisível. Abrir
`marca/imersao-master-mat-sem-fundo.png` sobre uma folha branca mostra o problema em um
segundo: sobra o MAT, some o MASTER.

```
node motor/logo-fundo-claro.js imersao-master-mat.png   ->  marca/imersao-master-mat-claro.png
node motor/logo-fundo-claro.js master-mat.png           ->  marca/master-mat-claro.png
node motor/logo-fundo-claro.js <logo>.png "#2A2A30"     ->  outra tinta pro que é neutro
```

A divisa dele é a **croma** (max-min do RGB), não o brilho:
- **pixel colorido** (o dourado) mantém a cor EXATA do arquivo e fica opaco. O corte é duro
  de propósito: rampa larga deixaria as bandas escuras do metal semitransparentes, e sobre
  branco elas clareariam — o metal perderia o contraste que o faz parecer metal.
- **pixel neutro** (a prata, o antialias) INVERTE: brilho vira opacidade de tinta escura.
  Letra branca de brilho cheio vira letra preta cheia; a borda cinza vira meio-tom.

⚠️ Reflexo especular DENTRO do dourado é quase branco e cairia na segunda regra, virando
respingo preto no meio do MAT. Por isso a classificação olha a VIZINHANÇA: neutro cercado
de ouro continua ouro. Mesmo assim, **abrir e olhar** — é a única checagem que pega isso.

⚠️ Não confundir com o `logo-tinta.js`: aquele trata o caso inverso (tinta escura sobre
branco) e pinta tudo numa cor só, o que mataria o metálico. A RM Treinamentos no papel
branco não passa por nenhum dos dois — ela já é uma paleta de fundo claro, e vale a
`-sem-fundo` (cores originais, recortadas).
