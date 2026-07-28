// Monta as imagens do deck CHECKLIST DE AUDIÊNCIAS a partir do que foi extraído do PDF
// que o dono subiu (Downloads/CHECKLIST DE AUDIÊNCIAS.pdf, 2026-07-27). Refazer:
//
//   python _extrair-do-pdf.py "<pdf>" <pasta-crua>       # precisa de PyMuPDF
//   node   _compor.js <pasta-crua> .
//   cd ../.. && node motor-slides.js conteudo/checklist-audiencias.json
//
// Cada painel já sai na proporção EXATA da caixa do motor, pra ele não cortar nem esticar.
// Os arquivos crus vêm nomeados pXX-N.png (página, ordem na página); o mapa de qual é
// quem está na tabela `paginas`, lá embaixo.
const path = require("path");
const fs = require("fs");
const sharp = require(path.resolve("D:/DADOS/Desktop/PROJETO CANVA/slides/node_modules/sharp"));

const SRC = process.argv[2];   // pasta com as imagens cruas do PDF
const OUT = process.argv[3];   // slides/imagens/checklist-audiencias

const DPI = 150;
const L = 13.333, A = 7.5, PAINEL_X = 6.3;
const FUNDO_W = Math.round(L * DPI), FUNDO_H = Math.round(A * DPI);          // 2000x1125
const PAN_W = Math.round((L - PAINEL_X) * DPI), PAN_H = FUNDO_H;             // 1055x1125
const CORTE_X = FUNDO_W - PAN_W;

const CENARIO = path.join(SRC, "p02-4.png");

// `transparency: 45` no pptxgenjs = 45% TRANSPARENTE, ou seja 55% de preto por cima do
// cenário. O painel tem que levar o mesmo tanto pra casar com o fundo — MENOS na borda
// esquerda, onde o motor já joga o VEU_EMENDA quase opaco por cima. Escurecer os dois
// no mesmo lugar fazia uma banda preta vertical bem na emenda, que é justo o que o véu
// existe pra evitar. Daí o véu do painel ser um gradiente, não um chapado.
const VEU_ESQ = 0.10, VEU_DIR = 0.55;

function svgRect(w, h, cor, op){
  return Buffer.from(
    `<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${cor}" fill-opacity="${op}"/></svg>`);
}
function svgVeu(w, h, a0, a1){
  return Buffer.from(
    `<svg width="${w}" height="${h}"><defs>` +
    `<linearGradient id="v" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0%" stop-color="#0B0B0C" stop-opacity="${a0}"/>` +
    `<stop offset="100%" stop-color="#0B0B0C" stop-opacity="${a1}"/>` +
    `</linearGradient></defs><rect width="${w}" height="${h}" fill="url(#v)"/></svg>`);
}
// O glow atrás do sujeito é o que separa ele do escritório escuro — sem isso o terno
// preto some no fundo preto. O modelo do dono faz isso em todas as páginas.
function svgGlow(w, h, cx, cy, r, op){
  return Buffer.from(
    `<svg width="${w}" height="${h}"><defs>` +
    `<radialGradient id="g" cx="${cx}" cy="${cy}" r="${r}">` +
    `<stop offset="0%" stop-color="#EFE6CE" stop-opacity="${op}"/>` +
    `<stop offset="55%" stop-color="#D8CBA8" stop-opacity="${op * 0.42}"/>` +
    `<stop offset="100%" stop-color="#000000" stop-opacity="0"/>` +
    `</radialGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#g)"/></svg>`);
}

async function fundoCenario(){
  return sharp(CENARIO).resize(FUNDO_W, FUNDO_H, { fit: "cover", position: "centre" }).toBuffer();
}

// modos: "figura" (altura cheia, pisa na base) · "cover" (preenche) · "icone" (centrado, menor)
async function painel(arquivo, modo, opts = {}){
  const base = await fundoCenario();
  let camada = await sharp(base)
    .extract({ left: CORTE_X, top: 0, width: PAN_W, height: PAN_H })
    .composite([{ input: svgVeu(PAN_W, PAN_H, VEU_ESQ, VEU_DIR), blend: "over" }])
    .png().toBuffer();

  const gx = opts.gx ?? "55%", gy = opts.gy ?? "44%";
  camada = await sharp(camada)
    .composite([{ input: svgGlow(PAN_W, PAN_H, gx, gy, "58%", opts.glow ?? 0.3), blend: "over" }])
    .png().toBuffer();

  // O motor ainda vai jogar VEU_EMENDA + VEU_ESQ por cima do painel (~30% de preto na
  // ponta direita). O sujeito é composto DEPOIS do escurecimento do cenário, então ele
  // sai daqui clareado na mesma medida — senão chega apagado no slide.
  const src = path.join(SRC, arquivo);
  const CLARO = opts.claro ?? 1.45;
  let sujeito, left, top;
  if(modo === "cover"){
    sujeito = await sharp(src).resize(PAN_W, PAN_H, { fit: "cover", position: opts.pos || "centre" })
      .modulate({ brightness: CLARO }).png().toBuffer();
    left = 0; top = 0;
  } else if(modo === "figura"){
    const alt = Math.round(PAN_H * (opts.escala ?? 1));
    sujeito = await sharp(src).resize({ height: alt }).modulate({ brightness: CLARO }).png().toBuffer();
    const m = await sharp(sujeito).metadata();
    left = Math.round(PAN_W * (opts.cx ?? 0.5) - m.width / 2);
    top = PAN_H - alt;
    if(left < 0 || left + m.width > PAN_W){
      // figura mais larga que o painel: corta pelas laterais em vez de deixar vazar
      const recL = Math.max(0, -left), recW = Math.min(m.width - recL, PAN_W - Math.max(0, left));
      sujeito = await sharp(sujeito).extract({ left: recL, top: 0, width: recW, height: alt }).png().toBuffer();
      left = Math.max(0, left);
    }
  } else { // icone
    // O ícone mora no MEIO do painel, que é onde os dois véus do motor se somam (~65%
    // de preto). Ele sai daqui mais claro que a figura de corpo inteiro, e um pouco mais
    // à direita, onde o véu já afrouxou.
    const alt = Math.round(PAN_H * (opts.escala ?? 0.44));
    sujeito = await sharp(src).resize({ height: alt, width: Math.round(PAN_W * 0.86),
      fit: "inside" }).modulate({ brightness: opts.claro ?? 1.75 }).png().toBuffer();
    const m = await sharp(sujeito).metadata();
    left = Math.round(PAN_W * (opts.cx ?? 0.6) - m.width / 2);
    top = Math.round(PAN_H * (opts.cy ?? 0.42) - m.height / 2);
  }
  return sharp(camada).composite([{ input: sujeito, left, top }])
    .jpeg({ quality: 90, mozjpeg: true }).toBuffer();
}

async function main(){
  fs.mkdirSync(OUT, { recursive: true });

  // o cenário limpo, que sangra por baixo de tudo
  await sharp(await fundoCenario()).jpeg({ quality: 88, mozjpeg: true })
    .toFile(path.join(OUT, "cenario.jpg"));

  // CAPA: o slide inteiro (16:9). Os dois retratos entram à direita, o texto mora à esquerda.
  {
    let capa = await sharp(await fundoCenario())
      .composite([{ input: svgRect(FUNDO_W, FUNDO_H, "#0B0B0C", 0.42), blend: "over" }])
      .composite([{ input: svgGlow(FUNDO_W, FUNDO_H, "68%", "42%", "42%", 0.34), blend: "over" }])
      .png().toBuffer();
    const camadas = [];
    for(const [arq, cx, escala] of [["p01-6.png", 0.88, 0.96], ["p01-5.png", 0.68, 1.0]]){
      const alt = Math.round(FUNDO_H * escala);
      const b = await sharp(path.join(SRC, arq)).resize({ height: alt })
        .modulate({ brightness: 1.28 }).png().toBuffer();
      const m = await sharp(b).metadata();
      camadas.push({ input: b, left: Math.round(FUNDO_W * cx - m.width / 2), top: FUNDO_H - alt });
    }
    await sharp(capa).composite(camadas).jpeg({ quality: 90, mozjpeg: true })
      .toFile(path.join(OUT, "capa.jpg"));
  }

  const paginas = [
    ["s02", "p02-3.png", "icone",  { escala: 0.42 }],                        // sino
    ["s03", "p03-3.png", "icone",  { escala: 0.34, cy: 0.3, cx: 0.55 }],     // aperto de mãos
    ["s04", "p04-3.png", "figura", { cx: 0.55 }],                            // estátua da justiça
    ["s05", "p05-3.png", "icone",  { escala: 0.44 }],                        // calendário
    ["s06", "p06-3.png", "cover",  { pos: "right top" }],                    // mão escrevendo
    ["s07", "p07-2.png", "figura", { cx: 0.52 }],                            // advogado de pé
    // s08 e s10 vêm com fundo próprio (mesa, parede): centrados, o retângulo delas
    // termina no meio do painel e a emenda vira uma linha reta. Encostam na borda.
    ["s08", "p08-3.png", "figura", { cx: 0.68 }],                            // advogado + martelo
    ["s09", "p09-4.png", "figura", { cx: 0.55 }],                            // falando à plateia
    ["s10", "p10-3.png", "cover",  { pos: "top" }],                          // aperto de mãos, cliente
    ["s11", "p11-3.png", "figura", { cx: 0.55 }],                            // advogado ao telefone
    ["s12", "p12-3.png", "icone",  { escala: 0.46 }],                        // checklist
  ];
  for(const [nome, arq, modo, opts] of paginas){
    const buf = await painel(arq, modo, opts);
    fs.writeFileSync(path.join(OUT, nome + ".jpg"), buf);
    console.log("ok", nome, "<-", arq, modo);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
