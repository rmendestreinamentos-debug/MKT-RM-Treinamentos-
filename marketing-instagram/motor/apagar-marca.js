// apagar-marca.js — cobre uma marca d'água de veículo copiando a textura vizinha por cima.
//
//   node motor/apagar-marca.js "<pasta>/<arquivo>" <x> <y> <larg> <alt> [desloc] ["<saida>"]
//                               imagem em imagens/   a caixa da marca      px      opcional
//
// Por que existe: foto de reportagem chega com o logo do veículo carimbado, e às vezes a
// imagem só serve inteira — recortar pra fora da marca jogaria fora justamente o que a
// frase pede. Copiar a faixa vizinha por cima resolve, porque parede, telhado e chão são
// texturas repetidas: o olho não acha a emenda se o deslocamento mantém as faixas
// horizontais alinhadas (por isso o clone é LATERAL, e não vertical).
//
// `desloc` (padrão: a própria largura + 10%) é de onde a textura vem, à esquerda da caixa;
// negativo puxa da direita. As bordas entram com degradê pra não deixar costura reta.
//
// ⚠️ Isto edita o CONTEÚDO de uma foto jornalística. Vale pra tirar a marca de quem
// publicou; não vale pra tirar ou pôr elemento que mude o que a foto mostra.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = path.resolve(__dirname, "..");

(async () => {
  const [rel, x, y, w, h, desloc, saida] = process.argv.slice(2);
  if(!rel || w === undefined || h === undefined){
    console.error('uso: node motor/apagar-marca.js "<pasta>/<arq>" <x> <y> <larg> <alt> [desloc] ["<saida>"]');
    process.exit(1);
  }
  const origem = [path.join(BASE, "imagens", rel), path.join(BASE, "fotos", rel)]
    .find(p => fs.existsSync(p));
  if(!origem){ console.error(`erro: ${rel} não existe em imagens/ nem fotos/`); process.exit(1); }

  const ext = path.extname(origem).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp"
             : ext === ".avif" ? "image/avif" : "image/jpeg";
  const src = `data:${mime};base64,${fs.readFileSync(origem).toString("base64")}`;
  const caixa = [x, y, w, h].map(Number);
  const dx = desloc !== undefined && desloc !== "" ? Number(desloc) : Math.round(caixa[2] * 1.1);

  const nav = await chromium.launch();
  const pag = await nav.newPage();
  const b64 = await pag.evaluate(async ([src, [x, y, w, h], dx]) => {
    const img = new Image(); img.src = src; await img.decode();
    const cv = document.createElement("canvas");
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const cx = cv.getContext("2d");
    cx.drawImage(img, 0, 0);

    // O retalho sai de uma faixa deslocada na HORIZONTAL, na mesma altura: é o que mantém
    // viga, junta de tijolo e linha de chão continuando de um lado pro outro.
    const folga = 6;                                  // pega o antialias em volta da letra
    const rx = x - folga, ry = y - folga, rw = w + folga * 2, rh = h + folga * 2;
    const retalho = document.createElement("canvas");
    retalho.width = rw; retalho.height = rh;
    retalho.getContext("2d").drawImage(cv, rx - dx, ry, rw, rh, 0, 0, rw, rh);

    // Degradê nas bordas: costura reta o olho acha na hora, borda esfumada não.
    const mask = retalho.getContext("2d");
    mask.globalCompositeOperation = "destination-in";
    const g = mask.createLinearGradient(0, 0, rw, 0);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.12, "rgba(0,0,0,1)");
    g.addColorStop(0.88, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
    mask.fillStyle = g; mask.fillRect(0, 0, rw, rh);
    const g2 = mask.createLinearGradient(0, 0, 0, rh);
    g2.addColorStop(0, "rgba(0,0,0,0)"); g2.addColorStop(0.12, "rgba(0,0,0,1)");
    g2.addColorStop(0.88, "rgba(0,0,0,1)"); g2.addColorStop(1, "rgba(0,0,0,0)");
    mask.fillStyle = g2; mask.fillRect(0, 0, rw, rh);

    // Duas passadas: a borda esfumada sozinha deixa o branco da marca vazar pelo degradê.
    cx.drawImage(retalho, rx, ry);
    cx.drawImage(retalho, rx, ry);
    return cv.toDataURL("image/jpeg", 0.95).split(",")[1];
  }, [src, caixa, dx]);
  await nav.close();

  const destino = path.join(BASE, "imagens", saida || rel.replace(/\.\w+$/, "-sem-marca.jpg"));
  fs.writeFileSync(destino, Buffer.from(b64, "base64"));
  console.log(`gerado: imagens/${saida || rel.replace(/\.\w+$/, "-sem-marca.jpg")}`
    + `  (marca de ${caixa[2]}x${caixa[3]} coberta, textura puxada de ${dx}px à esquerda)`);
})();
