# Exemplos rotulados

Criativos de referência para o modo interpretativo ("cria um baseado nesse").
Um exemplo bem rotulado ensina mais que dez soltos. NÃO acumular sem critério.

## Duas pastas de modelo de ESTÁTICO
- **`referencia/`** — as peças de **calendário** (orgânico e escassez).
- **`tráfego/`** — os **criativos de tráfego pago**, subidos pelo dono em 2026-07-21/27.

Juntas são o repertório de peças que a esteira sabe produzir. Cada modelo serve a
**qualquer perfil** (RM Summit,
Master MAT, Mapa, Formação, Comercial 24hrs, Rafael Mendes Advogados): o layout é o
mesmo, muda o `marca`/`logo` da peça.

⚠️ **Os prints estão na paleta verde** (foram capturados do Summit "Crise é o Cacete",
Capital Upgrade). Copiar deles o **formato e a estrutura**, nunca a cor nem o logo:
a identidade sai sempre de `marca/tokens.css` (**dourado/preto**) e de `marca/`.

## Modelos de CARROSSEL
Os originais são pesados (ZIPs de ~90 e ~140 MB) e ficam **fora do repo**, em
`_bruto/Exemplos Carrosseis/` na raiz do projeto. Não subir pro git. Os dois modelos:

| Modelo | Tipo no motor | Estrutura |
|---|---|---|
| *Odisseia / gaiola de ouro* (@joaovitormadv) | `thread` | Print de tweet no dark mode: perfil no topo, texto em **peso normal**, imagem embutida opcional. Sem negrito, sem marca-texto, sem capa. Fecha em slide só texto, card centrado no preto. **Frames e anatomia em `thread-x/`** — é o modelo canônico. |
| *Eu só visto fantasia em casa* (25 slides) | `legenda` | Foto em tela cheia, muitas vezes **duas lado a lado** fazendo o contraste ("eu" × "o Pablo Marçal"), com caixa branca de legenda. Fecha num slide branco com CTA de comentário. |
| *O novo algoritmo do Instagram em 2026* (@brandsdecoded_, 10 slides) | `editorial` | Carrossel editorial: barra de topo assinando, alternância claro/escuro + um slide de accent chapado, régua hairline, listas de `→`/`❌`/numerada, img-box e fecho em botão-pílula. **Frames e anatomia em `Carrossel/`.** É o modelo de referência da skill `maquina-carrosseis` — e é peça de OUTRA marca: copiar a estrutura, nunca o "Powered by Content Machine". |

⚠️ A descrição antiga do `thread` (negrito + marca-texto vermelho + capa em caixa
alta) foi corrigida em 2026-07-14 contra o modelo real. Os ganchos continuam no
motor pra quem quiser, mas **o padrão é o print limpo**.

⚠️ Ambos passam de **20 slides**, o teto do Instagram — o motor avisa ao gerar.

⚠️ Carrossel é peça **nativa**: sem logo, sem dourado, sem Montserrat. É de propósito
(ver `CLAUDE.md`). Quem assina é o perfil (avatar + @), não o produto.

| Arquivo | Tipo | Por que funciona |
|---|---|---|
| `contagem-5-dias.png` | Contagem regressiva | Número gigante domina a peça; o calendário dá prova visual da data. Leitura em 1 segundo. |
| `contagem-15-dias.png` | Contagem regressiva | Mesma estrutura + print do perfil como prova social (seguidores, link). |
| `depoimento-larissa.png` | Depoimento | Foto do participante ao vivo + citação em caixa alta com a frase-chave destacada em outra cor. Nome e cargo dão credibilidade. |
| `provocacao-2-dias-2-anos.png` | Provocação | Só copy. Contraste numérico (2 dias × 2 anos) carrega a peça. CTA manda pra legenda — orgânico. |
| `urgencia-97-lote.png` | Urgência / escassez | Número da escassez destacado; CTA em pílula, link na bio — peça de tráfego. |
| `institucional-patrocinador.png` | Institucional | Crachá como moldura. **Ainda não virou modo do motor** — pendente. |
| `lineup-maiores.png` | `palestrantes` | Fileira de rostos com o nome no peito, lockup em pílula no topo, selos de info e botão. O ativo da peça são os **nomes confirmados**. |
| `Tráfego pago.jpeg` | `anuncio` | Anúncio de captação (CAUP/Capital Upgrade). A peça é um funil: promessa → **chip que filtra o lead** → prova (foto) → botão → ressalva. O chip ("acima de R$ 2 milhões/ano", "mais de 10 funcionários") é o que faz o formato: ele desqualifica quem não é o cliente **antes** do clique. |
| `Tráfego págo (caricato).jpeg` | `caricato` | Imagem caricata (gerada) sangrando na peça inteira; texto só no rodapé — setup em peso normal, remate em display com a palavra-chave em outra cor. Fecha imitando o **"Saiba Mais" nativo** do Instagram. O original não tem logo; **na nossa versão tem** (selo no alto), por decisão do dono em 2026-07-14. |

⚠️ Sumiu do disco: `virada-de-lote.png`, o modelo do tipo `lote` que o `CLAUDE.md`
ainda cita. Ele está no commit `65e6912` — `git checkout 65e6912 -- "<caminho>"` traz de volta.

## `tráfego/` = o repertório de ANÚNCIO — e só ele
**Regra do dono (2026-07-27): peça de tráfego pago se pauta APENAS nos modelos desta
pasta.** Não é uma galeria de inspiração: é o cardápio fechado. Se a peça é pra rodar
como anúncio, o layout sai de um destes sete — não de `referencia/`, não de invenção
nova, não de "misturei dois". Quem põe arquivo aqui é o dono; eu não movo nem adiciono
nada por conta própria.

Peças de **outras marcas**, guardadas pelo layout. Copiar a ESTRUTURA — nunca a marca,
a cor nem o logo. A identidade sai de `marca/tokens.css` (dourado/preto) e de `marca/`.

| Arquivo | Tipo | Por que funciona |
|---|---|---|
| `WhatsApp ... 16.06.10.jpeg` | `heroi` | **SME / Jornada Equity** (João Kepler). O modelo puro: retrato sangrando no topo, virada pra preto sólido logo abaixo do rosto, lockup na virada, e a pilha de venda toda no preto — qualificação → manchete em dois tons → apoio → botão. |
| `WhatsApp ... 16.06.10 (2).jpeg` | `heroi` | **Janguiê Diniz / CSE**. Mesma anatomia, com **fita diagonal de slogan** repetindo em cima e embaixo emoldurando a peça. A qualificação é o preço de entrada ("acima de R$ 2 milhões/ano"). |
| `WhatsApp ... 16.06.10 (3).jpeg` | `heroi` | **Paulo Vieira / Revolution**. Retrato em pé de corpo inteiro, fundo dessaturado, logo no alto à esquerda em vez de na virada. A data fecha embaixo do botão, com ícone de calendário. |
| `WhatsApp ... 16.06.11 (1).jpeg` | `heroi` **lateral** | **ADV 10X**. Retrato à DIREITA sangrando, texto todo à esquerda. Serve quando a foto boa é de meio corpo e não aguenta sangrar no topo. Manchete em dois tons + "E VOCÊ?" sublinhado como virada. **Ainda não é modo do motor.** |
| `WhatsApp ... 08.34.03.jpeg` | `heroi` **lateral** / escassez | **A Nova Advocacia**, "ÚLTIMOS INGRESSOS NO LOTE ATUAL!". A mesma coluna lateral do ADV 10X, mas a serviço do **relógio**: logo → manchete inteira em amarelo → cidade e datas em uma linha → apoio → "Toque em SAIBA MAIS". Prova que o herói lateral serve pra urgência, não só pra apresentação. **Ainda não é modo do motor.** |
| `WhatsApp ... 16.06.10 (1).jpeg` | `palestrantes` em anúncio | **Imersão jurídica** (Flávio Augusto, Joel Jota, Caio Carneiro). Print do feed do Meta: a fileira de rostos ocupa o terço de cima e o resto é copy corrida. Ensina que **nome conhecido vem antes da frase** — e que o corpo do anúncio pode ser texto longo. |
| `WhatsApp ... 16.06.11.jpeg` | `lote` | **A Nova Advocacia**, "VAI FICAR MAIS CARO". Formato **quadrado**, manchete no céu da foto da cidade, escada de informação (o quê → onde/quando → CTA) e logo no rodapé. A cidade é o fundo — a mesma regra do nosso `lote`. |

**O que a pasta ensina, somando as sete:** o herói tem **duas montagens** — vertical
(retrato em cima, texto no preto de baixo) e **lateral** (retrato de um lado, coluna de
texto do outro). A lateral aparece em duas das sete e ainda não existe no motor.

⚠️ Vários deles **desenham interface do Meta** (botão falso, "Toque em Saiba Mais").
É o que os originais fazem e funciona, mas é a categoria de criativo que o Meta mais
reprova. Anúncio recusado: o botão é o primeiro suspeito, não a copy.

⚠️ **Nenhum deles é do Rafael.** São referências de layout de concorrente/vizinho de
mercado. Nunca reproduzir logo, paleta ou nome que aparece nelas.

## O que foi absorvido para os tokens/motor
- Título em **caixa alta, peso alto, entrelinha curta** — impacto a 1 segundo.
- **Duas cores dentro da mesma frase**: a palavra-chave em acento, o resto em branco.
  No motor isso é o `*asterisco*` — `"O Summit foi um *divisor de águas*"`.
- Fundo escuro com **brilho radial** da cor de acento (no nosso caso, dourado).
- **Logo no rodapé**, centralizado, fechando a peça (não no topo).
