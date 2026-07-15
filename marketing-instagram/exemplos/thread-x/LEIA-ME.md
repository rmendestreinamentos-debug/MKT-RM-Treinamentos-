# O carrossel que imita o X (tipo `thread`)

Modelo capturado do perfil **@joaovitormadv** — que é a **conta pessoal do dono**
(as outras três de `marca/perfis.json` são do trabalho). Não é referência de
terceiro: é peça dele, e ele assina carrossel com ela (slug `joao-vitor`).
Carrossel da Odisseia / "gaiola de ouro", 19 slides + os finais de *Prisões*. Três
frames curadas aqui — a pasta cheia fica em `Exemplos Carrosseis Twitter/` na raiz
do projeto, fora do repo.

| Frame | O que ensina |
|---|---|
| `thread-x-abertura.png` | Slide COM imagem: card no topo, pintura embaixo |
| `thread-x-slide-imagem.png` | Mesmo layout, já na virada da tese |
| `thread-x-remate.png` | Slide SÓ TEXTO: o card flutua no meio do preto |

## A regra que rege o formato
**Tem que parecer print, não peça.** Todo detalhe de designer que entra
(negrito, cor, capa em caixa alta, logo) denuncia que é arte e mata o efeito.
Quem assina é o perfil — avatar e @ —, nunca o produto.

## Anatomia
- **Fundo preto puro** (`#000`, o "lights out" do X). Nunca claro, nunca dourado.
- **Cabeçalho** em todo slide: avatar circular · nome em branco/bold · `@handle`
  em cinza (`#71767b`). Sem selo azul no modelo. Sem data, sem métricas de
  curtida/repost — o rodapé do tweet real fica de fora, deixa a peça limpa.
- **Texto em peso NORMAL** (400), cor `#e7e9ea`. É o peso que o X usa de verdade.
  Negrito é o erro clássico: entrega o truque na hora.
- **Imagem embutida** (opcional): largura do card, cantos arredondados, colada
  logo abaixo do texto. Pintura clássica, render ou foto real — tudo vale.
- **Sem marca-texto, sem realce colorido.** Peça inteira em uma cor só.
- **Emoji** solto no fim da frase de remate (`😉`) — é o que dá o tom de gente.

## Os dois layouts (o motor escolhe sozinho)
1. **Com imagem** → card ancorado no topo, imagem preenchendo o resto.
2. **Só texto** → perfil + texto centrados verticalmente no preto, muito respiro
   em cima e embaixo. É o layout do **remate**: a frase que fecha o carrossel.

## O roteiro (é isto que faz o carrossel funcionar)
A copy não é uma lista de dicas. É uma **história que vira espelho**:

1. **Gancho** — uma cena alheia e concreta ("Ulisses recebeu uma proposta
   irrecusável"). O leitor entra sem se sentir cobrado.
2. **Escalada** — a oferta cresce (abrigo, descanso, vida eterna).
3. **Estranhamento** — mesmo assim o herói não quer. Abre a pergunta.
4. **Diagnóstico** — o nome da coisa: "não estava preso por correntes. Estava
   preso pelo conforto."
5. **A virada pro leitor** — "muita gente vive sua própria ilha de Calipso."
   Aqui a história para de ser antiga.
6. **A ressalva** — "isso não significa pedir demissão amanhã." Sem ela a peça
   vira coach e o leitor se defende. **Não pular este slide.**
7. **A tese** — a distinção exata: ficar por escolha × ficar por medo.
8. **O remate** — pergunta sem saída, em slide só texto:
   *"...ou porque sua gaiola é bonita demais para parecer prisão. 😉"*

Frases curtas. Parágrafo de 1 a 3 linhas. Linha em branco separa bloco.
Segunda pessoa. Sem hashtag, sem CTA de venda no meio da narrativa.

## Como o motor faz
`"tipo": "thread"` (ver `CLAUDE.md`). Preto e centralização vêm de graça:
slide com `imagem` ancora no topo, slide sem `imagem` centra. `perfil` no topo
do JSON vale pro carrossel inteiro.
