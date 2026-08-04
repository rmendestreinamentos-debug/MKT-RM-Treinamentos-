// faixa.js — mede a FAIXA DE IMAGEM de cada slide já gerado de um carrossel `thread`.
//
//   node motor/faixa.js saida/<pasta-do-carrossel>
//
// Por que existe: no modelo do X a imagem PREENCHE o bloco, com canto arredondado. O
// bloco tem a largura do card e a altura que SOBRA depois do texto, então cada slide
// tem uma proporção diferente, e ela só se conhece depois de gerar. Sem esse número o
// recorte vira chute, e o chute produz as duas falhas que o dono já reprovou: a FATIA
// (imagem esticada e cortada, "um recorte esquisito") e a MOLDURA (imagem menor que a
// caixa, "minha imagem enfiada dentro de uma montagem").
//
// O fluxo é: gerar uma vez com a imagem que existe → rodar isto → recortar cada arquivo
// na proporção medida, escolhendo a região que responde à frase (`motor/recortar.js`) →
// gerar de novo. Aí a imagem preenche exato, sem sobra e sem corte automático.
//
// ⚠️ Mudou o texto de um slide, a faixa dele muda de altura: medir e recortar de novo.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

(async () => {
  const dir = process.argv[2];
  if(!dir){ console.error("uso: node motor/faixa.js saida/<pasta-do-carrossel>"); process.exit(1); }
  if(!fs.existsSync(dir)){ console.error(`erro: ${dir} não existe — gere o carrossel primeiro`); process.exit(1); }

  const arqs = fs.readdirSync(dir).filter(f => /\.png$/i.test(f) && !f.startsWith("_")).sort();
  if(!arqs.length){ console.error(`erro: nenhum PNG em ${dir}`); process.exit(1); }

  const nav = await chromium.launch();
  const pag = await nav.newPage();
  for(const f of arqs){
    const b64 = fs.readFileSync(path.join(dir, f)).toString("base64");
    const r = await pag.evaluate(async (src) => {
      const img = new Image(); img.src = src; await img.decode();
      const cv = document.createElement("canvas");
      cv.width = img.width; cv.height = img.height;
      const cx = cv.getContext("2d");
      cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, cv.width, cv.height).data;
      // O fundo do slide é chapado (branco no tema claro, preto no escuro): a linha que
      // for chapada de ponta a ponta está FORA da imagem. Amostra colunas espaçadas
      // porque varrer pixel a pixel numa peça de 2160x2700 é lento e não muda o resultado.
      const px = (x, y) => { const i = (y * cv.width + x) * 4; return [d[i], d[i+1], d[i+2]]; };
      const [r0, g0, b0] = px(4, 4);                       // canto = cor do fundo
      const fundoPx = (x, y) => { const [r, g, b] = px(x, y);
        return Math.abs(r - r0) < 18 && Math.abs(g - g0) < 18 && Math.abs(b - b0) < 18; };
      const cols = [];
      for(let x = 140; x < cv.width - 140; x += 40) cols.push(x);
      const vazia = y => cols.every(x => fundoPx(x, y));
      let base = cv.height - 130;                           // dentro do padding de baixo
      while(base > 0 && vazia(base)) base--;                // sobe até tocar a imagem
      if(base <= 0) return null;
      let topo = base;
      while(topo > 0 && !vazia(topo)) topo--;               // sobe até sair dela
      const alt = base - topo;
      if(alt < 200) return null;                            // é linha de texto, não imagem
      const meio = Math.round((topo + base) / 2);
      let e = 0; while(e < cv.width && fundoPx(e, meio)) e++;
      let dr = cv.width - 1; while(dr > 0 && fundoPx(dr, meio)) dr--;
      return { larg: dr - e, alt };
    }, `data:image/png;base64,${b64}`);

    if(!r){ console.log(`${f}  — sem imagem`); continue; }
    // Num par, cada foto ocupa metade da largura (menos o fio de 8px do meio).
    const meia = ((r.larg - 8) / 2 / r.alt).toFixed(2);
    console.log(`${f}  faixa ${r.larg}x${r.alt}  →  proporção ${(r.larg / r.alt).toFixed(2)}`
      + `   (se for PAR, cada imagem: ${meia})`);
  }
  await nav.close();
})();
