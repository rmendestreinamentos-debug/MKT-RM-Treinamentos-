// capa.js — capa de MÓDULO de área de membros. Não é peça de feed.
// Uso:  node motor/capa.js conteudo/capas/<arquivo>.json
//
// Por que um motor separado, e não mais um `tipo` no gerar.js: o gerar.js é travado em
// 1080×1350 e a régua inteira dele (fonte, margem, enquadramento) é pensada nesses
// pixels. A capa de módulo sai em 680×1088 — outra proporção, outro veículo (ela é vista
// pequena, dentro do player, não no feed). Enfiar 680×1088 lá dentro obrigaria a
// parametrizar o viewport do motor de feed, e o dia em que alguém mexesse nisso mudaria
// TODA peça de Instagram sem querer. Motor próprio, mesmo padrão de marca (tokens.css).
//
// Saída em 2×, pela mesma razão do feed: o layout é medido em 680×1088 e o print dobra a
// densidade (1360×2176). Plataforma de curso reamostra o upload; partir do dobro de
// informação é o que impede o texto dourado de esfarelar na compressão.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = path.resolve(__dirname, "..");

// Dois formatos, e são peças diferentes no mesmo sistema visual:
//   capa   — 680×1088, o card do módulo na lista de aulas. Retrato, texto no rodapé.
//   banner — 1280×720 (16:9), a faixa do topo da área de membros. O texto vai no CENTRO,
//            porque a faixa é cortada nas laterais em tela estreita e o que fica sempre
//            visível é o miolo. Rodapé aqui não existe: em 720px de altura o bloco de
//            baixo encostaria na borda.
//   larga  — 1088×680 (8:5), a capa DEITADA: a mesma peça da capa de módulo, girada.
//            Mantém o bloco no rodapé (é a identidade da série); só a margem lateral e o
//            corpo do título mudam, porque a largura útil quase dobra.
const FORMATOS = {
  capa:   { largura: 680,  altura: 1088 },
  banner: { largura: 1280, altura: 720  },
  larga:  { largura: 1088, altura: 680  },
};

function erro(msg){ console.error("erro:", msg); process.exit(1); }
function esc(s){
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
// *palavra* vira o trecho em dourado metálico — mesma convenção do motor de feed, pra
// quem escreve o JSON não ter que aprender duas marcações.
function realce(t){
  return esc(t).replace(/\*([^*]+)\*/g, (_, m) => `<span class="ouro">${m}</span>`);
}
// Cada linha vira um BLOCO em nowrap, não um <br>. Duas razões, e as duas doem:
// (1) com <br> o navegador ainda pode rachar uma linha comprida por conta própria, e a
//     quebra que ele inventa vira uma linha a mais que ninguém escreveu;
// (2) linha em nowrap ESTOURA a caixa em vez de reflui, e estouro é medível — é o que
//     deixa o motor conferir se o título coube (ver `caberTitulo`). Com <br> o texto
//     "cabe" sempre, e o defeito só aparece no PNG.
function linhas(t){
  return realce(t).split("\n").map(l => `<span class="ln">${l}</span>`).join("");
}
function semMarcacao(t){ return String(t ?? "").replace(/\*/g, ""); }
function maiorLinha(t){
  return semMarcacao(t).split("\n").reduce((m, l) => Math.max(m, l.trim().length), 0);
}
// O tamanho do título sai da LINHA MAIS LONGA, não da soma: título de duas linhas curtas
// não pode encolher por causa do total, e a linha comprida não pode estourar e rachar
// numa terceira. Faixas medidas na largura útil (568px) em Montserrat 900 caixa alta.
function corpoTitulo(txt){
  const n = maiorLinha(txt);
  if(n <= 10) return 78;
  if(n <= 13) return 64;
  if(n <= 16) return 54;
  if(n <= 20) return 44;
  if(n <= 26) return 36;
  return 30;
}

function dataURI(p){
  const ext = path.extname(p).toLowerCase();
  const mime = ext === ".svg" ? "image/svg+xml"
             : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg"
             : ext === ".webp" ? "image/webp"
             : ext === ".avif" ? "image/avif"
             : ext === ".gif" ? "image/gif" : "image/png";
  return `data:${mime};base64,${fs.readFileSync(p).toString("base64")}`;
}

// A foto pode estar em imagens/ (recorte e material do dono) ou em fotos/ (o acervo do
// evento). Procura nos dois, na mesma ordem do motor de feed.
function achaFoto(nome){
  if(!nome) return null;
  for(const raiz of ["imagens", "fotos"]){
    const p = path.join(BASE, raiz, nome);
    if(fs.existsSync(p)) return p;
  }
  const solto = path.isAbsolute(nome) ? nome : path.join(BASE, nome);
  if(fs.existsSync(solto)) return solto;
  erro(`foto não encontrada: "${nome}" (procurei em imagens/, fotos/ e no caminho solto).`);
}

// LOGO: carimbo real quando o PNG existe, wordmark tipográfico quando não existe.
// A capa cai sobre FOTO, então vale a mesma regra do LOGOS.md — o PNG original traz o
// fundo preto chapado dentro do arquivo e viraria um retângulo sem pé nem cabeça sobre
// a imagem. Se houver uma versão `-sem-fundo` ao lado, ela ganha sozinha.
const JA_TRATADO = /-(sem-fundo|ouro|dourado|vibrante|branco|preto|tinta)\.png$/i;

function resolveLogo(d){
  if(d.logo){
    // Já veio numa versão tratada (logo-sem-fundo.js ou logo-tinta.js)? usa como está.
    const tratado = JA_TRATADO.test(d.logo);
    const semFundo = d.logo.replace(/\.png$/i, "-sem-fundo.png");
    const alvo = (!tratado && fs.existsSync(path.join(BASE, "marca", semFundo))) ? semFundo : d.logo;
    const p = path.join(BASE, "marca", alvo);
    if(!fs.existsSync(p)) erro(`logo "${d.logo}" não existe em marca/. Ponha o arquivo lá ou use "wordmark".`);
    if(!tratado && alvo === d.logo && /\.png$/i.test(d.logo))
      console.warn(`aviso: usando ${d.logo} direto. Ele tem fundo chapado dentro do arquivo? Sobre a foto\n` +
                   `  isso vira um retângulo. Logo CLARO sobre preto: node motor/logo-sem-fundo.js ${d.logo}\n` +
                   `  Logo ESCURO sobre branco:  node motor/logo-tinta.js ${d.logo} ouro`);

    // ALTURA por proporção, não por número chutado. Wordmark deitado (o lockup do RM
    // Summit, prop ~4) e selo EMPILHADO (o da RM Treinamentos, prop 1.13 — monograma em
    // cima, palavra embaixo) não podem ter a mesma altura: na altura do wordmark, a
    // palavra de baixo do empilhado fica com 3px e vira borrão. Mesma conta do motor de
    // feed, calibrada pro rodapé desta capa.
    const prop = proporcaoPNG(p);
    let altura = Number(d.logo_altura);
    if(!altura){
      altura = 34;
      if(prop && prop < 1.6) altura = 66;   // empilhado: a palavra de baixo precisa de altura
      else if(prop && prop < 2.6) altura = 40;
      // Banner e capa deitada são quase o dobro da largura da capa em pé: na mesma
      // altura o selo vira um detalhe perdido no meio da peça.
      const f = d.formato || "capa";
      if(f === "banner") altura = Math.round(altura * 1.3);
      else if(f === "larga") altura = Math.round(altura * 1.15);
    }
    return { tipo: "img", src: dataURI(p), altura };
  }
  if(d.wordmark) return { tipo: "texto", texto: d.wordmark };
  return null;
}

function proporcaoPNG(p){
  if(path.extname(p).toLowerCase() !== ".png") return null;
  const b = fs.readFileSync(p);
  if(b.length < 24 || b.toString("ascii", 12, 16) !== "IHDR") return null;
  const h = b.readUInt32BE(20);
  return h ? b.readUInt32BE(16) / h : null;
}

function medidas(d){
  const f = FORMATOS[d.formato || "capa"];
  if(!f) erro(`formato "${d.formato}" não existe. Use "capa" (680×1088) ou "banner" (1280×720).`);
  return { largura: Number(d.largura) || f.largura, altura: Number(d.altura) || f.altura };
}

function ornamento(){
  // Régua dourada afilada — o mesmo papel da régua das frases: é o detalhe que amarra
  // uma série de capas como conjunto quando os títulos e as fotos mudam.
  return `<div class="regua"><i></i><b></b><i></i></div>`;
}

function html(d){
  const foto = achaFoto(d.foto);
  const logo = resolveLogo(d);
  const foco  = d.foco  === undefined ? 0   : Number(d.foco);
  const focox = d.focox === undefined ? 50  : Number(d.focox);
  const zoom  = Number(d.zoom) || 1;
  // A foto SANGRA na arte inteira por padrão, e isso não é gosto: 680×1088 (0.625) é
  // quase a proporção de um retrato de estúdio, então em tela cheia o `cover` corta uns
  // poucos por cento e a pessoa aparece com busto. Prender a foto numa faixa de 66% cria
  // uma janela mais LARGA que alta, o `cover` passa a escalar pela largura e amplia o
  // retrato até virar close-up — a cabeça come metade da arte e o corpo some. Faixa
  // curta só serve pra foto horizontal.
  const alturaFoto = Number(d.altura_foto) || 100;  // % da arte que a foto ocupa
  const tokens = fs.readFileSync(path.join(BASE, "marca/tokens.css"), "utf8");

  const formato = d.formato || "capa";
  const banner = formato === "banner";
  const larga  = formato === "larga";
  const { largura: LARGURA, altura: ALTURA } = medidas(d);
  // A régua de tamanho do título foi calibrada nos 568px úteis da capa em pé. Banner e
  // capa deitada têm quase o dobro disso (1060 e 944): aplicar a mesma tabela lá daria
  // um título minúsculo numa peça larga. O fator é a razão entre as larguras úteis, e o
  // ajuste medido depois do render corrige o que a estimativa errar.
  const tamTitulo = Number(d.tamanho_titulo)
    || Math.round(corpoTitulo(d.titulo || "") * (banner ? 1.5 : larga ? 1.2 : 1));

  return `<!doctype html><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap">
<style>
${tokens}
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000}
.capa{
  position:relative; width:${LARGURA}px; height:${ALTURA}px; overflow:hidden;
  background:#050507; font-family:var(--display);
  /* Fundo DESENHADO, não preto chapado: chapado lê como slide que perdeu a imagem.
     Clarão quente no alto (atrás da cabeça) e queda pro preto no pé. */
  background-image:
    radial-gradient(120% 46% at 50% 12%, rgba(244,182,97,.20), rgba(244,182,97,0) 62%),
    linear-gradient(180deg, #0d0b09 0%, #050507 58%, #000 100%);
}

/* ---- foto ---- */
.foto{
  position:absolute; inset:0 0 auto 0; height:${alturaFoto}%; overflow:hidden;
}
.foto i{
  position:absolute; inset:0; display:block;
  background-image:url('${dataURI(foto)}');
  background-size:cover; background-position:${focox}% ${foco}%;
  transform:scale(${zoom}); transform-origin:${focox}% ${foco}%;
}
/* O véu chega OPACO no pé (é sobre ele que o título é lido) e some no meio, onde está o
   rosto e o busto. Escurecer o meio junto foi o erro da primeira versão: o terno some no
   preto e sobra uma cabeça flutuando. No topo só uma sombra leve, pra moldura dourada
   ter contraste sem apagar o cabelo. */
.foto::after{
  content:""; position:absolute; inset:0;
  background:
    linear-gradient(180deg,
      rgba(5,5,7,.42) 0%, rgba(5,5,7,.10) 14%, rgba(5,5,7,0) 34%,
      rgba(5,5,7,.06) 48%, rgba(5,5,7,.42) 62%, rgba(5,5,7,.86) 76%,
      #050507 87%, #050507 100%),
    /* vinheta: fecha os cantos e empurra o olho pro centro da arte */
    radial-gradient(120% 74% at 50% 40%, rgba(5,5,7,0) 46%, rgba(5,5,7,.55) 100%);
}
/* Luz quente POR CIMA da foto — é o que faz o dourado virar ambiente, e não só um
   detalhe de moldura. Fica em blend "screen" pra clarear sem lavar a pele. */
.foto::before{
  content:""; position:absolute; inset:0; z-index:1; mix-blend-mode:screen;
  background:radial-gradient(88% 34% at 50% 6%, rgba(244,182,97,.28), rgba(244,182,97,0) 70%);
}
${!banner ? "" : `
/* O véu do banner é OUTRO problema. Na capa o texto mora no rodapé e o véu é uma queda
   de cima pra baixo; aqui ele mora no MEIO, em cima da cena mais cheia da foto (plateia,
   painel, telão). Um degradê vertical não resolve: ou apaga a foto inteira, ou deixa o
   miolo legível demais atrás da letra. Então são duas camadas — um escurecimento geral
   que rebaixa a foto a cenário, e uma mancha central mais forte que abre o lugar do
   texto. É essa mancha que também mata a leitura de telão e backdrop de outra marca.  */
.foto::after{
  background:
    radial-gradient(54% 86% at 50% 50%, rgba(5,5,7,.86) 0%, rgba(5,5,7,.60) 44%, rgba(5,5,7,.22) 76%, rgba(5,5,7,.06) 100%),
    linear-gradient(180deg, rgba(5,5,7,.50) 0%, rgba(5,5,7,.24) 34%, rgba(5,5,7,.28) 68%, rgba(5,5,7,.66) 100%),
    radial-gradient(120% 100% at 50% 50%, rgba(5,5,7,0) 42%, rgba(5,5,7,.60) 100%);
}
.foto::before{
  background:radial-gradient(70% 90% at 50% 96%, rgba(244,182,97,.22), rgba(244,182,97,0) 72%);
}
`}

/* ---- moldura dourada ---- */
.moldura{
  position:absolute; inset:20px; border:1px solid rgba(244,182,97,.30);
  pointer-events:none;
}
/* Cantos reforçados: a linha fina sozinha some na miniatura do player; o canto é o que
   sobra dela quando a capa é vista a 200px de largura. */
.moldura b{position:absolute; width:34px; height:34px; border:2px solid var(--acento)}
.moldura b:nth-child(1){top:-1px; left:-1px;  border-right:0; border-bottom:0}
.moldura b:nth-child(2){top:-1px; right:-1px; border-left:0;  border-bottom:0}
.moldura b:nth-child(3){bottom:-1px; left:-1px;  border-right:0; border-top:0}
.moldura b:nth-child(4){bottom:-1px; right:-1px; border-left:0;  border-top:0}

/* ---- bloco de texto ---- */
.bloco{
  position:absolute; left:0; right:0; bottom:0;
  padding:0 56px 62px; text-align:center;
}
${!larga ? "" : `
/* CAPA DEITADA: o bloco continua no rodapé (é o que a faz irmã da capa em pé), mas a
   margem lateral cresce com a largura — 56px numa peça de 1088 seria uma margem de 5%,
   e o título encostaria nas bordas. E a folga de baixo encolhe: 62px eram 5,7% dos 1088
   de altura da capa em pé; aqui a peça tem 680 de altura e a mesma folga viraria 9%,
   empurrando o bloco pra cima do assunto da foto. */
.bloco{padding:0 72px 46px}
.assina{margin-top:26px}
`}
${!banner ? "" : `
/* BANNER: o bloco vai pro centro geométrico, não pro rodapé. A faixa do topo da área de
   membros é recortada nas laterais e na altura conforme a largura da tela de quem abre,
   e o único pedaço que sobrevive a todos os recortes é o miolo. Texto encostado numa
   borda é texto que some no primeiro celular. */
.bloco{
  inset:0; bottom:0; display:flex; flex-direction:column;
  align-items:center; justify-content:center; padding:0 110px;
}
/* No banner o logo vem ANTES do nome do curso: quem assina a faixa é a casa, e o curso
   é o assunto. Na capa do módulo é o contrário — lá o assunto abre e a casa fecha. */
.bloco .assina{order:-1; margin-top:0; margin-bottom:26px}
.regua{margin-bottom:24px}
`}
.eyebrow{
  font-size:15px; font-weight:700; letter-spacing:.34em; text-transform:uppercase;
  color:rgba(255,255,255,.62); margin-bottom:20px;
}
.regua{display:flex; align-items:center; justify-content:center; gap:9px; margin-bottom:26px}
.regua i{width:56px; height:1px; background:linear-gradient(90deg, rgba(244,182,97,0), var(--acento))}
.regua i:last-child{background:linear-gradient(90deg, var(--acento), rgba(244,182,97,0))}
.regua b{width:6px; height:6px; background:var(--acento); transform:rotate(45deg)}

h1{
  font-size:${tamTitulo}px; font-weight:900; line-height:1.02; letter-spacing:-.015em;
  text-transform:uppercase; color:var(--papel);
  text-shadow:0 2px 24px rgba(0,0,0,.75);
}
/* Bloco, e SEM margem negativa: scrollWidth de um bloco com margem negativa devolve a
   largura da CAIXA, não a do texto, e o ajuste do título passa a se comparar consigo
   mesmo e encolhe até o piso. Se um dia precisar compensar o tracking da última letra,
   faça no elemento medido, não na caixa que serve de régua. */
h1 .ln{display:block; white-space:nowrap}
/* Dourado METÁLICO, não chapado: o degradê entre o quente e o vibrante é o que faz a
   palavra parecer ouro em vez de amarelo. Os dois tons já são os da casa. */
h1 .ouro{
  background:linear-gradient(100deg, #d99a45 0%, var(--acento) 26%, #fde9b8 48%, var(--apoio) 70%, #c9822f 100%);
  -webkit-background-clip:text; background-clip:text; color:transparent;
}
.apoio{
  margin-top:18px; font-size:17px; font-weight:500; line-height:1.5;
  color:rgba(255,255,255,.70);
}

/* ---- assinatura ---- */
.assina{margin-top:34px; display:flex; align-items:center; justify-content:center}
/* "Discreto" é opacidade, não tamanho: encolher o lockup empilhado até ele sumir
   transformaria o "Treinamentos" em borrão. Melhor manter a altura que a palavra exige
   e recuar na presença — ele fica atrás do título na hierarquia sem ficar ilegível. */
.assina img{display:block; opacity:.72}
.assina .wordmark{
  font-size:13px; font-weight:600; letter-spacing:.30em; text-transform:uppercase;
  color:var(--acento); opacity:.72;
}
</style>
<div class="capa">
  <div class="foto"><i></i></div>
  <div class="moldura"><b></b><b></b><b></b><b></b></div>
  <div class="bloco">
    ${d.eyebrow ? `<div class="eyebrow">${esc(d.eyebrow)}</div>` : ""}
    ${d.regua === false ? "" : ornamento()}
    <h1>${linhas(d.titulo || "")}</h1>
    ${d.texto ? `<p class="apoio">${linhas(d.texto)}</p>` : ""}
    ${!logo ? "" : logo.tipo === "img"
      ? `<div class="assina"><img style="height:${logo.altura}px" src="${logo.src}" alt=""></div>`
      : `<div class="assina"><span class="wordmark">${esc(logo.texto)}</span></div>`}
  </div>
</div>`;
}

(async () => {
  const arq = process.argv[2];
  if(!arq) erro("uso: node motor/capa.js conteudo/capas/<arquivo>.json");
  const caminho = path.isAbsolute(arq) ? arq : path.join(BASE, arq);
  if(!fs.existsSync(caminho)) erro(`arquivo não encontrado: ${arq}`);
  const dados = JSON.parse(fs.readFileSync(caminho, "utf8"));

  const capas = Array.isArray(dados.capas) ? dados.capas : [dados];
  const hd = Math.min(4, Math.max(1, Number(dados.hd) || 2));
  const browser = await chromium.launch();
  // Uma página por peça, e não uma reaproveitada: o mesmo arquivo pode misturar capa
  // (680×1088) e banner (1280×720), e o viewport é o que define o layout. Trocar o
  // tamanho de uma página já montada deixa medida velha em cache e o ajuste do título
  // mede contra a largura errada.
  let page = null, viewportAtual = "";

  let i = 0;
  for(const capa of capas){
    i++;
    const d = { ...dados, ...capa };
    delete d.capas;
    if(!d.titulo) erro(`peça ${i} sem "titulo".`);
    if(!d.foto)   erro(`peça ${i} sem "foto". A peça é foto + texto + design; sem imagem não é peça.`);

    const { largura, altura } = medidas(d);
    const chave = `${largura}x${altura}`;
    if(chave !== viewportAtual){
      if(page) await page.close();
      page = await browser.newPage({ viewport: { width: largura, height: altura }, deviceScaleFactor: hd });
      viewportAtual = chave;
    }
    await page.setContent(html(d), { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    // AJUSTE DO TÍTULO — depois das fontes carregarem, nunca antes: com a fonte de
    // fallback a medida sai errada e o ajuste "conserta" um problema que não existe.
    // A régua por contagem de caractere (`corpoTitulo`) é um chute bom, e chute bom
    // ainda erra: "PROSPECÇÃO" tem 10 letras e é largo, "ILUMINADAS" tem 10 e é estreito.
    // Aqui a largura é MEDIDA. Isto não é o autofit do PowerPoint (que recalcula ao abrir,
    // na máquina de quem abre): aqui a conta acontece uma vez, antes do print, e o que
    // sai é pixel — não tem como refluir depois.
    const ajuste = await page.evaluate((tetoAltura) => {
      const h1 = document.querySelector("h1");
      if(!h1) return null;
      const arte = document.querySelector(".capa");
      const bloco = document.querySelector(".bloco");
      const de = parseFloat(getComputedStyle(h1).fontSize);
      // Duas medidas, porque são dois jeitos diferentes de estourar.
      // LARGURA: a linha passa da margem — o defeito clássico do título comprido.
      // ALTURA: o bloco inteiro come a peça. Só a largura não pega isso, e numa arte
      // DEITADA é o que estoura primeiro: "PEÇAS SIMPLES" cabe folgado nos 944px de
      // largura e mesmo assim, no corpo que a régua sugere, tapa o rosto da foto e
      // ocupa metade dos 680px de altura. Em pé o problema não aparecia, porque lá
      // sobra altura de sobra — por isso ele só surgiu quando a peça girou.
      const largo = () => [...h1.querySelectorAll(".ln")].some(l => l.scrollWidth > h1.clientWidth);
      // Mede o CONTEÚDO do bloco (do topo do primeiro filho à base do último), não a
      // caixa dele. No banner a caixa é flex com inset:0 e ocupa a arte inteira, então
      // medir a caixa daria "estourou" sempre e o título despencaria até o piso.
      const conteudo = () => {
        const f = [...bloco.children].map(e => e.getBoundingClientRect());
        if(!f.length) return 0;
        return Math.max(...f.map(r => r.bottom)) - Math.min(...f.map(r => r.top));
      };
      const alto = () => conteudo() > arte.clientHeight * tetoAltura;
      let px = de;
      while(px > 26 && (largo() || alto())){ px -= 1; h1.style.fontSize = px + "px"; }
      return { de, para: px, ainda: largo() || alto() };
    }, (d.formato || "capa") === "larga" ? 0.44
     : (d.formato || "capa") === "banner" ? 0.62 : 0.52);
    if(ajuste && ajuste.para < ajuste.de)
      console.log(`  título encolhido de ${ajuste.de}px para ${ajuste.para}px pra caber na margem.`);
    if(ajuste && ajuste.ainda)
      console.warn("  aviso: o título NÃO coube nem no piso de 26px. Quebre a copy com \\n —\n" +
                   "  título menor que o texto de apoio deixa de ser título.");
    const nome = d.arquivo_saida || dados.arquivo_saida || "capa";
    // O número só entra quando o nome é COMPARTILHADO (a série de módulos herdando um
    // `arquivo_saida` do topo). Capa que declarou o nome dela não leva sufixo — senão o
    // arquivo sai "kit-modulo-A-queixo-01", que sugere um lote que não existe.
    const proprio = Boolean(d.arquivo_saida);
    const sufixo = (capas.length > 1 && !proprio) ? `-${String(i).padStart(2,"0")}` : "";
    const saida = path.join(BASE, "saida", `${nome}${sufixo}.png`);
    fs.mkdirSync(path.dirname(saida), { recursive: true });
    await page.locator(".capa").screenshot({ path: saida });
    console.log(`gerado: ${path.relative(BASE, saida)}  (${largura*hd}×${altura*hd})`);
  }
  if(page) await page.close();
  await browser.close();
})();
