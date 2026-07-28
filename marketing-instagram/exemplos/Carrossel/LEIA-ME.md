# O carrossel editorial da BrandsDecoded ("Content Machine")

Modelo subido pelo dono em 2026-07-16. Dez slides, capturados do feed de
**@brandsdecoded_** — carrossel *"O novo algoritmo do Instagram em 2026 e o fim do
criador de conteúdo"*, que fecha vendendo o Workshop Máquina de Conteúdo 10k.

⚠️ **Não é peça da casa: é peça DELES.** É o criativo de referência do produto que a
skill `maquina-carrosseis` embala — o design system do Bloco 6 dela é exatamente este
modelo. Copiar daqui a **estrutura e o ritmo**, nunca a marca: a barra
"Powered by Content Machine", o `@brandsdecoded_`, o asterisco laranja do avatar e o
"Janeiro 2026 ®" são a assinatura de outra empresa. Publicar isso numa conta do RM
seria carimbar marca de terceiro na peça (ver `marcas-separadas` e o aviso da paleta
verde em `../LEIA-ME.md`).

⚠️ **Setas `‹ ›` e a fileira de bolinhas no rodapé não são arte** — é a interface do
Instagram web, que entrou junto no print. A arte é o retângulo 1080×1350 atrás delas.

## Os dez frames

| Frame | Registro | O que ensina |
|---|---|---|
| `01-capa.png` | Foto sangrando | Único slide em caixa alta condensada. Retrato + véu na base, badge do @ com selo azul, headline de 4 linhas com **a última linha em laranja**, subheadline com `→` embaixo |
| `02-tese.png` | Claro | A anatomia base: título com realce inline → régua → parágrafo grande → régua → label sublinhado (`O que muda:`) → lista de `→` |
| `03-fonte.png` | Escuro | O slide que **prova a origem do dado** antes de argumentar. Número em laranja no meio da frase; remate em amarelo-creme |
| `04-mitos.png` | Claro | Título + img-box (foto retangular de cantos arredondados) + lista de `❌` com as crenças mortas + parágrafo cinza de fecho |
| `05-metricas.png` | Escuro | Entrega técnica: `→` com o **termo em negrito** e a definição em peso normal. Realce amarelo no escuro (o laranja some no preto) |
| `06-accent-chapado.png` | **Laranja chapado** | O slide que quebra o ritmo. Um por carrossel, no meio. Traz um **card branco** (print de perfil) como prova |
| `07-anatomia-grade.png` | Escuro | Grade de 8 miniaturas de posts + lista com os rótulos (`Slide 1:`, `Slides 2-3:`) em amarelo. Prova por mosaico |
| `08-escala-numerada.png` | Claro | Único com **lista numerada** (1…5). Título em laranja sublinhado abrindo a lista |
| `09-oferta.png` | Escuro | A virada comercial: parágrafo de tese → régua → **oferta em amarelo sublinhado** (data + nome do produto) → régua → o que a pessoa leva |
| `10-cta.png` | Claro | Fecho: data + "Ao vivo" em laranja, frase sublinhada, a pergunta que cobra decisão, img-box com o badge do @ e **botão-pílula outline** com o CTA de comentário |

## Anatomia

- **Barra de topo em todos os 10**, três colunas: assinatura do produto à esquerda,
  `@handle` no centro, mês + `®` à direita. Fonte ~14px, mesma cor do texto com opacidade.
  É ela que assina a peça — **não existe logo em lugar nenhum do carrossel.**
- **Três fundos, alternando**: claro (off-white, quase #F7F4F1) · escuro (preto azulado,
  quase #0B0B0F) · **accent chapado** (laranja), que aparece uma vez só.
- **Duas cores de acento, e o fundo decide qual**: laranja (~#E8421A) nos slides claros,
  amarelo-creme (~#EAF08A) nos escuros. Laranja em fundo preto morre de contraste — por
  isso a troca. O acento cai **dentro da frase**, em uma expressão, nunca no bloco todo.
- **Tipografia em dois registros**: capa em condensada 900 caixa alta; todo o resto em
  grotesca 700-800 **sentence case**. O corpo é grande (~36-42px) e respirado.
- **Régua hairline** separando os andares do slide (título / corpo / rodapé). É ela que
  dá cara de jornal em vez de post.
- **Sublinhado como label**: `O que muda:`, `O segredo:`, `2026 é o ano do conteúdo.`
  Sublinhado com offset, não negrito. Marca o que é rótulo e o que é frase.
- **Quatro tipos de lista**: `→` (o padrão) · `❌` (o que morreu) · numerada (o passo a
  passo) · grade de miniaturas (a prova visual).
- **img-box**: foto retangular, largura do miolo, cantos arredondados, entre título e
  lista. Nunca sangra — só a capa sangra.

## O roteiro (10 slides)

O próprio carrossel entrega a fórmula no slide 7, e ele mesmo a cumpre:

1. **Capa** — quebra de padrão visual, tem que parar o scroll.
2-3. **A armadilha de retenção** — a promessa de valor e **de onde vem o dado**. O slide
   da fonte vem cedo de propósito: sem ele o resto é achismo.
4-6. **Entrega técnica pesada** — o que morreu, o que passou a valer, quem se beneficia.
7-8. **Gatilhos de salvamento** — a anatomia e o passo a passo. São os slides que a
   pessoa salva, e salvamento é a moeda do formato.
9. **A ponte comercial** — a tese conclui e a oferta entra colada nela, não solta.
10. **CTA de conversa** — comentar uma palavra, nunca "link na bio".

Cada slide fecha uma ideia e abre a próxima. Nenhum slide avisa "arrasta pro lado".

## Como o motor faz

Virou o tipo **`editorial`** em 2026-07-16 (ver `CLAUDE.md`). A paleta mora em
`marca/tokens.css` como `--ed-*`, separada da dourada da casa: o modelo é revista, e
misturar as duas identidades estragaria as duas. Primeira peça: `conteudo/bets-propaganda-regras.json`.

O que **não** foi portado (ninguém precisou ainda): a **grade de miniaturas** do
`07-anatomia-grade.png` e o **card branco** de print do `06-accent-chapado.png`.

⚠️ **O tipo NÃO copia a cor do original.** O laranja `#e8421a` daqui virou **vermelho
`#d81f26`** em `--ed-accent` (2026-07-16): é a identidade do dono. Ao ler estes frames,
copiar onde o acento CAI (realce inline, `❌`, seta da capa, slide chapado) — nunca o
laranja em si. Trocar de cor de novo é mexer em `--ed-*` nos tokens, e nada mais.
