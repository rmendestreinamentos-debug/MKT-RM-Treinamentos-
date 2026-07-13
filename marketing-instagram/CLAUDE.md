# Projeto: conteúdo de Instagram

## O que é
Esteira pra produzir peças de Instagram (estáticos e carrosséis) seguindo
um padrão visual fixo. O texto vem sempre da pessoa; o trabalho aqui é
ADAPTAR a arte ao texto, nunca inventar identidade nova.

## Princípio que rege tudo (não quebrar)
- **Repetitivo → código.** Peças de padrão fixo são geradas pelo motor em
  `motor/` rodando um script. NÃO chamar geração por IA pra isso. O layout
  é travado; só o conteúdo muda.
- **Interpretativo → exemplos.** Quando o pedido for "cria um baseado neste
  exemplo", usar as referências rotuladas em `exemplos/` como base de estilo.
- Nunca redesenhar o padrão por conta própria. O padrão mora nos tokens.

## Os quatro tipos de ESTÁTICO
Cada tipo é um modo do motor — o campo `"tipo"` no JSON (peça inteira ou por slide).
Todos saem em fundo escuro com brilho dourado e o selo da marca no rodapé.
**Todo modelo serve a todos os perfis** — o layout é o mesmo, muda só `marca`/`logo`.
Modelos de **carrossel**: ainda não chegaram (só existe o `padrao`).

1. **`contagem`** — contagem regressiva. Número gigante (`numero` + `unidade`),
   `prefixo` ("Faltam"), `texto` de apoio e `data`. É a peça mais repetitiva do
   calendário: muda só o número. CTA de link.
2. **`depoimento`** — prova social. `foto` do participante ao fundo (de `fotos/`),
   `citacao` em caixa alta, `autor`, `cargo`, `obs`. Credibilidade vem do rosto e do cargo.
3. **`provocacao`** — só copy, sem foto. Pergunta ou contraste que para o scroll
   (`titulo`). Orgânico: CTA manda pra legenda.
4. **`urgencia`** — escassez. Lote, vagas, % esgotado (`titulo` + `eyebrow`).
   Tráfego pago: CTA sempre de link.

Existe ainda o `padrao` (default): o carrossel claro, selo no topo, título em
sentence case — usado pra conteúdo educativo em vários slides.

## Os dois carrosséis — peças NATIVAS (sem marca, de propósito)
Carrossel não leva logo, nem dourado, nem Montserrat. Ele imita conteúdo orgânico:
carimbar a marca mataria o efeito. A assinatura é o **perfil**, não o produto.
Fonte: `--nativo` (grotesca de sistema). Não "consertar" isso.

5. **`thread`** — print de thread do X. `perfil` (nome, `handle`, `avatar`,
   `verificado`) no topo de todo slide. Capa: `titulo` (caixa alta) + `gancho` +
   `imagem`. Slides de texto: `texto` (linha em branco separa parágrafo) + `imagem`
   opcional. Fecha com um slide `"tema": "escuro"` — o remate, sem imagem.
   Aqui o `*asterisco*` vira **marca-texto vermelho**, não dourado.
6. **`legenda`** — foto com caixa de legenda. `paineis`: 1 ou 2 fotos lado a lado
   (o contraste "eu × ele"), cada uma com sua `legenda` na caixa branca. O slide
   sem `paineis` (só `texto`) é o fecho branco, com o CTA de comentário.

Instagram publica no máximo **20 slides** — o motor avisa se passar.

## Foto de fundo
Qualquer estático aceita `"foto": "arquivo.jpg"` (de `fotos/`) como fundo full-bleed.
O motor aplica um véu escuro por cima: o texto SEMPRE tem que ganhar da imagem.
Regule com `"veu": "leve" | "medio" (padrão) | "forte"`. Ver `fotos/LEIA-ME.md`.

## A palavra-chave em outra cor
Envolva em `*asteriscos*` o trecho que deve saltar dentro da frase:
`"O Summit foi um *divisor de águas* na minha vida."` Vale em `titulo`, `citacao`
e `texto`. Uma frase, duas cores — é o que dá o impacto de 1 segundo. Não abusar:
um destaque por peça.

O mesmo `*asterisco*` rende diferente por tipo: **dourado** nos estáticos,
**marca-texto vermelho** na `thread`. Mesma escrita, cada peça no seu registro.

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
