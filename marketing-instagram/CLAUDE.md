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

## Os três tipos de conteúdo
<!-- PREENCHER: troque pelos seus três tipos reais. Cada um vira um modo do motor. -->
1. TIPO_1 — (descreva: formato, quando usa, estrutura)
2. TIPO_2 — (descreva)
3. TIPO_3 — (descreva)

## Marca por peça (nome + logo)
O nome NÃO é fixo — cada peça declara de qual produto é, no próprio JSON:
- `"marca": "RM Summit"` → texto que aparece no selo. Default: "Rafael Mendes Advogados".
- `"logo": "rm-summit.png"` (opcional) → arquivo em `marca/`.
- `"inicial": "RM"` (opcional) → sobrescreve a inicial do fallback.

Cascata do selo (resolvida no motor): logo da peça → `marca/logo.png` (logo da
casa) → inicial estilizada derivada do nome. Some com o "Sua Marca" antigo.

Produtos conhecidos (viram o campo `marca`): RM Summit · Rafael Mendes Advogados ·
Formação de Lideranças · Comercial 24hrs · Master MAT · Mapa da Advocacia
Previdenciária · Mapa da Advocacia Trabalhista.

## Identidade visual
<!-- PREENCHER: estes viram os tokens em marca/tokens.css -->
- Cores: (principal / fundo / acento / apoio)
- Fontes: (título / corpo)
- Tom de voz: (ex: direto, sem jargão, sentence case)

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
