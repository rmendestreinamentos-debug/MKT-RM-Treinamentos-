// logo-sem-fundo.js — tira o fundo PRETO de um logo, gerando um PNG transparente.
// Uso:  node motor/logo-sem-fundo.js rm-summit-sp.png
//       -> escreve marca/rm-summit-sp-sem-fundo.png
//
// Por que existe: os logos da casa vieram com o fundo preto CHAPADO dentro do
// arquivo. Num slide escuro isso não aparece (preto sobre preto), mas sobre FOTO
// — que é o caso do anúncio e do caricato — vira um retângulo preto sem pé nem
// cabeça. Não dá pra resolver no CSS: o preto está nos pixels.
//
// Como: o logo é claro sobre preto, então o brilho de cada pixel JÁ É a opacidade
// dele. Toma-se alpha = max(r,g,b) e "desmultiplica-se" a cor por esse alpha. Isso
// preserva as bordas suaves e o brilho do dourado — um corte por limiar deixaria
// serrilhado e comeria o degradê.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = path.resolve(__dirname, "..");

(async () => {
  const nome = process.argv[2];
  if(!nome){ console.error("uso: node motor/logo-sem-fundo.js <arquivo.png em marca/>"); process.exit(1); }

  const origem = path.join(BASE, "marca", nome);
  if(!fs.existsSync(origem)){ console.error(`erro: ${nome} não existe em marca/`); process.exit(1); }

  const destino = path.join(BASE, "marca", nome.replace(/\.png$/i, "") + "-sem-fundo.png");
  const dataURI = `data:image/png;base64,${fs.readFileSync(origem).toString("base64")}`;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const b64 = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const cv = document.createElement("canvas");
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const ctx = cv.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, cv.width, cv.height);
    const p = d.data;
    // Alpha cru = brilho deixaria o cinza-claro (o "SÃO PAULO") semitransparente, e
    // a foto atravessaria a letra. A curva puxa os meios-tons pra opaco sem trazer o
    // preto de volta: 0 continua 0, e o resto sobe. GAMA < 1 = mais opaco.
    const GAMA = 0.45;
    for(let i = 0; i < p.length; i += 4){
      const brilho = Math.max(p[i], p[i+1], p[i+2]);
      if(brilho === 0){ p[i+3] = 0; continue; }
      p[i]   = Math.min(255, Math.round(p[i]   * 255 / brilho));   // desmultiplica
      p[i+1] = Math.min(255, Math.round(p[i+1] * 255 / brilho));
      p[i+2] = Math.min(255, Math.round(p[i+2] * 255 / brilho));
      p[i+3] = Math.min(255, Math.round(255 * Math.pow(brilho / 255, GAMA)));
    }
    ctx.putImageData(d, 0, 0);
    return cv.toDataURL("image/png").split(",")[1];
  }, dataURI);
  await browser.close();

  fs.writeFileSync(destino, Buffer.from(b64, "base64"));
  console.log("gerado:", path.relative(BASE, destino));
})();
