# Montar o projeto numa máquina nova

O GitHub guarda o **código e o projeto** — os dois motores, os JSONs de conteúdo, os
modelos e os assets curados da marca. Mas, de propósito, **três coisas ficam de fora do
Git**: o acervo de fotos (grande demais), a chave de API (segredo) e o ambiente
(fontes + dependências). Sem elas o repositório abre, mas o motor não gera as peças.

Este é o checklist pra sair do zero numa máquina nova.

## 1. Clonar
```
git clone https://github.com/rmendestreinamentos-debug/MKT-RM-Treinamentos-.git
```

## 2. Trazer o que o Git NÃO carrega (à mão: HD, pen drive ou nuvem)

| O quê | Caminho | Por que está fora |
|---|---|---|
| **Acervo de fotos (~5,8 GB)** | `marketing-instagram/fotos/` | Grande demais pro Git |
| **Imagens avulsas** | `marketing-instagram/imagens/` | Idem — despejo do dono pro carrossel |
| **Material bruto (~240 MB)** | `_bruto/` | Fonte enviada pelo dono: prints, PSD, ZIPs, logos editáveis. Nenhum motor lê daqui |
| **Chave de API** | `_bruto/API KEY/.env` | Segredo — nunca versionar |

> ⚠️ Sem o acervo, o motor dá **"imagem não encontrada"** em qualquer peça que use
> foto do acervo — incluindo os decks. Copie a pasta inteira, preservando a estrutura.

## 3. Instalar o ambiente
- **Node.js** — o motor roda nele. (Nesta máquina o executável está em
  `C:\Program Files\nodejs\node.exe` e **não** está no PATH; noutra máquina pode estar.)
- **Git** — pra versionar.
- **Fontes do deck**: **Montserrat** (Light, ExtraBold, Black) e **Rubik One**.
  Não são nativas do Windows. Se faltarem, o PowerPoint substitui e **o layout do deck
  dança** (título muda de tamanho, quebra em mais linhas).
- **Gabarito de trabalho** — copiar `GABARITO.md` (raiz do repo) pra `~/.claude/CLAUDE.md`:
  ```
  copy GABARITO.md "%USERPROFILE%\.claude\CLAUDE.md"
  ```
  É o modo de trabalho em dez diretrizes (transcrito do PDF em
  `marketing-instagram/motor/ADAPTA - PDF GABARITO.pdf`). O Claude Code só carrega instrução
  automaticamente de `~/.claude/`, e essa pasta é do usuário, não do repositório: sem esta
  cópia o gabarito fica parado no Git e **não muda comportamento nenhum**.

## 4. Instalar as dependências
```
cd slides            && npm install
cd marketing-instagram && npm install
```

## 5. Rodar
- **Deck (.pptx):** `node slides/motor-slides.js slides/conteudo/<aula>.json`
  Depois, conferir com o olho exportando PNG pelo PowerPoint:
  `powershell -NoProfile -File slides/exportar-png.ps1 <nome-do-deck>`
- **Feed do Instagram:** `node marketing-instagram/motor/gerar.js marketing-instagram/conteudo/<peça>.json`

A pasta `saida/` (PNGs e .pptx) é **gerada** pelo motor — não vem no Git e não precisa
copiar. É só rodar.

---

### Resumo
O **cérebro** do projeto está versionado no GitHub. O que falta numa máquina nova é o
**material bruto pesado** (fotos), o **segredo** (chave de API) e o **ambiente** (fontes
+ dependências) — que por tamanho e segurança ficam fora do Git de propósito.
