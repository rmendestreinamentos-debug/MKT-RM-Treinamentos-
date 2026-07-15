// aparar.js — apara a moldura transparente de um PNG que já veio recortado.
// Uso:  node motor/aparar.js "<arquivo.png>" "Rafael Mendes (estudio)"
//                             <caminho de entrada>  <nome em palestrantes/recorte/>
//
// Por que existe: recorte que vem PRONTO do dono (exportado do Photoshop) costuma vir
// numa tela quadrada gigante — 6250×6250 — com a pessoa pequena no meio e um oceano de
// transparência em volta. Pro olho é a mesma imagem; pro MOTOR não é.
//
// O motor mede a proporção do PNG no cabeçalho do arquivo (largura/altura do IHDR) pra
// saber quanto cada pessoa vai ocupar na fileira. Um PNG 6250×6250 mede proporção 1.0
// mesmo que o corpo dentro dele seja estreito — e aí a conta da fileira sai toda errada:
// o motor reserva a largura de um quadrado pra uma pessoa que é um retângulo em pé, e o
// grupo vira cinco ilhas separadas por vazio invisível.
//
// Aparar não é "limpar o arquivo": é fazer a moldura do PNG coincidir com o CORPO, que
// é a única coisa que o motor consegue medir.
//
// Sai em palestrantes/recorte/ (é de lá que o line-up e o carrossel de estreia leem).

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = path.resolve(__dirname, "..");
const ALTURA_MAX = 1800;      // o motor embute o PNG em base64 no HTML: 6250px viraria um HTML de 40MB
const CORTE_ALFA = 12;        // abaixo disso é sujeira de borda, não pessoa

(async () => {
  const [entrada, saida] = process.argv.slice(2);
  if(!entrada || !saida){
    console.error('uso: node motor/aparar.js "<arquivo.png>" "<nome de saída>"');
    process.exit(1);
  }
  const src = path.isAbsolute(entrada) ? entrada : path.join(BASE, entrada);
  if(!fs.existsSync(src)){ console.error(`não achei: ${src}`); process.exit(1); }

  const destino = path.join(BASE, "palestrantes", "recorte",
    saida.replace(/\.png$/i, "") + ".png");

  const navegador = await chromium.launch();
  const pagina = await navegador.newPage();
  const dataURI = "data:image/png;base64," + fs.readFileSync(src).toString("base64");

  const png = await pagina.evaluate(async ({ uri, ALTURA_MAX, CORTE_ALFA }) => {
    const img = new Image();
    await new Promise((ok, erro) => { img.onload = ok; img.onerror = erro; img.src = uri; });

    // A CAIXA DO CORPO se acha numa miniatura, não no arquivo cheio. Varrer 39 milhões de
    // pixels em JS custa caro e não paga: a borda de uma pessoa não muda de lugar por
    // causa de um pixel. Mede-se em escala reduzida e devolve-se a caixa pro tamanho real.
    const ESCALA = Math.min(1, 900 / Math.max(img.width, img.height));
    const lw = Math.max(1, Math.round(img.width * ESCALA));
    const lh = Math.max(1, Math.round(img.height * ESCALA));
    const mini = document.createElement("canvas");
    mini.width = lw; mini.height = lh;
    const mc = mini.getContext("2d", { willReadFrequently: true });
    mc.drawImage(img, 0, 0, lw, lh);
    const px = mc.getImageData(0, 0, lw, lh).data;

    let x0 = lw, y0 = lh, x1 = -1, y1 = -1;
    for(let y = 0; y < lh; y++){
      for(let x = 0; x < lw; x++){
        if(px[(y * lw + x) * 4 + 3] > CORTE_ALFA){
          if(x < x0) x0 = x;
          if(x > x1) x1 = x;
          if(y < y0) y0 = y;
          if(y > y1) y1 = y;
        }
      }
    }
    if(x1 < 0) throw new Error("a imagem é toda transparente — não há corpo pra aparar");

    // De volta ao tamanho real, com uma folga de 2px na escala da miniatura: a redução
    // arredonda pra dentro e comeria a franja do cabelo e a barra da roupa.
    const folga = Math.ceil(2 / ESCALA);
    const cx = Math.max(0, Math.floor(x0 / ESCALA) - folga);
    const cy = Math.max(0, Math.floor(y0 / ESCALA) - folga);
    const cw = Math.min(img.width  - cx, Math.ceil((x1 - x0 + 1) / ESCALA) + folga * 2);
    const ch = Math.min(img.height - cy, Math.ceil((y1 - y0 + 1) / ESCALA) + folga * 2);

    const k = Math.min(1, ALTURA_MAX / ch);
    const out = document.createElement("canvas");
    out.width  = Math.round(cw * k);
    out.height = Math.round(ch * k);
    out.getContext("2d").drawImage(img, cx, cy, cw, ch, 0, 0, out.width, out.height);
    return out.toDataURL("image/png");
  }, { uri: dataURI, ALTURA_MAX, CORTE_ALFA });

  await navegador.close();
  fs.writeFileSync(destino, Buffer.from(png.split(",")[1], "base64"));

  const b = fs.readFileSync(destino);
  const [w, h] = [b.readUInt32BE(16), b.readUInt32BE(20)];
  console.log(`aparado: palestrantes/recorte/${path.basename(destino)}  ${w}x${h}  prop=${(w / h).toFixed(3)}`);
})();
