// recortar.js — recorta um pedaço de uma foto do acervo e salva em imagens/.
// Uso:  node motor/recortar.js "FOTOS/DIA 3/0017_....jpg" 100 1000 1576 1970 rafael-sorriso.jpg
//                               <foto em fotos/>          x0  y0   larg alt  <nome em imagens/>
//
// Por que existe: o corte 4:5 do feed só escolhe o que fica no MEIO — ele não sabe
// tirar do quadro quem não deveria estar lá. Foto boa do acervo vem, às vezes, com
// um vizinho de crachá "BELO HORIZONTE" ao lado: aí não é caso de véu nem de `foco`,
// é caso de recortar a imagem de verdade.
//
// O recorte é uma peça NOVA e vai pra `imagens/` — o acervo (`fotos/`) não se mexe.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = path.resolve(__dirname, "..");

(async () => {
  const [rel, x, y, w, h, saida] = process.argv.slice(2);
  if(!rel || !saida){
    console.error('uso: node motor/recortar.js "<foto em fotos/>" <x> <y> <larg> <alt> <nome.jpg>');
    process.exit(1);
  }
  const origem = path.join(BASE, "fotos", rel);
  if(!fs.existsSync(origem)){ console.error(`erro: ${rel} não existe em fotos/`); process.exit(1); }

  const ext = path.extname(origem).toLowerCase();
  const mime = ext === ".png" ? "image/png" : "image/jpeg";
  const src = `data:${mime};base64,${fs.readFileSync(origem).toString("base64")}`;
  const caixa = [x, y, w, h].map(Number);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const b64 = await page.evaluate(async ([src, [x, y, w, h]]) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    cv.getContext("2d").drawImage(img, x, y, w, h, 0, 0, w, h);
    return cv.toDataURL("image/jpeg", 0.94).split(",")[1];
  }, [src, caixa]);
  await browser.close();

  const destino = path.join(BASE, "imagens", saida);
  fs.writeFileSync(destino, Buffer.from(b64, "base64"));
  console.log(`gerado: imagens/${saida}  (${caixa[2]}x${caixa[3]}, proporção ${(caixa[2]/caixa[3]).toFixed(2)})`);
})();
