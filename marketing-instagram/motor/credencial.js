// credencial.js — CRACHÁ FÍSICO de evento. Não é peça de feed, e não é capa de módulo.
// Uso:  node motor/credencial.js conteudo/credenciais/<arquivo>.json
//
// Por que mais um motor, e não um `tipo` no gerar.js ou um formato no capa.js: os dois
// são peças de TELA. Aqui o veículo é papel cortado por uma guilhotina, e papel traz três
// exigências que tela não tem — e que, ignoradas, só aparecem quando as 300 credenciais já
// estão impressas:
//   1) SANGRIA. O corte tem tolerância de ~1mm. Fundo preto que termina exatamente na
//      linha de corte sai com um fio branco na borda em parte da tiragem. Por isso a arte
//      é gerada MAIOR que o crachá (3mm a mais de cada lado) e o preto invade essa faixa.
//   2) MARGEM DE SEGURANÇA. Pela mesma tolerância, texto a menos de ~5mm da borda corre o
//      risco de sair raspado. Nada de conteúdo vive fora dela, e a moldura fica a 4mm.
//   3) ZONA DO CORDÃO. Os 14mm do topo levam furo ou ilhós. Qualquer coisa impressa ali
//      morre — literalmente perfurada. A faixa fica vazia de propósito.
//
// MEDIDA (pedido do dono, 2026-07-30): crachá de 10 × 14 cm, retrato.
// A régua interna é 6 px por milímetro, então o desenho acontece em 600×840 px e o print
// dobra a densidade (deviceScaleFactor 2) — 1200×1680 px de arte útil, que em 10×14 cm dá
// ~305 DPI. Gráfica pede 300; abaixo disso a letra fina esfarela na impressão.
//
// A ARQUITETURA DA PEÇA (segunda instrução do dono, 2026-07-30): a credencial é
// MAJORITARIAMENTE A LOGO, e o nome do participante NÃO é impresso — ele vem depois, numa
// ETIQUETA colada. Isso muda o que a peça é: ela deixa de ser um crachá personalizado e
// vira um SUPORTE, impresso em lote por tipo de credencial. Consequências que o layout
// tem que respeitar:
//   · o campo da etiqueta é BRANCO e CHAPADO, pra a etiqueta (que é branca) sumir dentro
//     dele em vez de virar um remendo colado por cima de arte;
//   · ele é medido em milímetros e desenhado na prova com a cota, porque quem compra a
//     etiqueta precisa do número — etiqueta maior que o campo cobre a arte, menor deixa
//     moldura branca em volta;
//   · o campo serve de plano B: não chegando a etiqueta, alguém escreve à caneta.
//
// ⚠️ Aviso pra gráfica: PNG é RGB. Em impressão offset, preto 100% K chapado numa área
// grande sai acinzentado e marca o verso. Peça PRETO RICO (algo como C40 M30 Y30 K100) na
// hora da conversão. Em impressão digital/laser isso não se aplica.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = path.resolve(__dirname, "..");

// --- régua do papel, em px de desenho ---------------------------------------
const MM = 6;                 // 6 px de desenho por milímetro
const LARGURA = 100 * MM;     // 600 — 10 cm
const ALTURA  = 140 * MM;     // 840 — 14 cm
const SANGRIA = 3  * MM;      // 18  — 3 mm de cada lado
const SEGURA  = 6  * MM;      // 36  — margem de segurança a partir do corte
const CORDAO  = 14 * MM;      // 84  — faixa do topo reservada pro furo/ilhós

// A tarja cresceu com a letra dela (pedido do dono, 2026-07-31: "a escrita de staff,
// palestrante, convidado precisa ser maior, não digo o espaço mas a letra em si"). Faixa e
// corpo andam juntos: letra de 34px numa faixa de 16mm encosta em cima e embaixo, e tarja
// apertada lê como erro de impressão, não como faixa. `tarja_altura` (mm) e `tarja_corpo`
// (px) ajustam no JSON; a moldura acompanha, senão ela cairia dentro da faixa.
let TARJA_MM = 18;
let TARJA    = TARJA_MM * MM;

// ACENTO — a cor dos detalhes, e ela sai do ARQUIVO DO LOGO, não do gosto do dia.
// Amostrados os pixels de marca/imersao-master-mat.png: a marca é um METÁLICO que vai do
// bronze (#774915) ao amarelo (#ffe172) passando pelo dourado (#f8c767), com o "MASTER"
// em prata (#eae7eb). Por isso o ornamento aqui é GRADIENTE, não cor chapada — dourado
// chapado ao lado desse logo lê como uma segunda marca, não como o mesmo sistema.
// (O dono corrigiu isto em 2026-07-30: a primeira versão saiu azul, herdada do deck.)
//
// ⚠️ CADA ACENTO TEM DUAS LIGAS, e a segunda não é enfeite: sobre PAPEL BRANCO o dourado
// médio (#E9B356) já é claro demais pra fio de 0,75pt, e o amarelo do brilho (#FFE172)
// simplesmente não existe — some no papel. A liga `_claro` é o mesmo metal rebaixado de
// luminância: mesma família de cor, contraste que sobrevive à impressão. Escolhida por
// `"fundo": "claro"` no JSON.
const ACENTOS = {
  ouro: {
    cor:   "#E9B356",                       // o dourado médio, pra texto e fio
    claro: "#FFE172",                       // o amarelo do brilho — o ponto alto do metal
    brasa: "rgba(233,179,86,",               // luz ambiente e véus
    metal: "linear-gradient(100deg, #8A5A1E 0%, #D59A46 18%, #FFE172 44%, #F8C767 62%, #C68A3B 82%, #8A5A1E 100%)",
    // sobre branco
    cor_claro:   "#A8762A",
    claro_claro: "#8A5A1E",
    brasa_claro: "rgba(168,118,42,",
    metal_claro: "linear-gradient(100deg, #6E4413 0%, #A8762A 18%, #D9A94A 44%, #C08F35 62%, #8A5A1E 82%, #6E4413 100%)",
  },
  // Mantido porque as outras marcas da casa não são douradas. Não é o padrão.
  azul: {
    cor:   "#4169E1", claro: "#8FA9F5", brasa: "rgba(65,105,225,",
    metal: "linear-gradient(100deg, #26418F 0%, #4169E1 26%, #A9BEF8 50%, #4169E1 74%, #26418F 100%)",
    cor_claro:   "#2B4C8C",
    claro_claro: "#1D3363",
    brasa_claro: "rgba(43,76,140,",
    metal_claro: "linear-gradient(100deg, #1D3363 0%, #2B4C8C 26%, #5D7FC4 50%, #2B4C8C 74%, #1D3363 100%)",
  },
};

// A PALETA DO PAPEL. O resto do motor lê daqui em vez de escrever cor solta no CSS — era
// isso ou duplicar a folha de estilo inteira pra ter as duas versões.
function paleta(A, claro){
  return claro ? {
    claro: true,
    cor: A.cor_claro, alto: A.claro_claro, brasa: A.brasa_claro, metal: A.metal_claro,
    tinta: "#171310",                       // a tinta do texto sobre o papel
    tinta62: "rgba(23,19,16,.62)",
    tinta80: "rgba(23,19,16,.80)",
    // Branco liso em 14cm de altura lê como papel que não foi impresso. O clarão quente do
    // alto vira um creme de leve e o pé fecha num marfim — é o mesmo desenho da versão
    // preta, só que rebatido.
    // ⚠️ O ponto de equilíbrio é ESTREITO e o erro tem um nome: PERGAMINHO. Ornamento em
    // multiply cobre a folha inteira, e o que na versão preta era textura discreta vira,
    // sobre branco, um bege de diploma — a peça deixa de ser "fundo branco com detalhes
    // dourados" e vira papel envelhecido. Por isso todo valor de trama aqui é ~metade do
    // equivalente escuro, e o papel puxa pro branco puro no miolo em vez de partir do creme.
    papel: `radial-gradient(120% 44% at 50% 7%, ${A.brasa_claro}.07), ${A.brasa_claro}0) 68%),
            linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 52%, #FDFBF5 100%)`,
    // MULTIPLY, não screen: sobre branco, screen não escurece nada e todo ornamento
    // desapareceria sem erro nenhum no console.
    blend: "multiply",
    logo_blend: "normal",                   // o -claro já vem com alpha; blend estragaria
  } : {
    claro: false,
    cor: A.cor, alto: A.claro, brasa: A.brasa, metal: A.metal,
    tinta: "#ffffff",
    tinta62: "rgba(255,255,255,.62)",
    tinta80: "rgba(255,255,255,.80)",
    papel: `radial-gradient(118% 42% at 50% 8%, ${A.brasa}.20), ${A.brasa}0) 66%),
            linear-gradient(180deg, #14100A 0%, #0A0806 44%, #000 100%)`,
    blend: "screen",
    logo_blend: "screen",
  };
}

// TIPO DE CREDENCIAL — a tarja do pé. Isto não é enfeite: num corredor de evento, a única
// informação lida a três metros é a COR da tarja; ninguém lê a palavra. Staff precisa ser
// reconhecido sem que nada seja lido.
// O participante fica com o ouro (é a marca, e é a maioria da tiragem); quem precisa se
// destacar dele sai em cor contrastante. A prata do palestrante é a mesma do "MASTER" no
// logo, então nem ela é cor de fora.
// ⚠️ A PALETA DA TARJA MUDA COM O PAPEL, e não por gosto: ela é definida CONTRA o fundo do
// crachá. Na versão preta o palestrante é PRATA (a mesma do "MASTER" no logo) porque prata
// salta do preto; no papel branco a mesma prata some, e quem salta é o PRETO. O inverso vale
// pro imprensa, que no branco precisa clarear pra não virar o gêmeo do palestrante a três
// metros. Cor de tarja copiada de um fundo pro outro é o defeito que só aparece impresso.
function tipos(P){
  const c = P.claro;
  return {
    participante: { rotulo: "PARTICIPANTE", fundo: P.metal,                tinta: "#22160A" },
    palestrante:  { rotulo: "PALESTRANTE",  fundo: c ? "#14100A" : "#EAE7EB", tinta: c ? "#ffffff" : "#141418" },
    // CONVIDADO (pedido do dono, 2026-07-31). O azul é o acento da Imersão Master MAT no
    // deck, escurecido — não é cor de fora da marca, e é a única faixa do conjunto que não
    // se confunde com ouro, preto, vermelho ou cinza a três metros.
    convidado:    { rotulo: "CONVIDADO",    fundo: "#2B4C8C",              tinta: "#ffffff" },
    staff:        { rotulo: "STAFF",        fundo: "#D81F26",              tinta: "#ffffff" },
    imprensa:     { rotulo: "IMPRENSA",     fundo: c ? "#6E6C77" : "#3A3A42", tinta: "#ffffff" },
  };
}

function erro(msg){ console.error("erro:", msg); process.exit(1); }
function esc(s){
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function linhas(t){
  return esc(t).split("\n").map(l => `<span class="ln">${l}</span>`).join("");
}
function slug(s){
  return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function dataURI(p){
  const ext = path.extname(p).toLowerCase();
  const mime = ext === ".svg" ? "image/svg+xml"
             : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg"
             : ext === ".webp" ? "image/webp" : "image/png";
  return `data:${mime};base64,${fs.readFileSync(p).toString("base64")}`;
}

function proporcaoPNG(p){
  if(path.extname(p).toLowerCase() !== ".png") return null;
  const b = fs.readFileSync(p);
  if(b.length < 24 || b.toString("ascii", 12, 16) !== "IHDR") return null;
  const h = b.readUInt32BE(20);
  return h ? b.readUInt32BE(16) / h : null;
}

// O PNG do logo carrega fundo preto DENTRO do arquivo, e o fundo desta peça não é preto
// puro (tem clarão quente no alto e a roseta atrás) — o retângulo apareceria.
//
// ⚠️ A saída NÃO é o `-sem-fundo`. Aquele calcula `alpha = brilho`, então o dourado do
// logo sai SEMITRANSPARENTE: a roseta atravessa as letras do "MAT" e o metal perde
// saturação, virando um laranja lavado. Num carimbo pequeno de rodapé ninguém nota; num
// logo que ocupa metade do crachá é a peça inteira estragada.
// A saída certa pra logo CLARO sobre PRETO é blend `screen` no CSS: preto vira invisível
// sobre qualquer fundo e o ouro fica com 100% da cor original. Por isso aqui se usa o
// arquivo BRUTO (`bruto: true`) e o `.marca img{mix-blend-mode:screen}` faz o trabalho.
//
// SOBRE PAPEL BRANCO nada disso vale, e o motor troca de arquivo sozinho: `screen` sobre
// branco não escurece nada, então o logo inteiro sairia invisível. A versão certa é a
// `-claro` (`node motor/logo-fundo-claro.js <logo>.png`), que mantém o dourado com a cor
// exata do arquivo e INVERTE o que é neutro — o "MASTER", que é prata e no papel branco
// não existe, volta em tinta escura. Sem ela o motor para e diz o comando: sair com o
// lockup pela metade é o tipo de defeito que ninguém vê na tela e todo mundo vê impresso.
const JA_TRATADO = /-(sem-fundo|ouro|dourado|vibrante|branco|preto|tinta|claro)\.png$/i;
function achaLogo(nome, bruto, claro){
  if(!nome) return null;
  const tratado = JA_TRATADO.test(nome);
  let alvo = nome;
  if(claro && !tratado){
    const versaoClara = nome.replace(/\.png$/i, "-claro.png");
    if(!fs.existsSync(path.join(BASE, "marca", versaoClara)))
      erro(`fundo claro: falta a versão pra papel branco de "${nome}".\n` +
           `       rode: node motor/logo-fundo-claro.js ${nome}`);
    alvo = versaoClara;
  } else if(!bruto && !tratado){
    const semFundo = nome.replace(/\.png$/i, "-sem-fundo.png");
    if(fs.existsSync(path.join(BASE, "marca", semFundo))) alvo = semFundo;
  }
  const p = path.join(BASE, "marca", alvo);
  if(!fs.existsSync(p)) erro(`logo "${nome}" não existe em marca/.`);
  return { src: dataURI(p), prop: proporcaoPNG(p) || 1 };
}

function corpoNome(txt){
  const n = String(txt || "").split("\n").reduce((m, l) => Math.max(m, l.trim().length), 0);
  if(n <= 8)  return 68;
  if(n <= 11) return 58;
  if(n <= 14) return 49;
  if(n <= 18) return 41;
  if(n <= 24) return 34;
  return 29;
}

// ---------------------------------------------------------------------------
// ORNAMENTOS — o que tira a peça do "preto chapado com um logo no meio".
// Guilhoché, roseta e microtexto são a gramática visual de documento (cédula, diploma,
// ingresso), que é exatamente o que uma credencial quer parecer.
// ---------------------------------------------------------------------------
function ornamentos(P, microtexto){
  const micro = (esc(microtexto) + " · ").repeat(28);
  return `
  <div class="guilloche"></div>
  <div class="brasa"></div>
  <div class="lamina"></div>
  <!-- roseta: os anéis concêntricos do centro da cédula. Foi o segundo desenho — o
       primeiro era o selo Master MAT em marca d'água, e não serviu: o "MAT" é um bloco
       cheio de dourado e virava mancha retangular. Anel não é texto, não disputa leitura. -->
  <div class="roseta"></div>
  <div class="micro"><span>${micro}</span></div>`;
}

// A moldura mora DENTRO do corte, nunca na sangria: linha a 1,7mm da guilhotina sai
// tortíssima — a tolerância do corte é da ordem de 1mm, e o olho pega desalinho de fio
// numa peça de 10cm na hora. 4mm é o mínimo que sobrevive à variação da tiragem.
function moldura(){ return `<div class="moldura"><b></b><b></b><b></b><b></b></div>`; }

function regua(){ return `<div class="regua"><i></i><b></b><i></i></div>`; }

// ---------------------------------------------------------------------------
function estilo(d, P, tipo, eti){
  const tokens = fs.readFileSync(path.join(BASE, "marca/tokens.css"), "utf8");
  const C = P.claro;
  return `
${tokens}
*{margin:0;padding:0;box-sizing:border-box}
body{background:#3a3a3a}
.sangra{
  position:relative; overflow:hidden;
  width:${LARGURA + SANGRIA*2}px; height:${ALTURA + SANGRIA*2}px;
  font-family:var(--display); color:${P.tinta};
  /* O fundo é DESENHADO, não chapado: clarão quente no alto (a mesma temperatura do metal
     do logo) e queda pro extremo no pé. Chapado em 14cm de altura lê como falta de arte —
     vale pro preto e vale pro branco, que sem desenho parece papel que não foi impresso. */
  background:${P.papel};
}
/* .corte é o crachá de verdade — o que sobra depois da guilhotina. Tudo que é conteúdo
   mora aqui dentro; só o fundo e a tarja vazam pra sangria. */
.corte{position:absolute; left:${SANGRIA}px; top:${SANGRIA}px; width:${LARGURA}px; height:${ALTURA}px}

/* ---- ornamentos ----
   O blend sai da paleta: SCREEN clareia (serve ao preto) e MULTIPLY escurece (serve ao
   branco). O segundo fio de cada trama troca junto — no preto ele é branco, no branco ele
   é um cinza-quente; branco sobre papel branco em multiply é literalmente nada. */
.guilloche{
  position:absolute; inset:0; opacity:${C ? ".30" : ".55"}; mix-blend-mode:${P.blend};
  background:
    repeating-radial-gradient(circle at 14% 20%, ${P.brasa}0) 0 7px, ${P.brasa}${C ? ".09" : ".10"}) 7px 8px),
    repeating-radial-gradient(circle at 88% 80%, ${P.brasa}0) 0 9px, ${P.brasa}${C ? ".08" : ".09"}) 9px 10px),
    repeating-radial-gradient(circle at 50% 50%, ${C ? "rgba(120,100,70,0)" : "rgba(255,255,255,0)"} 0 13px, ${C ? "rgba(120,100,70,.025)" : "rgba(255,255,255,.03)"} 13px 14px);
}
.brasa{
  position:absolute; inset:0; mix-blend-mode:${P.blend};
  background:radial-gradient(62% 20% at 50% 15%, ${P.brasa}${C ? ".07" : ".30"}), ${P.brasa}0) 74%);
}
.lamina{
  position:absolute; inset:0; opacity:${C ? ".20" : ".5"}; mix-blend-mode:${P.blend};
  background:linear-gradient(104deg,
    ${C ? `${P.brasa}0) 34%, ${P.brasa}.05) 46%, ${P.brasa}.09) 50%, ${P.brasa}.04) 54%, ${P.brasa}0) 66%`
        : "rgba(255,255,255,0) 34%, rgba(255,255,255,.05) 46%, rgba(255,255,255,.10) 50%, rgba(255,255,255,.04) 54%, rgba(255,255,255,0) 66%"});
}
.roseta{
  position:absolute; left:50%; top:${SANGRIA + 52*MM}px; transform:translate(-50%,-50%);
  width:${76*MM}px; height:${76*MM}px; pointer-events:none; mix-blend-mode:${P.blend};
  background:
    repeating-radial-gradient(circle at 50% 50%, ${P.brasa}0) 0 4.5px, ${P.brasa}${C ? ".16" : ".30"}) 4.5px 5.2px),
    repeating-radial-gradient(circle at 50% 50%, ${C ? "rgba(120,100,70,0)" : "rgba(255,255,255,0)"} 0 15px, ${C ? "rgba(120,100,70,.05)" : "rgba(255,255,255,.12)"} 15px 15.7px);
  -webkit-mask-image:radial-gradient(circle at 50% 50%, rgba(0,0,0,.28) 0%, #000 46%, transparent 72%);
          mask-image:radial-gradient(circle at 50% 50%, rgba(0,0,0,.28) 0%, #000 46%, transparent 72%);
}
/* A faixa de microtexto vive logo abaixo da zona do cordão — é o filete que separa o furo
   da arte. No pé não há lugar fixo pra ela: lá embaixo o campo da etiqueta e a tarja
   ocupam tudo, e faixa ancorada no rodapé acabaria debaixo de uma das duas. */
.micro{
  position:absolute; left:0; right:0; top:${SANGRIA + 15*MM}px;
  height:12px; overflow:hidden; opacity:${C ? ".52" : ".34"};
  -webkit-mask-image:linear-gradient(90deg, transparent, #000 20%, #000 80%, transparent);
          mask-image:linear-gradient(90deg, transparent, #000 20%, #000 80%, transparent);
}
.micro span{
  display:block; white-space:nowrap; font-size:5px; font-weight:700;
  letter-spacing:.42em; text-transform:uppercase; color:${P.alto};
}
/* dentro do CORTE, a 4mm da guilhotina — ver o comentário em moldura() */
.moldura{
  position:absolute; left:${4*MM}px; right:${4*MM}px; top:${4*MM}px; bottom:${(TARJA_MM+4)*MM}px;
  border:.75px solid ${P.brasa}${C ? ".55" : ".34"}); border-radius:2px; pointer-events:none;
}
.verso .moldura{bottom:${4*MM}px}
.moldura b{position:absolute; width:22px; height:22px; border:1.5px solid ${P.cor}}
.moldura b:nth-child(1){top:-1px;    left:-1px;  border-right:0; border-bottom:0}
.moldura b:nth-child(2){top:-1px;    right:-1px; border-left:0;  border-bottom:0}
.moldura b:nth-child(3){bottom:-1px; left:-1px;  border-right:0; border-top:0}
.moldura b:nth-child(4){bottom:-1px; right:-1px; border-left:0;  border-top:0}
/* A régua é o METAL, não um dourado chapado: mesma liga do logo. */
.regua{display:flex; align-items:center; justify-content:center; gap:7px}
.regua i{width:52px; height:1.25px; background:${P.metal}}
.regua b{width:5px; height:5px; background:${P.alto}; transform:rotate(45deg)}

/* VÉU DA MARCA — a mesma lógica de véu do resto do projeto (o assunto tem que ganhar do
   fundo), só que aqui por uma razão técnica: o logo entra em blend screen, e screen SOMA
   o que estiver atrás. Sobre a roseta, os anéis apareciam DENTRO das letras do "MAT" e o
   metal virava um ouro riscado. Um bolsão de preto puro sob o logo devolve a cor exata do
   arquivo; fora dele a textura e o clarão quente continuam. Apagar a roseta inteira também
   resolveria — e deixaria o fundo chapado, que é o que o dono não quer. */
/* No papel BRANCO o bolsão é de PAPEL, e por outra razão: aqui o logo é um PNG opaco e não
   precisa de fundo preto pra ter cor. O que o véu faz é limpar a trama e a roseta de baixo
   da marca — anel de guilhoché atravessando o "MASTER" em tinta fina é o que faz a peça
   parecer impressa por cima de outra coisa. Por isso ele é bem mais fraco que o preto. */
.veu{
  position:absolute; left:0; right:0; top:${13*MM}px; height:${76*MM}px;
  background:radial-gradient(64% 56% at 50% 44%,
    ${C ? "#FFFDF8 0%, rgba(255,253,248,.90) 42%, rgba(255,253,248,0) 78%"
        : "#000 0%, rgba(0,0,0,.94) 40%, rgba(0,0,0,0) 78%"});
}
/* no verso o lockup é pequeno e mora só no topo — o bolsão acompanha */
.verso .veu{top:${9*MM}px; height:${24*MM}px;
  background:radial-gradient(52% 74% at 50% 50%,
    ${C ? "#FFFDF8 0%, rgba(255,253,248,.88) 46%, rgba(255,253,248,0) 82%"
        : "#000 0%, rgba(0,0,0,.92) 46%, rgba(0,0,0,0) 82%"});}

/* ---- A MARCA: o andar que ocupa a maior parte da peça ---- */
.marca{
  position:absolute; left:${SEGURA}px; right:${SEGURA}px;
  top:${(d.composicao === "lockup" ? 40 : 20)*MM}px; text-align:center;
}
/* screen: o preto do arquivo some, o ouro fica com a cor cheia. Ver achaLogo().
   No papel branco o blend vira normal: lá o arquivo já é a versão -claro, com alpha
   de verdade, e screen sobre branco devolveria branco. */
.marca img{display:block; margin:0 auto; max-width:100%; mix-blend-mode:${P.logo_blend}}
/* "IMERSÃO" entre dois fios, no metal — é EXATAMENTE como a palavra aparece dentro do
   lockup original (marca/imersao-master-mat.png). Aqui ela é remontada por cima do selo
   empilhado porque o lockup deitado tem proporção 5,76:1 e, na largura do crachá, viraria
   uma tira de 15mm de altura: o oposto de "ocupada majoritariamente pela logo".
   ⚠️ Isto RECOMPÕE elementos existentes da marca na tipografia dela — não inventa nada —
   mas ainda é um arranjo novo. A versão composicao:lockup usa o arquivo original intacto,
   e sai no mesmo comando pra comparação. */
/* margem ZERO: o arquivo do selo já traz ~5mm de respiro preto dentro dele, e somar uma
   margem CSS a essa folga abria um vão que separava a palavra do resto do lockup. */
.imersao{
  display:flex; align-items:center; justify-content:center; gap:14px; margin-bottom:0;
}
.imersao i{flex:1; max-width:${11*MM}px; height:1.25px; background:${P.metal}}
.imersao span{
  font-size:17px; font-weight:600; letter-spacing:.46em; text-transform:uppercase;
  background:${P.metal}; -webkit-background-clip:text; background-clip:text; color:transparent;
  padding-left:.46em;   /* devolve o tracking da última letra, senão o metal fica torto */
}
.evento{
  margin-top:${6*MM}px; font-size:10px; font-weight:700; letter-spacing:.32em;
  text-transform:uppercase; color:${P.tinta62};
}

/* ---- O CAMPO DA ETIQUETA ----
   Branco e chapado de propósito: a etiqueta é branca, e sobre arte escura ela viraria um
   remendo colado. Dentro de um campo branco ela desaparece — e o campo ainda funciona
   sozinho, à caneta, quando a etiqueta não chega. O fio dourado em volta é o que o
   transforma de "buraco na arte" em elemento desenhado. */
/* ⚠️ NO PAPEL BRANCO o campo deixa de ser um bolsão claro dentro do escuro e vira o que
   sempre foi por baixo: uma ÁREA RESERVADA. Não há mais o que "abrir" no fundo — o que
   precisa existir é a delimitação, senão a etiqueta é colada no olho de quem monta e cada
   crachá da tiragem sai com ela num lugar. Por isso o anel de preto do modelo escuro sai
   (ele viraria um contorno sujo no papel) e sobra fio dourado com sombra quente de leve. */
.etiqueta{
  position:absolute; left:50%; transform:translateX(-50%);
  top:${eti.topo*MM}px; width:${eti.largura*MM}px; height:${eti.altura*MM}px;
  background:${eti.fundo}; border-radius:3px;
  box-shadow:${C
    ? `0 0 0 1.25px ${P.cor}, 0 0 0 3.5px rgba(255,255,255,.9), 0 2px 10px ${P.brasa}.22)`
    : `0 0 0 1.25px ${P.cor}, 0 0 0 4px rgba(0,0,0,.55), 0 6px 18px rgba(0,0,0,.5)`};
}
/* dica impressa MUITO discreta, no pé do campo: se a etiqueta cobrir, some junto; se não
   chegar etiqueta nenhuma, ela diz o que escrever ali. */
.etiqueta .dica{
  position:absolute; left:0; right:0; bottom:${2.5*MM}px; text-align:center;
  font-size:7px; font-weight:700; letter-spacing:.34em; text-transform:uppercase;
  color:rgba(0,0,0,.26);
}
/* nome IMPRESSO — só quando "etiqueta": false */
.nomeCampo{
  position:absolute; left:${9*MM}px; right:${9*MM}px;
  top:${eti.topo*MM}px; height:${eti.altura*MM}px;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  text-align:center;
}
.nome{
  font-size:${corpoNome(d.nome)}px; font-weight:900; line-height:1.04;
  letter-spacing:-.015em; text-transform:uppercase; color:${P.tinta};
}
.nome .ln{display:block; white-space:nowrap}
.detalhe{
  margin-top:12px; font-size:12px; font-weight:500; line-height:1.4;
  color:${P.tinta80};
}
.detalhe .ln{display:block}

/* ---- tarja do tipo: SANGRA nos três lados de baixo ----
   Ela vaza de propósito. Tarja com margem em volta vira adesivo colado; sangrada vira
   parte do objeto. E é a cor dela que identifica a pessoa de longe. */
.tarja{
  position:absolute; left:0; right:0; bottom:0;
  height:${TARJA + SANGRIA}px; background:${tipo.fundo};
  display:flex; align-items:center; justify-content:center;
  padding-bottom:${SANGRIA}px;   /* o texto centra no CORTE, não na sangria */
}
/* ⚠️ O TRACKING CAI QUANDO O CORPO SOBE, e não é preferência: a .30em de um corpo de 17px
   são 5px entre letras; a 34px viram 10px, e "PARTICIPANTE" passa de 208 pra mais de 500px
   — encostaria na margem de segurança dos dois lados. Letra maior com espaço menor é
   exatamente o que foi pedido. O corpo ainda é MEDIDO e encolhido em tira(): rótulo custom
   mais longo que "PARTICIPANTE" quebraria a conta em silêncio. */
.tarja .txt{
  font-size:${d.tarja_corpo || 34}px; font-weight:900; letter-spacing:.18em;
  text-transform:uppercase; color:${tipo.tinta}; white-space:nowrap;
  padding-left:.18em;   /* devolve o tracking da última letra, senão a palavra sai torta */
}
/* A sombra sobre a tarja existe pra ela não parecer adesivo colado. No papel branco a
   sombra preta suja o marfim; ali o que separa é um fio dourado, na mesma liga da moldura. */
.tarja::before{
  content:""; position:absolute; left:0; right:0; top:-14px; height:14px;
  background:${C ? "none" : "linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,.55))"};
}
${!C ? "" : `.tarja::after{
  content:""; position:absolute; left:0; right:0; top:0; height:1.25px; background:${P.metal};
}`}

/* ---- verso ----
   Coluna em FLUXO, não blocos absolutos: com posição fixa o QR ficava ancorado no rodapé
   e a lista crescia por cima dele. Em fluxo, cada elemento empurra o seguinte. */
.verso .corpo{
  position:absolute; left:${SEGURA}px; right:${SEGURA}px;
  top:${CORDAO}px; bottom:${SEGURA}px;
  display:flex; flex-direction:column; align-items:center;
}
.verso .corpo img{display:block; mix-blend-mode:${P.logo_blend}}
.verso .pe img{mix-blend-mode:normal}   /* a RM Treinamentos já vem recortada */
.verso .micro{top:${SANGRIA + 22*MM}px}
.lista{width:100%; margin-top:${9*MM}px}
.lista h2{
  font-size:11px; font-weight:800; letter-spacing:.30em; text-transform:uppercase;
  color:${P.alto}; margin-bottom:13px; text-align:center;
}
.lista ul{list-style:none}
.lista li{
  display:flex; gap:9px; align-items:baseline;
  font-size:12.5px; font-weight:500; line-height:1.42; color:${P.tinta80};
  padding:6.5px 2px; border-bottom:.5px solid ${C ? "rgba(23,19,16,.14)" : "rgba(255,255,255,.10)"};
}
.lista li:last-child{border-bottom:0}
/* min-width, senão cada descrição começa num x diferente: "08h30" e "Wi-Fi" não têm a
   mesma largura, e sem a coluna fixa a segunda coluna sai serrilhada. */
.lista li b{color:${P.cor}; font-weight:800; flex:none; min-width:${9*MM}px}
.folga{flex:1; min-height:${5*MM}px}
/* No papel branco o quadrado branco do QR desapareceria: ele vira só o fio dourado em volta
   da área que o leitor precisa enxergar limpa. */
.qr{
  width:${19*MM}px; height:${19*MM}px; background:#fff; padding:4px; border-radius:3px;
  margin-bottom:${6*MM}px; flex:none;
  ${C ? `box-shadow:0 0 0 1px ${P.brasa}.55);` : ""}
}
.qr img{width:100%; height:100%; display:block}
.qr .vazio{
  width:100%; height:100%; border:1px dashed rgba(0,0,0,.35); border-radius:2px;
  display:flex; align-items:center; justify-content:center;
  font-size:7px; font-weight:700; letter-spacing:.14em; color:rgba(0,0,0,.45);
  text-align:center; padding:4px;
}
/* ⚠️ A RM Treinamentos do papel branco é a -sem-fundo, e nela o alpha É a arte: o ocre do
   "R" fica em ~76% de opacidade de propósito. Sobre preto isso nunca apareceu (atrás havia
   preto), mas sobre a trama dourada os anéis do guilhoché atravessam a marca e ela sai
   riscada. O bolsão de papel atrás resolve sem mexer no arquivo da marca. */
.pe{text-align:center; flex:none;
  ${C ? "background:radial-gradient(62% 58% at 50% 40%, #fff 0%, rgba(255,255,255,.94) 52%, rgba(255,255,255,0) 78%);" : ""}}
.pe img{display:block; margin:0 auto; opacity:${C ? "1" : ".72"}}
.pe .site{
  margin-top:10px; font-size:9px; font-weight:600; letter-spacing:.26em;
  text-transform:uppercase; color:${C ? "rgba(23,19,16,.50)" : "rgba(255,255,255,.50)"};
}

/* ---- guias de prova (NUNCA no arquivo que vai pra gráfica) ---- */
.guias{position:absolute; inset:0; pointer-events:none; z-index:99}
.guias .corteL{position:absolute; inset:${SANGRIA}px; outline:1px dashed #ff2d95}
.guias .seg{position:absolute; inset:${SANGRIA + SEGURA}px; outline:1px dashed #00e5ff}
.guias .furo{
  position:absolute; left:50%; transform:translateX(-50%); top:${SANGRIA + 5*MM}px;
  width:${18*MM}px; height:${4*MM}px; border:1px dashed #ffd400; border-radius:99px;
}
.guias .cota{
  position:absolute; bottom:2px; left:4px; font-size:7px; font-weight:700;
  letter-spacing:.10em; color:#ff2d95; font-family:var(--corpo);
}
.guias .cotaEti{
  position:absolute; left:50%; transform:translateX(-50%);
  top:${SANGRIA + (eti.topo + eti.altura)*MM + 5}px;
  font-size:8px; font-weight:800; letter-spacing:.08em; color:#00ff9d;
  font-family:var(--corpo); white-space:nowrap;
}
/* Com a área RESERVADA (nada impresso), a prova é o único lugar onde ela existe — e sem
   ela quem cola a etiqueta na produção não tem referência nenhuma, e as 300 saem com o
   nome em 300 alturas. Só na prova; no arquivo de gráfica não há traço algum. */
.guias .areaEti{
  position:absolute; left:50%; transform:translateX(-50%);
  top:${SANGRIA + eti.topo*MM}px; width:${eti.largura*MM}px; height:${eti.altura*MM}px;
  border:1px dashed #00ff9d; border-radius:3px;
}`;
}

// medidas do campo da etiqueta, em mm
//
// SÃO TRÊS ESTADOS, e confundi-los muda o que a tiragem é:
//   · objeto    → o campo DESENHADO (fio dourado em volta). Uma arte por TIPO.
//   · null      → área RESERVADA e não impressa: a etiqueta é colada no branco do papel.
//                 Uma arte por tipo, igual. É o pedido do dono em 2026-07-31, e no papel
//                 branco ele faz sentido — o campo era um retângulo branco DENTRO do preto,
//                 e sobre papel branco ele virou moldura em volta de nada.
//   · false     → o nome IMPRESSO. Aí a tiragem passa a ser uma arte por PESSOA.
function campoEtiqueta(d){
  // Com `etiqueta: null` a medida não some junto: ela migra pro `area_nome`, porque a cota
  // continua sendo entregável — quem compra a etiqueta precisa do número, e quem cola
  // precisa da altura. O que sumiu foi o desenho, não a medida.
  const base = (d.etiqueta && typeof d.etiqueta === "object") ? d.etiqueta
             : (d.etiqueta === null && d.area_nome && typeof d.area_nome === "object") ? d.area_nome
             : {};
  const e = base;
  return {
    largura: Number(e.largura) || 84,
    altura:  Number(e.altura)  || 32,
    topo:    Number(e.topo)    || 90,
    fundo:   e.fundo || "#ffffff",
    dica:    e.dica === undefined ? "Nome do participante" : e.dica,
  };
}

function blocoMarca(d, P){
  const composicao = d.composicao || "empilhado";
  if(composicao === "lockup"){
    // O arquivo original, intacto, na maior largura que a margem permite.
    const l = achaLogo(d.logo || "imersao-master-mat.png", true, P.claro);
    const larg = Number(d.logo_largura) || 86;      // mm
    return `<img style="width:${larg*MM}px" src="${l.src}" alt="">`;
  }
  // EMPILHADO: "IMERSÃO" remontado no metal + o selo Master MAT grande embaixo.
  const selo = achaLogo(d.logo_selo || "master-mat.png", true, P.claro);
  const larg = Number(d.logo_largura) || 74;        // mm
  return `
      <div class="imersao"><i></i><span>Imersão</span><i></i></div>
      <img style="width:${larg*MM}px" src="${selo.src}" alt="">`;
}

function paginaFrente(d, P, tipo, eti){
  const impresso = d.etiqueta === false;
  const vazio    = d.etiqueta === null;   // área reservada, sem nada impresso nela
  return `<!doctype html><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap">
<style>${estilo(d, P, tipo, eti)}</style>
<div class="sangra">
  ${ornamentos(P, d.microtexto || d.marca || "Imersão Master MAT")}
  <div class="corte">
    <div class="veu"></div>
    ${moldura()}
    <div class="marca">
      ${blocoMarca(d, P)}
      ${d.evento ? `<div class="evento">${esc(d.evento)}</div>` : ""}
    </div>
    ${impresso
      ? `<div class="nomeCampo">
           ${regua()}
           <div class="nome" style="margin-top:16px">${linhas(d.nome || "")}</div>
           ${d.detalhe ? `<div class="detalhe">${linhas(d.detalhe)}</div>` : ""}
         </div>`
      : vazio ? ""
      : `<div class="etiqueta">${eti.dica ? `<div class="dica">${esc(eti.dica)}</div>` : ""}</div>`}
  </div>
  <div class="tarja"><span class="txt">${esc(d.tarja || tipo.rotulo)}</span></div>
  ${!d.guias ? "" : `<div class="guias">
    <div class="corteL"></div><div class="seg"></div><div class="furo"></div>
    ${impresso ? "" : `<div class="cotaEti">${vazio ? "área reservada pro nome (não impressa)" : "campo da etiqueta"}: ${eti.largura} × ${eti.altura} mm</div>`}
    ${!vazio ? "" : `<div class="areaEti"></div>`}
    <div class="cota">PROVA · rosa = corte 100×140mm · ciano = margem segura · amarelo = furo do cordão</div>
  </div>`}
</div>`;
}

function paginaVerso(d, P, tipo, eti){
  const logo = achaLogo(d.logo || "imersao-master-mat.png", true, P.claro);
  // ⚠️ O rodapé NÃO segue a regra do `-claro`: a RM Treinamentos não é dourada nem prata,
  // é ocre + vinho + bordô, uma paleta que já nasceu pra fundo claro. No papel branco vale
  // o `-sem-fundo` (as cores originais, recortadas); no preto vale a `-branco`.
  const pe = achaLogo(d.logo_rodape || (P.claro ? "rm-treinamentos-sem-fundo.png" : "rm-treinamentos-branco.png"));
  const itens = Array.isArray(d.verso_itens) ? d.verso_itens : [];
  const qrArq = d.qr ? path.join(BASE, "imagens", d.qr) : null;
  return `<!doctype html><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap">
<style>${estilo(d, P, tipo, eti)}</style>
<div class="sangra verso">
  ${ornamentos(P, d.microtexto || d.marca || "Imersão Master MAT")}
  <div class="corte">
    <div class="veu"></div>
    ${moldura()}
    <div class="corpo">
      <img style="width:${52*MM}px" src="${logo.src}" alt="">
      ${!itens.length ? "" : `<div class="lista">
        <h2>${esc(d.verso_titulo || "Programação")}</h2>
        <ul>${itens.map(i => {
          const [a, ...resto] = String(i).split("|");
          return resto.length
            ? `<li><b>${esc(a.trim())}</b><span>${esc(resto.join("|").trim())}</span></li>`
            : `<li><span>${esc(a.trim())}</span></li>`;
        }).join("")}</ul>
      </div>`}
      <div class="folga"></div>
      ${d.qr === undefined ? "" : `<div class="qr">${
        qrArq && fs.existsSync(qrArq)
          ? `<img src="${dataURI(qrArq)}" alt="">`
          : `<div class="vazio">QR DO<br>CHECK-IN</div>`}</div>`}
      <div class="pe">
        <img style="width:${22*MM}px" src="${pe.src}" alt="">
        ${d.site ? `<div class="site">${esc(d.site)}</div>` : ""}
      </div>
    </div>
  </div>
  ${!d.guias ? "" : `<div class="guias">
    <div class="corteL"></div><div class="seg"></div><div class="furo"></div>
    <div class="cota">PROVA · verso</div>
  </div>`}
</div>`;
}

// ---------------------------------------------------------------------------
(async () => {
  const arq = process.argv[2];
  if(!arq) erro("uso: node motor/credencial.js conteudo/credenciais/<arquivo>.json");
  const caminho = path.isAbsolute(arq) ? arq : path.join(BASE, arq);
  if(!fs.existsSync(caminho)) erro(`arquivo não encontrado: ${arq}`);
  const cfg = JSON.parse(fs.readFileSync(caminho, "utf8"));

  const A = ACENTOS[cfg.acento || "ouro"];
  if(!A) erro(`acento "${cfg.acento}" não existe. Use ${Object.keys(ACENTOS).join(" ou ")}.`);

  // `fundo`: "claro" é o crachá de PAPEL BRANCO com os detalhes em dourado (pedido do dono,
  // 2026-07-31); "escuro" é o preto original. Não é um filtro por cima da mesma arte — o
  // motor troca a liga do metal, o blend dos ornamentos, a cor de cada tarja e o ARQUIVO do
  // logo. Fundo trocado à mão no CSS sairia com metade da peça invisível.
  const fundo = String(cfg.fundo || "escuro").toLowerCase();
  if(!["claro", "escuro"].includes(fundo)) erro(`fundo "${cfg.fundo}" não existe. Use claro ou escuro.`);
  const P = paleta(A, fundo === "claro");

  const TIPOS = tipos(P);
  const hd = Math.min(4, Math.max(1, Number(cfg.hd) || 2));
  const eti = campoEtiqueta(cfg);
  TARJA_MM = Math.max(12, Number(cfg.tarja_altura) || 18);
  TARJA = TARJA_MM * MM;

  // O QUE É UM ARQUIVO DE SAÍDA mudou com a etiqueta. Com o nome IMPRESSO, a tiragem é uma
  // arte por PESSOA. Com etiqueta, o nome entra depois: a arte passa a ser uma por TIPO de
  // credencial, e o mesmo PNG rende as 300 cópias de participante.
  const comEtiqueta = cfg.etiqueta !== false;
  const lote = comEtiqueta
    ? (cfg.tipos || ["participante"]).map(t => ({ tipo: t, arquivo_saida: t }))
    : (Array.isArray(cfg.pessoas) && cfg.pessoas.length
        ? cfg.pessoas
        : [{ nome: cfg.nome || "NOME DO\nPARTICIPANTE", arquivo_saida: "modelo" }]);

  // As duas composições saem juntas quando o dono não fixou uma: o empilhado RECOMPÕE a
  // marca (IMERSÃO remontado sobre o selo) e o lockup usa o arquivo intacto. A escolha
  // entre respeitar o arquivo e ocupar a peça é dele, não minha — e comparar duas provas
  // decide em cinco segundos o que um parágrafo de explicação não decide.
  const composicoes = cfg.composicao ? [cfg.composicao] : ["empilhado", "lockup"];

  const destino = path.join(BASE, "saida", "credenciais");
  fs.mkdirSync(destino, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: LARGURA + SANGRIA*2, height: ALTURA + SANGRIA*2 },
    deviceScaleFactor: hd,
  });

  async function tira(html, nome, temNome){
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    if(temNome){
      // AJUSTE DO NOME — medido, depois das fontes carregarem. A régua por contagem de
      // caractere é chute bom, e chute bom ainda erra. Em papel isso importa mais que em
      // tela: nome estourando a margem sai raspado pela guilhotina, e não tem como refazer
      // sem reimprimir a tiragem.
      const aj = await page.evaluate(() => {
        const el = document.querySelector(".nome");
        if(!el) return null;
        const caixa = el.parentElement;
        const de = parseFloat(getComputedStyle(el).fontSize);
        const largo = () => [...el.querySelectorAll(".ln")].some(l => l.scrollWidth > el.clientWidth);
        const alto  = () => caixa.scrollHeight > caixa.clientHeight;
        let px = de;
        while(px > 18 && (largo() || alto())){ px -= 1; el.style.fontSize = px + "px"; }
        return { de, para: px, ainda: largo() || alto() };
      });
      if(aj && aj.para < aj.de) console.log(`    nome de ${aj.de}px -> ${aj.para}px`);
      if(aj && aj.ainda)
        console.warn(`    AVISO: o nome não coube nem em 18px em "${nome}". Quebre com \\n.`);
    }
    // AJUSTE DA TARJA — mesma disciplina do nome, e pela mesma razão. Com o corpo em 34px a
    // palavra mais longa do conjunto ("PARTICIPANTE") ainda sobra dentro da margem, mas um
    // `tarja` custom ("PALESTRANTE CONVIDADO") estouraria em silêncio e sairia raspado pela
    // guilhotina. Aqui não há quebra de linha possível: tarja é uma linha só, então o
    // recurso é encolher.
    const at = await page.evaluate((max) => {
      const el = document.querySelector(".tarja .txt");
      if(!el) return null;
      const de = parseFloat(getComputedStyle(el).fontSize);
      let px = de;
      while(px > 14 && el.getBoundingClientRect().width > max){
        px -= 1; el.style.fontSize = px + "px";
      }
      return { de, para: px, ainda: el.getBoundingClientRect().width > max };
    }, LARGURA - SEGURA*2);
    if(at && at.para < at.de) console.log(`    tarja de ${at.de}px -> ${at.para}px`);
    if(at && at.ainda) console.warn(`    AVISO: a tarja não coube nem em 14px em "${nome}".`);

    const saida = path.join(destino, `${nome}.png`);
    await page.locator(".sangra").screenshot({ path: saida });
    console.log(`gerado: ${path.relative(BASE, saida)}`);
  }

  console.log(`credencial 100×140mm + 3mm de sangria · fundo ${fundo} · acento ${cfg.acento || "ouro"} · ${hd}× (${(LARGURA+SANGRIA*2)*hd}×${(ALTURA+SANGRIA*2)*hd}px)`);
  console.log(`tarja: ${TARJA_MM}mm de altura, rótulo em ${cfg.tarja_corpo || 34}px`);
  if(comEtiqueta) console.log(`campo da etiqueta: ${eti.largura} × ${eti.altura} mm, a ${eti.topo}mm do topo`);

  for(const comp of composicoes){
    console.log(`\n[${comp}]`);
    for(const p of lote){
      const d = { ...cfg, ...p, composicao: comp };
      delete d.pessoas; delete d.tipos;
      const tipo = TIPOS[d.tipo || "participante"];
      if(!tipo) erro(`tipo "${d.tipo}" não existe. Use: ${Object.keys(TIPOS).join(", ")}.`);
      const base = d.arquivo_saida || slug(d.nome);
      const nome = composicoes.length > 1 ? `${comp}-${base}` : base;
      console.log(`  ${comEtiqueta ? tipo.rotulo : (d.nome || "").replace(/\n/g, " ")}`);
      // `guias: false` FORÇADO no arquivo de gráfica: o `guias` do topo do JSON se espalha
      // pra cada item no spread, e sem isso o arquivo bom sairia com as linhas de prova
      // impressas dentro — defeito que só se descobre com a tiragem na mão.
      await tira(paginaFrente({ ...d, guias: false }, P, tipo, eti), `frente-${nome}`, !comEtiqueta);
      if(d.guias) await tira(paginaFrente({ ...d, guias: true }, P, tipo, eti), `_PROVA-frente-${nome}`, !comEtiqueta);
    }
  }

  // O verso é o MESMO pra todo mundo (programação, regras, QR) — uma arte só, impressa
  // atrás de todas. Gerar um verso por tipo só encheria a pasta.
  if(cfg.verso !== false){
    console.log("");
    const tipo = TIPOS[cfg.tipo || "participante"];
    await tira(paginaVerso({ ...cfg, guias: false }, P, tipo, eti), "verso", false);
    if(cfg.guias) await tira(paginaVerso({ ...cfg, guias: true }, P, tipo, eti), "_PROVA-verso", false);
  }

  await page.close();
  await browser.close();
  console.log(
    `\npra gráfica: os arquivos SEM "_PROVA" no nome, em 10,6 × 14,6 cm (já com sangria).\n` +
    `peça corte final em 10 × 14 cm e PRETO RICO na conversão pra CMYK.`
  );
})();
