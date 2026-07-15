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

| | `summit` (padrão) | `mat` |
|---|---|---|
| Modelo | `Modelos/O proposito.pdf` | `Modelos/Comercial para Motoristas.pdf` |
| Fonte | Montserrat (mistura pesos) | Rubik One (um peso só) |
| Foto | **emoldurada** em ouro | **sangra** no fundo |
| Régua | dourada | branca |
| Corpo | caixa baixa | CAIXA ALTA |
| Serve pra | contar história | dar aula |

Reprodução dos modelos, pra comparar: `conteudo/teste-tema-summit.json` e
`conteudo/teste-tema-mat.json` (as fotos em `imagens/teste/` saíram dos próprios PDFs).

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

Procura em `slides/imagens/`, depois `marketing-instagram/imagens/`, depois no acervo
`marketing-instagram/fotos/`.

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
