const fs = require("fs"), path = require("path"), { chromium } = require("playwright");
const BASE = path.resolve(__dirname, "..");
const DIR = path.join(BASE, "palestrantes", "recorte");
const alvos = process.argv.slice(2);
(async () => {
  const arqs = fs.readdirSync(DIR).filter(f => alvos.some(a => f.includes(a)));
  let html = `<style>
    body{background:#0d0d0d;margin:0;padding:20px;font-family:Segoe UI,sans-serif;color:#eee}
    .g{display:flex;flex-wrap:wrap;gap:16px}
    .c{display:inline-block}
    .w{position:relative;display:inline-block;background:#222}
    .w img{display:block;height:420px;width:auto}
    .lin{position:absolute;left:0;right:0;height:1px;background:rgba(255,80,80,.55)}
    .lin.forte{background:rgba(255,255,0,.9)}
    .col{position:absolute;top:0;bottom:0;width:1px;background:rgba(80,180,255,.5)}
    .col.forte{background:rgba(0,255,120,.9)}
    .t{position:absolute;font-size:10px;color:#ff8080;left:2px}
    .tc{position:absolute;font-size:10px;color:#7fd4ff;top:2px}
    .n{font-size:14px;text-align:center;margin-top:4px}
  </style><div class="g">`;
  for (const f of arqs) {
    const uri = "data:image/png;base64," + fs.readFileSync(path.join(DIR, f)).toString("base64");
    let reg = "";
    for (let p = 5; p < 100; p += 5)
      reg += `<div class="lin${p % 25 === 0 ? " forte" : ""}" style="top:${p}%"></div><span class="t" style="top:${p}%">${p}</span>`;
    for (let p = 10; p < 100; p += 10)
      reg += `<div class="col${p === 50 ? " forte" : ""}" style="left:${p}%"></div><span class="tc" style="left:${p}%">${p}</span>`;
    html += `<div class="c"><div class="w"><img src="${uri}">${reg}</div><div class="n">${f.replace(/\.png$/, "")}</div></div>`;
  }
  html += `</div>`;
  const nav = await chromium.launch();
  const pg = await nav.newPage({ viewport: { width: 1360, height: 900 } });
  await pg.setContent(html);
  await pg.screenshot({ path: path.join(BASE, "saida", "_GRADE.png"), fullPage: true });
  await nav.close();
  console.log("saida/_GRADE.png");
})();
