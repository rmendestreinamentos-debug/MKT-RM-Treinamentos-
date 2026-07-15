// tirar-fundo.js — recorta a pessoa da foto, gerando um PNG de fundo transparente.
// Uso:  node motor/tirar-fundo.js "Rafa Brito.jpg" [tolerancia]
//       -> escreve palestrantes/recorte/Rafa Brito.png
//
// Por que existe: o KV do line-up cola os palestrantes OMBRO A OMBRO. Isso só existe
// com recorte — card com foto não faz colagem. O acervo veio com um único PNG já
// recortado (o Lásaro); o resto é JPG de estúdio, com fundo liso.
//
// Como: crescimento de região a partir das BORDAS. Todo pixel da moldura vira semente
// de "fundo"; um vizinho entra no fundo se a cor dele estiver perto da cor do pixel de
// onde veio. Comparar com o VIZINHO (e não com uma cor fixa) é o que deixa o algoritmo
// seguir o degradê do estúdio — fundo de foto raramente é uma cor só.
//
// ⚠️ Isso NÃO é segmentação por IA. Serve em fundo liso e falha em fundo de cena.
// Sempre abrir o PNG e OLHAR: buraco na roupa (camisa branca em fundo branco) e halo
// na borda do cabelo são as duas falhas típicas.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = path.resolve(__dirname, "..");
const LARGURA = 1400;                             // recorte serve a um post: não precisa de 5000px

(async () => {
  const nome = process.argv[2];
  const tol = Number(process.argv[3]) || 26;
  const erode = process.argv[4] !== undefined ? Number(process.argv[4]) : 3;
  const global = process.argv[5] !== undefined ? Number(process.argv[5]) : 70;
  const abre = process.argv[6] !== undefined ? Number(process.argv[6]) : 6;

  // --fundo=x0,y0,x1,y1 (em % da imagem) — retângulo declarado fundo À FORÇA.
  // A escotilha existe porque nem tudo é questão de parâmetro: na foto do Rafael há um
  // foco de palco desfocado ao lado do rosto, e o halo dele encosta no degradê que chega
  // ao paletó. Como uma peça só, ele sobrevive à seleção do maior blob — e nenhuma
  // tolerância o separa sem comer o terno junto. Aqui se APONTA onde é fundo.
  // Só vale em área que a pessoa não ocupa: o retângulo vira semente e cresce de dentro.
  const rec = (process.argv.find(a => a.startsWith("--fundo=")) || "").slice(8);
  const caixa = rec ? rec.split(",").map(Number) : null;
  if(caixa && caixa.length !== 4){ console.error("erro: --fundo=x0,y0,x1,y1 em % da imagem"); process.exit(1); }

  if(!nome){ console.error('uso: node motor/tirar-fundo.js "<arquivo>" [tol] [erode] [global] [abre] [--fundo=x0,y0,x1,y1]'); process.exit(1); }

  const origem = path.join(BASE, "palestrantes", nome);
  if(!fs.existsSync(origem)){ console.error(`erro: ${nome} não existe em palestrantes/`); process.exit(1); }

  const ext = path.extname(origem).toLowerCase();
  const mime = ext === ".png" ? "image/png" : "image/jpeg";
  const src = `data:${mime};base64,${fs.readFileSync(origem).toString("base64")}`;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const out = await page.evaluate(async ([src, LARGURA, tol, erode, global, abre, caixa]) => {
    const img = new Image();
    img.src = src;
    await img.decode();

    const w = LARGURA;
    const h = Math.round(img.naturalHeight * (w / img.naturalWidth));
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);

    const d = ctx.getImageData(0, 0, w, h);
    const p = d.data;
    const fundo = new Uint8Array(w * h);          // 1 = fundo
    const fila = new Int32Array(w * h);
    let ini = 0, fim = 0;

    // Imagem que JÁ chega recortada (o PNG do Lásaro) não passa pelo crescimento: o
    // alpha dela é a verdade. Rodar o algoritmo por cima só estragaria uma borda boa.
    let jaRecortada = false;
    for(let x = 0; x < w && !jaRecortada; x++) if(p[x*4+3] === 0) jaRecortada = true;
    if(jaRecortada){
      for(let i = 0; i < w * h; i++) fundo[i] = p[i*4+3] < 16 ? 1 : 0;
      fim = 0;                                     // pula o crescimento
    }

    // Cada pixel de fundo carrega a COR DA SEMENTE — a cor da borda de onde a região
    // dele nasceu. Comparar só com o vizinho deixa o crescimento CAMINHAR: onde a
    // roupa muda de tom devagar (um terno escuro contra um palco escuro), ele entra
    // pela pessoa passo a passo, cada passo dentro da tolerância, e come um ombro
    // inteiro. A trava global corta isso: por mais suave que seja o caminho, o pixel
    // só vira fundo se AINDA estiver perto do fundo de origem.
    const sem = new Uint8Array(w * h * 3);
    const perto = (a, b) => {
      const ia = a * 4, ib = b * 4;
      return Math.abs(p[ia] - p[ib]) + Math.abs(p[ia+1] - p[ib+1]) + Math.abs(p[ia+2] - p[ib+2]) < tol;
    };
    const pertoDaSemente = (v, i) => {
      const iv = v * 4, is = i * 3;
      return Math.abs(p[iv] - sem[is]) + Math.abs(p[iv+1] - sem[is+1]) + Math.abs(p[iv+2] - sem[is+2]) < global;
    };
    const semear = (i, de) => {
      if(fundo[i]) return;
      fundo[i] = 1; fila[fim++] = i;
      const o = i * 3, f = (de === undefined ? i : de) * 3;
      if(de === undefined){ sem[o] = p[i*4]; sem[o+1] = p[i*4+1]; sem[o+2] = p[i*4+2]; }
      else { sem[o] = sem[f]; sem[o+1] = sem[f+1]; sem[o+2] = sem[f+2]; }
    };

    // Semeia TOPO e LATERAIS — nunca a linha de BAIXO. Retrato é cortado na cintura
    // pela própria moldura da foto: a barra de baixo É a pessoa. Semear ali planta a
    // semente dentro da roupa, e o crescimento sobe comendo a camisa — sai um rasgo
    // serrilhado na barra de todo mundo. O fundo do rodapé não se perde: ele é
    // contíguo com as laterais e chega lá sozinho.
    if(!jaRecortada){
      for(let x = 0; x < w; x++) semear(x);
      for(let y = 0; y < h; y++){ semear(y * w); semear(y * w + w - 1); }
      if(caixa){
        const [ax, ay, bx, by] = caixa;
        for(let y = Math.round(ay * h / 100); y < Math.round(by * h / 100); y++)
          for(let x = Math.round(ax * w / 100); x < Math.round(bx * w / 100); x++) semear(y * w + x);
      }
    }

    while(ini < fim){
      const i = fila[ini++];
      const x = i % w, y = (i / w) | 0;
      const passa = v => !fundo[v] && perto(i, v) && pertoDaSemente(v, i);
      if(x > 0     && passa(i-1)) semear(i-1, i);
      if(x < w - 1 && passa(i+1)) semear(i+1, i);
      if(y > 0     && passa(i-w)) semear(i-w, i);
      if(y < h - 1 && passa(i+w)) semear(i+w, i);
    }

    // ERODE a silhueta. Onde a roupa quase se confunde com o fundo (camisa branca em
    // estúdio branco), o crescimento para cedo e deixa uma FRANJA do fundo grudada na
    // pessoa — que sobre a peça escura vira um contorno claro e entrega o recorte na
    // hora. Comer alguns pixels da borda tira a franja; o que se perde de pessoa nesse
    // raio ninguém vê.
    for(let passo = 0; passo < erode; passo++){
      const antes = fundo.slice();
      for(let y = 0; y < h; y++){
        for(let x = 0; x < w; x++){
          const i = y * w + x;
          if(antes[i]) continue;
          if((x > 0 && antes[i-1]) || (x < w-1 && antes[i+1]) ||
             (y > 0 && antes[i-w]) || (y < h-1 && antes[i+w])) fundo[i] = 1;
        }
      }
    }

    // Só o MAIOR blob de pessoa sobrevive. O crescimento sempre deixa poeira — um foco de
    // palco, um respingo do degradê do estúdio — que sobre fundo escuro vira sujeira
    // flutuando ao redor da cabeça. A pessoa é uma peça só; o resto não é ninguém.
    //
    // ⚠️ A poeira quase nunca chega aqui SOLTA: ela vem pendurada no corpo por um filete
    // de sombra que o crescimento não conseguiu atravessar. Como uma peça só, ela passa
    // pela seleção — o foco de palco ao lado da cabeça do Rafael sobrevivia assim.
    // Por isso a seleção roda sobre uma cópia ABERTA da máscara: erodir `abre` vezes
    // rompe qualquer ponte mais fina que 2*abre, escolhe-se o corpo, e dilata-se de volta
    // o mesmo tanto — sempre dentro da silhueta original, que continua sendo a verdade da
    // borda. A pessoa volta ao tamanho; a ilha, que ficou longe demais, não volta.
    const dentro = i => !fundo[i];
    let nucleo = new Uint8Array(w * h);
    for(let i = 0; i < w * h; i++) nucleo[i] = dentro(i) ? 1 : 0;
    const morf = (m, alvo) => {                    // some com quem tem vizinho != alvo
      const antes = m.slice();
      for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){
        const i = y * w + x;
        if(antes[i] !== alvo) continue;
        if((x > 0 && antes[i-1] !== alvo) || (x < w-1 && antes[i+1] !== alvo) ||
           (y > 0 && antes[i-w] !== alvo) || (y < h-1 && antes[i+w] !== alvo)) m[i] = alvo ? 0 : 1;
      }
    };
    for(let passo = 0; passo < abre; passo++) morf(nucleo, 1);

    const marca = new Int32Array(w * h);
    let maior = 0, maiorTam = 0, id = 0;
    for(let s = 0; s < w * h; s++){
      if(!nucleo[s] || marca[s]) continue;
      id++;
      let tam = 0, i0 = 0, i1 = 0;
      fila[i1++] = s; marca[s] = id;
      while(i0 < i1){
        const i = fila[i0++]; tam++;
        const x = i % w, y = (i / w) | 0;
        const viz = [x > 0 ? i-1 : -1, x < w-1 ? i+1 : -1, y > 0 ? i-w : -1, y < h-1 ? i+w : -1];
        for(const v of viz) if(v >= 0 && nucleo[v] && !marca[v]){ marca[v] = id; fila[i1++] = v; }
      }
      if(tam > maiorTam){ maiorTam = tam; maior = id; }
    }
    for(let i = 0; i < w * h; i++) nucleo[i] = (nucleo[i] && marca[i] === maior) ? 1 : 0;
    for(let passo = 0; passo < abre; passo++) morf(nucleo, 0);
    for(let i = 0; i < w * h; i++) if(dentro(i) && !nucleo[i]) fundo[i] = 1;

    // Alpha com borda suave: a média 3x3 da máscara vira meio-tom na silhueta, senão a
    // borda fica serrilhada e o recorte grita "colado no Paint".
    const alpha = new Uint8ClampedArray(w * h);
    for(let y = 0; y < h; y++){
      for(let x = 0; x < w; x++){
        let soma = 0, n = 0;
        for(let dy = -1; dy <= 1; dy++){
          for(let dx = -1; dx <= 1; dx++){
            const yy = y + dy, xx = x + dx;
            if(yy < 0 || yy >= h || xx < 0 || xx >= w) continue;
            soma += fundo[yy * w + xx] ? 0 : 255;
            n++;
          }
        }
        alpha[y * w + x] = soma / n;
      }
    }
    let opacos = 0;
    for(let i = 0; i < w * h; i++){ p[i*4+3] = alpha[i]; if(alpha[i] > 128) opacos++; }
    ctx.putImageData(d, 0, 0);

    // Corta no BOUNDING BOX da silhueta. Sem isso cada PNG guarda uma quantidade
    // diferente de ar em volta, e na colagem as cabeças saem em alturas diferentes —
    // não tem CSS que conserte, porque o ar é invisível.
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for(let y = 0; y < h; y++){
      for(let x = 0; x < w; x++){
        if(alpha[y * w + x] <= 16) continue;
        if(x < x0) x0 = x; if(x > x1) x1 = x;
        if(y < y0) y0 = y; if(y > y1) y1 = y;
      }
    }
    const cw = Math.max(1, x1 - x0 + 1), ch = Math.max(1, y1 - y0 + 1);
    const cv2 = document.createElement("canvas");
    cv2.width = cw; cv2.height = ch;
    cv2.getContext("2d").drawImage(cv, x0, y0, cw, ch, 0, 0, cw, ch);

    return { b64: cv2.toDataURL("image/png").split(",")[1],
             pct: Math.round(100 * opacos / (w * h)), w: cw, h: ch };
  }, [src, LARGURA, tol, erode, global, abre, caixa]);
  await browser.close();

  fs.mkdirSync(path.join(BASE, "palestrantes", "recorte"), { recursive: true });
  const destino = path.join(BASE, "palestrantes", "recorte", nome.replace(/\.(jpe?g|png)$/i, "") + ".png");
  fs.writeFileSync(destino, Buffer.from(out.b64, "base64"));

  // Um recorte que sobrou com 90% da tela é recorte que não recortou nada; com 5%, comeu
  // a pessoa. O número não substitui olhar, mas pega o desastre antes de você abrir.
  const aviso = out.pct > 75 ? "  ⚠️ quase nada foi removido — aumente a tolerância"
              : out.pct < 12 ? "  ⚠️ sobrou quase nada — a tolerância comeu a pessoa"
              : "";
  console.log(`gerado: palestrantes/recorte/${path.basename(destino)}  (${out.w}x${out.h}, ${out.pct}% opaco, tol ${tol})${aviso}`);
})();
