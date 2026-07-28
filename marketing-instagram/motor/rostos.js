// rostos.js — mede ONDE está o rosto dentro de cada recorte de palestrante.
// Uso:  node motor/rostos.js                 (mede tudo que está em palestrantes/recorte/)
//       node motor/rostos.js "Fulano (RM5)"  (mede só um)
//
// Por que existe: o line-up escala cada pessoa pela ALTURA DO PNG, e cada recorte vem com
// um enquadramento diferente — um é busto fechado, outro é meio corpo com o braço aberto.
// Dar a mesma altura de PNG aos dois faz a cabeça de um sair o dobro da do outro, e as
// cabeças pararem em alturas diferentes. Na fileira isso lê como recorte colado no susto,
// não como grupo no mesmo palco. O que precisa ser IGUAL entre eles é o ROSTO, e o rosto
// o motor não enxerga sozinho: é isto que este arquivo mede.
//
// Como mede: máscara de tom de pele (não de silhueta — cabelo comprido e ombro largo
// mentem sobre o tamanho da cabeça) e maior mancha contígua na metade de cima. Devolve,
// em fração do PNG: centro horizontal do rosto, topo e base dele.
//
// Sai em palestrantes/rostos.json, lido por gerar.js quando o slide pede "alinhar": "rosto".
// ⚠️ A medida é automática e erra em foto de perfil, mão no queixo e barba muito escura.
// CONFERIR na folha `saida/_ROSTOS.png`, que desenha a caixa achada em cima de cada um.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = path.resolve(__dirname, "..");
const DIR = path.join(BASE, "palestrantes", "recorte");
const SAIDA = path.join(BASE, "palestrantes", "rostos.json");

(async () => {
  const filtro = process.argv[2];
  const arquivos = fs.readdirSync(DIR)
    .filter(f => /\.png$/i.test(f))
    .filter(f => !filtro || f.toLowerCase().includes(filtro.toLowerCase()));
  if (!arquivos.length) { console.error("nada pra medir em palestrantes/recorte/"); process.exit(1); }

  const navegador = await chromium.launch();
  const pagina = await navegador.newPage();
  const medidas = fs.existsSync(SAIDA) ? JSON.parse(fs.readFileSync(SAIDA, "utf8")) : {};
  const conferencia = [];

  for (const arq of arquivos) {
    const uri = "data:image/png;base64," + fs.readFileSync(path.join(DIR, arq)).toString("base64");
    const m = await pagina.evaluate(async ({ uri }) => {
      const img = new Image();
      await new Promise((ok, err) => { img.onload = ok; img.onerror = err; img.src = uri; });
      const ESCALA = Math.min(1, 420 / img.height);
      const lw = Math.max(1, Math.round(img.width * ESCALA));
      const lh = Math.max(1, Math.round(img.height * ESCALA));
      const c = document.createElement("canvas");
      c.width = lw; c.height = lh;
      const cc = c.getContext("2d", { willReadFrequently: true });
      cc.drawImage(img, 0, 0, lw, lh);
      const px = cc.getImageData(0, 0, lw, lh).data;

      // pele: vale do tom claro ao escuro. O que separa pele de terno e de parede é a
      // ordem R > G > B com diferença mínima entre canais — não o brilho.
      const pele = new Uint8Array(lw * lh);
      for (let i = 0; i < lw * lh; i++) {
        const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2], a = px[i * 4 + 3];
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        pele[i] = (a > 120 && r > 45 && g > 25 && b > 12 && max - min > 10 &&
                   r > g && g >= b && r - g > 8 && r - g < 90) ? 1 : 0;
      }

      // maior mancha na metade de cima (o rosto). Braço e mão também são pele, mas moram
      // embaixo; limitar a busca ao topo tira quase toda a confusão.
      const limite = Math.floor(lh * 0.62);
      const marca = new Int32Array(lw * lh).fill(-1);
      let melhor = null;
      for (let i = 0; i < lw * limite; i++) {
        if (!pele[i] || marca[i] >= 0) continue;
        const id = i;
        const b = { x0: lw, y0: lh, x1: -1, y1: -1, n: 0 };
        const fila = [i]; marca[i] = id;
        while (fila.length) {
          const p = fila.pop();
          const x = p % lw, y = (p / lw) | 0;
          b.n++;
          if (x < b.x0) b.x0 = x;
          if (x > b.x1) b.x1 = x;
          if (y < b.y0) b.y0 = y;
          if (y > b.y1) b.y1 = y;
          const viz = [];
          if (x > 0) viz.push(p - 1);
          if (x < lw - 1) viz.push(p + 1);
          if (y > 0) viz.push(p - lw);
          if (y < lh - 1) viz.push(p + lw);
          for (const v of viz) if (pele[v] && marca[v] < 0) { marca[v] = id; fila.push(v); }
        }
        if (!melhor || b.n > melhor.n) melhor = b;
      }
      if (!melhor) return null;

      // ONDE ACABA O ROSTO. A mancha de pele não para no queixo: ela desce pelo pescoço e
      // entra no decote, na mão no queixo, no braço. Tomar a caixa inteira daria "rosto"
      // com 0,85 da altura da pessoa. O que separa o rosto do resto é a LARGURA por linha:
      // a face é larga, o pescoço é estreito. Então mede-se a largura da face no alto e
      // desce-se até ela estrangular.
      // ONDE ACABA O ROSTO. A mancha de pele não para no queixo: desce pelo pescoço, entra
      // no decote e encosta na mão apoiada. Ancorar no TOPO da mancha erra sempre que há
      // cabelo castanho (que passa por pele) ou mão levantada. A âncora estável é o PICO:
      // a linha com mais pele é a das bochechas. Dali sobe-se até a testa e desce-se até o
      // queixo, parando onde a quantidade de pele despenca.
      const linha = y => {
        let n = 0, a = -1, b = -1;
        for (let x = melhor.x0; x <= melhor.x1; x++) {
          if (pele[y * lw + x]) { n++; if (a < 0) a = x; b = x; }
        }
        return { n, a, b };
      };
      const perfil = [];
      for (let y = melhor.y0; y <= melhor.y1; y++) perfil[y] = linha(y);
      let yPico = melhor.y0;
      for (let y = melhor.y0; y <= melhor.y1; y++)
        if (perfil[y].n > perfil[yPico].n) yPico = y;
      const pico = perfil[yPico].n;

      let queixo = melhor.y1;
      for (let y = yPico; y <= melhor.y1; y++) if (perfil[y].n < pico * 0.45) { queixo = y; break; }
      let testa = melhor.y0;
      for (let y = yPico; y >= melhor.y0; y--) if (perfil[y].n < pico * 0.30) { testa = y; break; }

      const wFace = perfil[yPico].b - perfil[yPico].a + 1;
      // rosto humano tem entre 1,15 e 1,7 de altura por largura — fora disso a medida
      // pegou outra coisa junto, e a proporção manda mais que o pixel.
      const alt = Math.min(wFace * 1.7, Math.max(wFace * 1.15, queixo - testa));

      return {
        cx: +(((perfil[yPico].a + perfil[yPico].b) / 2) / lw).toFixed(4),
        y0: +(testa / lh).toFixed(4),
        y1: +((testa + alt) / lh).toFixed(4),
        largura: +(wFace / lw).toFixed(4)
      };
    }, { uri });

    if (!m) { console.warn(`sem rosto detectado: ${arq}`); continue; }
    medidas[arq] = m;
    conferencia.push({ arq, m, uri });
    console.log(`${arq}  rosto: cx=${m.cx}  y=${m.y0}→${m.y1}  altura=${(m.y1 - m.y0).toFixed(3)}`);
  }

  fs.writeFileSync(SAIDA, JSON.stringify(medidas, null, 1));

  // folha de conferência: a caixa achada desenhada em cima da pessoa. Medida automática
  // que ninguém olhou é chute com casas decimais.
  let html = `<style>body{background:#111;margin:0;padding:24px;font-family:Segoe UI,sans-serif;color:#fff}
    .g{display:flex;flex-wrap:wrap;gap:14px}.c{width:200px;background:#1b1b1b;border-radius:10px;padding:8px}
    .w{position:relative;height:230px;display:flex;align-items:center;justify-content:center}
    .w img{max-height:230px;max-width:100%}
    .cx{position:absolute;border:2px solid #f4b661}
    .r{font-size:13px;color:#bbb;margin-top:6px;text-align:center}</style>
    <h2>rostos medidos — conferir a caixa</h2><div class="g">`;
  for (const { arq, m, uri } of conferencia) {
    html += `<div class="c"><div class="w"><img src="${uri}" onload="
      const b=this.getBoundingClientRect(),p=this.parentElement.getBoundingClientRect(),d=this.nextElementSibling;
      d.style.left=(b.left-p.left+${m.cx - m.largura / 2}*b.width)+'px';
      d.style.top=(b.top-p.top+${m.y0}*b.height)+'px';
      d.style.width=(${m.largura}*b.width)+'px';
      d.style.height=(${m.y1 - m.y0}*b.height)+'px';"><div class="cx"></div></div>
      <div class="r">${arq.replace(/\.png$/, "")}</div></div>`;
  }
  html += `</div>`;
  const pg2 = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
  await pg2.setContent(html);
  await pg2.waitForTimeout(400);
  await pg2.screenshot({ path: path.join(BASE, "saida", "_ROSTOS.png"), fullPage: true });
  await navegador.close();
  console.log(`\nmedidas: palestrantes/rostos.json   conferir: saida/_ROSTOS.png`);
})();
