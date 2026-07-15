// acervo.js — o repositório de imagens. Vive e cresce: novas fotos entram sempre.
//
// Três arquivos, três papéis:
//   fotos/<subpastas>/    o acervo em si. Joga foto nova aqui e pronto.
//   fotos/_triagem.csv    laudo TÉCNICO (motor/fotos.js): resolução, miolo, véu.
//   fotos/_catalogo.csv   laudo de CONTEÚDO: o que aparece na foto. Escrito olhando.
//
// O uso não é registrado em lugar nenhum — ele é DERIVADO de conteudo/*.json.
// A peça é a verdade; se a foto está numa peça, ela foi usada. Sem log pra
// dessincronizar.
//
// Uso:
//   node motor/acervo.js                    panorama: catalogado, usado, o que falta
//   node motor/acervo.js novas              fotos que entraram e ninguém mediu ainda
//   node motor/acervo.js pendentes [n] [p]  próximo lote a catalogar (amostra espaçada)
//   node motor/acervo.js escolher [n] [p]   fotos que servem e NUNCA foram usadas
//   node motor/acervo.js usadas             quem já entrou em peça, e quantas vezes

const fs = require("fs");
const path = require("path");

const BASE = path.resolve(__dirname, "..");
const DIR_FOTOS = path.join(BASE, "fotos");
const DIR_CONTEUDO = path.join(BASE, "conteudo");
const TRIAGEM = path.join(DIR_FOTOS, "_triagem.csv");
const CATALOGO = path.join(DIR_FOTOS, "_catalogo.csv");
const EXT = [".jpg", ".jpeg", ".png", ".webp"];

const CABECALHO = "arquivo,cena,pessoas,rosto,cordao_bh,serve_sp,descricao";

// --- leitura ---------------------------------------------------------------

function varrer(dir, raiz = dir, saco = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) varrer(p, raiz, saco);
    else if (EXT.includes(path.extname(e.name).toLowerCase()))
      saco.push(path.relative(raiz, p).replace(/\\/g, "/"));
  }
  return saco;
}

// O Google Drive baixa duplicata como "nome (1).jpg" — às vezes SEM o espaço,
// "nome(1).jpg". É a MESMA foto nos dois casos: descarta.
const ehCopia = (f, todas) => {
  const orig = f.replace(/ ?\(\d+\)(\.\w+)$/, "$1");
  return orig !== f && todas.has(orig);
};

function lerCsv(arquivo) {
  if (!fs.existsSync(arquivo)) return [];
  const linhas = fs.readFileSync(arquivo, "utf8").split(/\r?\n/).slice(1).filter(Boolean);
  return linhas.map(l => {
    // campos podem ter vírgula dentro de aspas; só o 1º (caminho) importa aqui
    const m = l.match(/^"([^"]+)",(.*)$/);
    if (!m) return null;
    return { arquivo: m[1].replace(/\\/g, "/"), resto: m[2], linha: l };
  }).filter(Boolean);
}

function lerTriagem() {
  const mapa = new Map();
  for (const r of lerCsv(TRIAGEM)) {
    const c = r.resto.split(",");
    mapa.set(r.arquivo, { miolo: +c[2], veu: c[3], serve: c[4] === "sim" });
  }
  return mapa;
}

function lerCatalogo() {
  const mapa = new Map();
  for (const r of lerCsv(CATALOGO)) {
    const c = r.resto.split(",");
    mapa.set(r.arquivo, { cena: c[0], pessoas: c[1], rosto: c[2], cordao: c[3], serveSp: c[4] });
  }
  return mapa;
}

// Uso = o que está nas peças. Fonte única de verdade.
// Só conta foto DO ACERVO: os modelo-*.json trazem placeholders (larissa.jpg,
// musk.jpg) que não moram em fotos/ e poluiriam a conta.
function lerUso(doAcervo) {
  const uso = new Map();
  if (!fs.existsSync(DIR_CONTEUDO)) return uso;
  for (const f of fs.readdirSync(DIR_CONTEUDO).filter(f => f.endsWith(".json"))) {
    const txt = fs.readFileSync(path.join(DIR_CONTEUDO, f), "utf8");
    for (const m of txt.matchAll(/"foto"\s*:\s*"([^"]+)"/g)) {
      const foto = m[1];
      if (!doAcervo.has(foto)) continue;
      if (!uso.has(foto)) uso.set(foto, []);
      uso.get(foto).push(f.replace(/\.json$/, ""));
    }
  }
  return uso;
}

// Amostra ESPAÇADA. O acervo vem em rajadas: 5 frames do mesmo instante, seguidos.
// Pegar sequencial cataloga a mesma cena 5 vezes. O passo espalha pelo evento.
function espacar(lista, n) {
  if (lista.length <= n) return lista;
  const passo = lista.length / n;
  return Array.from({ length: n }, (_, i) => lista[Math.floor(i * passo)]);
}

// --- comandos --------------------------------------------------------------

const todasArr = fs.existsSync(DIR_FOTOS) ? varrer(DIR_FOTOS) : [];
const conjunto = new Set(todasArr);
const todas = todasArr.filter(f => !ehCopia(f, conjunto));
const copias = todasArr.length - todas.length;

const triagem = lerTriagem();
const catalogo = lerCatalogo();
const uso = lerUso(new Set(todas));

const cmd = process.argv[2] || "status";
const n = +(process.argv[3] || 12) || 12;
const filtro = (process.argv[4] || "").toLowerCase();
const casa = f => !filtro || f.toLowerCase().includes(filtro);

if (cmd === "status") {
  const semTriagem = todas.filter(f => !triagem.has(f));
  const semCatalogo = todas.filter(f => !catalogo.has(f));
  const usadas = [...uso.keys()];
  const repetidas = [...uso.entries()].filter(([, p]) => p.length > 1);
  const liberadas = [...catalogo.entries()].filter(([, c]) => c.serveSp === "sim");

  const medidas = todas.length - semTriagem.length;
  console.log(`\nACERVO  ${todas.length} fotos${copias ? `  (+${copias} cópias descartadas)` : ""}\n`);
  console.log(`  medidas (triagem técnica)   ${medidas}/${todas.length}  ${pct(medidas, todas.length)}`);
  console.log(`  catalogadas (conteúdo)      ${catalogo.size}/${todas.length}  ${pct(catalogo.size, todas.length)}`);
  console.log(`  liberadas p/ São Paulo      ${liberadas.length} das catalogadas`);
  console.log(`  usadas em peça              ${usadas.length}`);
  if (repetidas.length) {
    console.log(`\n  REPETIDAS (mesma foto em mais de uma peça):`);
    for (const [f, pecas] of repetidas.sort((a, b) => b[1].length - a[1].length))
      console.log(`    ${pecas.length}x  ${f}\n        ${pecas.join(", ")}`);
  }
  if (semTriagem.length) console.log(`\n  ${semTriagem.length} foto(s) nova(s) sem medição → node motor/fotos.js`);
  if (semCatalogo.length) console.log(`  ${semCatalogo.length} foto(s) sem catálogo → node motor/acervo.js pendentes`);
  console.log();
}

else if (cmd === "novas") {
  const novas = todas.filter(f => !triagem.has(f));
  if (!novas.length) return console.log("\nNenhuma foto nova. Tudo medido.\n");
  console.log(`\n${novas.length} foto(s) entraram e ainda não foram medidas:\n`);
  novas.slice(0, 40).forEach(f => console.log(`  ${f}`));
  if (novas.length > 40) console.log(`  ... e mais ${novas.length - 40}`);
  console.log(`\nRode  node motor/fotos.js  pra medir, depois  acervo.js pendentes  pra catalogar.\n`);
}

else if (cmd === "pendentes") {
  const pend = todas.filter(f => !catalogo.has(f) && casa(f));
  if (!pend.length) return console.log("\nCatálogo em dia — nada pendente" + (filtro ? ` em "${filtro}"` : "") + ".\n");
  console.log(`\n${pend.length} pendente(s)${filtro ? ` em "${filtro}"` : ""}. Próximo lote (amostra espaçada):\n`);
  for (const f of espacar(pend, n)) {
    const t = triagem.get(f);
    const dica = t ? `miolo ${String(t.miolo).padStart(2)}% · véu ${t.veu.padEnd(5)}` : "não medida";
    console.log(`  ${dica}  ${path.join(DIR_FOTOS, f).replace(/\\/g, "/")}`);
  }
  console.log(`\nAbra cada uma, descreva, e acrescente a linha em fotos/_catalogo.csv:`);
  console.log(`  ${CABECALHO}\n`);
}

else if (cmd === "escolher") {
  const livres = todas.filter(f => {
    const c = catalogo.get(f);
    return c && c.serveSp === "sim" && !uso.has(f) && casa(f);
  });
  if (!livres.length) return console.log("\nNenhuma foto livre e liberada" + (filtro ? ` em "${filtro}"` : "") + ". Catalogue mais.\n");
  console.log(`\n${livres.length} foto(s) servem para SP e NUNCA foram usadas:\n`);
  for (const f of espacar(livres, n)) {
    const c = catalogo.get(f), t = triagem.get(f);
    console.log(`  [${c.cena}] véu ${t ? t.veu : "?"}\n    "foto": "${f}"`);
  }
  console.log();
}

else if (cmd === "usadas") {
  if (!uso.size) return console.log("\nNenhuma foto usada ainda.\n");
  console.log(`\n${uso.size} foto(s) em uso:\n`);
  for (const [f, pecas] of [...uso.entries()].sort((a, b) => b[1].length - a[1].length))
    console.log(`  ${String(pecas.length).padStart(2)}x  ${f}\n        ${pecas.join(", ")}`);
  console.log();
}

else {
  console.error(`comando desconhecido: ${cmd}`);
  console.error(`use: status | novas | pendentes [n] [filtro] | escolher [n] [filtro] | usadas`);
  process.exit(1);
}

function pct(a, b) { return b ? `(${Math.round(a / b * 100)}%)` : ""; }
