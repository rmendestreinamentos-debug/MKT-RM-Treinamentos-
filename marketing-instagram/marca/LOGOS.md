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
