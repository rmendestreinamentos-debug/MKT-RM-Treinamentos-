// nitidez.js — aplica máscara de nitidez (unsharp mask) num recorte já separado, pra quando
// a foto de origem chega mole (palco, luz baixa, câmera longe, sem tripé). Não inventa
// detalhe que não existe — realça a borda que já está lá, a mesma lógica que qualquer editor
// de foto usa pra "puxar" nitidez antes de publicar.
//
// Sobrescreve o arquivo em palestrantes/recorte/, que é um artefato DERIVADO (a prancha
// original em palestrantes/ nunca muda) — rodar de novo com quantidade 0 desfaz, ou rodar
// motor/separar.js de novo recorta limpo a partir da prancha.
//
// Uso:  node motor/nitidez.js "<nome do recorte>.png" [quantidade 0–2, padrão 0.7] [raio px, padrão 2]
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = path.resolve(__dirname, "..");
const DIR = path.join(BASE, "palestrantes", "recorte");

(async () => {
  const [nomeArg, quantArg, raioArg] = process.argv.slice(2);
  if(!nomeArg){
    console.error('uso: node motor/nitidez.js "<nome do recorte>.png" [quantidade] [raio]');
    process.exit(1);
  }
  const nome = nomeArg.replace(/\.png$/i, "") + ".png";
  const arq = path.join(DIR, nome);
  if(!fs.existsSync(arq)){ console.error(`não achei: palestrantes/recorte/${nome}`); process.exit(1); }
  const quantidade = quantArg ? Number(quantArg) : 0.7;
  // O raio TEM que ser inteiro: ele indexa pixel do array plano (`y*w+x`), e um raio
  // fracionário (1.6) gera índice fracionário, `src[i]` vira `undefined`, a soma vira
  // NaN e a imagem inteira sai preta — sem erro nenhum no console. Foi o que aconteceu
  // com o Renato Barufi e o Gabriel Anício na primeira tentativa.
  const raio = Math.max(1, Math.round(raioArg ? Number(raioArg) : 2));

  const navegador = await chromium.launch();
  const pagina = await navegador.newPage();
  const uri = "data:image/png;base64," + fs.readFileSync(arq).toString("base64");

  const saida = await pagina.evaluate(async ({ uri, quantidade, raio }) => {
    const img = new Image();
    await new Promise((ok, err) => { img.onload = ok; img.onerror = err; img.src = uri; });
    const w = img.width, h = img.height;
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const orig = ctx.getImageData(0, 0, w, h).data;

    // Unsharp mask: borrar (box blur em 3 passes, aproxima Gaussian) e subtrair o borrado
    // do original amplificado — o que sobra é a BORDA, que é o que o olho lê como foco.
    function blurH(src, dst){
      for(let y = 0; y < h; y++){
        let r = 0, g = 0, b = 0, cnt = 0;
        for(let x = -raio; x <= raio; x++){
          const xx = Math.min(w - 1, Math.max(0, x));
          const i = (y * w + xx) * 4;
          r += src[i]; g += src[i+1]; b += src[i+2]; cnt++;
        }
        for(let x = 0; x < w; x++){
          const i = (y * w + x) * 4;
          dst[i] = r / cnt; dst[i+1] = g / cnt; dst[i+2] = b / cnt; dst[i+3] = src[i+3];
          const xAdd = Math.min(w - 1, x + raio + 1), xSub = Math.max(0, x - raio);
          const iA = (y * w + xAdd) * 4, iS = (y * w + xSub) * 4;
          r += src[iA] - src[iS]; g += src[iA+1] - src[iS+1]; b += src[iA+2] - src[iS+2];
        }
      }
    }
    function blurV(src, dst){
      for(let x = 0; x < w; x++){
        let r = 0, g = 0, b = 0, cnt = 0;
        for(let y = -raio; y <= raio; y++){
          const yy = Math.min(h - 1, Math.max(0, y));
          const i = (yy * w + x) * 4;
          r += src[i]; g += src[i+1]; b += src[i+2]; cnt++;
        }
        for(let y = 0; y < h; y++){
          const i = (y * w + x) * 4;
          dst[i] = r / cnt; dst[i+1] = g / cnt; dst[i+2] = b / cnt; dst[i+3] = src[i+3];
          const yAdd = Math.min(h - 1, y + raio + 1), ySub = Math.max(0, y - raio);
          const iA = (yAdd * w + x) * 4, iS = (ySub * w + x) * 4;
          r += src[iA] - src[iS]; g += src[iA+1] - src[iS+1]; b += src[iA+2] - src[iS+2];
        }
      }
    }

    const n = w * h * 4;
    let cur = Float32Array.from(orig);
    const tmp = new Float32Array(n), blur = new Float32Array(n);
    for(let pass = 0; pass < 3; pass++){
      blurH(cur, tmp);
      blurV(tmp, blur);
      cur = Float32Array.from(blur);
    }

    const out = ctx.createImageData(w, h);
    const od = out.data;
    for(let i = 0; i < n; i += 4){
      od[i]   = Math.max(0, Math.min(255, orig[i]   + quantidade * (orig[i]   - cur[i])));
      od[i+1] = Math.max(0, Math.min(255, orig[i+1] + quantidade * (orig[i+1] - cur[i+1])));
      od[i+2] = Math.max(0, Math.min(255, orig[i+2] + quantidade * (orig[i+2] - cur[i+2])));
      od[i+3] = orig[i+3];
    }
    ctx.putImageData(out, 0, 0);
    return c.toDataURL("image/png");
  }, { uri, quantidade, raio });

  await navegador.close();
  fs.writeFileSync(arq, Buffer.from(saida.split(",")[1], "base64"));
  console.log(`nítido: palestrantes/recorte/${nome}  (quantidade ${quantidade}, raio ${raio}px)`);
})();
