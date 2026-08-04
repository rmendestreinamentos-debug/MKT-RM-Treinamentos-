# O carrossel que imita o X (tipo `thread`)

A pasta guarda **dois carrosséis de referência**, e eles não têm o mesmo peso.

**O modelo da casa** é o do perfil **@joaovitormadv** — que é a **conta pessoal do dono**
(as outras três de `marca/perfis.json` são do trabalho). Não é referência de
terceiro: é peça dele, e ele assina carrossel com ela (slug `joao-vitor`).
Carrossel da Odisseia / "gaiola de ouro", 19 slides + os finais de *Prisões*. Três
frames curadas aqui — a pasta cheia fica em `_bruto/Exemplos Carrosseis Twitter/` na
raiz do projeto, fora do repo.

**A referência de terceiro** entrou em 2026-08-03: dois frames de um carrossel de
**@joaopauloprudem** (João Paulo Cardoso), sobre o lucro da Usiminas e a história do
Vale do Aço. É de outra pessoa, então dela se copia o FORMATO, nunca a voz nem a marca
— a mesma regra das outras pastas de `exemplos/`. O que ela vale está na seção
"O segundo registro", abaixo.

| Frame | O que ensina |
|---|---|
| `thread-x-abertura.png` | Slide COM imagem: card no topo, pintura embaixo |
| `thread-x-slide-imagem.png` | Mesmo layout, já na virada da tese |
| `thread-x-remate.png` | Slide SÓ TEXTO: o card flutua no meio do preto |
| `Captura de tela 2026-08-03 080400.png` | Gancho de NOTÍCIA + **duas imagens lado a lado** |
| `Captura de tela 2026-08-03 080406.png` | Slide de contexto: uma imagem só, foto de arquivo |

## A regra que rege o formato
**Tem que parecer print, não peça.** Todo detalhe de designer que entra
(negrito, cor, capa em caixa alta, logo) denuncia que é arte e mata o efeito.
Quem assina é o perfil — avatar e @ —, nunca o produto.

## Anatomia
- **Fundo: o dono escolhe, e a pergunta é obrigatória** (regra dele, 2026-07-30). Os
  frames aqui são o **escuro** (`#000`, o "lights out"), que é o padrão do modelo; o
  **claro** (`#fff`, tinta `#0f1419`) é o outro modo do X e vale igual. `"tema"` no
  topo do arquivo, pro carrossel inteiro. O que continua barrado é dourado, cor da
  casa e fundo inventado: o print é fiel a um dos dois modos do X, ou não é print.
- **Fonte Chirp**, a do próprio X (regra do dono, 2026-07-30) — vem de `marca/fontes/`,
  embutida pelo motor. Faltando o arquivo, a peça sai numa grotesca de sistema e o
  console avisa; ao lado de um print de verdade, a diferença aparece.
- **Cabeçalho** em todo slide: avatar circular · nome em branco/bold · `@handle`
  em cinza (`#71767b`). Sem data, sem métricas de curtida/repost — o rodapé do tweet
  real fica de fora, deixa a peça limpa.
  ⚠️ **Nenhum dos quatro frames de referência tem selo azul no card** — nem os do dono,
  nem os do @joaopauloprudem. O motor desenha um quando o perfil está `"verificado":
  true`, e o do `joao-vitor` ficou assim em 2026-07-15 a pedido dele. Vale saber de onde
  vem cada coisa: o card imita o **X**, mas a verificação que o print do perfil confirmou
  é a do **Instagram**. Se um dia o card tiver que ficar igual à referência, é
  `"verificado": false` em `marca/perfis.json` — não se mexe no motor.
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

## O segundo registro: a thread de NOTÍCIA (@joaopauloprudem, 2026-08-03)
O roteiro acima é o da **parábola**: história antiga que vira espelho. Os dois frames
novos mostram o outro uso do mesmo layout, e ele serve muito melhor a conteúdo
jurídico/econômico — **o fato de hoje explicado pela história dele**:

1. **O fato, com número e data** — "Usiminas registra lucro de R$ 428 milhões no 2º
   trimestre de 2026." Uma linha, seca, como manchete.
2. **A causa contraintuitiva** — "A China, que por anos derrubou empregos aqui no Vale
   do Aço, foi o principal fator por trás disso."
3. **A promessa explícita** — "Só que não foi do jeito que você está pensando. Te
   conto." É ela que compra o swipe: o slide 1 termina devendo a explicação. Sem essa
   frase, o gancho é só uma notícia, e notícia não pede o próximo slide.
4. **O contexto histórico, em datas** — a ferrovia em 1922, a Belgo-Mineira em 1936, a
   Usiminas em 1962. Número é argumento aqui do mesmo jeito que é no estático.

⚠️ **A imagem deste registro é DOCUMENTAL, não ilustrativa**: usina de verdade, foto de
arquivo em preto e branco, retrato do chefe de Estado citado. É o oposto da pintura
clássica do carrossel da Odisseia, e é o que dá cara de reportagem. Numa peça nossa isso
vem de `imagens/<carrossel>/`; imagem gerada não serve aqui (ver a regra do Gemini em
`CLAUDE.md` — fato não se ilustra com invenção).

**As duas imagens lado a lado** aparecem justamente onde a copy opõe dois assuntos na
mesma frase (a usina brasileira × a China): `"imagem": ["usina.jpg", "xi.jpg"]`. Elas
entram num bloco só, com um fio fino no meio — é o mesmo bloco de uma imagem, partido.
Usar quando a frase tem dois sujeitos; fora disso, uma imagem.
⚠️ No par, o `foco` também vira **lista** (`["topo","baixo"]`): as duas fotos quase nunca
têm o assunto na mesma altura, e um foco só conserta uma e estraga a outra. A escolha da
imagem e do corte tem critério escrito — o **crivo**, em `imagens/LEIA-ME.md`.

**O cabeçalho sai SEM selo azul** — a conta dele não é verificada, e o print é fiel a
isso. No motor quem decide é `"verificado"` em `marca/perfis.json`, perfil por perfil:
carimbar selo em conta que não tem é o mesmo erro de carimbar a marca errada.

⚠️ **As setas (‹ ›) e as bolinhas do rodapé NÃO são da arte.** Os dois frames foram
capturados com o carrossel aberto no Instagram, então o que aparece ali é a interface
dele por cima da peça. Desenhar isso no PNG deixa duas setas na tela quando a peça for
publicada de verdade. O único lugar do projeto que desenha interface do Instagram de
propósito é o fecho do tipo `estreia`, e lá é a barra de ações, não o navegador.

## Como o motor faz
`"tipo": "thread"` (ver `CLAUDE.md`). A centralização vem de graça: slide com `imagem`
ancora no topo, slide sem `imagem` centra. `perfil` e `tema` no topo do JSON valem pro
carrossel inteiro — e os dois se **perguntam** ao dono antes de escrever o arquivo
(quem assina, e claro ou escuro).
