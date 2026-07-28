// separar.js — separa VÁRIAS pessoas recortadas de um mesmo PNG em arquivos individuais.
// Uso: node motor/separar.js "<arquivo.png>" "<prefixo de saída>"
//
// Por que existe: o dono manda o lote de palestrantes numa PRANCHA só — uma tela grande
// com quatro pessoas já sem fundo, espalhadas. O `aparar.js` supõe UMA pessoa por arquivo
// (ele mede a caixa de tudo que não é transparente), então numa prancha ele devolveria a
// caixa dos quatro juntos. Aqui os corpos são separados por componente conexo de alpha,
// cada um vira um PNG aparado, e aí o line-up consegue posicionar pessoa por pessoa.
//
// Sai em palestrantes/recorte/<prefixo>-N.png, numerado na ordem de leitura (cima→baixo,
// esquerda→direita). Renomear depois para o NOME da pessoa — é o nome do arquivo que a
// peça cita, e conferir quem é quem se faz olhando, não adivinhando.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = path.resolve(__dirname, "..");
const ALTURA_MAX = 1800;
const CORTE_ALFA = 12;

(async () => {
  const [entrada, prefixo] = process.argv.slice(2);
  const src = path.resolve(entrada);
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage();
  const dataURI = "data:image/png;base64," + fs.readFileSync(src).toString("base64");

  const pecas = await pagina.evaluate(async ({ uri, ALTURA_MAX, CORTE_ALFA }) => {
    const img = new Image();
    await new Promise((ok, err) => { img.onload = ok; img.onerror = err; img.src = uri; });

    const ESCALA = Math.min(1, 700 / Math.max(img.width, img.height));
    const lw = Math.max(1, Math.round(img.width * ESCALA));
    const lh = Math.max(1, Math.round(img.height * ESCALA));
    const mini = document.createElement("canvas");
    mini.width = lw; mini.height = lh;
    const mc = mini.getContext("2d", { willReadFrequently: true });
    mc.drawImage(img, 0, 0, lw, lh);
    const px = mc.getImageData(0, 0, lw, lh).data;

    const cheio = new Uint8Array(lw * lh);
    for (let i = 0; i < lw * lh; i++) cheio[i] = px[i * 4 + 3] > CORTE_ALFA ? 1 : 0;

    // componentes conexos (4-vizinhos), com fila explícita
    const marca = new Int32Array(lw * lh).fill(-1);
    const caixas = [];
    for (let i = 0; i < lw * lh; i++) {
      if (!cheio[i] || marca[i] >= 0) continue;
      const id = caixas.length;
      const cx = { x0: lw, y0: lh, x1: -1, y1: -1, n: 0 };
      const fila = [i]; marca[i] = id;
      while (fila.length) {
        const p = fila.pop();
        const x = p % lw, y = (p / lw) | 0;
        cx.n++;
        if (x < cx.x0) cx.x0 = x;
        if (x > cx.x1) cx.x1 = x;
        if (y < cx.y0) cx.y0 = y;
        if (y > cx.y1) cx.y1 = y;
        const viz = [];
        if (x > 0) viz.push(p - 1);
        if (x < lw - 1) viz.push(p + 1);
        if (y > 0) viz.push(p - lw);
        if (y < lh - 1) viz.push(p + lw);
        for (const v of viz) if (cheio[v] && marca[v] < 0) { marca[v] = id; fila.push(v); }
      }
      caixas.push(cx);
    }

    // Quem é PESSOA e quem é sujeira. Fundir por caixa que se cruza não serve: numa
    // prancha em diagonal a caixa de quem está em cima à esquerda encosta na de quem está
    // embaixo à direita, e as duas viram uma só. Corpo é o componente GRANDE; o que sobra
    // (mecha solta, franja de recorte) é anexado ao corpo mais próximo, ou some.
    const areaPessoa = lw * lh * 0.015;
    const pessoas = caixas.filter(c => c.n >= areaPessoa);
    const restos  = caixas.filter(c => c.n < areaPessoa && c.n > lw * lh * 0.0002);
    const dist = (a, b) => Math.max(0, Math.max(a.x0 - b.x1, b.x0 - a.x1))
                         + Math.max(0, Math.max(a.y0 - b.y1, b.y0 - a.y1));
    for (const r of restos) {
      let alvo = null, melhor = lw * 0.03;          // além disso não é do corpo de ninguém
      for (const p of pessoas) { const d = dist(r, p); if (d < melhor) { melhor = d; alvo = p; } }
      if (!alvo) continue;
      alvo.x0 = Math.min(alvo.x0, r.x0); alvo.y0 = Math.min(alvo.y0, r.y0);
      alvo.x1 = Math.max(alvo.x1, r.x1); alvo.y1 = Math.max(alvo.y1, r.y1);
    }
    let vivos = pessoas;
    // ordem de leitura: cima→baixo, esquerda→direita
    vivos.sort((a, b) => (a.y0 - b.y0) || (a.x0 - b.x0));

    const folga = Math.ceil(2 / ESCALA);
    return vivos.map(c => {
      const cx = Math.max(0, Math.floor(c.x0 / ESCALA) - folga);
      const cy = Math.max(0, Math.floor(c.y0 / ESCALA) - folga);
      const cw = Math.min(img.width - cx, Math.ceil((c.x1 - c.x0 + 1) / ESCALA) + folga * 2);
      const ch = Math.min(img.height - cy, Math.ceil((c.y1 - c.y0 + 1) / ESCALA) + folga * 2);
      const k = Math.min(1, ALTURA_MAX / ch);
      const out = document.createElement("canvas");
      out.width = Math.round(cw * k);
      out.height = Math.round(ch * k);
      out.getContext("2d").drawImage(img, cx, cy, cw, ch, 0, 0, out.width, out.height);
      return out.toDataURL("image/png");
    });
  }, { uri: dataURI, ALTURA_MAX, CORTE_ALFA });

  await navegador.close();
  pecas.forEach((dado, i) => {
    const destino = path.join(BASE, "palestrantes", "recorte", `${prefixo}-${i + 1}.png`);
    fs.writeFileSync(destino, Buffer.from(dado.split(",")[1], "base64"));
    const b = fs.readFileSync(destino);
    console.log(`${prefixo}-${i + 1}.png  ${b.readUInt32BE(16)}x${b.readUInt32BE(20)}  prop=${(b.readUInt32BE(16) / b.readUInt32BE(20)).toFixed(3)}`);
  });
})();
