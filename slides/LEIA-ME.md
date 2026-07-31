# Motor de DECK (16:9) — `.pptx` editável

Separado do motor de feed (`marketing-instagram/motor/`, que faz 1080×1350).
Aqui a saída é um **PowerPoint editável**, e o entregável final é o PNG exportado dele.

```
node motor-slides.js conteudo/<arquivo>.json     # -> saida/<nome>.pptx
powershell -File exportar-png.ps1 <nome>         # -> saida/png/<nome>/Slide1.PNG ...
```

⚠️ **Deck só se confere com o OLHO.** O motor pode dizer "ok: 30 slides" e ter posto o
título por baixo da foto — isso não aparece no log, aparece na imagem. Exporte o PNG e
olhe. Todos os defeitos corrigidos até hoje foram assim.

Num deck longo, abrir 53 PNGs um a um não escala. A folha de contato mostra todos juntos:

```
node folha-contato.js <saida.jpg> <colunas> <lista.txt>   # lista.txt = um caminho por linha
```

Foi ela que pegou, no `comercial-365-dia-1`: o fecho colado no último bullet, o ponto de
destaque no elo errado da cascata, e uma foto de pessoa **sorrindo** embaixo de "OS
GARGALOS DO COMERCIAL" em vermelho — a foto dizendo o contrário do título. Nenhum dos três
aparece olhando slide por slide, porque isolado cada um parece aceitável.

## As fontes NÃO são nativas do Windows
Foram instaladas no perfil do usuário (sem admin), em `%LOCALAPPDATA%\Microsoft\Windows\Fonts`:
**Montserrat** (Light/Regular/Bold/ExtraBold/Black) e **Rubik One**. Se o deck abrir numa
máquina sem elas, o PowerPoint substitui e o layout dança. Como o entregável é o PNG
exportado *desta* máquina, isso não é problema no dia a dia — mas é, se você mandar o
`.pptx` pra alguém editar.

## Os dois TEMAS (`"tema"` no topo do JSON)
Os modelos do dono (`Modelos/`) são dois dialetos da mesma gramática: título em caixa
alta com uma palavra em ouro, régua embaixo, foto, uma linha de fecho, logo no rodapé
**esquerdo**. O que muda é a voz.

| | `summit` (padrão) | `mat` | `c365` |
|---|---|---|---|
| Modelo | `Modelos/O proposito.pdf` | `Modelos/Comercial para Motoristas.pdf` | `Modelos/COMERCIAL 365 - DIA 1.pdf` |
| Fonte | Montserrat (mistura pesos) | Rubik One (um peso só) | Montserrat |
| Foto | **emoldurada** em ouro | **sangra** no fundo | **painel** à direita (x=5,6") |
| Régua | dourada | branca | **não tem** |
| Logo | rodapé esquerdo | rodapé esquerdo | **topo direito** |
| Corpo | caixa baixa | CAIXA ALTA | caixa baixa |
| Serve pra | contar história | dar aula | workshop longo |

### O `c365` e o painel da direita
Os dois primeiros temas sangram a foto na página inteira. O `c365` a põe num **painel**
que começa em 5,6", com a esquerda preta e a emenda dissolvida. Não é só estilo: **83 das
115 fotos de evento do acervo são VERTICAIS**, e num corte 16:9 elas guardam 42% da altura
(a linha cai no queixo). No painel de 7,7"×7,5" o corte é quase quadrado e guarda ~70%.

Ele também **encolhe o título pra caber** (`titulo_encolhe`), em vez de deixar quebrar como
os outros dois. A régua de faixas do `titulo()` foi calibrada na Rubik One, que é estreita;
na Montserrat a maiúscula é 15% mais larga e uma linha de 20 letras racha. Num deck de 53
títulos escritos por outra pessoa, a conta faz sozinha o que seria calibrar copy slide a slide.

Reprodução dos modelos, pra comparar: `conteudo/teste-tema-summit.json` e
`conteudo/teste-tema-mat.json` (as fotos em `imagens/teste/` saíram dos próprios PDFs).

## O ACENTO (`"acento"` no topo do JSON) — a cor é do PRODUTO, não do tema
O deck é preto com letra branca, e o acento é todo o resto: a palavra realçada, a régua,
a tarja do card, o número, a seta, a borda da etapa ativa do `fluxo`, a escada do
`ranking`. Ele nasce **dourado** porque os dois modelos do dono são dourados, mas cada
produto tem a sua cor — e deck de produto azul carimbado de dourado lê como arquivo do
produto errado, o mesmo erro de pôr o logo de outra marca, só que em cor.

| | `ouro` (padrão) | `azul` |
|---|---|---|
| Acento | `#F4B661` | `#4169E1` (azul real) |
| Apoio (2º do ranking) | `#F3C223` | `#6E93FF` |
| Serve pra | RM Summit, os modelos | **Imersão Master MAT** (pedido do dono, 2026-07-30) |

### O acento também muda por SLIDE
Do `COMERCIAL 365` vieram sete cores de uma vez, e elas não são sete produtos: ali o acento
muda por **seção do mesmo deck**, e cada divisória repete a cor do bloco que anuncia. Por
isso `"acento"` pode ir também **dentro do slide**, e aí ele vence o do topo do arquivo.
Os hexas foram **medidos nos pixels do PDF do dono**, não escolhidos: `verde` `#14FF00` ·
`jade` `#00BF63` · `laranja` `#BB3B17` · `vermelho` `#FF3131` · `ambar` `#E79F13` ·
`ciano` `#0097B2` · `rosa` `#E2A9F1`.

⚠️ **A cor tem semântica, e o marcador da lista tem que concordar com ela.** Num slide de
acento vermelho (um gargalo) com itens que são o que FAZER, o `marca_item: "check"` pinta
um ✓ vermelho, que diz as duas coisas ao mesmo tempo e não diz nenhuma. Ali o marcador é
`bullet`. O ✕ vermelho só vale quando os itens são mesmo os defeitos.

`acento` e `tema` são independentes: um deck `mat` (Rubik One, foto sangrando) pode sair
dourado ou azul. Nome desconhecido **para o motor** em vez de cair no dourado — cair no
default sairia um deck inteiro na cor errada e o console diria "ok". Cor nova se
acrescenta em `ACENTOS`, no topo do motor, e é uma linha: os quatro tons (`cor`, `apoio`,
`escada`, `fundo`) existem porque a cor aparece em vinte lugares, e espalhada solta pelo
layout trocar uma exigiria caçar as vinte.

⚠️ **O logo pode não acompanhar.** O da Imersão Master MAT é DOURADO nos pixels, e num
deck azul ele fica sendo a única coisa quente da página. Funciona (azul e ouro é par
clássico), mas é escolha, não acidente: se o dono quiser tudo frio, o caminho é uma
versão monocromática branca do lockup.

## O @ de quem apresenta (`"perfil"` no topo do JSON)
`"perfil": "joao-vitor"` põe o @ no rodapé **direito de todo slide**, no canto oposto ao
logo. O logo diz de que produto é a aula; o @ diz quem está falando, e num deck que
circula em print de story os dois precisam viajar juntos.

O handle sai de **`marketing-instagram/marca/perfis.json`**, pelo slug, exatamente como no
motor de feed. **Nunca se digita o @ à mão**: cadastro duplicado do mesmo handle é garantia
de que um dia os dois divergem, e o errado manda a plateia pra conta de outra pessoa.
Handle `null` no arquivo **para** o motor, que diz de quem falta. Slugs em uso:
`joao-vitor` · `rm-summit` · `rafael-mendes` · `rafael-mendes-advogados`.

⚠️ Ele mora num **chip escuro**, e isso não é enfeite: o véu do slide escurece a
ESQUERDA, e o canto de baixo à direita fica com a imagem crua. A borda clara da gravura do
Botticelli apagou o @ azul na primeira versão. Sobre slide preto o chip desaparece.
⚠️ Com `"numerar": true` o número **sobe**, senão sai impresso em cima do @.

## As DUAS ênfases dentro da frase
- `*palavra*` → **ouro**. É a palavra que a frase existe pra dizer. Uma por frase.
- `**palavra**` → **peso forte**, branco. É o esqueleto: `NOSSA **HISTÓRIA COMEÇOU**
  ANTES DELE *NASCER*`. É a mistura de pesos que dá o ritmo — sem ela sobra um bloco
  uniforme de caixa alta.

No tema `mat` a Rubik One tem um peso só: o `**` não muda nada, e é assim que o modelo
faz. Ali a ênfase é a COR, e ponto.

⚠️ **O marcador abre e fecha na MESMA linha.** `**` aberto numa linha e fechado na
outra vira asterisco impresso na arte. O motor avisa e limpa, mas a ênfase se perde.

## Os layouts (`"layout"` por slide)
Os que vieram dos modelos:
- **`capa`** — título + régua + subtítulo. Bloco à esquerda no summit (com `"moldura": true`
  o retrato entra ao lado); centrado no mat, sobre a foto que sangra.
- **`foto`** — a página de contar história: texto à esquerda, retrato emoldurado à direita.
- **`duas-fotos`** — o antes × depois. Título centrado, as duas fotos, legenda embaixo
  (`linhas`; a última sai em peso forte, que é o remate).
- **`lista`** — título, régua, 3 a 5 itens com uma palavra em ouro cada, `fecho` no pé.
  É a página que mais aparece no deck do MAT.
- **`declaracao`** — a frase É a página. Sem foto, centrada. É o slide que respira.
- **`contato`** — bloco de dados à esquerda, `qr` à direita (o QR entra **inteiro**, sem
  corte: recortar come os módulos da borda e a câmera para de ler).

Os que vieram do `COMERCIAL 365`:
- **`cascata`** — a corrente vertical do "↓", que no roteiro daquele deck é o desenho mais
  repetido. O `fluxo` horizontal não serve com nove elos: ele quebra em duas fileiras e a
  ordem deixa de ser óbvia, que é a única coisa que a página existe pra dizer. A seta entre
  os elos comeria a altura deles, então o encadeamento vira um **trilho** (linha vertical
  com um ponto por elo). Item é string ou `{ "titulo", "texto" }` — o par nomeia o elo e
  explica embaixo ("SDR" / "Acolhe, qualifica e agenda").
  ⚠️ `"destaque"`: `ultimo` (padrão) · `primeiro` · `nenhum`. O ponto cheio marca **onde a
  corrente chega**, e o padrão está certo quando a lista sobe. Mas a HIERARQUIA DO VÍNCULO
  desce (do presencial ao texto): ali o padrão pintava "Texto" como destino e a página dizia
  o contrário do próprio fecho.
  ⚠️ `"elo"`: `empilhado` · `deitado`. O elo com rótulo tem dois desenhos. **Empilhado**
  (padrão) põe o nome em cima e a definição embaixo. **Deitado** põe os dois na mesma linha,
  com o nome numa coluna à esquerda, e é o que salva a página de muitos elos: o cronograma
  de oito aulas empilhado sai com dezesseis linhas espremidas, deitado sai com oito e
  respiro. O motor já escolhe sozinho quando a diferença de corpo é grande (três pontos ou
  mais); a chave existe pra **páginas irmãs**, que precisam sair iguais mesmo tendo
  quantidade diferente de elo — é o caso dos dois cronogramas do `COMERCIAL 365 · DIA 2`,
  marcados os dois como `deitado`.
  🔎 `DEBUG_CASCATA=1 node motor-slides.js <arquivo>` imprime, por página, a altura do elo,
  o corpo escolhido e o corpo que cada desenho permitia. É por onde se descobre que a página
  saiu a 10pt por causa da medição, e não por falta de espaço.
- **`secao`** — a divisória de bloco: uma palavra gigante no acento, o rótulo ("BLOCO 2")
  pequeno e espaçado ACIMA dela, em cinza. É o que dá ritmo ao deck longo; sem ela, 53
  páginas de título-e-bullet viram uma esteira sem começo nem fim.
  ⚠️ Ele dimensiona pela linha MAIS LONGA. Título de duas linhas compridas cai pra 21pt,
  metade do corpo das outras divisórias, e quebra o ritmo. Quebre em três linhas curtas.
- **`planos`** — o cardápio de preço, com o **revelar progressivo**. No modelo do dono os
  três planos não aparecem juntos: ele mostra os cartões vazios, revela o Básico, depois o
  Avançado, depois o Individual, e a mesma página se repete quatro vezes. Não é preguiça de
  slide, é a mecânica da venda: o preço alto só entra depois que o barato ancorou. Aqui isso
  é o campo `"revelado"` por plano; sem ele o cartão sai só com o cabeçalho colorido.
  Cada plano leva `nome` `acento` `de` `por` `parcelas` `selo` `itens`. O `de` sai **riscado**
  (`strike` no run, não uma forma desenhada por cima, que dançaria em outra máquina).
  ⚠️ O corpo dos `itens` é **um só pras três colunas**, decidido pela mais cheia: calculado
  coluna a coluna, os planos saíam a 12, 11 e 8pt e o cardápio lia como três slides colados.
  Pra comparar preço o olho precisa das linhas com o mesmo peso.

O `colunas` também aceita **`"acento"` por grupo**, e foi daí que veio: as três colunas de um
cardápio não são três exemplos da mesma coisa, são níveis, e é a cor que diz qual é o do meio.

Herdados do motor antigo, ainda válidos: `texto` `cards` `numeros` `fluxo` `ranking`
`colunas` `citacao` `final`.

## As duas imagens do slide
- **`foto`** — o assunto. Emoldurada (nos layouts que emolduram) ou sangrando.
- **`cenario`** — opcional, e é o que dá o ar de cena montada em vez de "foto com texto
  por cima": o cenário sangra na página inteira e a `foto` vira o PERSONAGEM, num painel
  à direita com a borda esquerda dissolvida no cenário. Sozinho, o personagem seria um
  retângulo colado; sozinho, o cenário seria papel de parede.
- **`foco`**: `topo` `baixo` `esquerda` `direita` `centro` — o corte sempre come parte da
  foto; é aqui que se escolhe o que fica.
- **`veu`**: `leve` · `medio` (padrão) · `forte` · `apagado` — quanto de preto entra sobre
  o `cenario`. O padrão foi calibrado em foto de PALCO, que já nasce escura. **Ilustração,
  pintura e gravura clara pedem `forte`**: a gravura de vaso grego (creme e laranja de
  ponta a ponta) virava a página mais clara do deck e destoava de todas as outras. É por
  slide, não por arquivo — a mesma imagem pode ser fundo discreto num layout e assunto em
  outro.

Procura em `slides/imagens/`, depois `marketing-instagram/imagens/`, depois no acervo
`marketing-instagram/fotos/`.

### ⚠️ Retrato VERTICAL não vira fundo 16:9 com `foco` — pré-renderize
O `foco` tem cinco posições (as do `sharp`), e num retrato 3:4 o corte 16:9 guarda ~42%
da altura: no `topo` a linha de corte cai no queixo, no `centro` come a testa. Não existe
posição certa — o formato é que não bate, e o console diz "ok" nas cinco.

```
node retrato-16x9.js "<origem>" "imagens/<deck>/hero-x.jpg" <topo> [altura] [larguraPessoa]
```

Ele monta o 16:9: a pessoa vai à **direita** (o motor escurece a esquerda, que é onde o
texto mora) e o fundo do próprio estúdio, borrado e escurecido, preenche o resto, com a
borda esquerda da pessoa dissolvida por máscara de alfa. `topo` é a fração da altura do
ARQUIVO onde começa o cabelo — é o único número que se mede olhando a foto. A saída entra
na peça com `"foco": "centro"`, porque já está na proporção. Origem nunca é tocada.
O lote do João Vitor (2026-07-31) saiu assim, em `imagens/jv-comunicacao/hero-*.jpg`.

## ⚠️ `rectRadius` acima da metade da altura MATA o export de PNG
Cantinho arredondado com raio maior que a metade da altura da forma gera um ajuste que o
PowerPoint aceita ao ABRIR e recusa ao exportar: o `SaveCopyAs` morre no meio com
`E_FAIL`, depois de já ter escrito 20 e tantos PNGs. Não há erro no motor nem no console
do Node, e o número de arquivos que sai varia entre tentativas, o que faz parecer
instabilidade do PowerPoint. Foi o chip do @ (0,31" de altura com raio 0,15"). Regra:
**raio no máximo em 40% da menor dimensão**.

## Logo SOBRE foto: use a versão `-sem-fundo`
Os logos têm o fundo preto chapado dentro do PNG. Em slide preto ninguém vê; sobre foto
vira um retângulo. `node ../marketing-instagram/motor/logo-sem-fundo.js <logo>.png`.

## O que o motor calcula sozinho (e por que)
O pptx **não encolhe e não avisa**: texto que não cabe quebra em mais linhas do que o
layout reservou, e o bloco de baixo entra por cima dele. Então o motor estima a largura
da linha (`TEMAS.largura` = largura média da maiúscula, em em) e:
- **encolhe o título** até ele caber na coluna — no layout `foto`, a coluna para onde a
  moldura começa;
- **encolhe os itens da lista** até cada um caber em UMA linha (bullet que racha em duas
  encosta no de baixo);
- **conta as linhas reais** depois da quebra, pra régua não cair em cima do título;
- deixa o `fit: shrink` do PowerPoint como rede, pra quando a conta errar por pouco.

Se um texto sair pequeno demais, o remédio é **encurtar a copy**, não forçar a fonte.

O piso de encolhimento é **14pt em título e 10pt em texto de apoio** (o elo da `cascata`, o
item do cartão de `planos`). O piso alto no apoio virava armadilha: a conta pedia 10pt, o
piso devolvia 14, a linha quebrava em duas dentro de uma caixa de uma linha e sentava em cima
do elo de baixo. Batendo no piso, o motor **avisa** em vez de espremer mais.

⚠️ O que se mede é se o texto cabe na **CAIXA**, não se cabe em UMA LINHA. Numa cascata de
dois elos a caixa aceita três linhas com folga; numa de oito, aceita uma só. A primeira
versão do aviso reprovava as duas por igual e mandava encurtar copy que estava perfeita.

⚠️ **A régua cobra pela MAIÚSCULA.** `linhasReais` mede cada caractere por `T.largura`, que
é a largura de uma maiúscula (0,78 em no c365). É a medida certa pro título, que é caixa
alta, e cara demais pra frase em caixa mista, que mede 0,56 em no render. Pagando o preço
cheio, o cronograma do dia 2 saía a **10pt numa página que comportava 18** — não por falta
de espaço, mas por régua errada. O elo da `cascata` desconta isso (`MISTA = 0.80`, mais
conservador que os 0,71 medidos) e zera o `margin` da caixa, senão o PowerPoint come 0,1"
de cada lado e a conta promete largura que a caixa não tem. Errar a régua pra cima custa
texto menor que o necessário; errar pra baixo custa linha em cima do elo seguinte. Na
dúvida, erre pra cima — os outros layouts ainda pagam o preço cheio, e ali a mesma correção
só vale depois de conferir página por página no PowerPoint.

No c365 o **fecho para na coluna de texto** (7,6"), não na largura cheia. Atravessando o
painel, ele ainda se lia sobre retrato escuro de palco — e foi por isso que passou batido —
mas some sobre foto clara. Duas linhas curtas no escuro ganham de uma comprida na foto.

## ⚠️ O título tem orçamento de ~22 CARACTERES por linha
O `titulo()` **não** encolhe pra caber: ele escolhe o corpo por faixa de comprimento
(≤20 letras → 40pt · 21–30 → 34pt · 31+ → 30pt) e deixa o que passar da coluna **rachar**
na linha seguinte. O efeito é traiçoeiro, porque a faixa muda junto: uma linha de 20 letras
sai a 40pt e estoura os 7,2" da coluna; a mesma linha com 22 letras cai pra 34pt e cabe.

Régua prática pra escrever o `\n` do título, no tema `mat`:

| Linha mais longa | Corpo | Cabe até |
|---|---|---|
| ≤ 20 letras | 40pt | **19** letras |
| 21 a 30 | 34pt | **22** letras |
| 31+ | 30pt | **25** letras |

Ou seja: **quebre em linhas de 17 a 22 letras** e nunca deixe uma linha entre 19 e 21 sem
conferir. Uma palavra sozinha na terceira linha ("TREINADO", "DECIDIR") é sempre isto.
Nos layouts centrados de coluna cheia (`declaracao`) a folga é de 11,5", quase o dobro:
título comprido que não cabe em `lista`/`texto` cabe lá, e às vezes trocar o layout é o
conserto mais barato. ⚠️ No `citacao` **não** resolva com uma terceira linha de título:
o bloco do rótulo desce junto e vai bater no logo.
