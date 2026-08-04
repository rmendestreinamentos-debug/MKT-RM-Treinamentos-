# Fontes que o motor EMBUTE na peça

Fonte que não está no Google Fonts nem instalada no Windows mora aqui, em arquivo.
O motor lê a pasta e embute o arquivo dentro do HTML antes do print (`fontesChirp()`
em `motor/gerar.js`) — `setContent` do Playwright não carrega caminho relativo, então
declarar a fonte no CSS e apontar pro disco não funcionaria.

## Chirp — a fonte do X (carrossel `thread`)

O carrossel nativo é escrito em **Chirp**, a fonte do próprio X (regra do dono,
2026-07-30). Ela sai de `--nativo` em `marca/tokens.css`.

⚠️ **Chirp é proprietária.** É um corte exclusivo que o X licenciou da Grilli Type
(parente da GT America) e **não** se baixa do Google Fonts nem acompanha o Windows.
Quem tem o arquivo precisa tê-lo por licença própria. O repositório não carrega a
fonte: os `.woff2` estão no `.gitignore`, como todo material bruto do projeto.

O dono subiu o kit em 2026-07-30. É o que está aqui:

```
Chirp-Regular.woff2   400   ← o corpo do tweet
Chirp-Medium.woff2    500
Chirp-Bold.woff2      700   ← o nome no cabeçalho e o título da capa
Chirp-Heavy.woff2     900
```

Qualquer arquivo que **comece com `chirp`** é aceito, em `.woff2`, `.woff`, `.ttf` ou
`.otf`. O peso sai do resto do nome (`Regular`/`Book` → 400, `Medium` → 500, `Bold` →
700, `Black`/`Heavy` → 900; `Italic` no nome vira estilo itálico). Regular e Bold são o
mínimo: sem o Bold, o navegador engrossa a Regular na força e o nome do perfil sai com
um negrito falso, mais gordo e mais largo que o do X.

⚠️ **Kit de webfont traz o mesmo peso em três formatos** (`.eot`, `.ttf`, `.woff2` — é o
que o `stylesheet.css` que veio na pasta declara em cascata, para o IE antigo). O motor
escolhe **um arquivo por peso**, na ordem `woff2 → woff → ttf → otf`, e **ignora `.eot`**:
o Chromium não lê esse formato, e embutir os três em base64 seria cerca de 1 MB de HTML
por slide sem nenhum ganho. O `stylesheet.css` também não é lido por nada — ele registra
a fonte como `"Twitter Chirp"` e por caminho relativo, que `setContent` não resolve. Pode
ficar aí como referência do pacote.

## Sem o arquivo, a peça sai e o motor avisa

O fallback é a cadeia antiga (Roboto → Segoe UI → Helvetica), que é o que a peça usava
antes e passa por print de celular Android. O que o motor **não** faz é ficar calado:
ele imprime `aviso: Chirp não encontrada em marca/fontes/` a cada geração de carrossel
nativo. Fonte errada é a coisa que ninguém percebe olhando o PNG e todo mundo percebe
comparando com um print de verdade — por isso o aviso, e por isso ler o console.
