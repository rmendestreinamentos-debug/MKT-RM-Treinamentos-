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
  é travado; só o conteúdo muda. (Isto é sobre a ARTE. A imagem de dentro do
  slide pode vir do Gemini, com regra própria — ver a terceira fonte, abaixo.)
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

## O estático de FRASE (`frase`) — a peça sem marca
Frase avulsa do dono virando post. **É o único tipo com selo `null` que não é nativo**:
mantém Montserrat e o dourado da casa, mas não carimba logo, data nem CTA.
Campos: `frase` (o texto, com UM `*realce*`), `autor` (opcional), `foto`, `veu`, `foco`,
`focox`, `zoom` e `estilo`. Peça: `conteudo/frases-mentoria.json` (20 numa rodada só —
não é carrossel, cada slide sai como PNG avulso).
- **`perfil` assina no pé** — a peça não tem selo, então o @ É a assinatura. Sai de
  `marca/perfis.json` pelo slug (`"perfil": "rm-summit"`), nunca digitado à mão. Dourado
  a 62% de opacidade: presente, mas atrás do texto na hierarquia — cheio, ele brigaria
  com o `*realce*`, que é a única cor que deve saltar. Sem `perfil` a peça sai sem @, e
  isso é legítimo: a série nasceu assim em 2026-07-27 e o dono pediu o @ depois.
  ⚠️ O rodapé é **reservado** pra ele (`padding-bottom` no corpo): sem essa folga o texto
  desce por cima do @ nas frases longas.
- **`autor` é o gatilho da autoria**: com ele a frase ganha aspas tipográficas e a
  assinatura embaixo; sem ele sai limpa. ⚠️ Atribuir por engano põe na boca de alguém
  uma frase que não é dele — o erro mais caro da peça, e o que ninguém percebe depois
  de publicado. Não deduzir: frase promocional ou informativa **não** leva assinatura.
- **A régua dourada é a única marca gráfica** — é ela que amarra vinte cenários
  diferentes como uma série. Sem selo, é o que sobra de identidade.
- **`estilo`**: `centro` (padrão) · `esq` · `baixo`. Rodar a série inteira no mesmo eixo
  faz vinte peças parecerem uma repetida. `baixo` é a saída quando o bloco cai em cima
  do rosto — e cai, porque o acervo é quase todo retrato. ⚠️ Em peça **sem foto**, `baixo`
  deixa metade da arte vazia no alto: fundo neutro só aceita `centro` e `esq`.
- ⚠️ **Gente de terceiros no cenário: o dono não quer** (regra dele, 2026-07-27, sobre as
  frases). Rosto de aluno/plateia/participante como fundo de frase **disputa a atenção**
  com o texto — e numa peça em que a frase É tudo, quem olha lê a pessoa antes da frase.
  Sem foto, a peça cai no `sem-foto`: um fundo neutro DESENHADO (clarão quente no alto,
  queda pro preto no pé), não preto chapado — chapado lê como slide que perdeu a imagem.
  Foto do **Rafael** continua valendo: nas frases dele o rosto é o assunto, não ruído.
  É a exceção prevista na regra "toda peça leva foto" — e é o dono quem a abriu.
- ⚠️ **Palavra com hífen** (`aplicá-la`) o navegador racha na linha, e sai "aplicá-" /
  "la": o olho lê PALAVRA CORTADA. `travaHifen` no motor prende isso. Texto de terceiro
  não pode nem parecer cortado.
- ⚠️ **Realce longo demais pinta metade da peça de dourado.** Em frase curta, 35
  caracteres de realce viram 4 linhas de ouro e o destaque deixa de destacar.
- **A PÁGINA 2 é uma só, pra todas** (pedido do dono, 2026-07-27):
  `conteudo/frases-cta-padrao.json` → `00-PAGINA-2-LINK-NA-BIO-01.png`. Vira o 2º slide
  de qualquer uma das frases, transformando o estático em carrossel de dois.
  ⚠️ **Ela não pode citar assunto nenhum.** "Se esse post fez sentido" fala do slide 1
  sem dizer do que ele trata — uma palavra sobre gestão/mentoria/escritório a prenderia
  a uma das vinte e quebraria as outras dezenove. É o que a torna PADRÃO.
  **Sem botão** (o dono tirou o "Toque no perfil", 2026-07-27): a própria frase é o CTA,
  e um botão desenhado logo abaixo dela repetia a mesma instrução duas vezes.
  Fundo: **Av. Faria Lima** (`imagens/cidade-sp/av-faria-lima-...3x4.jpg`) — a única foto
  de SP com resolução de feed folgada; as outras três são horizontais ou pequenas.
  ⚠️ É foto de DIA CLARO: exige `veu:"forte"` + `zoom` pra empurrar o céu branco pra fora
  do quadro. Texto branco sobre nuvem some, e o console não acusa.
  Se um dia a peça voltar a ter botão: o `.cta.link` de fábrica usa o dourado **vibrante**,
  e a série toda é no **quente** — `.slide.frase .cta.link .pill` já corrige isso no
  template. Dois dourados a 200px um do outro leem como erro de arquivo, não hierarquia.

⚠️ **`foco` numérico + `focox` + `zoom` agora valem na foto de fundo de QUALQUER tipo**
(antes só no herói/lateral/caricato). É o que tira crachá legível e placa de terceiro
de dentro do quadro — indispensável em peça que não pode mostrar marca nenhuma.

## Os três estáticos de TRÁFEGO PAGO
Estes não são "peça com CTA de link" — são **anúncio**. Eles montam o próprio rodapé
(foto, logo, botão, ressalva, nessa ordem), então não herdam a montagem dos outros.
Nascem escuros. Modelo pronto pra copiar: `conteudo/trafego-proximo-nivel.json`.

11. **`heroi`** — retrato-herói. Copia a ESTRUTURA das referências que o dono subiu em
   2026-07-21 (`exemplos/tráfego/WhatsApp Image 2026-07-21 at 16.06.*`: SME/Equity,
   Janguiê/CSE, Paulo Vieira/Revolution, ADV 10X) — **nunca a marca**. O SEGREDO do
   modelo: a foto **sobe pra metade de cima** e vira **preto sólido já abaixo do rosto** —
   sem isso a manchete cai sobre o torso/mão/microfone e fica jogada, ilegível. Três zonas:
   **retrato sangrando** (rosto livre no topo) → **logo na virada** foto→texto → pilha de
   venda TODA no preto de baixo: `eyebrow` (a **qualificação** — "para advogados
   que faturam acima de R$ X", o chip virado régua), `titulo` (manchete GIGANTE em caixa
   alta, o `*realce*` vira o **2º tom dourado** — escrever com `\n` pra empilhar, ex.
   `INSCRIÇÕES\n*ABERTAS*`), `texto` (apoio), `cta.acao` (botão) e `cta.obs` (a data, sai
   com ícone de calendário). Foto: **individual, alegre, do Rafael/Renan/Gabriel**, e
   VERTICAL (o herói é retrato em pé).
   ⚠️ **O enquadramento tem TRÊS controles, e `foco` sozinho não dá conta** (regra do dono,
   2026-07-27: "os três precisam ficar mais em destaque"). `foco` sobe/desce · **`focox`**
   move na horizontal (o rosto raramente está no centro do quadro) · **`zoom`** APROXIMA.
   O `zoom` é o que põe a pessoa em destaque: retrato de palco tirado de longe entra
   pequeno e o rosto vira detalhe. Escala em cima do ponto focal, então aproximar não
   desmancha o que já estava certo. Valem no `heroi` e no `lateral`.
   ⚠️ **Zoom alto EXIGE baixar o `foco` junto.** Aproximar empurra a cabeça pra fora pelo
   topo: `zoom:2.0` com `foco:30` decapitou o Renan; o certo foi `zoom:1.45` com `foco:10`.
   Regra prática: subiu o zoom, **baixe** o foco e confira. Faixa útil: 1.05–1.5 em retrato
   de meio corpo, até ~1.5 em plano aberto. Passar disso serra a testa.
   ⚠️ **`foco:"topo"` é quase sempre a escolha ERRADA aqui.** Ele mostra o topo da FOTO —
   que num retrato de palco é o vão vazio acima da cabeça. Isso empurra o rosto pra baixo,
   direto na virada preta, e **o logo corta a pessoa na boca**. Use o **número** (% de
   `background-position`, igual ao editorial): mais alto sobe a CABEÇA. Valores em uso:
   45 pro Rafael colorido, 62 pro P&B, 72 pro Renan. O certo é gerar, ABRIR e olhar —
   cada foto tem a cabeça numa altura, e o console não acusa rosto cortado.
   ⚠️ **O bloco de baixo é elástico e empurra o logo pra cima.** Título de 4 linhas +
   apoio de 4 linhas fazem o selo subir pra dentro da faixa da foto. Apoio em **1 ou 2
   linhas** e título em **2 linhas** são o teto prático; passando disso, o logo invade o
   rosto por mais que o `foco` esteja certo. O dono também reprovou o excesso de texto
   sobre a foto (2026-07-27) — no herói a escrita é enxuta por regra, não por gosto.
   ⚠️ **Close-up não serve de herói.** Retrato em que a cabeça ocupa mais de ~40% da
   altura da foto não cabe na faixa de cima em enquadramento nenhum: o queixo sempre cai
   embaixo do logo, e `foco` não resolve porque o problema é ESCALA, não posição. Precisa
   de plano médio, com corpo abaixo do queixo. (`imagens/gabriel-sorriso.jpg` é assim —
   foto ótima, formato errado pra este modo.)
   ⚠️ **Foto do Rafael apontando o dedo pra câmera está BARRADA** (`DIA 1/0276`, regra do
   dono 2026-07-27) — a mão desfocada em primeiro plano não fica boa. Difere do
   `anuncio` (faixa fina) e do `caricato` (texto mínimo): aqui a foto é grande E o texto é
   estruturado. Modelo: `conteudo/summit-sp-heroi-inscricoes.json`.

12. **`lateral`** — o herói **deitado**: retrato sangra de UM LADO, coluna de texto do
   outro. Vem das refs ADV 10X e A Nova Advocacia em `exemplos/tráfego/`. Existe por dois
   motivos, e o segundo é o que importa: aceita a foto de meio corpo que o vertical
   rejeita, e **muda o RITMO DA LEITURA**. No vertical tudo é centralizado e gritado; aqui
   é coluna à esquerda, manchete menor, **parágrafo em caixa baixa** e botão em **pílula**.
   Rodar uma campanha inteira só no vertical faz oito anúncios parecerem um só — alternar
   os dois é o que dá variedade sem inventar identidade nova.
   Campos: `foto` + `foco` (numérico, mesma regra do herói), `lado` (`"esquerda"` põe a
   foto à esquerda; o padrão é à direita), `eyebrow`, `titulo` (2 tons, `\n` empilha),
   **`virada`** (a pergunta curta sublinhada — o "E VOCÊ?" da ref; é ela que separa o
   diagnóstico da oferta, e é o único sublinhado do projeto), `texto` (o parágrafo, com
   `*realce*` em branco-negrito) e `cta.acao`/`cta.obs`.
   ⚠️ **A pílula é curta.** A coluna tem 64% da arte: CTA de mais de ~26 caracteres racha
   em duas linhas e vira um bloco. "Ingressos em “SAIBA MAIS”" cabe; a frase inteira não.

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
   ⚠️ **A faixa pede foto HORIZONTAL.** Ela é uma tira larga e baixa: uma vertical entra em
   `cover` e só ~20% da altura dela aparece — com `foco:"topo"` sai o cabelo, no centro sai o
   peito, e o rosto nunca cabe. `foco` esquerda/direita não resolve (o corte é vertical).
   Retrato vertical bom vira faixa ruim; escolher horizontal, ou detalhe com o assunto no meio.
8. **`caricato`** — a imagem é a peça. `imagem` sangra na arte inteira; o texto só
   remata embaixo: `apoio` (o setup, uma linha só) + `titulo` (o remate, com o
   `*realce*` em dourado). O `cta.acao` vira a chamada que imita o "Saiba Mais"
   nativo — `*realce*` nela vira o negrito do botão falso. O selo assina no **alto**.
   A imagem sai de `imagens/`; apontar pro acervo (`fotos/`) também funciona, e aí
   vale a regra de não repetir.
   💡 **`"topo": true` sobe a manchete pro CÉU** — é como a referência "VAI FICAR MAIS
   CARO" realmente é: a parte limpa da foto de cidade é em cima, e é lá que a urgência
   bate primeiro. Nessa variação o véu escurece as DUAS pontas (as duas carregam texto) e
   o **selo desce pro rodapé**, senão disputa o canto com o título. O campo **`remate`**
   só existe aqui: é a linha de venda que fica acima do "Saiba Mais" — nem apoio (que é
   setup) nem manchete. ⚠️ Rodapé claro joga o remate em cima do asfalto da foto e ninguém
   lê; foi o defeito da primeira versão.
   💡 **É este o modelo da "VAI FICAR MAIS CARO"** — cidade sangrando, manchete embaixo,
   selo no alto. É a peça de tráfego **sem os sócios**, e o dono pediu mais dela em
   2026-07-27. `foco`/`focox`/`zoom` valem aqui: o acervo de cidade é curto (só 3 fotos
   de SP têm resolução de feed), e o mesmo panorama recortado em dois pontos diferentes
   rende duas peças que não parecem a mesma. Sem isso toda cidade sai no corte central. Imagem caricata é montagem/geração: vem pronta do
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

   ⚠️ **O lote costuma chegar em PRANCHA** — um PNG por área com 2 a 4 pessoas já sem fundo,
   espalhadas na mesma tela. `node motor/separar.js "<prancha.png>" "<prefixo>"` quebra por
   componente de transparência e salva uma pessoa por arquivo em `palestrantes/recorte/`.
   O `aparar.js` NÃO resolve isso (ele mede a caixa de tudo que não é transparente e
   devolveria os quatro num arquivo só). Depois de separar, **perguntar ao dono quem é quem**
   antes de nomear os arquivos: o nome vai no peito da pessoa, e trocar é o erro mais caro
   da peça. O line-up por público leva o **Rafael Mendes no centro** da fileira.

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

   ⚠️ **`"alinhar": "rosto"` é o que faz a fileira virar COLAGEM** (regra do dono, 2026-07-28:
   "arte mais harmônica, colagem condizente, sem espaçamento desnecessário"). Sem ele o motor
   escala cada um pela altura do ARQUIVO, e como um recorte é busto fechado e o vizinho é meio
   corpo, as cabeças saem de tamanhos diferentes, em alturas diferentes, com o nome fora do
   queixo do dono. Com ele, o motor lê `palestrantes/rostos.json` (cx, topo da cabeça e queixo,
   em fração do PNG) e dá a todos a MESMA cabeça, com os queixos na MESMA linha, rostos
   igualmente espaçados e o nome centrado no rosto. Medir com `node motor/rostos.js` (chuta e
   desenha a caixa em `saida/_ROSTOS.png`) e **conferir**: a leitura automática erra em mão no
   queixo, cabelo solto e barba cheia. Quando errar, medir na grade (`node motor/rostos-grade.js
   "<nome>"` → `saida/_GRADE.png`) e escrever o número à mão no JSON. Sem a medida, o motor para
   e diz de quem falta. **`"zoom"`** (no slide) aumenta o grupo inteiro sem mexer no
   espaçamento, **`"margem"`** (px, padrão 120) fecha a fileira em direção ao CENTRO quando as
   pontas estão sangrando na borda — as duas andam juntas, porque margem maior encolhe o passo
   e o grupo junto — e **`"destaque"`** (por pessoa) sobe UMA acima das outras sem desligar o
   alinhamento: é assim que o **Rafael Mendes fica maior e à frente no centro** (1.16 + `z` alto)
   sem sair da linha de queixo. Valores em uso: 5 pessoas `margem:165, zoom:0.92`; 4 pessoas
   `margem:180, zoom:0.95`; 3 pessoas `margem:200, zoom:1.15`.
   ⚠️ A âncora vertical é o TOPO da faixa, não a base: presa ao chão, toda vez que o grupo
   encolhe as cabeças descem e abre um vão morto entre o lockup e as pessoas.

   ⚠️ **Corte de CABEÇA no topo era bug do motor, não da foto** (regra do dono, 2026-07-28:
   "o recorte ainda está cortando a cabeça"). A linha do queixo era um CHUTE (95% da faixa
   menos a cabeça da pessoa mediana), e cada recorte tem uma proporção diferente de cabelo
   acima do rosto medido — quem tinha mais estourava o topo do palco e o `overflow:hidden`
   cortava sem avisar. Corrigido: a linha do queixo agora nasce do PIOR CASO real (a maior
   distância entre queixo e topo do PNG, calculada pessoa por pessoa, já na escala final
   dela) — por construção ninguém corta mais em cima. Se algum dia o console avisar "grupo
   alto demais pro palco mesmo no piso da conta", é hora de baixar `zoom` ou subir `aperto`.

   ⚠️ **Ninguém sai NÍTIDO por acidente.** Duas coisas embaçam o rosto e nenhuma aparece no
   console: (1) o motor **não desfoca mais quem está atrás** — o `blur` da perspectiva
   atmosférica foi removido em 2026-07-28 ("tem muita foto embaçada na arte final"), a
   profundidade ficou só na luz; (2) em 2× a pessoa ocupa o DOBRO de pixels, então recorte
   pequeno sai esticado. O motor agora avisa, por nome, quando o PNG não tem resolução pro
   tamanho pedido — **ler o console**. O que o motor não faz é inventar pixel do NADA, mas pode
   PUXAR nitidez de recorte que chegou mole: `node motor/nitidez.js "<recorte>.png" [quantidade
   0–2, padrão 0.7] [raio px, padrão 2]` aplica unsharp mask e sobrescreve o arquivo em
   `palestrantes/recorte/` (artefato derivado — a prancha original nunca muda; `separar.js`
   de novo recorta limpo se precisar desfazer). Rodar quando o olho já vê a diferença — foi
   o caso da Anaísa Banhara, do Guilherme Lage, do Renato Barufi e do Gabriel Anício no
   lote de 2026-07-28 (o dono cobrou de novo: "algumas fotos estão embaçadas, não quero
   que fiquem embaçadas" — o pente-fino tem que ser em TODO o grupo, não só no pior caso).
   Rosto de perto (retrato) aguenta raio pequeno (1px) com quantidade alta (1.2–1.4) sem
   parecer artificial; rosto menor no quadro (palco, corpo inteiro) pede raio maior (2px).
   ⚠️ **`raio` TEM que ser inteiro.** Fracionário (1.6) indexa pixel fracionário no array,
   vira `NaN` e a imagem sai **preta inteira**, sem erro no console — foi o que aconteceu
   com o Renato e o Gabriel na primeira tentativa. O script agora arredonda sozinho; se um
   PNG preto aparecer em `recorte/`, é essa a causa — refazer com `separar.js` a partir da
   prancha original.

   ⚠️ **O que não pode passar da borda é o ROSTO** — ombro pode, e deve. O motor encolhe o
   grupo sozinho até o rosto de todos caber (`"conter": false` desliga), e a redução entra na
   ALTURA DA FAIXA, não só nas pessoas: encolher só o grupo deixaria a faixa do mesmo tamanho
   e abriria vão entre os corpos e o bloco de venda. Exigir o CORPO inteiro dentro da arte é
   o erro oposto — encolhe tudo por causa de um braço aberto na ponta.

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

## O carrossel EDITORIAL (`editorial`) — o terceiro registro
Nem marca nem print: **revista**. Modelo e anatomia em `exemplos/Carrossel/`.
Paleta própria (`--ed-*` em `tokens.css`), sem selo e sem logo em slide nenhum —
**quem assina é a barra do topo**, que repete nos 7/10 slides: `"barra": { "esquerda",
"direita" }` no topo do arquivo, e o **centro sai do `perfil`** (nunca digitado à mão).

- `"capa": true` — único slide em caixa alta condensada (Barlow), foto sangrando +
  crachá do @. O resto é sentence case: é o contraste capa gritada × corpo calmo que
  faz parecer reportagem. Inverter isso mata o modelo.
- `"tema"`: `claro` · `escuro` · **`accent`** (o chapado). O accent é o quebra-ritmo —
  **um por carrossel**, no pico da tese, nunca dois.
- **O acento é do PERFIL, não do tipo** (regra do dono, 2026-07-16): João e RM Advogados
  são **vermelhos**, RM Summit é **dourado**, Rafael Mendes é **azul** (hex ainda não
  passado — o motor para e pede, como faz com o handle). Sai de `cor`/`cor_escuro` em
  `marca/perfis.json`; o `--ed-accent` dos tokens é só o valor de fábrica. Cor fixa no
  token pintava toda peça de vermelho, assinasse quem assinasse — o mesmo erro de
  carimbar a marca errada, só que em cor.
- O acento **troca com o fundo**: `cor` no claro, `cor_escuro` no escuro, preto no
  accent. Cor escura em fundo preto morre de contraste — por isso o vermelho vira
  amarelo-creme lá. O dourado lê bem no preto e por isso o RM Summit não troca.
- **A tinta do slide chapado o motor calcula** (luminância WCAG): fundo claro pede texto
  preto, escuro pede branco. Não se declara em `perfis.json` — declarar à mão daria um
  slide ilegível no dia em que alguém trocasse a cor e esquecesse do texto.
- Andares do slide: `titulo` → régua → `imagem` → `texto` → `label` → `lista` → `remate`
  → `cta`. O **fecho gravita pro rodapé**: o vão fica no MEIO, não no pé.
- `label` é **sublinhado, nunca negrito** — sublinhado marca o rótulo, negrito marca a
  frase. `lista` + `marca_item`: `seta` (o padrão) · `x` (o que morreu) · `numero`.
- `cta` vira **botão-pílula outline** (é orgânico: comentar, não "link na bio").
- Só a capa sangra; nos internos a `imagem` é uma **caixa** no meio do texto. O padrão é
  `cover` (recorta), mas `"encaixe": "contain"` cabe a imagem INTEIRA — grade de logo,
  print e tabela têm que ser lidas, e o recorte come as fileiras da borda.
  ⚠️ A imagem interna **sangra nas laterais** e tem 520px. A caixa arredondada com margem
  dos dois lados lia como figurinha colada por cima da arte — o modelo não tem esse
  retângulo, e o dono reprovou (2026-07-20).
  ⚠️ A faixa é LARGA e o acervo é quase todo retrato VERTICAL: em `cover` o corte pega o
  meio e sai o peito, nunca o rosto. **`"foco"` em toda foto de gente** — `topo`/`baixo`/
  `esquerda`/`direita`, ou um **número** (a % de object-position: `"foco": 34`) quando o
  atalho não acerta. ⚠️ Número MENOR mostra o TOPO da foto — e é aí que o queixo some.
  Rosto cortado embaixo pede número MAIOR, não menor; `topo` (22) é o ponto de partida. Sem ele a peça sai decapitada, e isso o console não acusa.

⚠️ O modelo é peça do **@brandsdecoded_**. Copiar a estrutura, nunca a marca: a barra
não repete "Powered by Content Machine" nem o @ deles.

### A capa também é ESTÁTICO — sem modo novo
Um `editorial` com **um slide só** e `"capa": true` é a manchete avulsa: foto sangrando,
crachá do @ e headline gritada. O motor não liga pra quantidade de slides. Modelo pronto:
`conteudo/modelo-manchete.json`. Serve a qualquer perfil — o crachá sai de `perfis.json`.
- ⚠️ **A copy tem que ser CURTA e quebrada à mão** com `\n`: a régua cobra ~17 caracteres
  por linha a 132px. Linha longa não estoura a margem — ela **racha**, e a quebra que você
  escreveu vira uma linha a mais. Título de 3 linhas curtas é o formato.
- ⚠️ **Crachá com logo por extenso vira borrão**: ele é um disco de 56px, feito pra foto
  de rosto. Perfil cujo avatar é lockup (`rm-summit-sp.png`) fica ilegível ali — é fiel ao
  que o Instagram mostra, mas se a marca precisa ser LIDA, use um estático com selo.

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

## A terceira fonte de imagem: o Gemini (2026-07-16) — e ela é a ÚLTIMA
`node motor/imagem.js "<prompt>" <carrossel>/<nome.png> [proporcao]` gera no Gemini e
salva na pasta do carrossel, em 4:5, com o prompt registrado em `_geradas.md` ao lado
(procedência não se deriva de lugar nenhum — sem o registro, ninguém sabe depois o que
é gerado). Chave em `marketing-instagram/.env`, barrada pelo `.gitignore`.

⚠️ **Gerar imagem NÃO é grátis.** Todo modelo de imagem devolve `limit: 0` na camada
gratuita — exige faturamento ativo no projeto da chave. Cada imagem é centavos, mas é
dinheiro: não gerar em rajada "pra ver no que dá".

**O modelo é escolha do dono** — custam bem diferente, e é a conta dele. `flash` (padrão,
barato) · `pro` (o melhor, caro) · `lite` (rascunho). Passa como apelido na linha
(`... taca.png pro`, em qualquer ordem com a proporção) ou fixa `GEMINI_MODELO=` no `.env`
— fixou, respeita e não pergunta. Cardápio: `node motor/imagem.js modelos`, que confere os
apelidos contra o que a chave enxerga hoje (o Google renomeia modelo o tempo todo).
Os `imagen-*` também estão lá, mas **nenhum faz 4:5** — o formato do slide.

**Existindo foto de verdade, ela ganha.** O acervo é o que ACONTECEU, e é isso que a
peça vende. O Gemini serve pra imagem ilustrativa e assumida: o fato histórico, a
metáfora, o objeto — a cena que ninguém pode fotografar.

⚠️ **Não se gera: rosto de pessoa real** (Rafael, aluno, palestrante — pessoa real tem
foto real), **o evento** (plateia, palco, salão: sai de `fotos/`), **print, número,
depoimento ou "resultado de aluno"**. Prova social gerada é prova social falsa, e é o
jeito mais rápido de perder a conta. A regra inteira mora no rodapé de `motor/imagem.js`.

⚠️ **Abrir e OLHAR** — mão, dedo e texto dentro da imagem saem errados, e o console não
acusa nada. É a mesma disciplina do acervo e do deck.

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

Sai em `imagens/` (o acervo não se mexe) e a peça aponta pro nome do recorte — o campo
`foto` procura em `fotos/` **e depois em `imagens/`**, justamente pra achar o recorte.
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

✅ **A marca de BH está LIBERADA** (regra do dono, 2026-07-20). O acervo todo é da
edição de **BELO HORIZONTE** e metade das fotos tem o cordão "RM SUMMIT · BELO
HORIZONTE" legível no peito ou a cidade no telão. **Isso não barra mais nada**: o
RM Summit é o mesmo produto nas duas cidades, e o dono não vê problema em a marca
de BH aparecer em peça de São Paulo. As colunas `cordao_bh` / `serve_sp` continuam
sendo preenchidas — elas dizem o que está visível na foto — mas viraram **aviso, não
filtro**, e `acervo.js escolher` só marca "⚠ BH visível" ao lado. Barrar por elas
deixava 3/4 do catálogo parado na prateleira e empurrava toda peça de venda pras
mesmas três fotos.

A medida do `_triagem.csv` diz se o texto vai ser legível. Ela **não** diz se a imagem
é boa, nem onde está o rosto, nem se tem crachá da cidade errada. **Sempre abrir e OLHAR.**

## A palavra-chave em outra cor
Envolva em `*asteriscos*` o trecho que deve saltar dentro da frase:
`"O Summit foi um *divisor de águas* na minha vida."` Vale em `titulo`, `citacao`
e `texto`. Uma frase, duas cores — é o que dá o impacto de 1 segundo. Não abusar:
um destaque por peça.

O mesmo `*asterisco*` rende diferente por tipo — mesma escrita, cada peça no seu
registro. **Conferir o modelo em `exemplos/` antes de mexer:**

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
Duas pastas de modelo de estático em imagem:
- **`exemplos/referencia/`** — o acervo geral de modelos da casa. Os prints estão na
  paleta **verde** (capturados do Summit "Crise é o Cacete", Capital Upgrade): copiar
  deles o FORMATO, nunca a cor nem o logo.
- **`exemplos/tráfego/`** — os **criativos de anúncio**, curados pelo dono.

⚠️ **Peça de TRÁFEGO PAGO se pauta APENAS nos modelos de `exemplos/tráfego/`**
(regra do dono, 2026-07-27). É cardápio fechado, não galeria de inspiração: se vai
rodar como anúncio, o layout sai de um dos arquivos de lá — não de `referencia/`, não
de invenção nova, não de mistura de dois. **Abrir e olhar a pasta antes de escrever o
JSON**; ela muda quando o dono sobe arquivo, e só ele põe arquivo lá.

Ver `exemplos/LEIA-ME.md`.

Falta um modelo virar modo do motor: **institucional** (patrocinador confirmado,
moldura de crachá).

## Formatos
- Feed retrato: 1080×1350 é a RÉGUA do layout (fonte, margem e enquadramento são pensados
  nesses pixels), mas a peça **sai em 2×: 2160×2700** (regra do dono, 2026-07-28). O que
  dobra é a densidade do print (`deviceScaleFactor`), não o viewport: mexer no viewport
  mudaria o desenho, e seria outra peça. `"hd": 3` no topo do JSON sobe pra 3×; `"hd": 1`
  volta ao tamanho antigo. O Instagram reamostra tudo que sobe — partir do dobro de
  informação é o que impede o texto e a borda do recorte de esfarelar na compressão.
- Estático: 1 peça · Carrossel: 2 a 12 slides

## Como trabalhar aqui
- Pra gerar peça repetitiva: editar um arquivo em `conteudo/`, rodar
  `node motor/gerar.js conteudo/<arquivo>.json` — as imagens saem em `saida/`.
- **`arquivo_saida` aceita subpasta** e o motor a cria: `"arquivo_saida": "tráfego pago/01-adaptacao"`
  sai em `saida/tráfego pago/`. Campanha vai pra subpasta — `saida/` na raiz vira um monte
  em duas semanas. A campanha de tráfego do Summit SP mora em **`saida/tráfego pago/`**.
- CTA é regra, não gosto: tráfego pago → CTA de link; orgânico → seguir/
  curtir/comentar/compartilhar conforme o campo `cta` do conteúdo.
- Imagem: acervo e `imagens/` primeiro; Gemini só pro que não se fotografa (ver acima).

## Disciplina deste arquivo
Manter abaixo de ~200 linhas. Não despejar tudo aqui — arquivo longo faz
o Claude obedecer PIOR. Regra estável e curta fica aqui; exemplo vai pra
`exemplos/`; detalhe de estilo vai pros tokens. Curar, não acumular.
