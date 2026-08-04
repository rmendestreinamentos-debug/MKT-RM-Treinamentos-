# `imagens/` — as imagens que VOCÊ escolhe pro carrossel

**Despeje aqui.** É esta a pasta pra jogar a imagem que você quer dentro de um
slide: pintura, print, meme, render, foto de banco, o que for. Sem organizar, sem
renomear, sem catalogar. Jogou aqui, o motor acha.

No JSON basta o nome do arquivo:

```json
{ "tipo": "thread", "texto": "...", "imagem": "calipso.jpg" }
```

## Uma pasta por carrossel (o jeito recomendado)
Crie a pasta com o nome do carrossel e despeje as imagens dele lá:

```
imagens/
  copa-do-mundo/       ← o carrossel da Copa
    taca.jpg
    torcida.jpg
  odisseia/            ← outro carrossel
    calipso.jpg
```

Aí a peça declara a pasta **uma vez**, no topo, e cada slide cita só o arquivo:

```json
{
  "perfil": "rm-summit",
  "pasta": "copa-do-mundo",
  "slides": [
    { "tipo": "thread", "texto": "...", "imagem": "taca.jpg" },
    { "tipo": "thread", "texto": "...", "imagem": "torcida.jpg" }
  ]
}
```

Se o nome da pasta estiver errado, o motor **para e avisa** — senão o carrossel
sairia inteiro sem imagem e você só descobriria olhando os PNGs.

Imagem solta na raiz de `imagens/` continua funcionando: o motor procura primeiro
na pasta da peça, depois na raiz.

## Imagem gerada no Gemini cai aqui também
Quando não existe foto da cena (um fato histórico, uma metáfora, um objeto), dá pra
gerar — e o arquivo cai nesta mesma pasta, pronto pro slide:

```
node motor/imagem.js "sala de tribunal vazia ao amanhecer" copa-do-mundo/tribunal.png
node motor/imagem.js "..." copa-do-mundo/taca.png pro       ← modelo melhor, mais caro
```

**Você escolhe o modelo.** `flash` é o padrão (rápido e barato), `pro` é o melhor e o
mais caro, `lite` é pra rascunho. Passe o apelido no fim da linha, ou fixe de vez com
`GEMINI_MODELO=pro` no `.env`. O cardápio com a serventia de cada um:
`node motor/imagem.js modelos`.

Sai em 4:5 (o formato do slide) e o prompt fica anotado em `<pasta>/_geradas.md`, pra
daqui a um mês você saber qual imagem é gerada e com que texto. A chave da API mora em
`marketing-instagram/.env` — pega em https://aistudio.google.com/apikey.

⚠️ **Isso custa dinheiro.** Gerar imagem não entra na camada gratuita do Gemini: o
projeto da chave precisa de faturamento ativo. É centavos por imagem, mas é cobrado.

**Foto de verdade sempre ganha.** Gerado é a última fonte, não a primeira: o acervo é o
que aconteceu, e é isso que a peça vende. E não se gera rosto de pessoa real, plateia,
palco, print nem resultado de aluno — prova social gerada é prova social falsa.

## Não confundir com `fotos/`
São duas pastas com papéis diferentes:

| Pasta | O que é |
|---|---|
| `imagens/` | **Você escolhe.** Imagem avulsa pra um slide específico. Sem triagem, sem catálogo, pode repetir. |
| `fotos/` | O **acervo do evento** (~1.600 fotos de BH). Tem triagem, catálogo e regra de não repetir. É de onde sai a foto de fundo dos estáticos. |

O motor procura primeiro em `imagens/`, depois em `fotos/`. Então uma imagem sua
aqui sempre ganha — e você continua podendo apontar pro acervo se quiser.

## Uma ou duas por slide
No modelo do X, o normal é **uma imagem** por slide (e muitos slides não têm
nenhuma — os de tese e o remate são só texto, de propósito). Se quiser duas lado
a lado, passe uma lista:

```json
{ "tipo": "thread", "texto": "...", "imagem": ["antes.jpg", "depois.jpg"] }
```

## O CRIVO: a imagem responde ao texto, e o corte não pode comer a resposta
Regra do dono, 2026-08-03, depois de um carrossel em que "muita foto ficou sem sentido".
Escolher e enquadrar imagem não é gosto: é uma pergunta com resposta certa e errada,
feita **slide por slide**, contra a frase daquele slide. São três perguntas, nesta ordem.

### Antes das três: DESCARTAR é a resposta mais frequente
Regra do dono, 2026-08-03: *"quando a imagem não for boa para utilizar, não utilize,
apenas a descarte. Não force algo, quero que tenha senso crítico."*

A pasta que ele monta é **material bruto, não uma lista de tarefas**. Ele junta o que
achou sobre o assunto; separar o que serve é o meu trabalho, e é a parte do trabalho que
tem valor. Usar tudo é o caminho preguiçoso disfarçado de zeloso: obriga a inventar
justificativa pra foto que não responde a nada, e uma peça inteira perde credibilidade por
causa de uma imagem forçada. **Nenhuma imagem é melhor que uma imagem errada** — slide sem
imagem é layout previsto no modelo, e o carrossel de referência tem vários.

Os três motivos de descarte que mais aparecem, todos vistos na peça de `escravidao/`:
- **redundante** — quatro fotos do mesmo fato histórico quando o carrossel tem um slide
  sobre ele. Entra a melhor; as outras três não viram slide, viram repetição.
- **fora de época** — foto histórica num slide que narra o caso de hoje. O leitor lê como
  se a cena fosse do caso, e ninguém escreveu que não é.
- **procedência ou assunto incertos** — foto que pode não ser do país/contexto que a frase
  afirma, ou que traz um tema a mais (trabalho infantil onde a copy fala de adulto). Em
  peça de denúncia isso é o que derruba o post nos comentários.

Descarte não se esconde: anotar quais ficaram de fora e por quê, como em
`escravidao/LEIA-ME.md`. O dono precisa saber que a foto dele foi vista e recusada, não
esquecida.

**1. Qual é o SUJEITO da frase?** Não o assunto do carrossel: o sujeito daquele slide.
"Dormiam em um galpão" tem por sujeito o alojamento, não a fazenda; "parte das
ferramentas era comprada pelos trabalhadores" tem por sujeito a ferramenta, não a
jornada. A imagem tem que mostrar ESSE sujeito.

**2. A imagem introduz assunto que o texto não tem?** É o defeito mais comum e o mais
invisível, porque a foto sozinha é boa. Foto histórica em slide que narra um caso de
hoje faz o leitor achar que a cena é do caso. Criança em slide que não fala de trabalho
infantil abre uma pauta que a copy não sustenta. Quando a foto certa não existe, o slide
vai **sem imagem**: o card centrado no fundo é layout previsto no modelo, e é melhor que
uma imagem que desvia.

**3. A imagem PREENCHE o bloco?** Esta é a que custou três reprovações, e é a mais
importante das três. **No X a imagem anexada preenche o bloco e tem canto arredondado.**
É assim em todo frame de `../exemplos/thread-x/`, e é o desenho da plataforma: não se
mexe. Há duas maneiras de errar, e o dono já reprovou as duas:
- **a FATIA** — deixar o motor esticar pela largura e cortar a altura. Como o bloco tem a
  altura que sobra do texto, cada slide corta num lugar e sai um pedaço de telhado, um vão
  de porta. "Apenas um recorte esquisito."
- **a MOLDURA** — fazer a imagem caber inteira dentro do bloco. Ela sobra dentro da caixa,
  o fundo em volta vira um retângulo, e o resultado é a foto do dono "enfiada dentro de
  uma montagem".

O que se ajusta não é o layout: é **o arquivo**. Recortar cada imagem na proporção EXATA
do bloco dela faz as duas falhas sumirem de uma vez, porque não sobra nada pra cortar nem
pra encaixar. O bloco muda de proporção a cada slide, então a proporção se **mede**:

```
node motor/gerar.js conteudo/<peça>.json      1. gera uma vez, com a imagem que existe
node motor/faixa.js saida/<pasta>             2. mede o bloco de cada slide
node motor/recortar.js "<pasta>/<arq>" <x> <y> <larg> <alt> "<pasta>/s07-<nome>.jpg"
node motor/gerar.js conteudo/<peça>.json      4. gera de novo, agora exato
```

No passo 3 é que o crivo trabalha: dentro da proporção que a faixa pede, escolher a região
que responde à frase. Nomear o recorte com o número do slide (`s07-quarto.jpg`) deixa
explícito que ele **serve àquele slide e a mais nenhum** — a mesma foto num slide de texto
mais curto precisaria de outro recorte.

⚠️ **Marca de veículo se APAGA quando a imagem só serve inteira.** Foto de reportagem chega
com o logo carimbado, e às vezes recortar pra fora dele jogaria fora o que a frase pede:
`node motor/apagar-marca.js "<pasta>/<arq>" <x> <y> <larg> <alt> [desloc] ["<saida>"]`
copia a textura vizinha por cima (clone lateral, pra viga e junta continuarem alinhadas).
Vale pra tirar a marca de quem publicou; **não** vale pra mudar o que a foto mostra.

O `recortar.js` lê jpg, png, **webp e avif**, porque o material bruto chega em tudo que a
web serve. O `foco` continua existindo pro caso de a imagem já ter proporção próxima da
faixa e faltar só dirigir um corte pequeno; num par, ele aceita **lista**
(`["topo","baixo"]`), já que cada metade tem o assunto numa altura.

⚠️ **`"encaixe": "contain"` é a exceção, não a saída fácil.** Ele cabe a imagem inteira e
aceita a moldura em volta — só vale pro print ou lockup que precisa ser LIDO por inteiro,
onde perder uma linha na borda seria pior que a moldura.

⚠️ **Num PAR cada foto ocupa metade da largura**, então a proporção que ela precisa é
outra: o `faixa.js` já imprime a conta das duas na mesma linha. Duas fotos lado a lado
também quase nunca têm o assunto na mesma altura, e aí o `foco` aceita lista.

⚠️ **Par não é enfeite: é a copy que o pede.** Duas imagens só quando a frase tem dois
sujeitos ("corrente, senzala" e "condição degradante"). Fora disso, uma imagem preenchendo
o bloco inteiro vale mais que duas pela metade.

⚠️ **Foto VERTICAL nunca serve direto**, porque o bloco é sempre mais largo que alto.
Tirar dela a horizontal que responde à frase é obrigatório, não opcional — foi o que os
três painéis do caso em `escravidao/` exigiram, um por um.

⚠️ **A conferência é com o OLHO, nos treze de uma vez.** Enquadramento errado não dá erro
no console e não aparece em miniatura quadrada, que corta justamente a faixa da imagem.

Registro de um julgamento inteiro, imagem por imagem: `escravidao/LEIA-ME.md`.

⚠️ Esta pasta **não vai pro git** (imagem pesada não se versiona). Ela mora só na
sua máquina — este LEIA-ME é a única exceção.
