// folha-contato.js — grade de miniaturas numeradas, pra escolher/conferir foto com o OLHO.
//
//   node folha-contato.js <saida.jpg> <colunas> <lista.txt> [larguraDaCélula]
//
// `lista.txt` é um caminho por linha, relativo às mesmas pastas que o motor procura
// (slides/imagens · marketing-instagram/imagens · marketing-instagram/fotos). Serve pras
// duas pontas do trabalho: escolher a foto ANTES (varrer o acervo sem abrir 60 arquivos) e
// conferir o deck DEPOIS (apontar pros PNGs de saida/png/<deck>/ e ver os 53 de uma vez).
// Foto repetida e foto que contradiz o título só aparecem vendo as páginas lado a lado.
//
// ⚠️ A célula NÃO recorta. Ela nasceu quadrada com `fit: cover`, que serve pra varrer
// acervo (o que importa ali é o assunto, não a borda) e MENTE pra conferir deck: num
// slide 16:9 metido num quadrado, o corte come as duas laterais — some o logo, some o @
// do rodapé, some a foto do painel direito, e a folha passa a atestar exatamente o que
// ela existe pra pegar. Agora a proporção sai da PRIMEIRA imagem da lista e as outras
// entram inteiras (`contain`) sobre preto. `larguraDaCélula` (padrão 300) é o zoom: 300
// pra escolher foto, 600+ pra ler texto de slide.
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const BASE = __dirname;
const ONDE = [
  path.resolve(BASE, 'imagens'),
  path.resolve(BASE, '..', 'marketing-instagram', 'imagens'),
  path.resolve(BASE, '..', 'marketing-instagram', 'fotos'),
  path.resolve(BASE, '..', 'marketing-instagram'),
];
function achar(rel) {
  for (const d of ONDE) { const p = path.resolve(d, rel); if (fs.existsSync(p)) return p; }
  return null;
}

(async () => {
  const saida = process.argv[2];
  const cols = +process.argv[3];
  const arqs = fs.readFileSync(process.argv[4], 'utf8').split(/\r?\n/).filter(Boolean);
  const CEL = +(process.argv[5] || 300);
  // A altura da célula sai da PRIMEIRA imagem: numa folha de deck todas são 16:9, num
  // acervo de retrato todas são 3:4. Assim a grade não sobra faixa preta por página.
  const primeira = arqs.map(achar).find(Boolean);
  const m = primeira ? await sharp(primeira).metadata() : { width: 1, height: 1 };
  const ALT = Math.max(80, Math.round(CEL * (m.height / m.width)));
  const linhas = Math.ceil(arqs.length / cols);
  const comp = [];
  for (let i = 0; i < arqs.length; i++) {
    const p = achar(arqs[i]);
    if (!p) { console.log('FALTA', arqs[i]); continue; }
    const buf = await sharp(p)
      .resize(CEL - 8, ALT - 8, { fit: 'contain', background: '#000' })
      .jpeg({ quality: 80 }).toBuffer();
    comp.push({ input: buf, left: (i % cols) * CEL + 4, top: Math.floor(i / cols) * ALT + 4 });
    const rot = Buffer.from(
      `<svg width="${CEL}" height="34"><rect width="${CEL}" height="34" fill="#000"/>` +
      `<text x="6" y="24" font-family="monospace" font-size="20" fill="#0f0">${i + 1}</text></svg>`);
    comp.push({ input: rot, left: (i % cols) * CEL + 4, top: Math.floor(i / cols) * ALT + 4 });
  }
  await sharp({ create: { width: cols * CEL, height: linhas * ALT, channels: 3, background: '#202020' } })
    .composite(comp).jpeg({ quality: 78 }).toFile(saida);
  arqs.forEach((a, i) => console.log(String(i + 1).padStart(2), a));
})();
