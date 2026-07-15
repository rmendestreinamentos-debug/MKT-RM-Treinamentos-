# Projeto: conteúdo de Instagram

## O que é
Esteira pra produzir peças de Instagram (estáticos e carrosséis) seguindo
um padrão visual fixo. O texto vem sempre da pessoa; o trabalho aqui é
ADAPTAR a arte ao texto, nunca inventar identidade nova.

## Toda peça começa pela mesma pergunta
**Slides, carrossel ou estático?** — perguntar antes de escrever qualquer JSON.
Não deduzir o formato pela copy: quem escolhe é o dono. É a única pergunta do
processo; do formato em diante, executar. A skill `criar` (`.claude/skills/criar/`)
conduz isso e roteia pro modo certo.

## Princípio que rege tudo (não quebrar)
- **Repetitivo → código.** Peças de padrão fixo são geradas pelo motor em
  `motor/` rodando um script. NÃO chamar geração por IA pra isso. O layout
  é travado; só o conteúdo muda.
- **Interpretativo → exemplos.** Quando o pedido for "cria um baseado neste
  exemplo", usar as referências rotuladas em `exemplos/` como base de estilo.
- Nunca redesenhar o padrão por conta própria. O padrão mora nos tokens.

## Os quatro tipos de ESTÁTICO de CALENDÁRIO
Cada tipo é um modo do motor — o campo `"tipo"` no JSON (peça inteira ou por slide).
Todos saem em fundo escuro com brilho dourado e o selo da marca no rodapé.
**Todo modelo serve a todos os perfis** — o layout é o mesmo, muda só `marca`/`logo`.

1. **`contagem`** — contagem regressiva. Número gigante (`numero` + `unidade`),
   `prefixo` ("Faltam"), `texto` de apoio e `data`. É a peça mais repetitiva do
   calendário: muda só o número. CTA de link.
2. **`depoimento`** — prova social. `foto` do participante ao fundo (de `fotos/`),
   `citacao` em caixa alta, `autor`, `cargo`, `obs`. Credibilidade vem do rosto e do cargo.
3. **`provocacao`** — só copy, sem foto. Pergunta ou contraste que para o scroll
   (`titulo`). Orgânico: CTA manda pra legenda.
4. **`urgencia`** — escassez. Lote, vagas, % esgotado (`titulo` + `eyebrow`).
   Tráfego pago: CTA sempre de link.

## Os dois estáticos de TRÁFEGO PAGO
Estes não são "peça com CTA de link" — são **anúncio**. Eles montam o próprio rodapé
(foto, logo, botão, ressalva, nessa ordem), então não herdam a montagem dos outros.
Nascem escuros. Modelo pronto pra copiar: `conteudo/trafego-proximo-nivel.json`.

7. **`anuncio`** — captação qualificada. `eyebrow` (vira cápsula), `titulo` (o `\n`
   é quebra de VERDADE — é ela que separa o problema do agravante), `texto` de apoio,
   `foto` (entra como **faixa** embaixo, não como fundo), `cta.acao` (o botão,
   obrigatório) e `cta.obs` (a ressalva).
   **O `chips` é o coração da peça** — no máximo 2, cada um `{ "icone", "texto" }`.
   O `*asterisco*` parte o chip: fora dele vai a condição ("Acima de"), dentro vai o
   número em dourado ("R$ 100 mil/mês"). O chip **desqualifica quem não é o cliente
   antes do clique** — é o que faz o lead chegar barato. Não é enfeite; peça sem chip
   é anúncio pra todo mundo. Ícones: `crescimento` `equipe` `dinheiro` `relogio`
   `alvo` `escudo` `local` `calendario` `processo` `balanca`.
8. **`caricato`** — a imagem é a peça. `imagem` sangra na arte inteira; o texto só
   remata embaixo: `apoio` (o setup, uma linha só) + `titulo` (o remate, com o
   `*realce*` em dourado). O `cta.acao` vira a chamada que imita o "Saiba Mais"
   nativo — `*realce*` nela vira o negrito do botão falso. O selo assina no **alto**.
   A imagem sai de `imagens/`; apontar pro acervo (`fotos/`) também funciona, e aí
   vale a regra de não repetir. Imagem caricata é montagem/geração: vem pronta do
   dono, o motor não a cria.
   ⚠️ A referência **não** tem selo (num anúncio quem assina é o @ da conta). O dono
   pediu a marca na peça em 2026-07-14 — e a marca é dele. Não "consertar" de volta.

9. **`palestrantes`** — line-up. A ordem da peça é a **ordem da venda**, e não se remexe:
   **lockup em pílula** no topo → **fileira de rostos**, cada um com o nome NO PEITO →
   chamada (`eyebrow`) → **título** em dois tons → **selos de info** → **botão**. O rosto
   vem antes do texto de propósito: no feed quem para o dedo é a fileira de gente
   conhecida, não a frase. O ativo da peça são os **nomes confirmados**.
   Modelo: `exemplos/referencia/lineup-maiores.png` · peças: `conteudo/summit-sp-lineup.json`
   (6 nomes, recortes de estúdio) e `conteudo/trafego-palestrantes.json` (5).
   `palestrantes: [{ nome, foto, escala?, z?, sobe?, x?, nomeem?, tagx?, tagsobe? }]` — **de 1 a 6**.
   Campos da peça: `aperto` (o BOTÃO DO TAMANHO — 0.60), `altura` (teto vertical, opcional),
   `info` (`[{ icone, texto }]`, até 3 — data, hora, lugar), `cta.acao` (o botão) e
   `cta.obs` (a ressalva), `fundo` (imagem de `imagens/`), `eyebrow`, `titulo`, `texto`.

   ⚠️ **Colagem EXIGE recorte** — foto crua traria o retângulo do fundo junto. O motor lê
   de `palestrantes/recorte/`, gerado por `node motor/tirar-fundo.js "<arquivo>"`. Sem o
   recorte, o motor para e diz o comando. Tolerância é **por foto**; os valores em uso e
   o limite do algoritmo estão em `palestrantes/RECORTES.md`.

   ⚠️ **Recorte que já vem PRONTO do dono ainda precisa ser APARADO.** PNG exportado do
   Photoshop chega numa tela quadrada gigante (6250×6250) com a pessoa no meio e um oceano
   de transparência em volta. Pro olho é a mesma imagem; pro motor não é — ele mede a
   proporção no cabeçalho do PNG, leria 1.0 pra todo mundo, e a fileira sairia toda errada.
   `node motor/aparar.js "<arquivo.png>" "<nome de saída>"` faz a moldura coincidir com o
   corpo. O conjunto de estúdio em uso saiu assim (sufixo `(estudio)`).

   ⚠️ **O que precisa caber na arte é a CABEÇA e o NOME — não o ombro.** Obrigar o corpo
   inteiro de quem está na ponta a caber nos 1080 é o erro que gera meia peça de preto
   vazio: recorte de peito é largo (ombro aberto dá proporção 1.10) e um único ombro
   estrangula a fileira toda. Ombro sangra na borda; ninguém compra ingresso por causa de
   um ombro. Por isso a conta tem duas partes independentes:
   - **`passo`** (distância entre cabeças) sai do orçamento do NOME e é fixo pro tamanho do
     grupo. É ele que garante que dois nomes nunca se toquem.
   - **`aperto`** é o quanto os corpos se comem NESSE passo — o **botão do tamanho**. Mais
     aperto = gente maior, mesmo espaçamento de cabeças. Teto em 0.62: passando disso, a
     cabeça de um começa a cobrir a do vizinho, e nome sem rosto não vende.

   ⚠️ **A altura da fileira é a FOLGA que sobra, e o motor a orça.** Os três andares (lockup,
   fileira, bloco de venda) dividem 1350px, e só a fileira é elástica. Teto fixo ignora isso
   — foi o que empurrou o botão pra fora da arte quando a fileira cresceu. O motor estima
   quanto o bloco de venda vai comer (inclusive **em quantas linhas o título vai rachar**) e
   entrega o resto pras pessoas. Título de 4 linhas e título de 1 linha são peças com folgas
   muito diferentes. `altura` só existe pra pedir gente MENOR que a folga.

   ⚠️ **As CABEÇAS são igualmente espaçadas.** Encostar cada corpo no anterior (empurrar
   pela LARGURA) parece o óbvio e é armadilha: os recortes têm larguras muito diferentes
   (ombro largo dá 1.10, terno dá 0.66), então quem é largo empurra o vizinho pra longe e
   quem é estreito fica colado no seguinte — e some atrás dele. O nome mora embaixo da
   CABEÇA: cabeças a distâncias iguais, nomes a distâncias iguais, nenhum encosta no outro.
   O passo é o mesmo pra todos; o encavalamento é consequência dele.

   ⚠️ **O nome mora no PEITO, não acima da cabeça.** A etiqueta em cima da cabeça (o velho
   formato de KV) exige um vão livre ali, e na fileira cheia esse vão não existe — ela caía
   na testa de quem estava atrás. No peito sempre sobra corpo embaixo do queixo, então
   sempre há lugar, e o rosto fica livre. `nomeem` (fração da altura da pessoa) e
   `tagx`/`tagsobe` (px) fazem o ajuste fino.

   ⚠️ **Título curto vira display GIGANTE em caixa alta; longo cai pra caixa baixa** — é a
   mesma regra do `depoimento`, e o motor decide sozinho (corte em 28 caracteres na linha
   mais longa). Em itálico 900 a caixa alta come ~35% mais largura: uma linha de 45
   caracteres teria que despencar pra 32px pra caber, e um "título" menor que o subtítulo
   não é título. **Se você quer o impacto do modelo, a copy precisa ser curta.**

10. **`lote`** — **virada de lote**. Não vende o evento: vende o **relógio**. Quem lê já
   sabe o que é o Summit — falta a data em que ele fica mais caro. Por isso a peça é uma
   **tabela**, não uma frase: `ingressos: [{ nome, de, por, parcelas }]` (de 1 a 3). O
   `de` é **opcional** — com ele o preço velho sai **riscado em vermelho** acima do novo
   (o modelo de BH); sem ele sai só o preço de hoje, e o "PARA" some junto (ponte sem
   dois preços anunciaria uma virada que a copy não fez). O resto é moldura: `titulo`,
   `texto` (a linha que atira pra tabela), `aviso` (a data da VIRADA — o prazo), `nota`
   (a condição, em rodapé de contrato), `rodape` (as datas do EVENTO — o produto),
   `foto` (de `imagens/`: aqui o fundo é a CIDADE, não o acervo) e `cta`.
   Modelo: `exemplos/referencia/virada-de-lote.png` · reprodução: `conteudo/lote-modelo-bh.json`
   · a de SP: `conteudo/summit-sp-virada-lote.json`.
   - A **sirene** é o gatilho: grita "alarme" antes da primeira palavra. `"alerta": false`
     tira (lote novo é aviso, não urgência); `"alerta": 240` muda o tamanho.
   - **Um tamanho de fonte para TODOS os preços**, tirado do mais comprido. Dimensionar
     cada coluna sozinha faria "R$ 597" sair maior que "R$ 1.497" — e o ingresso caro
     pareceria o barato.
   - `"ponte": "Por"` troca o "PARA" entre os dois preços.

⚠️ **Nestes o selo cai SOBRE a foto** — declare o logo `-sem-fundo`. O PNG
original tem o fundo preto chapado dentro do arquivo, e sobre foto ele vira um
retângulo preto. `node motor/logo-sem-fundo.js <logo>.png` gera a versão recortada
(ver `marca/LOGOS.md`). Nos outros tipos o selo cai em fundo escuro e o original serve.

⚠️ **Botão desenhado e "Toque em Saiba Mais" imitam a interface do Meta.** É o que as
duas referências fazem, e funciona; mas é também a categoria de criativo que o Meta
reprova com mais frequência. Se um anúncio for recusado, o botão é o primeiro suspeito
— não a copy.

## Os carrosséis COM marca (selo, dourado, Montserrat)
- **`carrossel`** — leitura sobre foto, fundo escuro, selo no rodapé. Cada slide:
  `titulo` + `texto` + `pagina` ("3/5"). É o carrossel de campanha.
- **`padrao`** (default) — o carrossel claro, selo no topo, título em sentence case.
  Conteúdo educativo em vários slides.

- **`estreia`** — revelação de line-up ("Pela primeira vez no RM Summit"). Um carrossel,
  três registros, e a **moldura chanfrada** é o que os amarra:
  capa (`grade` de 2 a 6 rostos, cada um com sua etiqueta) → um slide por palestrante
  (`palestrante` + `texto` = a bio) → fecho (só `titulo`/`texto`/`cta`, no dourado chapado).
  Modelo: `exemplos/referencia/primeira-vez/`.
  **O pulo do gato é o ESTOURO**: o rosto fica DENTRO da janela dourada e o corpo sai por
  BAIXO dela, sobre a foto do evento (`fundo`, de `imagens/`). Sem isso é um retrato num
  retângulo. Enquadrar com `altura`/`desce` por pessoa — cada recorte corta a pessoa numa
  altura, e a cabeça tem que cair dentro da janela.
  ⚠️ Estouro **exige recorte** (`palestrantes/recorte/`), como o line-up. Foto que não se
  deixa recortar vai com `"recorte": false`: ela fica presa dentro da janela, sem sangrar.
  É pior de propósito — é o sinal de que falta pedir o PNG à mão (ver `RECORTES.md`).
  ⚠️ O fecho leva a **barra de ações do Instagram** desenhada. Em orgânico não passa por
  revisão do Meta; se a peça virar tráfego pago, a barra é a primeira coisa a sair.

## Os dois carrosséis — peças NATIVAS (sem marca, de propósito)
Carrossel não leva logo, nem dourado, nem Montserrat. Ele imita conteúdo orgânico:
carimbar a marca mataria o efeito. A assinatura é o **perfil**, não o produto.
Fonte: `--nativo` (grotesca de sistema). Não "consertar" isso.

5. **`thread`** — print de tweet do X, dark mode. `perfil` em todo slide (ver
   "Quem assina" abaixo). Slides: `texto` (linha em branco separa parágrafo) +
   `imagem` opcional — uma (o normal do modelo) ou **duas lado a lado** numa lista:
   `"imagem": ["antes.jpg", "depois.jpg"]`. **Fundo preto e texto em peso normal
   são o padrão** — negrito ou cor entregam que é arte, não print. Slide com
   `imagem` ancora o card no topo e a imagem preenche o resto; slide sem `imagem`
   centra o card no preto — é o **remate**.
   Modelo canônico + roteiro da copy: `exemplos/thread-x/`.
   (`titulo`/`gancho` e o `*asterisco*` como marca-texto vermelho continuam
   disponíveis, mas fora do padrão — usar só se o dono pedir.)
6. **`legenda`** — foto com caixa de legenda. `paineis`: 1 ou 2 fotos lado a lado
   (o contraste "eu × ele"), cada uma com sua `legenda` na caixa branca. O slide
   sem `paineis` (só `texto`) é o fecho branco, com o CTA de comentário.

Instagram publica no máximo **20 slides** — o motor avisa se passar.

### Quem assina o carrossel nativo — PERGUNTAR SEMPRE
Peça nativa não tem logo: a assinatura é o perfil. Perfil errado publica a peça na
voz da marca errada, então **isto não se deduz — pergunta-se** (a skill `criar`
conduz). No JSON vai o slug, e o motor puxa nome/@/avatar de `marca/perfis.json`:

| Quem assina | No JSON |
|---|---|
| RM Summit | `"perfil": "rm-summit"` |
| Rafael Mendes (pessoal) | `"perfil": "rafael-mendes"` |
| Rafael Mendes Advogados | `"perfil": "rafael-mendes-advogados"` |

**Nunca digitar um @ à mão, nunca chutar.** Handle `null` em `perfis.json` = o dono
ainda não confirmou; o motor para e pede.

### A imagem DENTRO do slide vem de `imagens/` — uma pasta por carrossel
Pasta onde o dono despeja o que quiser (pintura, print, meme, render) — sem triagem,
sem catálogo, pode repetir. **Não confundir com o acervo `fotos/`**, que é o banco do
evento e só entra como foto de FUNDO de estático, com regra de não repetir.

Cada carrossel ganha sua subpasta, e a peça declara ela **uma vez** no topo:
`"pasta": "copa-do-mundo"` → o motor procura em `imagens/copa-do-mundo/`, e cada slide
cita só `"imagem": "taca.jpg"`. Pasta declarada que não existe **para o motor** — sem
isso o carrossel sairia inteiro sem imagem e ninguém notaria. Imagem na raiz de
`imagens/` continua valendo. Ver `imagens/LEIA-ME.md`.

## Foto de fundo — TODA peça leva (regra do dono, 2026-07-13)
A peça é **texto + foto + design**, não texto sobre preto. Estático sem foto é
exceção que precisa de motivo (ex.: a copy é um contraste numérico que a imagem
atrapalharia). Na dúvida, põe foto.

- `"foto": "FOTOS/DIA 1/xxx.jpg"` — caminho relativo dentro de `fotos/`, subpasta inclusa.
- `"veu": "leve" | "medio" (padrão) | "forte"` — o texto SEMPRE tem que ganhar da imagem.
- `"foco": "topo" | "baixo" | "esquerda" | "direita"` — o corte 4:5 come parte da foto.
  Centralizado, ele decapita quem está em pé, ou joga o rosto atrás do título. Corrigir aqui.

## Foto de peça de VENDA tem que ser ALEGRE (regra do dono, 2026-07-14)
Rosto sorrindo, com energia. Retrato sério/contemplativo é **defeito**, mesmo quando
o clima "casa" com a copy — a peça existe pra vender, não pra combinar de tom.
Filtrar por sorriso ANTES de filtrar por clima.

⚠️ O acervo é pobre nisso: o Rafael sorri quase só nas posadas com aluno, e essas
são todas no backdrop **BELO HORIZONTE** (pasta `ALUNOS RAFAEL` inteira, barrada).
Quando a foto certa vier com um vizinho de crachá de BH ao lado, o corte 4:5 **não**
resolve — ele só escolhe o miolo. Recorte a imagem de verdade:

```
node motor/recortar.js "FOTOS/DIA 3/0017_....jpg" <x> <y> <larg> <alt> rafael-sorriso.jpg
```

Sai em `imagens/` (o acervo não se mexe) e a peça aponta pro nome do recorte.
Deixe **ar no topo** se a peça tiver selo no alto (`caricato`) — senão o logo bate na testa.

## O acervo é um REPOSITÓRIO vivo (regra do dono, 2026-07-13)
`fotos/` não é uma pasta que se lê uma vez: o dono joga foto nova lá sempre que
tem. São ~1.600 e vão crescer. **A meta é usar o acervo INTEIRO** — foto repetida
entre peças é defeito, não economia.

Três arquivos, três papéis:
- `fotos/**` — o acervo. Foto nova entra aqui, e só.
- `fotos/_triagem.csv` — laudo **técnico** (`motor/fotos.js`): resolução, miolo, véu.
- `fotos/_catalogo.csv` — laudo de **conteúdo**: o que aparece na foto. Só se escreve
  OLHANDO a imagem. É isto que permite escolher por busca em vez de por memória.

O **uso não tem log**: é derivado de `conteudo/*.json`. A peça é a verdade.

```
node motor/acervo.js              panorama: catalogado, usado, repetido, o que falta
node motor/acervo.js novas        fotos que entraram e ninguém mediu → rode fotos.js
node motor/acervo.js pendentes    próximo lote a catalogar (amostra ESPAÇADA)
node motor/acervo.js escolher     fotos que servem e NUNCA foram usadas ← escolha aqui
```

Antes de fechar qualquer peça: `acervo.js` não pode acusar repetida.

⚠️ O acervo vem em **rajadas** — 5 frames do mesmo instante, em sequência. Por isso
`pendentes` amostra espaçado. Catalogar em ordem cataloga a mesma cena 5 vezes.

⚠️ **Foto não pode contradizer a peça.** O acervo todo é da edição de **BELO HORIZONTE**:
metade das fotos tem o cordão "RM SUMMIT · BELO HORIZONTE" legível no peito, e há
foto com a cidade escrita no telão. Nenhuma delas entra em peça de São Paulo — é a
coluna `cordao_bh` / `serve_sp` do catálogo. Na dúvida, abrir e conferir.

A medida do `_triagem.csv` diz se o texto vai ser legível. Ela **não** diz se a imagem
é boa, nem onde está o rosto, nem se tem crachá da cidade errada. **Sempre abrir e OLHAR.**

## A palavra-chave em outra cor
Envolva em `*asteriscos*` o trecho que deve saltar dentro da frase:
`"O Summit foi um *divisor de águas* na minha vida."` Vale em `titulo`, `citacao`
e `texto`. Uma frase, duas cores — é o que dá o impacto de 1 segundo. Não abusar:
um destaque por peça.

O mesmo `*asterisco*` rende diferente por tipo — mesma escrita, cada peça no seu
registro. **Conferir o modelo em `exemplos/referencia/` antes de mexer:**

| Tipo | O que o `*realce*` vira |
|---|---|
| `contagem`, `depoimento`, `urgencia` | dourado **na própria linha**, mesmo tamanho |
| `provocacao` | **linha de display GIGANTE**, empilhada. O texto fora do realce vira linha de ligação, pequena, entre os blocos. É o contraste de TAMANHO que para o scroll — cor sozinha não faz o trabalho. |
| `thread` | **marca-texto vermelho** (caixa), como no print do X |
| `anuncio` | dourado na linha — e **dentro do chip** ele parte a frase: fora do realce vai a condição, dentro vai o número |
| `caricato` | dourado no remate; **no CTA** vira o negrito do "Saiba Mais" |

Na `provocacao`, dois realces são o certo quando a copy opõe dois números
("*3 dias*" × "*5 anos*") — é a oposição que carrega a peça.

## Marca por peça (nome + logo)
Os produtos são **marcas próprias** e não entram na narrativa do Rafael Mendes
Advogados. Por isso **não existe marca default**: cada peça declara a sua no JSON.
- `"marca": "RM Summit"` → texto do selo. **Obrigatório** — sem ele o motor para.
- `"logo": "rm-summit-sp.png"` (opcional) → arquivo em `marca/`. Sem logo declarado,
  o selo cai na **inicial neutra** — de propósito, pra nunca carimbar a marca errada.
- `"inicial": "RM"` (opcional) → sobrescreve a inicial do fallback.

O logo da casa é um slug explícito (`rafael-mendes.png`), nunca um fallback
automático. Mapa completo produto→arquivo: `marca/LOGOS.md`.

Produtos conhecidos (viram o campo `marca`): RM Summit · Rafael Mendes Advogados ·
Formação de Lideranças · Comercial 24hrs · Master MAT · Mapa da Advocacia
Previdenciária · Mapa da Advocacia Trabalhista.

## Identidade visual
Os valores moram em `marca/tokens.css` — mudar lá, não espalhar cor solta pelo código.
- Cores: preto `#000` (tinta) · branco `#fff` (papel) · dourado quente `#f4b661`
  (acento) · dourado vibrante `#f3c223` (apoio) · cinza `#5a5a5a` (suave)
- Fontes: Montserrat (título e corpo) — títulos de impacto em 800/900, caixa alta
- Tom de voz: direto e provocativo, sem jargão jurídico. Número é argumento
  ("2 dias", "97%"). Frase curta. Fala com o dono do escritório, não com o leigo.
  <!-- CONFERIR: tom de voz foi inferido dos exemplos; ajustar se não for isso. -->

## Referências (modo interpretativo)
`exemplos/referencia/` guarda os modelos de estático em imagem. Os prints estão na
paleta **verde** (capturados do Summit "Crise é o Cacete", Capital Upgrade): copiar
deles o FORMATO, nunca a cor nem o logo. Ver `exemplos/LEIA-ME.md`.

Falta um modelo virar modo do motor: **institucional** (patrocinador confirmado,
moldura de crachá).

## Formatos
- Feed retrato: 1080×1350 (padrão)
- Estático: 1 peça · Carrossel: 2 a 12 slides

## Como trabalhar aqui
- Pra gerar peça repetitiva: editar um arquivo em `conteudo/`, rodar
  `node motor/gerar.js conteudo/<arquivo>.json` — as imagens saem em `saida/`.
- CTA é regra, não gosto: tráfego pago → CTA de link; orgânico → seguir/
  curtir/comentar/compartilhar conforme o campo `cta` do conteúdo.
- Imagens vêm do banco de fotos da pessoa; não gerar foto de coisa real.

## Disciplina deste arquivo
Manter abaixo de ~200 linhas. Não despejar tudo aqui — arquivo longo faz
o Claude obedecer PIOR. Regra estável e curta fica aqui; exemplo vai pra
`exemplos/`; detalhe de estilo vai pros tokens. Curar, não acumular.
