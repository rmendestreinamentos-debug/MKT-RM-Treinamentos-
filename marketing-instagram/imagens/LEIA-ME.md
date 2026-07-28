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

⚠️ Esta pasta **não vai pro git** (imagem pesada não se versiona). Ela mora só na
sua máquina — este LEIA-ME é a única exceção.
