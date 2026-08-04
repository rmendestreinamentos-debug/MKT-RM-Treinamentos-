// aparar-imagem.js — apara a margem SÓLIDA (preta ou branca) em volta de uma imagem
// de imagens/, e salva o recorte ao lado.
// Uso:  node motor/aparar-imagem.js "menu-produtos/rm-summit-sp.png" [folga %] [saída]
//                                    <caminho dentro de imagens/>     padrão 8
//
// Por que existe: logo e lockup de produto chegam do editor numa tela larga com o
// desenho pequeno no meio e um oceano de fundo chapado em volta. Pro olho é o mesmo
// arquivo; dentro de uma peça não é. No `thread`, a imagem anexada ocupa uma faixa de
// largura fixa: o que manda no tamanho do lockup é a proporção dele DENTRO do arquivo,
// e um logo que ocupa 30% da arte entra 3x menor do que poderia, com o resto do bloco
// em fundo morto.
//
// Difere do `aparar.js`, que mede TRANSPARÊNCIA (recorte de pessoa em PNG com alfa).
// Aqui o fundo é opaco e chapado, e o que se mede é a diferença de cor contra o pixel
// do canto. São dois problemas parecidos com soluções que não se substituem.
//
// A folga existe de propósito: cortar exatamente no pixel do desenho faz o logo
// encostar na borda do bloco arredondado, e aí ele lê como imagem cortada, não como
// arte centrada. 8% de respiro é o que devolve o ar sem devolver o vazio.
//
// A imagem original NUNCA é sobrescrita sem que você peça: sem o terceiro argumento, o
// recorte sai com o sufixo `-aparado`.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = path.resolve(__dirname, "..");
// Fundo "chapado" quase nunca é chapado de verdade: arte de logo costuma ter uma
// vinheta suave, e o JPEG/PNG carrega ruído de compressão. Medir a distância SOMANDO os
// três canais fazia um cinza rgb(20,20,20) contar como desenho, e aí o aparo não aparava
// nada (foi o que aconteceu com o lockup do Comercial 365). Duas defesas: distância pelo
// canal que mais desviou, e uma linha/coluna só conta como conteúdo se tiver um punhado
// de pixels acima do limiar — um pixel solto é ruído, não traço de letra.
const TOLERANCIA = 40;        // piso do desvio de luminância até o fundo
const FRACAO_TINTA = 0.35;    // do desvio MÁXIMO da imagem: abaixo disso ainda é fundo
const MINIMO = 3;            // pixels de tinta numa linha/coluna pra ela contar como desenho

(async () => {
  const [rel, folgaArg, saidaArg] = process.argv.slice(2);
  if(!rel){
    console.error('uso: node motor/aparar-imagem.js "<caminho em imagens/>" [folga %] [saída]');
    process.exit(1);
  }
  const origem = path.join(BASE, "imagens", rel);
  if(!fs.existsSync(origem)){ console.error(`erro: ${rel} não existe em imagens/`); process.exit(1); }
  const folga = Math.max(0, Number(folgaArg) || 8) / 100;
  const ext = path.extname(rel);
  const saida = saidaArg
    ? path.join(BASE, "imagens", path.dirname(rel), saidaArg)
    : path.join(BASE, "imagens", rel.slice(0, -ext.length) + "-aparado" + ext);

  const b64 = fs.readFileSync(origem).toString("base64");
  const mime = ext.toLowerCase() === ".png" ? "image/png" : "image/jpeg";

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const r = await page.evaluate(async ({ uri, tol, min, fracao }) => {
    const img = new Image();
    img.src = uri;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    // o fundo é a cor do canto superior esquerdo: é o único ponto que, num lockup
    // centrado, é fundo em todo arquivo que chega assim
    const fr = d[0], fg = d[1], fb = d[2];
    const lum = (r, g, b) => 0.299*r + 0.587*g + 0.114*b;
    const fundoLum = lum(fr, fg, fb);
    // Limiar CALIBRADO pela própria imagem, não fixo. Arte de logo quase nunca tem fundo
    // chapado de verdade: a vinheta radial do lockup do Comercial 365 chega a rgb(45,45,45)
    // no miolo, passava por qualquer limiar fixo baixo e esticava a caixa centenas de
    // pixels além do desenho — o logo saía encostado à esquerda com um vão à direita.
    // Medindo contra o pixel MAIS distante do fundo (a tinta do logo), a vinheta fica
    // sempre na faixa de fundo e a letra, sempre na de tinta.
    let difMax = 0;
    for(let i = 0; i < d.length; i += 4){
      if(d[i+3] < 8) continue;
      const dif = Math.abs(lum(d[i], d[i+1], d[i+2]) - fundoLum);
      if(dif > difMax) difMax = dif;
    }
    const limiar = Math.max(tol, difMax * fracao);
    // conta, por linha e por coluna, quantos pixels desviaram do fundo
    const porLinha = new Uint32Array(c.height), porColuna = new Uint32Array(c.width);
    for(let y = 0; y < c.height; y++){
      for(let x = 0; x < c.width; x++){
        const i = (y * c.width + x) * 4;
        if(d[i+3] < 8) continue;                       // transparente conta como fundo
        if(Math.abs(lum(d[i], d[i+1], d[i+2]) - fundoLum) <= limiar) continue;
        porLinha[y]++; porColuna[x]++;
      }
    }
    // ⚠️ A MOLDURA de 1px do arquivo não conta. O lockup do Comercial 365 tinha a coluna
    // 2562 inteira clara (artefato de exportação, invisível no olho): ela sozinha virava
    // a borda direita do desenho e jogava 400px de vão preto pra dentro do recorte, com
    // o logo encostado à esquerda. Artefato de export mora exatamente na borda; desenho
    // de verdade, não.
    // Com a moldura fora e o limiar calibrado pela tinta, o corte por linha volta a ser
    // baixo: traço fino (o "365" é desenhado a linha de ~10px) precisa contar, senão o
    // topo do 6 e a base do 5 são aparados junto com o fundo.
    const m = Math.min(2, Math.floor(Math.min(c.width, c.height) / 4));
    let y0 = -1, y1 = -1, x0 = -1, x1 = -1;
    for(let y = m; y < c.height - m; y++) if(porLinha[y] >= min){ if(y0 < 0) y0 = y; y1 = y; }
    for(let x = m; x < c.width - m; x++) if(porColuna[x] >= min){ if(x0 < 0) x0 = x; x1 = x; }
    return { larg: c.width, alt: c.height, x0, y0, x1, y1,
             fundo: `rgb(${fr},${fg},${fb})` };
  }, { uri: `data:${mime};base64,${b64}`, tol: TOLERANCIA, min: MINIMO, fracao: FRACAO_TINTA });

  if(r.x1 < 0){ console.error("erro: a imagem é fundo chapado do começo ao fim — nada a aparar."); process.exit(1); }

  // A folga é calculada sobre o DESENHO, não sobre o arquivo: num arquivo com muita
  // margem, 8% da largura total devolveria quase toda a margem que acabou de sair.
  // E sai da MENOR dimensão dele, em pixels iguais nos dois eixos: um lockup deitado
  // é largo e baixo, então 8% da largura viraria um respiro lateral generoso com o
  // desenho encostando em cima e embaixo. Respiro parelho é o que lê como centrado.
  const g = Math.round(Math.min(r.x1 - r.x0 + 1, r.y1 - r.y0 + 1) * folga);
  const gx = g, gy = g;
  const cx = Math.max(0, r.x0 - gx), cy = Math.max(0, r.y0 - gy);
  const cw = Math.min(r.larg - cx, r.x1 - r.x0 + 1 + gx * 2);
  const ch = Math.min(r.alt - cy, r.y1 - r.y0 + 1 + gy * 2);

  await page.setViewportSize({ width: cw, height: ch });
  await page.setContent(`<style>html,body{margin:0;background:${r.fundo};overflow:hidden}
    img{position:absolute;left:${-cx}px;top:${-cy}px}</style>
    <img src="data:${mime};base64,${b64}">`);
  await page.screenshot({ path: saida });
  await browser.close();

  console.log(`${r.larg}×${r.alt} -> ${cw}×${ch}  (fundo ${r.fundo}, folga ${Math.round(folga*100)}%)`);
  console.log("salvo:", path.relative(BASE, saida));
})();
