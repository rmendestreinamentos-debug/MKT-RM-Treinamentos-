// logo-fundo-claro.js — logo CLARO SOBRE PRETO vira versão pra FUNDO BRANCO.
// Uso:  node motor/logo-fundo-claro.js imersao-master-mat.png
//       node motor/logo-fundo-claro.js imersao-master-mat.png "#141418"   <- outra tinta
//       node motor/logo-fundo-claro.js master-mat.png ouro                <- neutro vira ouro
//
// Existe porque nenhum dos dois scripts irmãos serve a este caso:
//   · logo-sem-fundo.js faz alpha = BRILHO. O dourado sai semitransparente e, sobre branco,
//     vira um laranja lavado; o "MASTER" (que é PRATA no arquivo) sai quase 100% opaco de
//     branco — ou seja, invisível no papel. É exatamente o que se vê em
//     marca/imersao-master-mat-sem-fundo.png: o MAT sobrevive, o MASTER desaparece.
//   · logo-tinta.js resolve o inverso (tinta escura sobre branco) e pinta TUDO numa cor só,
//     o que mataria o metálico do MAT.
//
// A conta aqui tem duas metades, e a divisa entre elas é a CROMA (max-min do RGB), não o
// brilho:
//   1) PIXEL COLORIDO (o dourado) — mantém a cor EXATA do arquivo e fica opaco. O corte é
//      duro de propósito: rampa de alpha só na faixa muito escura (6..30). Rampa larga
//      deixaria as bandas escuras do metal (o bronze #774915, que é sombra do gradiente, não
//      borda) semitransparentes, e sobre branco elas clareariam — o metal perderia
//      justamente o contraste que o faz parecer metal.
//   2) PIXEL NEUTRO (o "MASTER" prata e o antialias) — INVERTE: alpha = brilho e a cor vira
//      TINTA ESCURA. Letra branca de brilho 100% vira letra preta 100%; a borda cinza vira
//      borda meio-tom. É o negativo fiel, e é o que devolve o "MASTER" no papel branco.
//
// ⚠️ O reflexo especular DENTRO do dourado é quase branco e cairia na regra 2 — viraria
// respingo preto no meio do MAT. Por isso a classificação não olha só o pixel: um neutro só
// é tratado como neutro se a VIZINHANÇA dele também for neutra. Reflexo cercado de ouro
// continua ouro.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = path.resolve(__dirname, "..");
const APELIDOS = {
  tinta: "#141418", preto: "#000000", grafite: "#2A2A30",
  ouro: "#B8860B", dourado: "#B8860B", bronze: "#8A5A1E",
};

function hexRGB(h){
  const s = String(h).replace("#", "");
  const n = parseInt(s.length === 3 ? s.split("").map(c => c + c).join("") : s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

(async () => {
  const nome = process.argv[2];
  const tintaArg = (process.argv[3] || "tinta").toLowerCase();
  if(!nome){
    console.error("uso: node motor/logo-fundo-claro.js <arquivo.png em marca/> [tinta|ouro|#hex] [saida]");
    process.exit(1);
  }
  const origem = path.join(BASE, "marca", nome);
  if(!fs.existsSync(origem)){ console.error(`erro: ${nome} não existe em marca/`); process.exit(1); }

  const hex = APELIDOS[tintaArg] || tintaArg;
  if(!/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex)){
    console.error(`erro: cor "${tintaArg}" não entendida. Use tinta, ouro, ou um #hex.`);
    process.exit(1);
  }
  const sufixo = process.argv[4] || "claro";
  const destino = path.join(BASE, "marca", nome.replace(/\.png$/i, "") + "-" + sufixo + ".png");
  const dataURI = `data:image/png;base64,${fs.readFileSync(origem).toString("base64")}`;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const r = await page.evaluate(async ({ src, ink }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const W = img.naturalWidth, H = img.naturalHeight;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, W, H);
    const p = d.data;

    // mapa de croma, pra poder perguntar pela VIZINHANÇA antes de decidir
    const croma = new Uint8Array(W * H);
    const valor = new Uint8Array(W * H);
    for(let i = 0, j = 0; i < p.length; i += 4, j++){
      const mx = Math.max(p[i], p[i+1], p[i+2]);
      const mn = Math.min(p[i], p[i+1], p[i+2]);
      croma[j] = mx - mn;
      valor[j] = mx;
    }
    // soma acumulada (integral image) — a média numa janela sai em 4 leituras, não em 49
    const soma = new Float64Array((W + 1) * (H + 1));
    for(let y = 0; y < H; y++)
      for(let x = 0; x < W; x++)
        soma[(y+1)*(W+1) + x+1] = croma[y*W + x] + soma[y*(W+1) + x+1] + soma[(y+1)*(W+1) + x] - soma[y*(W+1) + x];
    const R = 4;   // janela de 9×9
    function vizinhanca(x, y){
      const x0 = Math.max(0, x - R), y0 = Math.max(0, y - R);
      const x1 = Math.min(W - 1, x + R), y1 = Math.min(H - 1, y + R);
      const s = soma[(y1+1)*(W+1) + x1+1] - soma[y0*(W+1) + x1+1] - soma[(y1+1)*(W+1) + x0] + soma[y0*(W+1) + x0];
      return s / ((x1 - x0 + 1) * (y1 - y0 + 1));
    }

    const CROMA_NEUTRO = 22;   // abaixo disso o pixel é cinza/branco/preto, não cor de marca
    const VIZ_NEUTRA   = 26;   // e a vizinhança também precisa ser, senão é reflexo no ouro
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    let nNeutro = 0, nCor = 0;

    for(let i = 0, j = 0; i < p.length; i += 4, j++){
      const c = croma[j], mx = valor[j];
      if(mx <= 6){ p[i+3] = 0; continue; }               // o plano preto do arquivo

      const x = j % W, y = (j / W) | 0;
      const neutro = c < CROMA_NEUTRO && vizinhanca(x, y) < VIZ_NEUTRA;

      let a;
      if(neutro){
        // NEGATIVO: brilho vira opacidade de tinta escura
        a = Math.min(255, Math.round((mx - 6) * 255 / 249));
        p[i] = ink[0]; p[i+1] = ink[1]; p[i+2] = ink[2];
        nNeutro++;
      } else {
        // COR: fica como está, e opaca já em brilho baixo — ver o comentário do cabeçalho
        a = Math.min(255, Math.max(0, Math.round((mx - 6) * 255 / 24)));
        nCor++;
      }
      p[i+3] = a;
      if(a > 24){
        if(x < x0) x0 = x; if(x > x1) x1 = x;
        if(y < y0) y0 = y; if(y > y1) y1 = y;
      }
    }
    ctx.putImageData(d, 0, 0);
    if(x1 < 0) return { erro: "a imagem ficou vazia — ela é clara sobre preto mesmo?" };

    const m = 2;
    x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m);
    x1 = Math.min(W - 1, x1 + m); y1 = Math.min(H - 1, y1 + m);
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const cut = document.createElement("canvas");
    cut.width = w; cut.height = h;
    cut.getContext("2d").drawImage(cv, x0, y0, w, h, 0, 0, w, h);
    return { b64: cut.toDataURL("image/png").split(",")[1], w, h, antes: [W, H], nNeutro, nCor };
  }, { src: dataURI, ink: hexRGB(hex) });
  await browser.close();

  if(r.erro){ console.error("erro:", r.erro); process.exit(1); }
  fs.writeFileSync(destino, Buffer.from(r.b64, "base64"));
  console.log(`gerado: ${path.relative(BASE, destino)}`);
  console.log(`  aparado de ${r.antes[0]}×${r.antes[1]} para ${r.w}×${r.h} (proporção ${(r.w/r.h).toFixed(2)})`);
  console.log(`  ${r.nCor} px de cor mantidos · ${r.nNeutro} px neutros repintados em ${hex}`);
  console.log("  ⚠️ ABRIR E OLHAR: respingo escuro dentro do dourado é reflexo que passou por neutro.");
})();
