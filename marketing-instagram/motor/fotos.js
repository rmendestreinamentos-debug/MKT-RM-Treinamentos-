// fotos.js — tria o acervo: quais fotos servem de fundo, e com que véu.
// Uso:  node motor/fotos.js            (varre fotos/ inteira, subpastas inclusive)
//       node motor/fotos.js GABRIEL    (só as pastas/arquivos que casam com o termo)
//
// Com ~1.600 fotos de evento, escolher no olho é inviável e impreciso. Isto mede
// o que decide a ARTE:
//   - resolução: aguenta 1080x1350 sem borrar?
//   - luminância do MIOLO: a faixa central onde o título senta. Foto clara ali
//     briga com o texto, por mais véu que se ponha.
// Imprime um resumo por pasta + o ranking dos melhores fundos, e grava o laudo
// completo em fotos/_triagem.csv.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = path.resolve(__dirname, "..");
const DIR = path.join(BASE, "fotos");
const EXT = [".jpg", ".jpeg", ".png", ".webp"];
const LARGURA = 1080, ALTURA = 1350;             // formato de publicação
const ALVO = LARGURA / ALTURA;

const mime = e => e === ".png" ? "image/png" : e === ".webp" ? "image/webp" : "image/jpeg";

function varrer(dir, raiz = dir, saco = []){      // anda nas subpastas
  for(const e of fs.readdirSync(dir, { withFileTypes: true })){
    const p = path.join(dir, e.name);
    if(e.isDirectory()) varrer(p, raiz, saco);
    else if(EXT.includes(path.extname(e.name).toLowerCase())) saco.push(path.relative(raiz, p));
  }
  return saco;
}

(async () => {
  if(!fs.existsSync(DIR)) { console.error("erro: pasta fotos/ não existe."); process.exit(1); }
  const filtro = (process.argv[2] || "").toLowerCase();
  let fotos = varrer(DIR);
  if(filtro) fotos = fotos.filter(f => f.toLowerCase().includes(filtro));
  if(!fotos.length){
    console.log(filtro ? `Nenhuma foto casa com "${filtro}".` : "Nenhuma foto em fotos/.");
    return;
  }

  const browser = await chromium.launch();
  let page = await browser.newPage();
  const laudo = [];

  // Foto de evento tem 3-4 MB. Depois de algumas centenas, a memória do renderer
  // satura e o decode() começa a falhar em imagem BOA. Reciclar a página resolve.
  const RECICLA = 120;
  const medir = async (uri) => page.evaluate(async (src) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const { naturalWidth: w, naturalHeight: h } = img;
        const c = document.createElement("canvas");
        c.width = 100; c.height = 125;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, 100, 125);
        // O MIOLO: onde o título cai (~22% a ~78% da altura). É essa faixa que decide.
        const d = ctx.getImageData(0, Math.round(125 * .22), 100, Math.round(125 * .56)).data;
        let soma = 0, n = 0;
        for(let k = 0; k < d.length; k += 4){
          soma += .2126 * d[k] + .7152 * d[k+1] + .0722 * d[k+2];   // luminância percebida
          n++;
        }
        return { w, h, luz: soma / n / 255 };
      }, uri);

  process.stdout.write(`Medindo ${fotos.length} foto(s)`);
  let i = 0;
  for(const f of fotos){
    if(++i % 100 === 0) process.stdout.write(".");
    if(i % RECICLA === 0){                        // troca a página antes de ela saturar
      await page.close();
      page = await browser.newPage();
    }
    const p = path.join(DIR, f);
    const uri = `data:${mime(path.extname(f).toLowerCase())};base64,${fs.readFileSync(p).toString("base64")}`;
    let m;
    try { m = await medir(uri); }
    catch {
      try {                                       // falhou? página nova e mais uma tentativa
        await page.close().catch(() => {});
        page = await browser.newPage();
        m = await medir(uri);
      } catch { laudo.push({ f, erro: "não decodificou" }); continue; }
    }

    const rel = m.w / m.h;
    const baixa = m.w < LARGURA || m.h < ALTURA;
    const panoramica = rel > ALVO * 1.6;
    const estourada = m.luz > .72;
    const veu = m.luz > .55 ? "forte" : m.luz > .28 ? "medio" : "leve";
    const serve = !baixa && !estourada;
    // Nota de fundo: miolo escuro manda, e retrato bate paisagem no corte 4:5.
    const nota = serve ? (1 - m.luz) * 100 - Math.abs(rel - ALVO) * 25 : -1;

    laudo.push({ f, w: m.w, h: m.h, luz: m.luz, veu, serve, baixa, panoramica, estourada, nota,
                 pasta: path.dirname(f) === "." ? "(raiz)" : path.dirname(f) });
  }
  await browser.close();
  console.log(" ok\n");

  const ok = laudo.filter(l => !l.erro);
  const servem = ok.filter(l => l.serve);

  // resumo por pasta
  const pastas = {};
  for(const l of ok) (pastas[l.pasta] ??= { n: 0, servem: 0 }).n++, l.serve && pastas[l.pasta].servem++;
  const larg = Math.max(...Object.keys(pastas).map(p => p.length), 6);
  console.log(`${"PASTA".padEnd(larg)}  FOTOS  SERVEM DE FUNDO`);
  console.log("-".repeat(larg + 24));
  for(const [p, v] of Object.entries(pastas).sort((a,b) => b[1].servem - a[1].servem))
    console.log(`${p.padEnd(larg)}  ${String(v.n).padStart(5)}  ${String(v.servem).padStart(5)}`);

  // ranking dos melhores fundos
  console.log(`\nMELHORES FUNDOS (miolo escuro + proporção boa):\n`);
  for(const l of servem.sort((a,b) => b.nota - a.nota).slice(0, 15))
    console.log(`  ${`${Math.round(l.luz*100)}%`.padStart(4)} miolo · véu ${l.veu.padEnd(5)} · ${l.w}x${l.h}  ${l.f}`);

  const csv = ["arquivo,largura,altura,miolo_pct,veu,serve,motivo"];
  for(const l of laudo){
    if(l.erro){ csv.push(`"${l.f}",,,,,nao,"${l.erro}"`); continue; }
    const motivo = [l.baixa && "resolucao baixa", l.estourada && "miolo estourado",
                    l.panoramica && "panoramica"].filter(Boolean).join(" / ");
    csv.push(`"${l.f}",${l.w},${l.h},${Math.round(l.luz*100)},${l.veu},${l.serve?"sim":"nao"},"${motivo}"`);
  }
  fs.writeFileSync(path.join(DIR, "_triagem.csv"), csv.join("\n"), "utf8");

  console.log(`\n${servem.length} de ${ok.length} servem de fundo. Laudo completo: fotos/_triagem.csv`);
  console.log(`Use o véu sugerido no JSON: "foto": "<caminho>", "veu": "leve" | "medio" | "forte"\n`);
})();
