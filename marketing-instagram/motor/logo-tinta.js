// logo-tinta.js — logo de TINTA ESCURA SOBRE BRANCO vira PNG transparente, aparado e
// (opcionalmente) pintado numa cor só.
// Uso:  node motor/logo-tinta.js rm-treinamentos.png ouro
//       node motor/logo-tinta.js rm-treinamentos.png branco
//       node motor/logo-tinta.js rm-treinamentos.png "#f4b661" [nome-de-saida]
//       node motor/logo-tinta.js rm-treinamentos.png cor      <- mantém as cores originais
//
// Por que NÃO serve o logo-sem-fundo.js: aquele resolve o caso da casa (logo CLARO sobre
// fundo PRETO), e a conta dele é alpha = brilho. Aqui é o inverso — tinta escura sobre
// branco. Rodar o outro apagaria as letras e deixaria o fundo opaco: sairia um retângulo
// branco com um buraco no formato do logo.
//
// Duas coisas a mais que este faz, e as duas são necessárias:
//
// 1. APARA a margem. Logo exportado de editor chega com um oceano de branco em volta.
//    Pro olho é o mesmo logo; pro layout não é — a altura declarada na peça é a altura do
//    ARQUIVO, então a margem come o espaço e a marca sai uma pulga no meio do nada.
//
// 2. PINTA numa cor só. É o "reverse" da marca. A RM Treinamentos é ocre + vinho + bordô,
//    uma paleta de fundo CLARO: sobre preto o vinho e o bordô somem (o "Treinamentos" fica
//    ilegível) e sobra o ocre solto, que lê como logo quebrado. Versão monocromática é o
//    que toda marca tem pra fundo escuro. Passar "cor" mantém o original — use quando o
//    carimbo cair sobre fundo claro.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = path.resolve(__dirname, "..");
const APELIDOS = { ouro: "#f4b661", dourado: "#f4b661", vibrante: "#f3c223", branco: "#ffffff", preto: "#000000" };

function hexRGB(h){
  const s = h.replace("#", "");
  const n = parseInt(s.length === 3 ? s.split("").map(c => c + c).join("") : s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

(async () => {
  const nome = process.argv[2];
  const tintaArg = (process.argv[3] || "ouro").toLowerCase();
  if(!nome){
    console.error("uso: node motor/logo-tinta.js <arquivo.png em marca/> [ouro|branco|cor|#hex] [saida]");
    process.exit(1);
  }
  const origem = path.join(BASE, "marca", nome);
  if(!fs.existsSync(origem)){ console.error(`erro: ${nome} não existe em marca/`); process.exit(1); }

  const manterCor = tintaArg === "cor" || tintaArg === "original";
  const hex = manterCor ? null : (APELIDOS[tintaArg] || tintaArg);
  if(!manterCor && !/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex)){
    console.error(`erro: cor "${tintaArg}" não entendida. Use ouro, branco, cor, ou um #hex.`);
    process.exit(1);
  }
  const sufixo = process.argv[4] || (manterCor ? "sem-fundo" : (APELIDOS[tintaArg] ? tintaArg : "tinta"));
  const destino = path.join(BASE, "marca", nome.replace(/\.png$/i, "") + "-" + sufixo + ".png");
  const dataURI = `data:image/png;base64,${fs.readFileSync(origem).toString("base64")}`;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const r = await page.evaluate(async ({ src, rgb, manterCor }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const cv = document.createElement("canvas");
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const ctx = cv.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, cv.width, cv.height);
    const p = d.data;

    // alpha = 1 - min(r,g,b)/255, e o MIN é o ponto do algoritmo, não o brilho médio.
    // O ocre do monograma (≈181,121,60) é uma cor CLARA: pela luminância ele sairia
    // meio transparente e o "R" da marca ficaria mais fraco que o resto. Pelo canal
    // mínimo ele é opaco, porque o azul dele é baixo — o que separa tinta de papel
    // aqui é SATURAÇÃO, não escuridão. Branco puro tem min=255 e some; cinza neutro
    // de antialias vira meio-tom, então a borda continua suave.
    let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
    for(let i = 0; i < p.length; i += 4){
      const min = Math.min(p[i], p[i+1], p[i+2]);
      const cru = 255 - min;
      if(cru <= 3){ p[i+3] = 0; continue; }
      // Monocromático PRECISA de alpha uniforme. Alpha cru = saturação, e cada cor da
      // marca tem a sua: o ocre do "R" dá ~195 e o bordô do "m" dá ~238, então o mesmo
      // dourado sairia com o "R" translúcido ao lado de um "m" sólido — lê como logo
      // meio apagado, não como marca. A rampa satura tudo acima de 110 e reserva a faixa
      // de 8 a 110 pro anti-alias, que é onde a borda suave tem que morar. Na versão que
      // mantém as cores originais isso não vale: lá a diferença de alpha É a arte.
      const a = manterCor ? cru
              : Math.min(255, Math.round(255 * (cru - 8) / 102));
      if(a <= 0){ p[i+3] = 0; continue; }
      p[i+3] = a;
      if(!manterCor){ p[i] = rgb[0]; p[i+1] = rgb[1]; p[i+2] = rgb[2]; }
      else {
        // desmultiplica pra cor não escurecer junto com o alpha na composição
        const k = 255 / a;
        p[i]   = Math.max(0, Math.min(255, Math.round(255 - (255 - p[i])   * k)));
        p[i+1] = Math.max(0, Math.min(255, Math.round(255 - (255 - p[i+1]) * k)));
        p[i+2] = Math.max(0, Math.min(255, Math.round(255 - (255 - p[i+2]) * k)));
      }
      // caixa do que sobrou opaco — o corte usa um limiar mais alto que o do alpha pra
      // não esticar a moldura até o último pixel de sujeira do JPEG/anti-alias
      if(a > 24){
        const px = (i / 4) % cv.width, py = Math.floor((i / 4) / cv.width);
        if(px < x0) x0 = px; if(px > x1) x1 = px;
        if(py < y0) y0 = py; if(py > y1) y1 = py;
      }
    }
    ctx.putImageData(d, 0, 0);
    if(x1 < 0) return { erro: "a imagem ficou vazia — ela é tinta escura sobre branco mesmo?" };

    const m = 2;                                            // respiro de 2px, senão a borda serrilha
    x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m);
    x1 = Math.min(cv.width - 1, x1 + m); y1 = Math.min(cv.height - 1, y1 + m);
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const cut = document.createElement("canvas");
    cut.width = w; cut.height = h;
    cut.getContext("2d").drawImage(cv, x0, y0, w, h, 0, 0, w, h);
    return { b64: cut.toDataURL("image/png").split(",")[1], w, h, antes: [cv.width, cv.height] };
  }, { src: dataURI, rgb: manterCor ? null : hexRGB(hex), manterCor });
  await browser.close();

  if(r.erro){ console.error("erro:", r.erro); process.exit(1); }
  fs.writeFileSync(destino, Buffer.from(r.b64, "base64"));
  console.log(`gerado: ${path.relative(BASE, destino)}`);
  console.log(`  aparado de ${r.antes[0]}×${r.antes[1]} para ${r.w}×${r.h} (proporção ${(r.w/r.h).toFixed(2)})`);
  if(r.w / r.h < 1.6)
    console.log("  aviso: lockup EMPILHADO (quase quadrado). Numa altura pequena a palavra de baixo\n" +
                "  vira borrão — dê a ele mais altura que a de um wordmark deitado, ou use só o monograma.");
})();
