# Esteira de conteúdo — Instagram

Gera peças (estáticos e carrosséis) no padrão da marca, a partir de texto.
O repetitivo é código: edita o conteúdo, roda, saem os PNGs. Sem IA no meio.

## Instalar (uma vez)
    npm install
    npx playwright install chromium

## Gerar uma peça
    node motor/gerar.js conteudo/exemplo.json
    # imagens 1080x1350 saem em saida/

## Estrutura
- `CLAUDE.md`   instruções que o Claude Code lê a cada sessão (marca, regras, 3 tipos)
- `marca/`      tokens da identidade visual (cores, fontes, logo)
- `motor/`      o molde (template.html) + o gerador (gerar.js)
- `conteudo/`   os arquivos de texto que você edita por peça
- `exemplos/`   criativos de referência rotulados (modo interpretativo)
- `saida/`      onde os PNGs prontos aparecem

## Nome e logo por peça
O nome do produto vem do próprio conteúdo, não do código. No JSON da peça:
`"marca": "RM Summit"` (default "Rafael Mendes Advogados") e, opcionalmente,
`"logo": "rm-summit.png"` apontando um arquivo em `marca/`. Sem logo declarado,
o motor usa `marca/logo.png` (logo da casa) e, na falta dele, a inicial do nome.
Solta os logos em `marca/` (ver `marca/LEIA-ME.md`).

## Preencher antes de usar de verdade
1. `marca/tokens.css` — suas cores e fontes reais
2. `CLAUDE.md` — seus três tipos de conteúdo e o tom de voz
3. Logos reais dentro de `marca/` (`logo.png` da casa + os por produto)
