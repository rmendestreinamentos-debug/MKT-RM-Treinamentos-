# Esteira de conteúdo — Instagram

Gera peças (estáticos e carrosséis) no padrão da marca, a partir de texto.
O repetitivo é código: edita o conteúdo, roda, saem os PNGs. Sem IA no meio.

## Instalar (uma vez)
    npm install
    npx playwright install chromium

## Gerar uma peça
    node motor/gerar.js conteudo/exemplo.json
    # imagens 1080x1350 saem em saida/

## Triar o banco de fotos
    node motor/fotos.js
    # mede resolução e luminância do miolo; diz quais servem de fundo e com que véu

## Os tipos
**Estáticos** (identidade da casa, dourado/preto, com logo):
`contagem` · `depoimento` · `provocacao` · `urgencia`

**Carrosséis** (peças nativas — sem logo e sem dourado, de propósito):
`thread` (print de thread do X) · `legenda` (foto com caixa de legenda)

Cada um tem um molde pronto em `conteudo/modelo-*.json` — copie e edite.
Detalhes e regras no `CLAUDE.md`.

Pra destacar um trecho dentro da frase, use `*asteriscos*`:
`"O Summit foi um *divisor de águas* na minha vida."` Sai dourado nos estáticos
e como marca-texto vermelho na thread.

## Estrutura
- `CLAUDE.md`   instruções que o Claude Code lê a cada sessão (marca, regras, tipos)
- `marca/`      tokens da identidade visual (cores, fontes) + logos por produto
- `motor/`      o molde (template.html) + o gerador (gerar.js)
- `conteudo/`   os arquivos de texto que você edita por peça
- `fotos/`      banco de fotos usado nos depoimentos
- `exemplos/`   criativos de referência rotulados (modo interpretativo)
- `saida/`      onde os PNGs prontos aparecem

## Nome e logo por peça
O nome do produto vem do próprio conteúdo, não do código — e **não tem default**:
cada peça declara `"marca": "RM Summit"` e, opcionalmente, `"logo": "rm-summit-sp.png"`
apontando um arquivo em `marca/`. Sem logo declarado, o selo usa a inicial do nome.
Os produtos são marcas próprias: o logo da casa (`rafael-mendes.png`) só entra quando
a peça pedir. Mapa produto→arquivo em `marca/LOGOS.md`.

## Preencher antes de usar de verdade
1. ~~`marca/tokens.css` — suas cores e fontes reais~~ ✔
2. ~~`CLAUDE.md` — os tipos de conteúdo~~ ✔ (conferir o tom de voz)
3. ~~Logos reais dentro de `marca/`~~ ✔ (ver `marca/LOGOS.md`)
4. Fotos reais em `fotos/` — hoje só tem o LEIA-ME
