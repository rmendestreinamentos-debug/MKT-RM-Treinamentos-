# Exemplos rotulados

Criativos de referência para o modo interpretativo ("cria um baseado nesse").
Um exemplo bem rotulado ensina mais que dez soltos. NÃO acumular sem critério.

## `referencia/` = os modelos de ESTÁTICO da casa
Os seis arquivos em `referencia/` são os **modelos de estático** — o repertório de
peças que a esteira sabe produzir. Cada modelo serve a **qualquer perfil** (RM Summit,
Master MAT, Mapa, Formação, Comercial 24hrs, Rafael Mendes Advogados): o layout é o
mesmo, muda o `marca`/`logo` da peça.

⚠️ **Os prints estão na paleta verde** (foram capturados do Summit "Crise é o Cacete",
Capital Upgrade). Copiar deles o **formato e a estrutura**, nunca a cor nem o logo:
a identidade sai sempre de `marca/tokens.css` (**dourado/preto**) e de `marca/`.

## Modelos de CARROSSEL
Os originais são pesados (ZIPs de ~90 e ~140 MB) e ficam **fora do repo**, em
`Exemplos Carrosseis/` na pasta do projeto. Não subir pro git. Os dois modelos:

| Modelo | Tipo no motor | Estrutura |
|---|---|---|
| *Odisseia / gaiola de ouro* (@joaovitormadv) | `thread` | Print de tweet no dark mode: perfil no topo, texto em **peso normal**, imagem embutida opcional. Sem negrito, sem marca-texto, sem capa. Fecha em slide só texto, card centrado no preto. **Frames e anatomia em `thread-x/`** — é o modelo canônico. |
| *Eu só visto fantasia em casa* (25 slides) | `legenda` | Foto em tela cheia, muitas vezes **duas lado a lado** fazendo o contraste ("eu" × "o Pablo Marçal"), com caixa branca de legenda. Fecha num slide branco com CTA de comentário. |

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
| `Tráfego pago.jpeg` | `anuncio` | Anúncio de captação (CAUP/Capital Upgrade). A peça é um funil: promessa → **chip que filtra o lead** → prova (foto) → botão → ressalva. O chip ("acima de R$ 2 milhões/ano", "mais de 10 funcionários") é o que faz o formato: ele desqualifica quem não é o cliente **antes** do clique. |
| `Tráfego págo (caricato).jpeg` | `caricato` | Imagem caricata (gerada) sangrando na peça inteira; texto só no rodapé — setup em peso normal, remate em display com a palavra-chave em outra cor. Fecha imitando o **"Saiba Mais" nativo** do Instagram. O original não tem logo; **na nossa versão tem** (selo no alto), por decisão do dono em 2026-07-14. |

⚠️ As duas de tráfego **desenham interface do Meta** (botão falso, "Toque em Saiba
Mais"). É o que os originais fazem e funciona, mas é a categoria de criativo que o
Meta mais reprova. Anúncio recusado: o botão é o primeiro suspeito, não a copy.

## O que foi absorvido para os tokens/motor
- Título em **caixa alta, peso alto, entrelinha curta** — impacto a 1 segundo.
- **Duas cores dentro da mesma frase**: a palavra-chave em acento, o resto em branco.
  No motor isso é o `*asterisco*` — `"O Summit foi um *divisor de águas*"`.
- Fundo escuro com **brilho radial** da cor de acento (no nosso caso, dourado).
- **Logo no rodapé**, centralizado, fechando a peça (não no topo).
