// motor-slides.js — lê um JSON de aula e cospe um .pptx editável.
// Uso:  node motor-slides.js conteudo/aula-11-sdr.json
//
// Formato NOVO (deck 16:9), separado do motor de feed do Instagram.
// O motor de feed (marketing-instagram/motor/) faz 1080x1350 e não é tocado aqui.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const sharp = require("sharp");
const pptxgen = require("pptxgenjs");

const BASE = __dirname;
const ACERVO = path.resolve(BASE, "..", "marketing-instagram");

// ---------- tokens (espelham marca/tokens.css) ----------
const PRETO = "0B0B0C";  // tinta
const PAPEL = "FFFFFF";
const OURO = "F4B661";   // acento
const OURO2 = "F3C223";  // apoio
const CINZA = "9A9A9A";  // suave
const VERMELHO = "E5484D"; // só pra marcar o que NÃO fazer

// ---------- os dois TEMAS ----------
// Os modelos do dono (`Modelos/`) são dois dialetos do mesmo deck: a gramática é a
// mesma (título em caixa alta com uma palavra em ouro, régua dourada embaixo, foto,
// uma linha de fecho, logo no rodapé ESQUERDO), mas a voz é outra.
//
//   summit — "O propósito". Montserrat, fundo preto, a foto entra EMOLDURADA em ouro.
//            O título mistura pesos na mesma frase (leve + forte + ouro): é a mistura
//            que dá o ritmo, não o tamanho.
//   mat    — "Comercial para motoristas". Rubik One, um peso só (a fonte já é pesada
//            demais pra misturar), e a foto SANGRA por trás de tudo, com véu à esquerda.
//
// As fontes foram instaladas no perfil do Windows (não eram nativas). Se um dia o deck
// abrir em outra máquina sem elas, o PowerPoint substitui e o layout dança.
// `pesa` = a família tem pesos pra misturar. `alta` = o CORPO do texto também vai em
// caixa alta (no MAT vai; no summit só o título — parágrafo de história em maiúscula
// vira paredão e ninguém lê).
// `largura` = largura média de uma MAIÚSCULA, em em. É o que permite prever se a linha
// cabe. Não é o mesmo número pras duas: a Rubik One é pesada mas ESTREITA (0.66); a
// Montserrat ExtraBold é larga (0.78). Usar um número só faz o título de uma delas
// rachar em cinco linhas ou o da outra sair pequeno à toa.
const TEMAS = {
  summit: { fonte: "Montserrat", leve: "Montserrat Light", forte: "Montserrat ExtraBold",
            display: "Montserrat Black", pesa: true, alta: false, largura: 0.78 },
  mat:    { fonte: "Rubik One", leve: "Rubik One", forte: "Rubik One",
            display: "Rubik One", pesa: false, alta: true, largura: 0.72 },
};
let T = TEMAS.summit;                 // trocado em main() pelo "tema" do JSON
let FONTE = T.fonte, FONTE_TIT = T.forte, FONTE_LEVE = T.leve;

const L = 13.333, A = 7.5;          // 16:9 em polegadas
const MG = 0.9;                      // margem
const COL = L - MG * 2;              // largura útil
const FIM_X = 5.6;                   // onde a foto do fecho começa

// A caixa que cada layout reserva pra foto — é dela que sai a proporção do corte.
// Foto que SANGRA usa o slide inteiro; foto EMOLDURADA usa a caixa da moldura.
const SANGRA = { w: L, h: A };
const CAIXA = {
  moldura:    { w: 6.2, h: 4.25 },   // layout "foto": a moldura à direita
  capa:       { w: 5.4, h: 6.05 },   // capa com moldura: retrato alto
  duas_fotos: { w: 5.18, h: 4.0 },   // cada uma das duas
  final:      { w: L - FIM_X, h: A },
};

// ---------- véu: PNG de gradiente, gerado na unha ----------
// Retângulo com transparência dá banda visível sobre foto. Um PNG de gradiente
// real resolve, e o pptx aceita imagem embutida em base64.
function crc32(buf){
  let c, tabela = crc32.t || (crc32.t = (() => {
    const t = [];
    for(let n = 0; n < 256; n++){
      c = n;
      for(let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for(const b of buf) crc = tabela[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(tipo, dados){
  const tam = Buffer.alloc(4); tam.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, "ascii"), dados]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tam, corpo, crc]);
}
// paradas: [{ p: 0..1, a: 0..1 }] — p = posição no eixo, a = opacidade do preto
function veu(direcao, paradas){
  const N = 256;
  const horizontal = direcao === "esquerda" || direcao === "direita";
  const w = horizontal ? N : 1, h = horizontal ? 1 : N;
  const linhas = [];
  const alfaEm = (t) => {
    for(let i = 0; i < paradas.length - 1; i++){
      const a = paradas[i], b = paradas[i + 1];
      if(t >= a.p && t <= b.p){
        const k = b.p === a.p ? 0 : (t - a.p) / (b.p - a.p);
        return a.a + (b.a - a.a) * k;
      }
    }
    return paradas[paradas.length - 1].a;
  };
  for(let y = 0; y < h; y++){
    const linha = [0];                       // filtro 0 (none)
    for(let x = 0; x < w; x++){
      let t = horizontal ? x / (N - 1) : y / (N - 1);
      if(direcao === "direita" || direcao === "baixo") t = 1 - t;
      linha.push(0x0b, 0x0b, 0x0c, Math.round(alfaEm(t) * 255));
    }
    linhas.push(Buffer.from(linha));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;                  // 8 bits, RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(linhas))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return "image/png;base64," + png.toString("base64");
}
// O texto sempre tem que ganhar da foto: escuro onde a letra pousa.
// VEU_ESQ escurece a ESQUERDA (capa: título à esquerda, rosto respira à direita).
// VEU_EMENDA escurece a borda onde a foto encosta no painel preto — sem ele a
// emenda vira uma linha dura entre o preto do slide e o claro da foto.
const VEU_ESQ = veu("esquerda", [{ p: 0, a: 0.94 }, { p: 0.42, a: 0.86 }, { p: 0.78, a: 0.35 }, { p: 1, a: 0.15 }]);
const VEU_EMENDA = veu("esquerda", [{ p: 0, a: 0.97 }, { p: 0.28, a: 0.7 }, { p: 0.68, a: 0.32 }, { p: 1, a: 0.18 }]);

// ---------- utilidades ----------
function erro(msg){ console.error("erro:", msg); process.exit(1); }
function caixa(t){ return T.alta ? String(t).toUpperCase() : String(t); }
// Texto que não cabe na caixa QUEBRA em mais linhas do que o layout reservou, e aí o
// bloco de baixo entra por cima dele. Aqui a linha mais longa decide o corpo: o título
// cede antes de invadir a imagem.
// A largura da maiúscula vem do TEMA (ver TEMAS.largura). Medi 0.62 no primeiro teste,
// com um número só pras duas fontes, e o título de Montserrat rachou em cinco linhas:
// caixa alta em peso pesado é muito mais larga que a média de uma fonte de texto.
function corpoQueCabe(chars, larg, teto){
  // 0.94 é folga, não preciosismo: a conta é uma MÉDIA de largura de letra, e uma
  // linha cheia de M e W estoura a estimativa por pouco — aí ela quebra em duas e o
  // bloco de baixo entra por cima. Barato de dar a folga, caro de não dar.
  const cabe = Math.floor(larg * 72 * 0.94 / (T.largura * Math.max(chars, 1)));
  return Math.max(14, Math.min(teto, cabe));
}
// Quantas linhas o bloco vai REALMENTE ocupar depois que o PowerPoint quebrar o que
// não coube. Reservar só o número de `\n` do JSON foi o que fez a régua da capa cair
// EM CIMA da segunda linha do título — o texto tinha quebrado e o layout não sabia.
function linhasReais(linhas, corpo, larg){
  return linhas.reduce((n, l) => n + Math.max(1,
    Math.ceil(l.replace(/\*/g, "").length * T.largura * corpo / 72 / larg)), 0);
}
// O deck não come só do acervo do evento. Os modelos usam foto de família, print de
// hospital, imagem gerada — coisa que o dono despeja avulsa. Por isso a busca começa
// em `slides/imagens/` (a pasta do deck), passa pelas imagens do feed e só então cai
// no acervo. O primeiro que existir vence.
const ONDE = [
  path.resolve(BASE, "imagens"),
  path.resolve(ACERVO, "imagens"),
  path.resolve(ACERVO, "fotos"),
];
function foto(rel){
  for(const dir of ONDE){
    const p = path.resolve(dir, rel);
    if(fs.existsSync(p)) return p;
  }
  erro(`imagem não encontrada: ${rel}\n       procurei em: ${ONDE.map(d => path.relative(BASE, d)).join(" · ")}`);
}
function logoPath(arq){
  const p = path.resolve(ACERVO, "marca", arq);
  return fs.existsSync(p) ? p : null;
}

// ---------- imagem: recortar ANTES, nunca esticar depois ----------
// O `sizing: cover` do pptxgenjs não lê a dimensão do arquivo: ele ESTICA a foto
// até encher a caixa. Foto 3:2 numa caixa 16:9 sai 18% mais larga (engorda o rosto);
// no painel do fecho ela era espremida a 69%. Então o corte é feito aqui, na mão,
// e o slide recebe uma imagem que já tem exatamente a proporção da caixa.
const CACHE = new Map();
const DPI = 150;
const FOCO = {
  topo: "top", baixo: "bottom", esquerda: "left", direita: "right", centro: "centre",
};
async function recorta(rel, larg, alt, foco){
  const chave = `${rel}|${larg}x${alt}|${foco || "centro"}`;
  if(CACHE.has(chave)) return CACHE.get(chave);
  const buf = await sharp(foto(rel))
    .resize(Math.round(larg * DPI), Math.round(alt * DPI), {
      fit: "cover",
      position: FOCO[foco || "centro"] || "centre",
    })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
  const uri = "image/jpeg;base64," + buf.toString("base64");
  CACHE.set(chave, uri);
  return uri;
}
// O QR entra INTEIRO, sem corte e sem reamostragem: recortar um QR come os módulos
// da borda e a câmera para de ler. Ele é o único ativo do slide de contato — se ele
// não lê, a página não existe.
async function imagemCrua(rel){
  const p = foto(rel);
  const ext = path.extname(p).toLowerCase();
  const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
  return `${mime};base64,` + fs.readFileSync(p).toString("base64");
}
// O logo também estava espremido: 4.34 de proporção real numa caixa de 3.81.
// Aqui ele entra pela ALTURA e a largura sai da proporção verdadeira.
const LOGOS = new Map();
async function medeLogo(arq){
  if(LOGOS.has(arq)) return LOGOS.get(arq);
  const p = logoPath(arq);
  if(!p){ LOGOS.set(arq, null); return null; }
  const m = await sharp(p).metadata();
  const dado = { path: p, razao: m.width / m.height };
  LOGOS.set(arq, dado);
  return dado;
}
function porAltura(arq, h){
  const lg = LOGOS.get(arq);
  return lg ? { path: lg.path, w: h * lg.razao, h } : null;
}
// DOIS marcadores, porque os modelos usam DUAS ênfases na mesma frase:
//   *palavra*   → OURO (a palavra que a frase existe pra dizer). Uma por frase.
//   **palavra** → branco em peso FORTE (o esqueleto da frase: "NOSSA **HISTÓRIA
//                 COMEÇOU** ANTES DELE *NASCER*"). É a mistura de pesos que dá o
//                 ritmo do título — sem ela sobra um bloco uniforme de caixa alta.
// No tema `mat` a Rubik One tem um peso só: o `**` não muda nada, e é assim que o
// modelo faz. Ali a ênfase é a COR, e ponto.
function realce(txt, base){
  const partes = String(txt).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return partes.map(pp => {
    let p = pp;
    if(p.startsWith("**") && p.endsWith("**"))
      return { text: p.slice(2, -2), options: T.pesa
        ? { ...base, fontFace: T.forte } : { ...base } };
    if(p.startsWith("*") && p.endsWith("*"))
      return { text: p.slice(1, -1), options: { ...base, color: OURO,
        ...(T.pesa ? { fontFace: T.forte } : {}) } };
    // Marcador que não fecha DENTRO da mesma linha (o `**` aberto numa linha e
    // fechado na outra é o erro fácil de cometer) sobraria como asterisco impresso
    // na arte. Some com ele e reclama alto — texto errado no slide não se vê no log.
    if(p.includes("*")){
      console.warn(`aviso: marcador de ênfase não fechado em "${p.trim()}" — ` +
        `o * e o ** têm que abrir e fechar na MESMA linha.`);
      p = p.replace(/\*/g, "");
    }
    return { text: p, options: base };
  });
}
// Uma frase realçada vira VÁRIOS runs. Se cada run levar `breakLine`, a frase
// racha em três linhas no meio do destaque — a quebra é só do ÚLTIMO run da linha.
function paragrafos(linhas, base){
  return linhas.flatMap((l, i) => {
    const runs = realce(l, typeof base === "function" ? base(i) : base);
    runs[runs.length - 1].options = { ...runs[runs.length - 1].options, breakLine: true };
    return runs;
  });
}

// ---------- cromo comum a todo slide ----------
// TODO slide leva foto — é a mesma regra do feed, e os dois modelos a cumprem em
// todas as páginas. A foto ou SANGRA por trás de tudo (com véu à esquerda, pra letra
// ganhar dela) ou entra EMOLDURADA em ouro. Slide sem foto é o preto puro, e nos
// modelos ele só aparece na página de declaração, onde a frase é a peça.
// O deck do MAT compõe DUAS imagens, e é isso que dá o ar de cena montada em vez de
// "foto com texto por cima": o CENÁRIO (o escritório escuro) sangra na página inteira,
// e o PERSONAGEM entra num painel à direita, com a borda esquerda dissolvida no cenário.
// Sozinho, o personagem viraria um retângulo colado; sozinho, o cenário viraria papel
// de parede. Juntos, viram um palco.
const PAINEL_X = 6.3;                 // onde o painel do personagem começa
function fundo(s, d){
  s.background = { color: PRETO };
  if(d._cenario){
    s.addImage({ data: d._cenario, x: 0, y: 0, w: L, h: A });
    s.addShape("rect", { x: 0, y: 0, w: L, h: A,
      fill: { color: PRETO, transparency: 45 }, line: { type: "none" } });
  }
  if(d.foto && !d._emoldurada){
    if(d._cenario){
      s.addImage({ data: d._recorte, x: PAINEL_X, y: 0, w: L - PAINEL_X, h: A });
      s.addImage({ data: VEU_EMENDA, x: PAINEL_X, y: 0, w: L - PAINEL_X, h: A });
    } else {
      s.addImage({ data: d._recorte, x: 0, y: 0, w: L, h: A });
    }
  }
  if(d._cenario || (d.foto && !d._emoldurada))
    s.addImage({ data: VEU_ESQ, x: 0, y: 0, w: L, h: A });
}
// A moldura dourada do tema summit: um retângulo de ouro por baixo, a foto por cima.
// Fazer a borda com `line` na própria imagem não funciona — o pptx desenha a linha
// POR DENTRO e ela come a foto no primeiro pixel.
function moldura(s, dados, x, y, w, h){
  const b = 0.035;
  s.addShape("rect", { x: x - b, y: y - b, w: w + b * 2, h: h + b * 2,
    fill: { color: OURO }, line: { type: "none" },
    shadow: { type: "outer", blur: 14, offset: 5, angle: 90, color: "000000", opacity: 0.65 } });
  s.addImage({ data: dados, x, y, w, h });
}

// O logo assina no rodapé ESQUERDO — é onde os dois modelos o põem. (O motor antigo
// punha à direita, com o número da página à esquerda; os modelos não numeram nada.)
function selo(s, d){
  const lg = d.logo && porAltura(d.logo, 0.52);
  if(lg) s.addImage({ path: lg.path, x: MG - 0.25, y: A - 0.92, w: lg.w, h: lg.h });
  else if(d.marca)
    s.addText(d.marca.toUpperCase(), { x: MG, y: A - 0.8, w: 3.4, h: 0.35,
      fontFace: FONTE, fontSize: 9, color: CINZA, charSpacing: 1.5 });
}
function rodape(s, d, n){
  // Numerar é opcional e nasce DESLIGADO: nenhum dos dois modelos numera. Numa aula
  // longa ajuda a se achar, e aí a peça pede com "numerar": true.
  if(d.numerar)
    s.addText(String(n).padStart(2, "0"), { x: L - MG - 0.8, y: A - 0.75, w: 0.8, h: 0.35,
      fontFace: FONTE_TIT, fontSize: 11, color: "3A3A3C", align: "right", valign: "middle" });
  selo(s, d);
}
// Título de página. A RÉGUA embaixo é a assinatura gráfica dos dois modelos — ela
// sangra pela esquerda (nasce fora do slide) e para antes do meio: é o que ancora o
// bloco de texto no canto e o separa da foto.
function titulo(s, txt, y = 0.72, larg = 7.2){
  const t = String(txt);
  const linhas = t.split("\n");
  const maior = Math.max(...linhas.map(l => l.replace(/\*/g, "").length));
  // O título QUEBRA, não encolhe até sumir. Espremer uma linha de 31 caracteres até
  // caber num só verso jogou "QUEM NORMALMENTE TEM DIFICULDADE" pra 20pt — menor que
  // os itens da própria lista. Título curto é grande, longo é médio, e o que passar da
  // largura cai pra segunda linha (que o `linhasReais` já reserva).
  const corpo = maior > 30 ? 30 : maior > 20 ? 34 : 40;
  // A base é FORTE. Ela só afina pra Light quando a copy pede a mistura de pesos com
  // `**`: aí o Light é o fundo contra o qual o negrito aparece. Sem marcador, um título
  // inteiro em Light fica anêmico — e foi o que aconteceu no primeiro deck.
  const base = (T.pesa && t.includes("**")) ? FONTE_LEVE : FONTE_TIT;
  const runs = paragrafos(linhas, { fontFace: base, fontSize: corpo, color: PAPEL });
  const alt = linhasReais(linhas, corpo, larg) * (corpo * 1.22 / 72);
  // NADA de `fit: shrink` aqui. O `<a:normAutofit/>` que ele gera é "encolher no
  // overflow", e o PowerPoint RE-CALCULA esse encolhimento toda vez que ABRE o arquivo,
  // com as métricas reais da fonte — não com a conta do motor. Como a caixa nasce do
  // tamanho MÍNIMO, a margem interna do PowerPoint já conta como estouro e ele derruba
  // o título (vimos capa inteira cair a 25% no re-export). `fit: none` + `margin: 0`
  // TRAVA o corpo que o motor escolheu: WYSIWYG, não dança na segunda abertura. O preço
  // é que um título subestimado vaza pra baixo em vez de encolher — mas isso se VÊ e se
  // conserta na peça; encolher a 25% passa batido e sai impresso.
  s.addText(runs.map(r => ({ ...r, text: r.text.toUpperCase() })), {
    x: MG, y, w: larg, h: alt, valign: "top", lineSpacing: corpo * 1.22, fit: "none", margin: 0,
  });
  // A régua é dourada no summit e BRANCA no mat — é o que cada modelo faz. No deck do
  // MAT o ouro já está reservado pra palavra realçada do bullet; uma régua dourada
  // por cima dela roubaria o único ponto de cor da página.
  const yr = y + alt + 0.06;
  s.addShape("rect", { x: 0, y: yr, w: MG + larg * 0.62, h: 0.018,
    fill: { color: T.pesa ? OURO : PAPEL }, line: { type: "none" } });
  return yr + 0.1;
}
// O fecho é a última linha da página: a frase que o aluno leva embora. Nos dois
// modelos ela mora no pé, sozinha, sem régua e sem itálico.
// O fecho SEGUE o fim do conteúdo — nunca sobe pra buscar uma altura fixa. Um piso
// ("no mínimo em 5.2") parece inofensivo e é o pior dos dois mundos: numa lista longa
// ele puxa a frase pra DENTRO da lista. O teto existe só pra ela não cair fora do
// slide; a folga até o logo (6.58) cabe as duas linhas de um fecho comprido.
const FECHO_MAX = 5.9;
function fecho(s, txt, y){
  if(!txt) return;
  y = Math.min(y, FECHO_MAX);
  s.addText(realce(String(txt).toUpperCase(), { fontFace: FONTE_TIT, fontSize: 16, color: PAPEL }), {
    x: MG, y, w: COL - 1, h: 0.6, valign: "top", lineSpacing: 20, fit: "none", margin: 0,
  });
}

// ---------- os layouts ----------
const LAYOUTS = {
  // capa: título grande à esquerda, régua, subtítulo. A foto sangra (mat) ou entra
  // emoldurada à direita (summit, com "moldura": true).
  // Os dois modelos abrem diferente, e a diferença é de VOZ, não de capricho:
  //   summit — bloco à ESQUERDA, o retrato emoldurado ao lado. É uma história: quem
  //            fala tem rosto, e o texto se alinha como parágrafo.
  //   mat    — bloco CENTRADO sobre a foto que sangra. É uma aula: o título é uma
  //            placa, e placa se lê de frente.
  capa(s, d){
    fundo(s, d);
    if(d._emoldurada) moldura(s, d._recorte, L - MG - CAIXA.capa.w, 0.72, CAIXA.capa.w, CAIXA.capa.h);
    const esq = T.pesa;                                 // summit alinha à esquerda
    const larg = d._emoldurada ? 5.9 : 7.4;
    const al = esq ? "left" : "center";
    let y = d.eyebrow ? 1.9 : 2.35;
    if(d.eyebrow){
      s.addText(caixa(d.eyebrow).toUpperCase(), { x: MG, y, w: larg, h: 0.4, align: al,
        fontFace: FONTE, fontSize: 13, color: OURO, bold: T.pesa, charSpacing: 3 });
      y += 0.55;
    }
    const t = String(d.titulo).split("\n");
    const maior = Math.max(...t.map(l => l.replace(/\*/g, "").length));
    const corpo = corpoQueCabe(maior, larg, maior > 22 ? 40 : 52);
    const alt = linhasReais(t, corpo, larg) * (corpo * 1.2 / 72);
    s.addText(paragrafos(t, { fontFace: FONTE_TIT, fontSize: corpo, color: PAPEL, align: al })
      .map(r => ({ ...r, text: r.text.toUpperCase() })), {
      x: MG, y, w: larg, h: alt, valign: "top", lineSpacing: corpo * 1.2, fit: "none", margin: 0,
    });
    const yr = y + alt + 0.24;
    s.addShape("rect", { x: esq ? MG : MG + 1.4, y: yr, w: esq ? larg * 0.72 : larg - 2.8, h: 0.018,
      fill: { color: esq ? OURO : PAPEL }, line: { type: "none" } });
    if(d.texto)
      s.addText(paragrafos(String(d.texto).split("\n").map(caixa),
        { fontFace: T.pesa ? FONTE : FONTE_TIT, fontSize: 17, color: "E4E4E6", align: al }),
        { x: MG, y: yr + 0.3, w: larg, h: 1.2, valign: "top", lineSpacing: 27 });
    if(d.fecho)
      s.addText(realce(caixa(d.fecho), { fontFace: T.pesa ? T.forte : FONTE_TIT, fontSize: 17,
        color: PAPEL, align: al }), { x: MG, y: 5.35, w: larg, h: 0.5, valign: "middle" });
    selo(s, d);
  },

  // foto: o layout de contar história — título + apoio à esquerda, um retrato
  // EMOLDURADO em ouro à direita. É a página que mais se repete em "O propósito".
  foto(s, d, n){
    fundo(s, d);
    // A coluna de texto para ONDE A MOLDURA COMEÇA. Sem essa conta o título transborda
    // e passa por baixo da foto — e no console tudo "gerou".
    const col = L - MG - CAIXA.moldura.w - MG - 0.2;
    const y = titulo(s, d.titulo, 1.35, col);
    if(d._emoldurada) moldura(s, d._recorte, L - MG - CAIXA.moldura.w, 1.5, CAIXA.moldura.w, CAIXA.moldura.h);
    // Apoio em BOLD, não em ExtraBold: o ExtraBold é do título, e no corpo ele fica
    // largo demais — a linha estourava a coluna e rachava no meio da frase.
    if(d.texto)
      s.addText(paragrafos(String(d.texto).split("\n").map(caixa),
        { fontFace: FONTE, bold: T.pesa, fontSize: 18, color: PAPEL }),
        { x: MG, y: y + 0.45, w: col, h: 2.2, valign: "top", lineSpacing: 28 });
    fecho(s, d.fecho, 5.9);
    rodape(s, d, n);
  },

  // duas-fotos: o antes × depois. Título centrado no alto, as duas fotos emolduradas
  // lado a lado, e a legenda embaixo — a segunda linha é o remate, em peso forte.
  "duas-fotos"(s, d, n){
    fundo(s, d);
    const t = String(d.titulo).split("\n");
    const corpoT = 34;
    const nl = linhasReais(t, corpoT, COL);
    s.addText(paragrafos(t, { fontSize: corpoT, color: PAPEL, align: "center",
      fontFace: (T.pesa && d.titulo.includes("**")) ? FONTE_LEVE : FONTE_TIT,
    }).map(r => ({ ...r, text: r.text.toUpperCase() })), {
      x: MG, y: 0.5, w: COL, h: nl * (corpoT * 1.24 / 72), valign: "top", lineSpacing: corpoT * 1.24 });
    const fotos = d._recortes || [];
    const vao = 0.22;
    const topo = 0.6 + nl * (corpoT * 1.24 / 72) + 0.12;
    // A ALTURA manda, não a largura. Preenchendo a largura toda, as duas fotos ficam
    // tão altas que a legenda cai em cima do logo — e é a legenda que faz o par de
    // fotos dizer alguma coisa. Aqui elas encolhem juntas até sobrar o pé da página.
    const razao = CAIXA.duas_fotos.w / CAIXA.duas_fotos.h;
    const teto = (d.linhas ? 5.45 : 6.3) - topo;
    let larg = (COL - vao * (fotos.length - 1)) / fotos.length;
    const alt = Math.min(larg / razao, teto);
    larg = alt * razao;
    const esq = (L - (larg * fotos.length + vao * (fotos.length - 1))) / 2;
    fotos.forEach((f, i) => moldura(s, f, esq + i * (larg + vao), topo, larg, alt));
    if(d.linhas)
      s.addText(paragrafos(d.linhas, i => ({
        fontFace: i === d.linhas.length - 1 && T.pesa ? T.forte : FONTE,
        bold: !T.pesa, fontSize: 17, color: PAPEL, align: "center" })),
        { x: MG, y: topo + alt + 0.18, w: COL, h: 0.9, valign: "top", lineSpacing: 26 });
    rodape(s, d, n);
  },

  // declaracao: a frase É a página. Sem foto, sem bullet, sem card — só o título
  // centrado, a régua, e uma ou duas linhas de apoio. É o slide que respira.
  declaracao(s, d, n){
    fundo(s, d);
    const t = String(d.titulo).split("\n");
    const maior = Math.max(...t.map(l => l.replace(/\*/g, "").length));
    const corpo = maior > 26 ? 36 : 44;
    const alt = linhasReais(t, corpo, COL) * (corpo * 1.25 / 72);
    const topo = (A - alt - 1.4) / 2;
    const base = (T.pesa && d.titulo.includes("**")) ? FONTE_LEVE : FONTE_TIT;
    s.addText(paragrafos(t, { fontFace: base, fontSize: corpo,
      color: PAPEL, align: "center" }).map(r => ({ ...r, text: r.text.toUpperCase() })), {
      x: MG, y: topo, w: COL, h: alt, valign: "top", lineSpacing: corpo * 1.25, fit: "none", margin: 0 });
    const yr = topo + alt + 0.16;
    s.addShape("rect", { x: L / 2 - 3, y: yr, w: 6, h: 0.018, fill: { color: OURO }, line: { type: "none" } });
    if(d.linhas)
      s.addText(paragrafos(d.linhas, i => ({
        fontFace: i === 0 && T.pesa ? T.forte : FONTE, fontSize: 19, color: PAPEL, align: "center" })),
        { x: MG, y: yr + 0.28, w: COL, h: 1.4, valign: "top", lineSpacing: 30 });
    rodape(s, d, n);
  },

  // contato: o fecho que pede AÇÃO — o bloco de dados à esquerda, o QR à direita.
  // O QR não leva moldura dourada: ele precisa da borda branca pra ser LIDO pela câmera.
  contato(s, d, n){
    fundo(s, d);
    const y = titulo(s, d.titulo, 1.9, 5.6);
    if(d.linhas)
      s.addText(paragrafos(d.linhas, i => ({
        fontFace: T.pesa && d.fortes && d.fortes.includes(i) ? T.forte : FONTE,
        fontSize: 16, color: PAPEL })),
        { x: MG, y: y + 0.4, w: 5.6, h: 3.2, valign: "top", lineSpacing: 26 });
    if(d._qr){
      const lado = 4.3;
      s.addShape("rect", { x: L - MG - lado, y: (A - lado) / 2, w: lado, h: lado,
        fill: { color: PAPEL }, line: { type: "none" } });
      s.addImage({ data: d._qr, x: L - MG - lado + 0.25, y: (A - lado) / 2 + 0.25,
        w: lado - 0.5, h: lado - 0.5 });
    }
    selo(s, d);
  },

  // texto corrido: 1 a 4 linhas, a primeira em display
  texto(s, d, n){
    fundo(s, d);
    let y = titulo(s, d.titulo);
    const linhas = d.linhas || [];
    const grande = linhas.length <= 3;
    s.addText(paragrafos(linhas, i => ({
      fontFace: grande && i === 0 ? FONTE_TIT : FONTE,
      fontSize: grande ? (i === 0 ? 30 : 22) : 20,
      color: i === 0 ? PAPEL : "C8C8CA",
    })), { x: MG, y: y + 0.35, w: COL - 1.2, h: 3.4, valign: "top", lineSpacing: grande ? 42 : 34,
           paraSpaceAfter: grande ? 8 : 4 });
    fecho(s, d.fecho, 5.55);
    rodape(s, d, n);
  },

  // lista com marca: bullet (o padrão dos modelos) / check (ouro) / x (vermelho) / número.
  // É a página que mais aparece no deck do MAT: título, régua, três a cinco itens com
  // UMA palavra em ouro cada, e o fecho embaixo. O texto ocupa só a METADE ESQUERDA
  // quando há foto — a direita é da imagem, e escrever por cima dela é o defeito nº 1.
  lista(s, d, n){
    fundo(s, d);
    let y = titulo(s, d.titulo);
    // Com foto sangrando o texto se recolhe — mas pode passar um pouco do painel: a
    // borda esquerda dele está dissolvida no escuro, e é ali que a letra ainda ganha.
    const meia = d.foto && !d._emoldurada;
    const util = meia ? 7.0 : COL;
    const intro = d.intro ? [].concat(d.intro) : [];
    if(intro.length){
      // No summit o corpo é Montserrat BOLD, não ExtraBold: o ExtraBold é peso de
      // TÍTULO, e usado no item da lista faz tudo na página gritar igual.
      // No summit o corpo é Montserrat BOLD, não ExtraBold: o ExtraBold é peso de TÍTULO,
      // e no item da lista faz tudo na página gritar igual. No mat a Rubik One não TEM
      // negrito — pedir `bold` faria o PowerPoint falsificar um, e o traço engorda torto.
      s.addText(paragrafos(intro.map(caixa), { fontFace: FONTE, bold: T.pesa,
        fontSize: 17, color: PAPEL }),
        { x: MG, y: y + 0.18, w: util, h: 0.4 * intro.length, valign: "top", lineSpacing: 26 });
      y += 0.3 + 0.4 * intro.length;
    }
    const itens = d.itens || [];
    const cols = !meia && itens.length > 6 ? 2 : 1;
    const porCol = Math.ceil(itens.length / cols);
    const larg = cols === 2 ? (util - 0.7) / 2 : util - 0.4;
    // O vão entre os itens é o que faz a lista respirar — nos modelos ele é quase o
    // dobro da altura da linha. Lista apertada vira parágrafo picado.
    const sobra = 5.4 - (y + 0.3);
    const alt = Math.min(0.86, Math.max(0.5, sobra / porCol));
    // Cada item ocupa UMA linha, e é por isso que ele existe: bullet que racha em duas
    // encosta no de baixo (a altura da linha é fixa) e a lista vira um borrão. O item
    // mais comprido é quem decide o corpo de todos.
    const largTexto = larg - 0.42;
    const maiorItem = Math.max(...itens.map(it => it.replace(/\*/g, "").length), 1);
    const corpo = Math.min(itens.length > 6 ? 17 : itens.length > 4 ? 19 : 21,
      corpoQueCabe(maiorItem, largTexto, 21));
    const marca = d.marca_item || "bullet";
    const cor = marca === "x" ? VERMELHO : marca === "bullet" ? PAPEL : OURO;
    const largMarca = marca === "numero" ? 0.6 : 0.34;   // "04" racha em dois se a caixa aperta
    const topo = y + 0.3;

    itens.forEach((it, i) => {
      const c = Math.floor(i / porCol), r = i % porCol;
      const x = MG + c * (larg + 0.7);
      const yy = topo + r * alt;
      const sinal = marca === "x" ? "✕" : marca === "check" ? "✓"
                  : marca === "numero" ? String(i + 1).padStart(2, "0") : "•";
      s.addText(sinal, { x, y: yy, w: largMarca, h: alt,
        fontFace: marca === "numero" ? FONTE_TIT : FONTE,
        fontSize: marca === "numero" ? corpo - 4 : corpo,
        color: cor, bold: T.pesa, valign: "middle" });
      s.addText(realce(caixa(it), { fontFace: FONTE, bold: T.pesa, fontSize: corpo, color: PAPEL }),
        { x: x + largMarca + 0.08, y: yy, w: larg - largMarca - 0.08, h: alt, valign: "middle" });
    });
    fecho(s, d.fecho, Math.max(topo + porCol * alt + 0.3, 5.5));
    rodape(s, d, n);
  },

  // cards: 3 a 5 chips grandes lado a lado (as características, os pilares)
  cards(s, d, n){
    fundo(s, d);
    let y = titulo(s, d.titulo);
    const itens = d.itens || [];
    const vao = 0.28;
    const larg = (COL - vao * (itens.length - 1)) / itens.length;
    const alt = 2.1, topo = y + 0.75;
    // palavra comprida ("COMUNICAÇÃO") racha no meio se a fonte não ceder ao card
    const maiorPalavra = Math.max(...itens.map(it => Math.max(...it.split(/\s+/).map(p => p.length))));
    const corpo = maiorPalavra > 10 ? 15 : itens.length > 4 ? 18 : 21;
    itens.forEach((it, i) => {
      const x = MG + i * (larg + vao);
      s.addShape("roundRect", { x, y: topo, w: larg, h: alt, rectRadius: 0.08,
        fill: { color: "141416" }, line: { color: "26262A", width: 1 } });
      s.addShape("rect", { x, y: topo, w: larg, h: 0.05, fill: { color: OURO }, line: { type: "none" } });
      s.addText(String(i + 1).padStart(2, "0"), { x, y: topo + 0.28, w: larg, h: 0.4,
        fontFace: FONTE_TIT, fontSize: 13, color: OURO, align: "center" });
      s.addText(realce(it.toUpperCase(), { fontFace: FONTE_TIT, fontSize: corpo, color: PAPEL }),
        { x: x + 0.06, y: topo + 0.75, w: larg - 0.12, h: 1.1, align: "center", valign: "middle", lineSpacing: 24 });
    });
    fecho(s, d.fecho, topo + alt + 0.4);
    rodape(s, d, n);
  },

  // numeros: cards numerados com título + apoio (as 3 prospecções)
  numeros(s, d, n){
    fundo(s, d);
    let y = titulo(s, d.titulo);
    const itens = d.itens || [];
    const vao = 0.32;
    const larg = (COL - vao * (itens.length - 1)) / itens.length;
    const alt = 2.7, topo = y + 0.7;
    itens.forEach((it, i) => {
      const x = MG + i * (larg + vao);
      s.addShape("roundRect", { x, y: topo, w: larg, h: alt, rectRadius: 0.08,
        fill: { color: "141416" }, line: { color: "26262A", width: 1 } });
      s.addText(String(i + 1), { x: x + 0.35, y: topo + 0.3, w: 0.9, h: 0.9,
        fontFace: FONTE_TIT, fontSize: 46, color: "2E2E33", valign: "middle" });
      s.addText(realce(it, { fontFace: FONTE, fontSize: 19, color: "E4E4E6" }),
        { x: x + 0.35, y: topo + 1.25, w: larg - 0.7, h: 1.2, valign: "top", lineSpacing: 26 });
    });
    fecho(s, d.fecho, topo + alt + 0.35);
    rodape(s, d, n);
  },

  // fluxo: etapas encadeadas por seta. Até 4 = horizontal; mais = 2 fileiras.
  fluxo(s, d, n){
    fundo(s, d);
    let y = titulo(s, d.titulo);
    const desenha = (etapas, topo, porFila) => {
      porFila = porFila || (etapas.length <= 4 ? etapas.length : Math.ceil(etapas.length / 2));
      const filas = Math.ceil(etapas.length / porFila);
      const corpo = porFila >= 6 ? 13 : porFila === 5 ? 15 : porFila === 4 ? 16 : 18;
      const vao = porFila >= 6 ? 0.38 : 0.5;
      const larg = (COL - vao * (porFila - 1)) / porFila;
      const alt = 0.78;
      etapas.forEach((e, i) => {
        const f = Math.floor(i / porFila), c = i % porFila;
        const x = MG + c * (larg + vao);
        const yy = topo + f * (alt + 0.42);
        const ult = i === etapas.length - 1;
        s.addShape("roundRect", { x, y: yy, w: larg, h: alt, rectRadius: 0.1,
          fill: { color: ult ? "1F1810" : "141416" },
          line: { color: ult ? OURO : "2A2A2E", width: ult ? 1.5 : 1 } });
        s.addText(realce(e, { fontFace: ult ? FONTE_TIT : FONTE, fontSize: corpo,
          color: ult ? OURO : "E4E4E6", bold: !ult }),
          { x: x + 0.08, y: yy, w: larg - 0.16, h: alt, align: "center", valign: "middle" });
        if(c < porFila - 1 && i < etapas.length - 1)
          s.addText("→", { x: x + larg, y: yy, w: vao, h: alt, fontFace: FONTE, fontSize: 20,
            color: OURO, align: "center", valign: "middle" });
      });
      return topo + filas * alt + (filas - 1) * 0.42;
    };
    let cursor = y + 0.5;
    if(d.intro){
      s.addText(realce(d.intro, { fontFace: FONTE, fontSize: 16, color: CINZA }),
        { x: MG, y: cursor - 0.42, w: COL, h: 0.4, valign: "middle" });
    }
    cursor = desenha(d.etapas || [], cursor, d.por_fila);
    if(d.etapas2){
      cursor += 0.8;
      s.addText(realce(d.intro2 || "", { fontFace: FONTE, fontSize: 16, color: CINZA }),
        { x: MG, y: cursor - 0.45, w: COL, h: 0.4, valign: "middle" });
      cursor = desenha(d.etapas2, cursor, d.por_fila2);
    }
    if(d.linhas)
      s.addText(paragrafos(d.linhas, { fontFace: FONTE, fontSize: 19, color: "C8C8CA" }),
        { x: MG, y: cursor + 0.35, w: COL, h: 1, valign: "top", lineSpacing: 28 });
    fecho(s, d.fecho, 5.9);
    rodape(s, d, n);
  },

  // ranking: pódio de prioridade
  ranking(s, d, n){
    fundo(s, d);
    let y = titulo(s, d.titulo);
    const itens = d.itens || [];
    const alt = 0.7, topo = y + 0.45;
    const cores = [OURO, OURO2, "C89B5E", "4A4A50"];
    itens.forEach((it, i) => {
      const yy = topo + i * (alt + 0.13);
      const larg = COL - i * 0.55;                       // escada: prioridade encurta
      s.addShape("roundRect", { x: MG, y: yy, w: larg, h: alt, rectRadius: 0.08,
        fill: { color: "141416" }, line: { color: "26262A", width: 1 } });
      s.addShape("rect", { x: MG, y: yy, w: 0.07, h: alt, fill: { color: cores[i] || "4A4A50" }, line: { type: "none" } });
      s.addText(String(i + 1) + "º", { x: MG + 0.35, y: yy, w: 0.8, h: alt,
        fontFace: FONTE_TIT, fontSize: 20, color: cores[i] || "4A4A50", valign: "middle" });
      s.addText(realce(it, { fontFace: FONTE, fontSize: 20, color: "E4E4E6", bold: true }),
        { x: MG + 1.2, y: yy, w: larg - 1.4, h: alt, valign: "middle" });
    });
    fecho(s, d.fecho, topo + itens.length * (alt + 0.13) + 0.25);
    rodape(s, d, n);
  },

  // colunas: blocos com subtítulo + itens (o dia perfeito, os indicadores)
  colunas(s, d, n){
    fundo(s, d);
    let y = titulo(s, d.titulo);
    const g = d.grupos || [];
    const vao = 0.3;
    const larg = (COL - vao * (g.length - 1)) / g.length;
    const topo = y + 0.55;
    // cards de altura igual, texto fluindo de cima. Item que quebra em duas linhas
    // empurra o seguinte — por isso a lista é UM bloco, não um item por caixa.
    const alt = (d.fecho ? 5.5 : 6.1) - topo;
    const estreito = g.length >= 4;
    const corpo = estreito ? 14 : 15;
    g.forEach((grupo, i) => {
      const x = MG + i * (larg + vao);
      s.addShape("roundRect", { x, y: topo, w: larg, h: alt, rectRadius: 0.08,
        fill: { color: "121214" }, line: { color: "26262A", width: 1 } });
      s.addShape("rect", { x, y: topo, w: larg, h: 0.045, fill: { color: OURO }, line: { type: "none" } });
      s.addText(grupo.titulo.toUpperCase(), { x: x + 0.22, y: topo + 0.2, w: larg - 0.44, h: 0.55,
        fontFace: FONTE_TIT, fontSize: 12.5, color: OURO, valign: "top", charSpacing: 0.8, lineSpacing: 16 });
      s.addText(
        paragrafos(grupo.itens, {
          fontFace: FONTE, fontSize: corpo, color: "D4D4D8",
          bullet: { characterCode: "2022", indent: 12 },
        }),
        { x: x + 0.18, y: topo + 0.85, w: larg - 0.36, h: alt - 1.05,
          valign: "top", lineSpacing: corpo + 6, paraSpaceAfter: 6 });
    });
    fecho(s, d.fecho, topo + alt + 0.22);
    rodape(s, d, n);
  },

  // citacao: a pergunta que o SDR faz, em aspas, + o objetivo dela
  citacao(s, d, n){
    fundo(s, d);
    let y = titulo(s, d.titulo);
    s.addText("“", { x: MG - 0.12, y: y + 0.35, w: 1, h: 1,
      fontFace: "Georgia", fontSize: 90, color: "2A2A2E", valign: "top" });
    s.addText(realce(d.pergunta, { fontFace: FONTE, fontSize: 27, color: PAPEL, italic: true }), {
      x: MG + 0.75, y: y + 0.6, w: COL - 1.6, h: 1.5, valign: "top", lineSpacing: 38,
    });
    if(d.objetivo){
      s.addText("OBJETIVO", { x: MG, y: y + 2.45, w: 2, h: 0.35,
        fontFace: FONTE_TIT, fontSize: 12, color: OURO, charSpacing: 2 });
      s.addText(realce(d.objetivo, { fontFace: FONTE, fontSize: 20, color: "C8C8CA" }),
        { x: MG, y: y + 2.85, w: COL - 1.5, h: 0.9, valign: "top", lineSpacing: 28 });
    }
    fecho(s, d.fecho, 5.9);
    rodape(s, d, n);
  },

  // final: foto sangrando à direita, frase à esquerda
  final(s, d, n){
    s.background = { color: PRETO };
    if(d.foto){
      s.addImage({ data: d._recorte, x: FIM_X, y: 0, w: L - FIM_X, h: A });
      s.addImage({ data: VEU_EMENDA, x: FIM_X, y: 0, w: L - FIM_X, h: A });
      s.addShape("rect", { x: 0, y: 0, w: FIM_X, h: A, fill: { color: PRETO }, line: { type: "none" } });
    }
    s.addShape("rect", { x: MG, y: 2.55, w: 1.1, h: 0.06, fill: { color: OURO }, line: { type: "none" } });
    s.addText(realce(d.titulo, { fontFace: FONTE_TIT, fontSize: 30, color: PAPEL }), {
      x: MG, y: 2.85, w: 5.9, h: 2.6, valign: "top", lineSpacing: 40,
    });
    selo(s, d);
  },
};

// ---------- roda ----------
async function main(){
  const entrada = process.argv[2];
  if(!entrada) erro("uso: node motor-slides.js conteudo/<arquivo>.json");
  const d = JSON.parse(fs.readFileSync(path.resolve(BASE, entrada), "utf8"));
  if(!d.marca) erro("peça sem 'marca' — cada peça declara a sua (ver marca/LOGOS.md).");
  if(!Array.isArray(d.slides) || !d.slides.length) erro("peça sem 'slides'.");

  const tema = d.tema || "summit";
  if(!TEMAS[tema]) erro(`tema '${tema}' desconhecido — use: ${Object.keys(TEMAS).join(" · ")}`);
  T = TEMAS[tema];
  FONTE = T.fonte; FONTE_TIT = T.forte; FONTE_LEVE = T.leve;

  // recorte e medida das imagens ANTES de montar o slide: o pptx só recebe
  // imagem que já tem a proporção da caixa onde vai entrar.
  const logos = new Set([d.logo, ...d.slides.map(s => s.logo)].filter(Boolean));
  await Promise.all([...logos].map(medeLogo));
  for(const slide of d.slides){
    // A MOLDURA é decisão de layout, não de tema: `foto` e `duas-fotos` sempre
    // emolduram (é o que a página é); nos outros a foto sangra, salvo pedido.
    slide._emoldurada = slide.layout === "foto" || slide.layout === "duas-fotos"
      || (slide.moldura === true && slide.layout !== "contato");

    if(Array.isArray(slide.fotos) && slide.fotos.length){
      const c = CAIXA.duas_fotos;
      slide._recortes = [];
      for(const f of slide.fotos) slide._recortes.push(await recorta(f, c.w, c.h, slide.foco));
    }
    if(slide.qr) slide._qr = await imagemCrua(slide.qr);
    if(slide.cenario) slide._cenario = await recorta(slide.cenario, SANGRA.w, SANGRA.h, slide.foco_cenario);
    if(!slide.foto) continue;
    // A regra é UMA: recortar SEMPRE na proporção da caixa ONDE a foto vai aparecer.
    // Se o corte sai numa proporção e a exibição é outra, o pptxgenjs estica a imagem
    // pra encher a caixa e a pessoa deforma — é o mesmo erro que o `sizing: cover` dele
    // comete. Por isso cada caso abaixo casa com o `addImage` do layout correspondente:
    //   emoldurada → a caixa da moldura (foto/capa/duas-fotos)
    //   cenário    → o PERSONAGEM mora no painel da direita (x=PAINEL_X..L)
    //   final      → a foto SANGRA só no painel direito (x=FIM_X..L), NÃO no slide todo.
    //                Recortar no 16:9 e espremer nesse painel estreito engorda o rosto.
    //   resto      → sangra o slide inteiro (16:9)
    const caixa = slide._emoldurada
      ? (slide.layout === "capa" ? CAIXA.capa : CAIXA[slide.layout] || CAIXA.moldura)
      : slide.cenario ? { w: L - PAINEL_X, h: A }
      : slide.layout === "final" ? CAIXA.final
      : SANGRA;
    slide._recorte = await recorta(slide.foto, caixa.w, caixa.h, slide.foco);
  }

  const pptx = new pptxgen();
  pptx.defineLayout({ name: "16x9", width: L, height: A });
  pptx.layout = "16x9";
  pptx.author = "RM Treinamentos";
  pptx.title = d.titulo || d.aula || "Aula";

  d.slides.forEach((slide, i) => {
    const layout = slide.layout || "texto";
    if(!LAYOUTS[layout]) erro(`layout '${layout}' desconhecido — use: ${Object.keys(LAYOUTS).join(" · ")}`);
    const s = pptx.addSlide();
    LAYOUTS[layout](s, { ...d, ...slide }, i + 1);
  });

  const saida = path.resolve(BASE, "saida", `${d.arquivo_saida || "deck"}.pptx`);
  fs.mkdirSync(path.dirname(saida), { recursive: true });
  await pptx.writeFile({ fileName: saida });
  console.log(`ok: ${d.slides.length} slides → ${path.relative(BASE, saida)}`);
}
main().catch(e => erro(e.message));
