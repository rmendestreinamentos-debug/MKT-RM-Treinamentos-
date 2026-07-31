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
const CINZA = "9A9A9A";  // suave
const VERMELHO = "E5484D"; // só pra marcar o que NÃO fazer

// ---------- o ACENTO: a única cor da página ----------
// O deck é preto com letra branca, e o acento é o resto: a palavra realçada, a régua,
// a tarja do card, o número, a seta, a borda da etapa ativa. Ele nasceu dourado porque
// os dois modelos do dono são dourados, mas cada PRODUTO tem a sua cor, e um deck de
// produto azul carimbado de dourado lê como arquivo do produto errado — o mesmo erro de
// pôr o logo de outra marca, só que em cor. Por isso a cor sai daqui e não do layout:
// espalhada solta pelos vinte lugares onde aparece, trocar uma exigiria caçar as vinte.
//
//   cor    — o acento propriamente: palavra realçada, régua, tarja, número, seta.
//   apoio  — o segundo tom, pro 2º lugar do `ranking`. Nunca sozinho numa página.
//   escada — o pódio do `ranking`, do 1º ao 4º. As duas últimas casas descem pra
//            neutro de propósito: é o apagar que faz o 1º lugar parecer primeiro.
//   fundo  — o quase-preto TINGIDO da cor, pro cartão da etapa ativa no `fluxo`.
//            Preto neutro ali deixaria a etapa ativa igual às outras.
//
// `azul` é o AZUL REAL (#4169E1) — pedido do dono pro deck da Imersão Master MAT
// (2026-07-30): fundo preto, letra branca, detalhe em azul.
//
// Do `COMERCIAL 365` vieram sete cores de uma vez, e elas NÃO são sete produtos: ali o
// acento muda por SEÇÃO dentro do mesmo deck (verde na regra, laranja e vermelho na dor,
// azul nas funções, âmbar no fechamento, rosa e ciano nas etapas do fluxo). Por isso o
// acento passou a poder ser declarado por SLIDE, e não só no topo do arquivo. Os hexas
// foram medidos nos pixels do PDF do dono, não escolhidos: ver `modelo` em cada linha.
const ACENTOS = {
  ouro: { cor: "F4B661", apoio: "F3C223",
          escada: ["F4B661", "F3C223", "C89B5E", "4A4A50"], fundo: "1F1810" },
  azul: { cor: "4169E1", apoio: "6E93FF",
          escada: ["4169E1", "6E93FF", "2A4699", "4A4A50"], fundo: "101A33" },
  // — os do Comercial 365 —
  verde: { cor: "14FF00", apoio: "00BF63",                       // o acento da marca
           escada: ["14FF00", "00BF63", "0A8C46", "4A4A50"], fundo: "0A1F0A" },
  jade: { cor: "00BF63", apoio: "14FF00",                        // o verde fechado
          escada: ["00BF63", "14FF00", "0A6E3C", "4A4A50"], fundo: "071B12" },
  laranja: { cor: "BB3B17", apoio: "E79F13",                     // a página de dor
             escada: ["BB3B17", "E79F13", "7E2A11", "4A4A50"], fundo: "24100A" },
  vermelho: { cor: "FF3131", apoio: "BB3B17",                    // o alerta
              escada: ["FF3131", "BB3B17", "8E2020", "4A4A50"], fundo: "260C0C" },
  ambar: { cor: "E79F13", apoio: "F4B661",                       // o fechamento
           escada: ["E79F13", "F4B661", "9A6A0D", "4A4A50"], fundo: "231805" },
  ciano: { cor: "0097B2", apoio: "4974FF",                       // o agendamento
           escada: ["0097B2", "4974FF", "066277", "4A4A50"], fundo: "04222A" },
  rosa: { cor: "E2A9F1", apoio: "C77FD9",                        // o acolhimento
          escada: ["E2A9F1", "C77FD9", "8A529C", "4A4A50"], fundo: "1E1224" },
};
let A_ = ACENTOS.ouro;                // trocado em main() pelo "acento" do JSON
let ACENTO = A_.cor, ACENTO2 = A_.apoio;

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
            display: "Rubik One", pesa: false, alta: true, largura: 0.68 },
  // c365 — "COMERCIAL 365 - DIA 1", do Gabriel Anício. Mesmo esqueleto dos outros dois
  // (preto, letra branca, texto à esquerda, foto sangrando à direita), com três desvios
  // que são a identidade do modelo e por isso viram BANDEIRA, não código espalhado:
  //   regua: false     — o modelo NÃO risca embaixo do título. O que separa o título do
  //                      corpo ali é o trecho colorido dentro dele, não uma linha.
  //   logo_topo: true  — o lockup assina no canto SUPERIOR DIREITO de toda página (nos
  //                      outros dois ele mora no rodapé esquerdo).
  //   alta: false      — o corpo vai em caixa baixa. O modelo oscila (as primeiras
  //                      páginas em caixa alta, as últimas em baixa) e a caixa baixa é a
  //                      que aguenta os bullets longos deste roteiro sem virar paredão.
  //   painel: 5.6      — a foto NÃO sangra a página: ela ocupa o painel da direita e a
  //                      esquerda é preto chapado, com a emenda dissolvida. É o que o
  //                      modelo faz em quase toda página, e resolve de quebra o formato
  //                      do acervo: 83 das 115 fotos de evento são VERTICAIS, e num
  //                      corte 16:9 elas guardam 42% da altura (a linha de corte cai no
  //                      queixo). No painel de 7,7"×7,5" o corte é quase quadrado e
  //                      guarda ~70% — a diferença entre uma pessoa e um pescoço.
  c365:   { fonte: "Montserrat", leve: "Montserrat Light", forte: "Montserrat ExtraBold",
            display: "Montserrat Black", pesa: true, alta: false, largura: 0.78,
            regua: false, logo_topo: true, painel: 5.6, titulo_encolhe: true },
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
// Quanto a RÉGUA precisa descer por causa do rabo da última linha. A caixa de texto
// mede a linha até a base da MAIÚSCULA; a cedilha do Ç, o rabo do Q e a vírgula moram
// abaixo dela e passavam POR DENTRO da régua ("SEGURANÇA", "DIREÇÃO", "PROSPECÇÃO" —
// palavra terminada em -ÇÃO é metade dos títulos em português, então não é caso raro).
// A folga é CONDICIONAL de propósito: dar a todo mundo empurraria o corpo de todo slide
// 0,15" pra baixo e estouraria o pé das páginas que já estavam no limite (os decks de
// aula têm lista de sete itens). Sem rabo na última linha, nada muda.
const RABO = /[ÇQ,;]/;
function descida(linha, corpo){
  return RABO.test(String(linha).toUpperCase()) ? corpo * 0.004 : 0;
}
// `piso` é o menor corpo aceitável. Ele existe porque em TÍTULO encolher a 9pt não é
// solução, é outro defeito — ali o remédio é encurtar a copy. Mas em texto de APOIO
// (o elo da cascata, o item do cartão de plano) o piso alto vira armadilha: a conta
// pede 10pt, o piso devolve 14, o texto quebra em duas linhas numa caixa de uma linha
// e encosta no de baixo. Quem chama diz até onde pode ceder.
function corpoQueCabe(chars, larg, teto, piso){
  // 0.94 é folga, não preciosismo: a conta é uma MÉDIA de largura de letra, e uma
  // linha cheia de M e W estoura a estimativa por pouco — aí ela quebra em duas e o
  // bloco de baixo entra por cima. Barato de dar a folga, caro de não dar.
  const cabe = Math.floor(larg * 72 * 0.94 / (T.largura * Math.max(chars, 1)));
  return Math.max(piso === undefined ? 14 : piso, Math.min(teto, cabe));
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
//   *palavra*   → ACENTO (a palavra que a frase existe pra dizer). Uma por frase.
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
      return { text: p.slice(1, -1), options: { ...base, color: ACENTO,
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
// O véu do cenário era fixo em 55% de preto, calibrado em foto de PALCO — que já nasce
// escura. Ilustração e pintura não: a gravura de vaso grego é creme e laranja de ponta a
// ponta, e a 55% ela virava a página mais clara do deck inteiro, brigando com o texto e
// destoando das outras 18. `"veu": "forte"` é a saída, e ela é por SLIDE porque a mesma
// imagem pode servir de fundo discreto num layout e de assunto em outro.
// O número é a TRANSPARÊNCIA do preto: quanto menor, mais escuro o resultado.
const VEU_CENARIO = { leve: 62, medio: 45, forte: 26, apagado: 14 };
function fundo(s, d){
  s.background = { color: PRETO };
  if(d._cenario){
    s.addImage({ data: d._cenario, x: 0, y: 0, w: L, h: A });
    const t = VEU_CENARIO[d.veu];
    if(d.veu && t === undefined)
      console.warn(`aviso: véu '${d.veu}' desconhecido — use: ${Object.keys(VEU_CENARIO).join(" · ")}`);
    s.addShape("rect", { x: 0, y: 0, w: L, h: A,
      fill: { color: PRETO, transparency: t === undefined ? VEU_CENARIO.medio : t },
      line: { type: "none" } });
  }
  if(d.foto && !d._emoldurada){
    if(d._cenario){
      s.addImage({ data: d._recorte, x: PAINEL_X, y: 0, w: L - PAINEL_X, h: A });
      s.addImage({ data: VEU_EMENDA, x: PAINEL_X, y: 0, w: L - PAINEL_X, h: A });
    } else if(T.painel){
      // Painel do c365: a foto mora só na direita e a esquerda é preto chapado. O véu
      // de emenda dissolve a borda; sem ele fica uma linha dura entre o preto e a foto.
      s.addImage({ data: d._recorte, x: T.painel, y: 0, w: L - T.painel, h: A });
      s.addImage({ data: VEU_EMENDA, x: T.painel, y: 0, w: L - T.painel, h: A });
      return;                       // o VEU_ESQ abaixo escureceria a foto de novo
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
    fill: { color: ACENTO }, line: { type: "none" },
    shadow: { type: "outer", blur: 14, offset: 5, angle: 90, color: "000000", opacity: 0.65 } });
  s.addImage({ data: dados, x, y, w, h });
}

// O logo assina no rodapé ESQUERDO — é onde os dois modelos o põem. (O motor antigo
// punha à direita, com o número da página à esquerda; os modelos não numeram nada.)
function selo(s, d){
  // No c365 o lockup assina no canto SUPERIOR DIREITO (T.logo_topo), e não no rodapé
  // esquerdo. Não é capricho de posição: ali o rodapé inteiro fica livre pro @ e pro
  // texto respirar, e o topo direito é a única faixa que nenhum layout do modelo usa.
  if(T.logo_topo){
    const lg = d.logo && porAltura(d.logo, 0.34);
    if(lg) s.addImage({ path: lg.path, x: L - MG - lg.w + 0.28, y: 0.3, w: lg.w, h: lg.h });
    arroba(s, d);
    return;
  }
  const lg = d.logo && porAltura(d.logo, 0.52);
  if(lg) s.addImage({ path: lg.path, x: MG - 0.25, y: A - 0.92, w: lg.w, h: lg.h });
  else if(d.marca)
    s.addText(d.marca.toUpperCase(), { x: MG, y: A - 0.8, w: 3.4, h: 0.35,
      fontFace: FONTE, fontSize: 9, color: CINZA, charSpacing: 1.5 });
  arroba(s, d);
}
// O @ de quem apresenta, no canto oposto ao logo — em TODO slide (pedido do dono,
// 2026-07-30). O logo diz de que PRODUTO é a aula; o @ diz quem está falando, e num
// deck que circula em print de story os dois precisam viajar juntos.
// Sai de `marca/perfis.json` pelo slug (`"perfil": "joao-vitor"`) e **nunca digitado à
// mão**: @ errado manda a plateia pra conta de outra pessoa, e é o tipo de erro que só
// se descobre depois de projetado. Handle `null` no arquivo PARA o motor, como no feed.
// Fica no acento e pequeno: é assinatura, não manchete. A 10pt o azul não disputa com a
// palavra realçada, que é 3 a 5 vezes maior.
// ⚠️ Ele mora num CHIP escuro, e isso não é enfeite. O véu do slide escurece a ESQUERDA
// (é lá que o texto pousa); o canto de baixo à direita fica com a imagem crua, e ali
// passa de tudo — a beira clara da gravura do Botticelli apagou o @ azul na primeira
// versão. O chip garante chão escuro em qualquer imagem, e sobre slide preto ele
// simplesmente desaparece: preto sobre preto.
function arroba(s, d){
  if(!d._arroba) return;
  const corpo = 10;
  // Largura medida no texto, não chutada: caixa fixa larga deixaria o chip sobrando à
  // esquerda do @ (o texto é alinhado dentro dela) e ele viraria uma tarja solta.
  const larg = d._arroba.length * (T.largura * corpo + 1.2) / 72 + 0.34;
  const x = L - MG - larg + 0.2, y = A - 0.79, alt = 0.31;
  // ⚠️ `rectRadius` acima da METADE da altura gera um ajuste que o PowerPoint recusa: o
  // arquivo abre, e o export de PNG morre no meio com E_FAIL. Aqui a altura é 0,31, então
  // o raio fica em 0,12 — arredondado o suficiente pra ler como pílula, longe do limite.
  s.addShape("roundRect", { x, y, w: larg, h: alt, rectRadius: 0.12,
    fill: { color: PRETO, transparency: 12 }, line: { type: "none" } });
  s.addText(d._arroba, { x, y, w: larg, h: alt, fontFace: FONTE, fontSize: corpo,
    color: ACENTO, charSpacing: 1.2, align: "center", valign: "middle" });
}
function rodape(s, d, n){
  // Numerar é opcional e nasce DESLIGADO: nenhum dos dois modelos numera. Numa aula
  // longa ajuda a se achar, e aí a peça pede com "numerar": true.
  // ⚠️ O número dividia o canto direito com o @. Com os dois ligados ele SOBE, senão
  // um sai impresso por cima do outro (e no console os dois "geraram").
  if(d.numerar)
    s.addText(String(n).padStart(2, "0"), { x: L - MG - 0.8, y: d._arroba ? A - 1.15 : A - 0.75,
      w: 0.8, h: 0.35, fontFace: FONTE_TIT, fontSize: 11, color: "3A3A3C",
      align: "right", valign: "middle" });
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
  // Por faixa de comprimento (o comportamento dos dois modelos antigos): o título NÃO
  // encolhe pra caber, ele quebra, e a faixa foi calibrada na Rubik One — que é estreita.
  // Na Montserrat do c365 a mesma régua racha: a maiúscula é 15% mais larga, uma linha de
  // 20 letras cai na faixa dos 40pt e só cabem ~16. Como este deck tem 53 títulos escritos
  // por outra pessoa, calibrar a copy slide a slide seria empurrar pro dono um trabalho que
  // a conta faz sozinha — aqui o corpo CEDE à linha mais longa, como no `final` e na `capa`.
  const corpo = T.titulo_encolhe ? corpoQueCabe(maior, larg, 40)
    : maior > 30 ? 30 : maior > 20 ? 34 : 40;
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
  // A folga não é estética: `alt` conta linhas de altura CHEIA, e a última linha ainda
  // desce o descendente (o Ç de NOTIFICAÇÃO) por fora dela. Com 0.06 a régua passava
  // por dentro da cedilha.
  const yr = y + alt + 0.13 + descida(linhas[linhas.length - 1], corpo);
  // O c365 não risca embaixo do título: ali quem separa título de corpo é o TRECHO
  // colorido dentro da própria frase. Pôr a régua "porque os outros dois têm" faria a
  // página deixar de ser aquele modelo. Sem ela o corpo sobe, senão fica um vão órfão.
  if(T.regua === false) return yr - 0.06;
  s.addShape("rect", { x: 0, y: yr, w: MG + larg * 0.62, h: 0.018,
    fill: { color: T.pesa ? ACENTO : PAPEL }, line: { type: "none" } });
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
  // No c365 o fecho para na coluna de texto. Na largura cheia ele atravessava o painel da
  // foto: sobre o retrato ESCURO de palco ainda dava pra ler, e foi por isso que passou
  // batido — mas a mesma linha sobre uma foto clara simplesmente some, e o fecho é a frase
  // que o aluno leva embora. Duas linhas curtas no escuro ganham de uma comprida na foto.
  const larg = T.painel ? 7.6 : COL - 1;
  s.addText(realce(String(txt).toUpperCase(), { fontFace: FONTE_TIT, fontSize: 16, color: PAPEL }), {
    x: MG, y, w: larg, h: T.painel ? 0.85 : 0.6, valign: "top", lineSpacing: 20, fit: "none", margin: 0,
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
        fontFace: FONTE, fontSize: 13, color: ACENTO, bold: T.pesa, charSpacing: 3 });
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
    const yr = y + alt + 0.24 + descida(t[t.length - 1], corpo);
    s.addShape("rect", { x: esq ? MG : MG + 1.4, y: yr, w: esq ? larg * 0.72 : larg - 2.8, h: 0.018,
      fill: { color: esq ? ACENTO : PAPEL }, line: { type: "none" } });
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
    const yr = topo + alt + 0.16 + descida(t[t.length - 1], corpo);
    s.addShape("rect", { x: L / 2 - 3, y: yr, w: 6, h: 0.018, fill: { color: ACENTO }, line: { type: "none" } });
    if(d.linhas)
      s.addText(paragrafos(d.linhas.map(caixa), i => ({
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
      // ⚠️ A altura sai das linhas REAIS, não do número de entradas do array. Reservando
      // 0,4" por entrada, uma intro de uma frase longa (que o PowerPoint quebra em três)
      // ocupava 1,1" e recebia 0,4": o primeiro item da lista saía IMPRESSO por cima da
      // última linha dela, e o console dizia "ok". É o mesmo erro que a régua da capa já
      // tinha cometido, e a conta que conserta é a mesma: `linhasReais`.
      const nl = linhasReais(intro, 17, util);
      s.addText(paragrafos(intro.map(caixa), { fontFace: FONTE, bold: T.pesa,
        fontSize: 17, color: PAPEL }),
        { x: MG, y: y + 0.18, w: util, h: 0.37 * nl, valign: "top", lineSpacing: 26 });
      y += 0.28 + 0.37 * nl;
    }
    const itens = d.itens || [];
    const cols = !meia && itens.length > 6 ? 2 : 1;
    const porCol = Math.ceil(itens.length / cols);
    const larg = cols === 2 ? (util - 0.7) / 2 : util - 0.4;
    // O vão entre os itens é o que faz a lista respirar — nos modelos ele é quase o
    // dobro da altura da linha. Lista apertada vira parágrafo picado.
    // Com fecho o chão da lista SOBE. Fixo em 5.4, uma lista de sete itens descia até
    // 5.9 e o fecho (que tem teto ali) encostava no último bullet — os dois viravam um
    // parágrafo de oito linhas, e some o remate, que é a frase que o aluno leva embora.
    const sobra = (d.fecho ? 5.1 : 5.4) - (y + 0.3);
    // O piso de 0,5" foi calibrado em item de 20pt. Acima de seis itens o corpo já cai
    // pra 17pt sozinho (ver `corpo`, abaixo), e aí 0,44" continua arejado — sem isso uma
    // lista de sete com fecho não tinha como caber: o piso segurava a lista em 5,75" e o
    // fecho, que tem teto em 5,9", encostava nela.
    const alt = Math.min(0.86, Math.max(itens.length > 6 ? 0.44 : 0.5, sobra / porCol));
    // Cada item ocupa UMA linha, e é por isso que ele existe: bullet que racha em duas
    // encosta no de baixo (a altura da linha é fixa) e a lista vira um borrão. O item
    // mais comprido é quem decide o corpo de todos.
    const largTexto = larg - 0.42;
    const maiorItem = Math.max(...itens.map(it => it.replace(/\*/g, "").length), 1);
    const corpo = Math.min(itens.length > 6 ? 17 : itens.length > 4 ? 19 : 21,
      corpoQueCabe(maiorItem, largTexto, 21));
    const marca = d.marca_item || "bullet";
    const cor = marca === "x" ? VERMELHO : marca === "bullet" ? PAPEL : ACENTO;
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

  // cascata: a corrente vertical do "↓". No roteiro do Comercial 365 ela é o desenho
  // mais repetido (o mapa do dia, os 5 estágios, o fluxo completo, a hierarquia do
  // vínculo), e o `fluxo` horizontal não serve: com nove elos ele quebra em duas fileiras
  // e a ordem deixa de ser óbvia — que é a única coisa que a página existe pra dizer.
  //
  // A seta desenhada entre um elo e outro comeria a altura que os elos precisam, então o
  // encadeamento vira um TRILHO: uma linha vertical contínua à esquerda com um ponto em
  // cada elo. Diz "isto vem depois daquilo" ocupando 0,14" de largura e zero de altura.
  // O último ponto é maior e vai no acento: é onde a corrente chega.
  //
  // Cada item é uma string ou { titulo, texto } — o par existe porque metade dos slides
  // nomeia o elo e explica embaixo ("SDR" / "Acolhe, qualifica e agenda").
  cascata(s, d, n){
    fundo(s, d);
    let y = titulo(s, d.titulo);
    const itens = (d.itens || []).map(it => typeof it === "string" ? { texto: it } : it);
    const meia = d.foto && !d._emoldurada;
    const util = (meia ? 7.0 : COL) - 0.5;
    if(d.intro){
      const intro = [].concat(d.intro);
      // Mesma conta da `lista`: linhas REAIS depois da quebra, senão o primeiro elo da
      // corrente sobe pra cima da última linha da intro.
      const nl = linhasReais(intro, 16, util);
      s.addText(paragrafos(intro.map(caixa), { fontFace: FONTE, bold: T.pesa,
        fontSize: 16, color: "C8C8CA" }),
        { x: MG, y: y + 0.16, w: util, h: 0.34 * nl, valign: "top", lineSpacing: 24 });
      y += 0.26 + 0.34 * nl;
    }
    const topo = y + 0.34;
    // O pé da cascata é o fecho, se houver; senão o rodapé. Os elos cedem altura até
    // caber — nove elos numa página que já tem título de duas linhas é o caso real.
    const pe = (d.fecho ? 5.45 : 6.45);
    const par = itens.some(it => it.titulo);
    // O teto do elo existe pra que uma cascata de dois não vire dois blocos jogados no meio
    // de uma página vazia. Só que o elo COM RÓTULO empilha DUAS linhas na caixa em que o elo
    // simples põe uma: com 0,78" sobravam 0,44" pro texto, e 0,44" só aceita uma linha se o
    // corpo cair pra 11pt. Onze pontos se lê no monitor a 60cm e some no telão a dez metros,
    // que é onde este deck vive. O par ganha caixa maior; o elo simples segue como estava.
    const alt = Math.max(0.32, Math.min(par ? 1.06 : 0.78,
      (pe - topo) / Math.max(itens.length, 1)));
    const xTrilho = MG + 0.13, xTexto = MG + 0.46;
    const largTexto = util - 0.46;
    // O corpo cede ao elo mais comprido: item que racha em duas linhas encosta no de
    // baixo, e numa corrente isso faz dois elos virarem um borrão só.
    // O elo não precisa caber em UMA linha: ele precisa caber na CAIXA dele. A diferença
    // não é acadêmica — numa cascata de dois elos a caixa comporta três linhas com folga,
    // e numa de oito ela comporta uma só. Medir "cabe em uma linha?" reprovava as duas
    // por igual e mandava encurtar copy que estava perfeita. Aqui a conta é a real: quantas
    // linhas a caixa aceita neste corpo, contra quantas o elo mais longo precisa.
    //
    // `linhasReais` cobra T.largura por caractere, que é a largura de uma MAIÚSCULA: a
    // medida certa pro título em caixa alta e cara demais pra frase em caixa mista, que é
    // o que o elo tem. Medido no render do próprio deck: 0,56 em por caractere contra os
    // 0,78 cobrados. Pagando o preço cheio, um cronograma que comportava 17pt saía a 10pt
    // — não porque faltava página, mas porque a régua estava errada.
    //
    // O desconto é 0,80 e não os 0,71 medidos de propósito: errar a régua pra CIMA custa
    // texto menor que o necessário, errar pra BAIXO custa linha sobreposta em cima do elo
    // seguinte. Os dois são defeito, só que um se lê apertado e o outro não se lê.
    // (As caixas do elo levam `margin: 0` — sem isso o PowerPoint come 0,1" de cada lado
    // e a conta, que mede pela largura declarada, promete espaço que a caixa não tem.)
    const MISTA = 0.80;
    // No elo DEITADO o rótulo vira uma COLUNA de largura fixa, medida pelo rótulo mais
    // comprido. Deixar cada texto começar onde o seu rótulo acabou dava uma margem esquerda
    // serrilhada ("AULA 6" e "AULA 10" não têm a mesma largura), e oito começos diferentes
    // numa lista de oito itens é o tipo de detalhe que ninguém sabe nomear mas todo mundo vê.
    const largRotulo = c => Math.max(...itens.map(it => String(it.titulo || "").length)) *
      (T.largura * Math.max(10, c - 3) + 1.2) / 72 + 0.34;
    // O elo com rótulo tem dois desenhos possíveis. EMPILHADO: nome em cima, definição
    // embaixo — mais bonito, e o que o deck usa quando sobra altura. DEITADO: nome e
    // definição na mesma linha, o nome numa coluna à esquerda — aproveita a largura que
    // sobra quando a altura acabou. Regra fixa ("deita se o elo for baixo") errava dos dois
    // lados: deitava página que comportava o empilhado e mantinha empilhado cronograma que
    // por isso saía a 10pt. Então o motor resolve os dois e fica com o que lê de mais longe,
    // que é o único critério que importa num deck de palco.
    function resolver(deitado){
      const hT = (par && !deitado) ? alt * 0.62 : alt;
      const cabem = c => Math.max(1, Math.floor(hT / (c * 1.25 / 72)));
      const precisa = c => Math.max(...itens.map(it =>
        linhasReais([it.texto || ""], (par && !deitado ? c - 2 : c) * MISTA,
          deitado ? largTexto - largRotulo(c) : largTexto)), 1);
      let c = Math.min(alt > 0.6 ? 19 : alt > 0.45 ? 17 : 15, 19);
      while(c > 10 && precisa(c) > cabem(c)) c--;
      return { corpo: c, estoura: precisa(c) > cabem(c), hT };
    }
    const empilhado = resolver(false);
    const deitado = par ? resolver(true) : null;
    if(d.elo && !["deitado", "empilhado"].includes(d.elo))
      console.warn(`aviso: elo '${d.elo}' desconhecido — use: deitado · empilhado.`);
    // Ganho de um ponto não paga a troca de desenho: o empilhado é o elo do deck, e trocar
    // por 19pt onde o empilhado já dava 18 mudaria metade das páginas por nada. Só deita
    // quando o empilhado está de fato quebrando (três pontos ou mais de diferença) — ou
    // quando o slide manda, via `"elo": "deitado"`, que é o caso das páginas irmãs que
    // precisam sair iguais mesmo tendo quantidade diferente de elo.
    const inline = par && (d.elo ? d.elo === "deitado"
      : deitado.corpo >= empilhado.corpo + 3);
    const escolha = inline ? deitado : empilhado;
    const corpo = escolha.corpo, hTexto = escolha.hT;
    if(process.env.DEBUG_CASCATA) console.log(`[cascata] "${String(d.titulo).split("\n")[0]}" ` +
      `n=${itens.length} topo=${topo.toFixed(2)} alt=${alt.toFixed(3)} par=${par} ` +
      `inline=${inline} corpo=${corpo}` +
      (par ? ` (empilhado=${empilhado.corpo} deitado=${deitado.corpo})` : "") +
      ` estoura=${escolha.estoura}`);
    // A 10pt e ainda estourando é copy comprida demais pro layout, não fonte grande demais:
    // espremer mais deixaria ilegível e o texto sairia por cima do elo de baixo do mesmo
    // jeito. O motor avisa e segue — quem conserta é a copy.
    if(escolha.estoura)
      console.warn(`aviso: os elos de "${String(d.titulo).split("\n")[0].replace(/\*/g, "")}" ` +
        `não cabem nem a 10pt (${itens.length} elos, o mais longo com ` +
        `${Math.max(...itens.map(it => (it.texto || "").length))} caracteres) — encurte o texto.`);
    // O trilho nasce e morre NO PONTO, não na borda da caixa: sobrando, ele vira um
    // risco solto pendurado embaixo do último elo.
    const yIni = topo + alt / 2, yFim = topo + (itens.length - 1) * alt + alt / 2;
    if(itens.length > 1)
      s.addShape("rect", { x: xTrilho, y: yIni, w: 0.022, h: yFim - yIni,
        fill: { color: "3A3A40" }, line: { type: "none" } });
    // O ponto cheio no acento marca ONDE A CORRENTE CHEGA, e o padrão é o último elo —
    // que é o certo quando a lista é uma sequência que termina em algo ("Pós-venda",
    // "Documentação"). Mas nem toda cascata sobe: a HIERARQUIA DO VÍNCULO vai do melhor
    // (presencial) ao pior (texto), e marcar o último elo pintava "Texto" como o destino,
    // dizendo o contrário da página. `destaque` escolhe: ultimo (padrão) · primeiro · nenhum.
    const destaque = d.destaque || "ultimo";
    if(!["ultimo", "primeiro", "nenhum"].includes(destaque))
      console.warn(`aviso: destaque '${destaque}' desconhecido — use: ultimo · primeiro · nenhum.`);
    itens.forEach((it, i) => {
      const yy = topo + i * alt;
      const ult = destaque === "primeiro" ? i === 0
        : destaque === "nenhum" ? false
        : i === itens.length - 1;
      const raio = ult ? 0.075 : 0.05;
      s.addShape("ellipse", { x: xTrilho + 0.011 - raio, y: yy + alt / 2 - raio,
        w: raio * 2, h: raio * 2,
        fill: { color: ult ? ACENTO : "6A6A72" }, line: { type: "none" } });
      if(it.titulo && inline){
        const lr = largRotulo(corpo);
        s.addText(String(it.titulo).toUpperCase(), { x: xTexto, y: yy, w: lr, h: alt,
          fontFace: FONTE_TIT, fontSize: Math.max(10, corpo - 3), color: ACENTO,
          charSpacing: 1.2, valign: "middle", margin: 0 });
        s.addText(realce(caixa(it.texto || ""), { fontFace: FONTE, bold: T.pesa,
          fontSize: corpo, color: PAPEL }),
          { x: xTexto + lr, y: yy, w: largTexto - lr, h: alt, valign: "middle", margin: 0 });
      } else if(it.titulo){
        // Rótulo do elo: pequeno, no acento, espaçado. É ele que faz "SDR" e "Acolhe,
        // qualifica e agenda" lerem como nome e definição, não como duas frases soltas.
        s.addText(String(it.titulo).toUpperCase(), { x: xTexto, y: yy, w: largTexto, h: alt * 0.36,
          fontFace: FONTE_TIT, fontSize: Math.max(10, corpo - 7), color: ACENTO,
          charSpacing: 1.4, valign: "middle", margin: 0 });
        s.addText(realce(caixa(it.texto || ""), { fontFace: FONTE, bold: T.pesa,
          fontSize: corpo - 2, color: PAPEL }),
          { x: xTexto, y: yy + alt * 0.34, w: largTexto, h: alt * 0.62,
            valign: "middle", margin: 0 });
      } else {
        s.addText(realce(caixa(it.texto || ""), { fontFace: ult ? FONTE_TIT : FONTE,
          bold: T.pesa && !ult, fontSize: corpo, color: ult ? PAPEL : "E4E4E6" }),
          { x: xTexto, y: yy, w: largTexto, h: alt, valign: "middle", margin: 0 });
      }
    });
    fecho(s, d.fecho, topo + itens.length * alt + 0.22);
    rodape(s, d, n);
  },

  // secao: a divisória de bloco — UMA palavra gigante no acento sobre a foto que sangra.
  // É a página que dá ritmo ao deck longo: sem ela, 53 slides de título-e-bullet viram
  // uma esteira sem começo nem fim. No modelo do dono cada divisória repete a COR da
  // etapa que anuncia, e é por isso que o `acento` por slide existe.
  // Sem título de página, sem régua, sem bullet: a palavra É a página.
  secao(s, d, n){
    fundo(s, d);
    const t = String(d.titulo).split("\n");
    const maior = Math.max(...t.map(l => l.replace(/\*/g, "").length));
    // A coluna é a metade esquerda quando há foto sangrando — escrever por cima do
    // assunto da imagem é o defeito nº 1 do layout de foto.
    const larg = d.foto && !d._emoldurada ? 6.6 : COL;
    const corpo = corpoQueCabe(maior, larg, 54);
    const alt = linhasReais(t, corpo, larg) * (corpo * 1.14 / 72);
    const temApoio = d.linhas && d.linhas.length;
    // O rótulo ("BLOCO 2") vai ACIMA da palavra, pequeno e espaçado, em cinza. Embaixo e
    // em branco ele lia como uma frase que ficou pela metade; em cima ele é o que é, uma
    // etiqueta de capítulo, e deixa a palavra colorida ser o único peso da página.
    const altRot = temApoio ? 0.52 : 0;
    const y = (A - alt - altRot) / 2 + altRot;
    if(temApoio)
      s.addText(d.linhas.map(l => String(l).toUpperCase()).join("   ·   "),
        { x: MG, y: y - altRot - 0.06, w: larg, h: 0.4, fontFace: FONTE, bold: T.pesa,
          fontSize: 13, color: "8A8A92", charSpacing: 3.2, valign: "middle" });
    s.addText(paragrafos(t, { fontFace: FONTE_TIT, fontSize: corpo, color: ACENTO })
      .map(r => ({ ...r, text: r.text.toUpperCase() })), {
      x: MG, y, w: larg, h: alt, valign: "top", lineSpacing: corpo * 1.14, fit: "none", margin: 0 });
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
      s.addShape("rect", { x, y: topo, w: larg, h: 0.05, fill: { color: ACENTO }, line: { type: "none" } });
      s.addText(String(i + 1).padStart(2, "0"), { x, y: topo + 0.28, w: larg, h: 0.4,
        fontFace: FONTE_TIT, fontSize: 13, color: ACENTO, align: "center" });
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
      s.addText(realce(caixa(it), { fontFace: FONTE, fontSize: 19, color: "E4E4E6" }),
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
          fill: { color: ult ? A_.fundo : "141416" },
          line: { color: ult ? ACENTO : "2A2A2E", width: ult ? 1.5 : 1 } });
        s.addText(realce(caixa(e), { fontFace: ult ? FONTE_TIT : FONTE, fontSize: corpo,
          color: ult ? ACENTO : "E4E4E6", bold: !ult }),
          { x: x + 0.08, y: yy, w: larg - 0.16, h: alt, align: "center", valign: "middle" });
        if(c < porFila - 1 && i < etapas.length - 1)
          s.addText("→", { x: x + larg, y: yy, w: vao, h: alt, fontFace: FONTE, fontSize: 20,
            color: ACENTO, align: "center", valign: "middle" });
      });
      return topo + filas * alt + (filas - 1) * 0.42;
    };
    let cursor = y + 0.5;
    if(d.intro){
      s.addText(realce(caixa(d.intro), { fontFace: FONTE, fontSize: 16, color: CINZA }),
        { x: MG, y: cursor - 0.42, w: COL, h: 0.4, valign: "middle" });
    }
    cursor = desenha(d.etapas || [], cursor, d.por_fila);
    if(d.etapas2){
      cursor += 0.8;
      s.addText(realce(caixa(d.intro2 || ""), { fontFace: FONTE, fontSize: 16, color: CINZA }),
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
    const topo = y + 0.45;
    // A escada é ELÁSTICA, e não era: com altura fixa de 0.7 a quarta linha passava de
    // 5.9 e o `fecho` (que tem teto ali) subia PRA DENTRO dela — a frase saía impressa
    // por cima do 4º lugar. Aqui as linhas cedem até o fecho caber embaixo. Piso em 0.5
    // porque o texto é 20pt: abaixo disso a linha aperta a letra.
    const teto = (d.fecho ? 5.35 : 6.2) - topo;
    const alt = Math.max(0.5, Math.min(0.7, teto / Math.max(itens.length, 1) - 0.13));
    const cores = A_.escada;
    itens.forEach((it, i) => {
      const yy = topo + i * (alt + 0.13);
      const larg = COL - i * 0.55;                       // escada: prioridade encurta
      s.addShape("roundRect", { x: MG, y: yy, w: larg, h: alt, rectRadius: 0.08,
        fill: { color: "141416" }, line: { color: "26262A", width: 1 } });
      s.addShape("rect", { x: MG, y: yy, w: 0.07, h: alt, fill: { color: cores[i] || "4A4A50" }, line: { type: "none" } });
      s.addText(String(i + 1) + "º", { x: MG + 0.35, y: yy, w: 0.8, h: alt,
        fontFace: FONTE_TIT, fontSize: 20, color: cores[i] || "4A4A50", valign: "middle" });
      s.addText(realce(caixa(it), { fontFace: FONTE, fontSize: 20, color: "E4E4E6", bold: true }),
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
    // O corpo CEDE até a lista caber dentro do cartão. Fixo em 14/15, uma coluna de sete
    // itens transbordava a borda de baixo e o 7º saía impresso FORA do cartão, no preto
    // (foi o "para cada inferno, uma saída"). O cartão não cresce — quem cede é a letra.
    // Conta em pt: cada item ocupa as linhas que ele REALMENTE quebra (item longo em
    // coluna estreita vira duas) mais 6pt de respiro depois dele.
    const hCaixa = (alt - 1.05) * 72;
    const largTexto = larg - 0.36;
    const maxItens = Math.max(...g.map(x => x.itens.length), 1);
    const ocupa = c => Math.max(...g.map(x => linhasReais(x.itens, c, largTexto))) * (c + 6)
      + 6 * maxItens;
    let corpo = estreito ? 14 : 15;
    while(corpo > 10 && ocupa(corpo) > hCaixa) corpo--;
    if(ocupa(corpo) > hCaixa)
      console.warn(`aviso: as colunas de "${String(d.titulo).split("\n")[0]}" não cabem ` +
        `nem a 10pt — encurte os itens ou tire um do grupo.`);
    // O cartão ENCOLHE quando o conteúdo é curto. Esticado até o pé da página, um grupo de
    // um item só virava um retângulo oco com uma linha no alto e 4" de vazio embaixo (foi
    // o "O mapa", com três perguntas). A altura é a que o conteúdo pede, com teto na folga
    // da página (senão a lista de sete transbordaria de novo) e piso em 1,6" — abaixo
    // disso o cabeçalho e a tarja de acento comem o cartão e ele deixa de ler como cartão.
    const altCheia = (ocupa(corpo) / 72) + 1.05 + 0.25;
    const alt2 = Math.max(1.6, Math.min(alt, altCheia));
    g.forEach((grupo, i) => {
      const x = MG + i * (larg + vao);
      // Cada coluna pode ter o SEU acento (`"acento"` no grupo). Nasceu do cardápio de
      // planos, onde as três colunas não são três exemplos da mesma coisa: são níveis, e
      // é a cor que diz qual é o do meio (o recomendado). Sem isso as três saem iguais e
      // o olho não escolhe. Grupo sem `acento` herda o do slide, como sempre.
      const cor = grupo.acento && ACENTOS[grupo.acento] ? ACENTOS[grupo.acento].cor : ACENTO;
      if(grupo.acento && !ACENTOS[grupo.acento])
        console.warn(`aviso: acento '${grupo.acento}' (coluna "${grupo.titulo}") desconhecido.`);
      s.addShape("roundRect", { x, y: topo, w: larg, h: alt2, rectRadius: 0.08,
        fill: { color: "121214" }, line: { color: "26262A", width: 1 } });
      s.addShape("rect", { x, y: topo, w: larg, h: 0.045, fill: { color: cor }, line: { type: "none" } });
      s.addText(grupo.titulo.toUpperCase(), { x: x + 0.22, y: topo + 0.2, w: larg - 0.44, h: 0.55,
        fontFace: FONTE_TIT, fontSize: 12.5, color: cor, valign: "top", charSpacing: 0.8, lineSpacing: 16 });
      s.addText(
        paragrafos(grupo.itens.map(caixa), {
          fontFace: FONTE, fontSize: corpo, color: "D4D4D8",
          // Marcador de lista com UM item é ruído: ele promete uma lista que não vem.
          // Grupo de um item é uma frase dentro do cartão, e sai sem bolinha.
          ...(grupo.itens.length > 1 ? { bullet: { characterCode: "2022", indent: 12 } } : {}),
        }),
        { x: x + 0.18, y: topo + 0.85, w: larg - 0.36, h: alt2 - 1.05,
          valign: "top", lineSpacing: corpo + 6, paraSpaceAfter: 6 });
    });
    fecho(s, d.fecho, topo + alt2 + 0.22);
    rodape(s, d, n);
  },

  // planos: o cardápio de preço, com o REVELAR progressivo.
  // No modelo do dono os três planos não aparecem juntos: ele mostra o cartão vazio de
  // todos, revela o Básico, depois o Avançado, depois o Individual — e a mesma página se
  // repete quatro vezes. Não é preguiça de slide, é a mecânica de venda: o preço alto
  // aparece DEPOIS que o barato já ancorou. Aqui isso é um campo, `revelado`, e o slide
  // sem ele desenha só o cabeçalho colorido e o corpo vazio.
  //
  // O bloco de preço tem três degraus e a hierarquia é o que faz ele funcionar: o valor
  // ANTIGO pequeno e riscado, o à vista GRANDE e branco, o parcelado embaixo em corpo
  // médio. Riscado no pptx é `strike: true` no run — não é uma forma desenhada por cima,
  // que dançaria se a fonte trocasse de máquina.
  planos(s, d, n){
    fundo(s, d);
    let y = titulo(s, d.titulo);
    if(d.intro){
      s.addText(realce(caixa([].concat(d.intro).join(" ")), { fontFace: FONTE, bold: T.pesa,
        fontSize: 15, color: "C8C8CA" }),
        { x: MG, y: y + 0.12, w: COL, h: 0.34, valign: "top" });
      y += 0.42;
    }
    const g = d.planos || [];
    const vao = 0.28;
    const larg = (COL - vao * (g.length - 1)) / g.length;
    const topo = y + 0.34;
    const alt = 6.55 - topo;
    // O corpo dos itens é UM só pras três colunas, decidido pela mais apertada. Calculado
    // por coluna, cada plano saía num tamanho (12, 11 e 8pt na primeira versão) e o
    // cardápio lia como três slides colados: o olho compara preço, e pra comparar as
    // linhas precisam ter o mesmo peso. O Individual, que sempre tem mais item, é quem
    // manda — e é ele que estava saindo ilegível.
    const largCol = larg - 0.42;
    let corpoItem = 12;
    const cabeTudo = c => g.every(p => {
      if(p.revelado !== true || !p.itens || !p.itens.length) return true;
      let usado = 0.62 + 0.3 + (p.de ? 0.44 : 0) + (p.por ? 0.76 : 0)
        + (p.por && p.parcelas ? 0.8 : 0) + (p.selo ? 0.5 : 0) + (p.bonus ? 1.02 : 0);
      return linhasReais(p.itens, c, largCol) * (c + 5) / 72 <= alt - usado - 0.25;
    });
    while(corpoItem > 8 && !cabeTudo(corpoItem)) corpoItem--;
    if(!cabeTudo(corpoItem))
      console.warn(`aviso: os itens dos planos não cabem nem a 8pt — encurte a lista do plano mais cheio.`);
    g.forEach((p, i) => {
      const x = MG + i * (larg + vao);
      const A2 = ACENTOS[p.acento] || A_;
      if(p.acento && !ACENTOS[p.acento])
        console.warn(`aviso: acento '${p.acento}' (plano "${p.nome}") desconhecido.`);
      // Cartão do plano. O revelado ganha o fundo TINGIDO da cor e a borda acesa; o que
      // ainda não foi revelado fica no cinza morto — é o contraste que faz a plateia
      // olhar pro que o apresentador acabou de virar.
      s.addShape("roundRect", { x, y: topo, w: larg, h: alt, rectRadius: 0.1,
        fill: { color: p.revelado ? A2.fundo : "121214" },
        line: { color: p.revelado ? A2.cor : "26262A", width: p.revelado ? 1.5 : 1 } });
      const hCab = 0.62;
      s.addShape("roundRect", { x, y: topo, w: larg, h: hCab, rectRadius: 0.1,
        fill: { color: A2.cor }, line: { type: "none" } });
      // O nome do plano pousa SOBRE a faixa colorida, então ele é preto: branco sobre
      // #14FF00 ou #E79F13 não tem contraste nenhum.
      s.addText(String(p.nome).toUpperCase(), { x: x + 0.1, y: topo, w: larg - 0.2, h: hCab,
        fontFace: FONTE_TIT, fontSize: p.nome.length > 12 ? 15 : 18, color: PRETO,
        align: "center", valign: "middle", charSpacing: 0.6 });
      if(!p.revelado) return;
      // `revelado: "ancora"` é o degrau do meio: mostra SÓ o valor riscado, sem o preço
      // real. É o momento em que a plateia vê quanto a coisa vale antes de saber quanto
      // vai pagar, e é a metade do trabalho que a âncora faz. Sem esse passo, riscado e
      // preço aparecem juntos e o desconto vira só uma decoração ao lado do número.
      const soAncora = p.revelado === "ancora";
      let cur = topo + hCab + 0.2;
      // `resumo` é a linha que DIFERENCIA os planos, logo abaixo do nome: "10 aulas" x
      // "13 aulas". Estava numa lista de bullets no pé do cartão e não cabia junto com a
      // faixa de bônus; aqui ocupa 0,3" e fica onde o olho já está, comparando.
      if(p.resumo && !soAncora){
        s.addText(String(p.resumo), { x: x + 0.15, y: cur, w: larg - 0.3, h: 0.3,
          fontFace: FONTE, bold: T.pesa, fontSize: 12, color: A2.cor,
          align: "center", valign: "middle" });
        cur += 0.34;
      }
      if(p.de){
        // Sozinho na tela, o riscado é o assunto da página: entra grande e branco. Ao lado
        // do preço real ele vira nota de rodapé, e aí encolhe e apaga.
        s.addText(p.de, { x, y: cur, w: larg, h: soAncora ? 0.72 : 0.4,
          fontFace: soAncora ? FONTE_TIT : FONTE, bold: T.pesa,
          fontSize: soAncora ? 26 : 17, color: soAncora ? PAPEL : "8A8A92",
          strike: true, align: "center", valign: "middle" });
        cur += soAncora ? 0.8 : 0.40;
      }
      if(soAncora) return;
      if(p.por){
        s.addText(p.por, { x, y: cur, w: larg, h: 0.68, fontFace: FONTE_TIT, fontSize: 30,
          color: PAPEL, align: "center", valign: "middle" });
        cur += 0.70;
        if(p.parcelas){
          s.addText("ou", { x, y: cur, w: larg, h: 0.28, fontFace: FONTE, fontSize: 13,
            color: "8A8A92", align: "center", valign: "middle" });
          s.addText(p.parcelas, { x, y: cur + 0.28, w: larg, h: 0.44, fontFace: FONTE_TIT,
            fontSize: 17, color: A2.cor, align: "center", valign: "middle" });
          cur += 0.74;
        }
      }
      if(p.selo){
        s.addText(String(p.selo).toUpperCase(), { x: x + 0.2, y: cur + 0.12, w: larg - 0.4, h: 0.36,
          fontFace: FONTE_TIT, fontSize: 12, color: A2.cor, align: "center", valign: "middle",
          charSpacing: 1.6 });
        cur += 0.42;
      }
      // ⚠️ ALTURA NEGATIVA MATA O ARQUIVO INTEIRO. Com a faixa de bônus no pé, o cartão do
      // Individual (que já tem riscado, preço, parcelamento E selo) ficava com sobra de
      // -0,32" pros itens; o pptx sai com um `cy` negativo e o PowerPoint recusa ABRIR o
      // arquivo — `Presentations.Open` devolve E_FAIL, zero PNG, e nem o motor nem o Node
      // reclamam de nada. Foram 61 slides gerados "ok" e nenhum exportado.
      // Aqui a lista só entra se sobrar altura de verdade: entre a lista e o bônus, o
      // bônus fica, porque é ele que faz a pessoa decidir hoje.
      const sobra = topo + alt - cur - 0.2 - (p.bonus ? 1.02 : 0);
      if(p.itens && p.itens.length && sobra >= 0.3)
        s.addText(paragrafos(p.itens.map(caixa), { fontFace: FONTE, fontSize: corpoItem,
          color: "D4D4D8", bullet: { characterCode: "2022", indent: 10 } }),
          { x: x + 0.2, y: cur + 0.1, w: larg - 0.4, h: sobra, valign: "top",
            lineSpacing: corpoItem + 5, paraSpaceAfter: 4 });
      else if(p.itens && p.itens.length)
        console.warn(`aviso: os itens do plano "${p.nome}" não couberam no cartão ` +
          `(sobra ${sobra.toFixed(2)}") e foram OMITIDOS — o bônus tem prioridade.`);
      // O bônus não é mais um bullet: é uma FAIXA cheia na cor, colada no pé do cartão,
      // com "SÓ HOJE" em cima. Como bullet ele desaparecia no meio da lista, e o prazo é
      // justamente o que faz a pessoa decidir agora em vez de pensar no assunto em casa.
      // Fundo chapado na cor, letra preta: é o único bloco invertido do deck, e por isso
      // o olho vai nele.
      if(p.bonus){
        const hB = 0.82, yB = topo + alt - hB - 0.16;
        s.addShape("roundRect", { x: x + 0.16, y: yB, w: larg - 0.32, h: hB, rectRadius: 0.09,
          fill: { color: A2.cor }, line: { type: "none" } });
        s.addText(String(p.bonus.rotulo || "Bônus só hoje").toUpperCase(),
          { x: x + 0.16, y: yB + 0.05, w: larg - 0.32, h: 0.26, fontFace: FONTE_TIT,
            fontSize: 10.5, color: PRETO, align: "center", valign: "middle", charSpacing: 1.8 });
        s.addText(String(p.bonus.texto), { x: x + 0.24, y: yB + 0.29, w: larg - 0.48, h: 0.48,
          fontFace: FONTE, bold: T.pesa, fontSize: 11, color: PRETO,
          align: "center", valign: "middle", lineSpacing: 14 });
      }
    });
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
      // O rótulo era "OBJETIVO" fixo, herdado do deck de SDR onde a citação era a
      // pergunta que o vendedor faz. Reusada pra citar uma FRASE (a promessa, a desculpa,
      // o que o cliente diz), "objetivo" mente sobre o que está escrito embaixo. `rotulo`
      // troca a palavra sem inventar layout novo; sem ele, nada muda pros decks antigos.
      s.addText(String(d.rotulo || "OBJETIVO").toUpperCase(), { x: MG, y: y + 2.45, w: 3.2, h: 0.35,
        fontFace: FONTE_TIT, fontSize: 12, color: ACENTO, charSpacing: 2 });
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
    s.addShape("rect", { x: MG, y: 2.55, w: 1.1, h: 0.06, fill: { color: ACENTO }, line: { type: "none" } });
    // Via `realce` direto, o "\n" ia DENTRO do run e o pptx quebrava linha nele E entre
    // os runs do realce: "AGORA O MAPA / É / SEU" em três linhas, com o É sozinho. Quem
    // sabe quebrar sem rachar o destaque é o `paragrafos` — é o que todo outro layout usa.
    const linhas = String(d.titulo).split("\n");
    // 30pt era CRAVADO, e a coluna do fecho tem só 5,9" (a foto come o resto): uma linha
    // de 21 letras estourava e rachava, deixando "DECIDIR" sozinho no meio da frase. Aqui
    // o corpo cede à linha mais longa, como no título das outras páginas — a frase de
    // fecho é a última coisa que o aluno lê, e não pode sair picada.
    const maior = Math.max(...linhas.map(l => l.replace(/\*/g, "").length));
    const corpo = corpoQueCabe(maior, 5.9, 30);
    s.addText(paragrafos(linhas.map(caixa),
      { fontFace: FONTE_TIT, fontSize: corpo, color: PAPEL }), {
      x: MG, y: 2.85, w: 5.9, h: 2.6, valign: "top", lineSpacing: corpo * 1.33,
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

  // O acento é do PRODUTO, não do tema — um deck `mat` pode ser dourado ou azul, e é a
  // peça que diz qual. Nome errado PARA aqui em vez de cair no dourado: cair no default
  // sairia um deck inteiro na cor errada e o console diria "ok".
  const acento = d.acento || "ouro";
  if(!ACENTOS[acento]) erro(`acento '${acento}' desconhecido — use: ${Object.keys(ACENTOS).join(" · ")}`);
  A_ = ACENTOS[acento];
  ACENTO = A_.cor; ACENTO2 = A_.apoio;

  // O @ de quem apresenta sai do MESMO arquivo que o feed usa, pelo slug. Guardar dois
  // cadastros do mesmo handle é garantir que um dia eles divirjam — e o que estiver
  // errado vai pro projetor. Aqui só se declara `"perfil": "joao-vitor"`.
  if(d.perfil){
    const arq = path.resolve(ACERVO, "marca", "perfis.json");
    if(!fs.existsSync(arq)) erro(`perfil '${d.perfil}' pedido, mas não achei ${path.relative(BASE, arq)}.`);
    const perfis = JSON.parse(fs.readFileSync(arq, "utf8"));
    const p = perfis[d.perfil];
    if(!p) erro(`perfil '${d.perfil}' não existe em marca/perfis.json — ` +
      `slugs: ${Object.keys(perfis).filter(k => !k.startsWith("_")).join(" · ")}`);
    if(!p.handle) erro(`o perfil '${d.perfil}' está com handle null em marca/perfis.json — ` +
      `peça o @ real ao dono e preencha lá antes de gerar.`);
    d._arroba = p.handle;
  }

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
      // No c365 a foto é recortada na proporção do PAINEL, não do slide: recortar em
      // 16:9 e exibir num painel quase quadrado espremeria a pessoa em 40%.
      : T.painel ? { w: L - T.painel, h: A }
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
    // O acento pode ser trocado POR SLIDE, e isso veio do modelo do Comercial 365: lá
    // ele muda por SEÇÃO do deck (verde na regra, vermelho na dor, ciano no agendamento),
    // com cada divisória repetindo a cor da etapa que anuncia. Sem isso, ou o deck inteiro
    // sai de uma cor só (e some a divisão em blocos), ou a cor seria escrita à mão em vinte
    // lugares por slide. Slide sem `acento` herda o do topo do arquivo, como sempre foi.
    if(slide.acento){
      if(!ACENTOS[slide.acento])
        erro(`acento '${slide.acento}' (slide ${i + 1}) desconhecido — use: ${Object.keys(ACENTOS).join(" · ")}`);
      A_ = ACENTOS[slide.acento];
    } else {
      A_ = ACENTOS[acento];
    }
    ACENTO = A_.cor; ACENTO2 = A_.apoio;
    const s = pptx.addSlide();
    LAYOUTS[layout](s, { ...d, ...slide }, i + 1);
  });

  const saida = path.resolve(BASE, "saida", `${d.arquivo_saida || "deck"}.pptx`);
  fs.mkdirSync(path.dirname(saida), { recursive: true });
  await pptx.writeFile({ fileName: saida });
  console.log(`ok: ${d.slides.length} slides → ${path.relative(BASE, saida)}`);
}
main().catch(e => erro(e.message));
