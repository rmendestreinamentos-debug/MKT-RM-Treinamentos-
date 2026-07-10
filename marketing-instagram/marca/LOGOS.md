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

## Ainda falta
- **Logo da casa** (`logo.png` — Rafael Mendes Advogados). Sem ele, peças que não
  declaram `logo` caem na inicial "R" estilizada. Solte um `logo.png` aqui pra resolver.

## Por slide
O `logo`/`marca` pode ser declarado por slide (sobrescreve o do topo do arquivo) —
útil pra fechar um carrossel com o selo de outro produto no CTA.
