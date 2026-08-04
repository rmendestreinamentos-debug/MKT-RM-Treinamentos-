#!/usr/bin/env node
/**
 * retrato-16x9 — transforma um RETRATO VERTICAL em fundo de slide 16:9.
 *
 * Por que existe: o `foto`/`cenario` do motor sangra na página inteira (13,333 × 7,5),
 * e o recorte tem só cinco posições (topo/baixo/esquerda/direita/centro). Num retrato
 * 3:4 o corte 16:9 guarda ~42% da altura: no `topo` a linha de corte cai no queixo, no
 * `centro` come a testa. Não existe posição certa — o formato é que não bate.
 *
 * O que ele faz, nesta ordem:
 *   1. FUNDO — a própria foto ampliada, borrada e escurecida. Fundo de estúdio é
 *      superfície lisa: borrado vira um degradê que combina com o retrato por
 *      construção. Preto chapado atrás de um fundo cinza-quente entregaria a emenda.
 *   2. PESSOA — recorte vertical em volta da cabeça (o `topo` é onde o cabelo começa,
 *      em fração da altura do arquivo), colada à DIREITA.
 *   3. EMENDA — a borda esquerda da pessoa dissolve no fundo por máscara de alfa.
 *      Sem isso fica um retângulo colado, que é o defeito clássico da montagem.
 *
 * A pessoa vai à direita porque o motor escurece a ESQUERDA (VEU_ESQ) — é lá que o
 * texto do slide mora. Retrato centralizado põe o rosto embaixo do título.
 *
 *   node retrato-16x9.js "<origem>" "<saida.jpg>" <topo> [altura] [larguraPessoa]
 *
 *   topo           fração da altura onde COMEÇA o cabelo (0.12 = 12% do arquivo)
 *   altura         fração da altura que o recorte da pessoa ocupa (padrão 0.62)
 *   larguraPessoa  fração da largura do slide que a pessoa ocupa (padrão 0.60)
 *
 * A origem nunca é tocada; a saída cai onde você mandar.
 */
const sharp = require("sharp");
const path = require("path");

const LARG = 2560, ALT = 1440;          // 16:9 folgado pra 150 DPI do motor

async function main(){
  const [orig, saida, topoArg, altArg, largArg] = process.argv.slice(2);
  if(!orig || !saida || !topoArg){
    console.error('uso: node retrato-16x9.js "<origem>" "<saida.jpg>" <topo> [altura] [larguraPessoa]');
    process.exit(1);
  }
  const topo = Number(topoArg);
  const altFrac = Number(altArg || 0.62);
  const largFrac = Number(largArg || 0.60);

  const src = sharp(orig).rotate();
  const m = await src.metadata();

  // ---- 1. fundo: a foto inteira, borrada e escurecida
  const fundo = await sharp(orig).rotate()
    .resize(LARG, ALT, { fit: "cover", position: "centre" })
    .blur(70)
    .modulate({ brightness: 0.55 })
    .toBuffer();

  // ---- 2. pessoa: recorte em volta da cabeça, colado à direita
  // Uma folga acima do cabelo, senão a cabeça encosta na borda de cima do slide.
  const folga = 0.035;
  const y = Math.max(0, Math.round((topo - folga) * m.height));
  const h = Math.min(m.height - y, Math.round(altFrac * m.height));
  const pessoaLarg = Math.round(largFrac * LARG);
  const pessoa = await sharp(orig).rotate()
    .extract({ left: 0, top: y, width: m.width, height: h })
    .resize(pessoaLarg, ALT, { fit: "cover", position: "top" })
    .toBuffer();

  // ---- 3. emenda: a borda ESQUERDA da pessoa dissolve no fundo
  // Degradê de alfa em SVG: opaco à direita, transparente na borda esquerda.
  const fade = Math.round(pessoaLarg * 0.28);
  const mascara = Buffer.from(
    `<svg width="${pessoaLarg}" height="${ALT}">
       <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="0">
         <stop offset="0" stop-color="#fff" stop-opacity="0"/>
         <stop offset="${(fade / pessoaLarg).toFixed(3)}" stop-color="#fff" stop-opacity="1"/>
       </linearGradient></defs>
       <rect width="${pessoaLarg}" height="${ALT}" fill="url(#g)"/>
     </svg>`);
  const pessoaSuave = await sharp(pessoa)
    .ensureAlpha()                                   // dest-in precisa de canal alfa
    .composite([{ input: await sharp(mascara).png().toBuffer(), blend: "dest-in" }])
    .png().toBuffer();

  await sharp(fundo)
    .composite([{ input: pessoaSuave, left: LARG - pessoaLarg, top: 0 }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(saida);

  console.log(`ok: ${path.basename(saida)}  ${LARG}×${ALT}  (origem ${m.width}×${m.height})`);
}

main().catch(e => { console.error("erro:", e.message); process.exit(1); });
