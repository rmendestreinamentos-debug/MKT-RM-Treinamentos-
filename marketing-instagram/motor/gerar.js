// gerar.js — lê um arquivo de conteúdo e cospe PNGs prontos pra publicar.
// Uso:  node motor/gerar.js conteudo/exemplo.json
//
// Depende de Playwright (navegador headless) pra renderizar HTML -> imagem.
// Instalar uma vez:  npm install  &&  npx playwright install chromium

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = path.resolve(__dirname, "..");

function ajustaTitulo(n){                        // arte se adapta ao texto
  return n < 22 ? 96 : n < 40 ? 76 : n < 70 ? 60 : 48;   // px
}
function ctaHTML(cta){
  if(!cta) return "";
  const classe = cta.tipo === "link" ? "cta link" : "cta";
  return `<div class="${classe}"><span class="pill">${cta.acao}</span>` +
         (cta.obs ? `<span class="obs">${cta.obs}</span>` : "") + `</div>`;
}
function dataURI(p){                              // arquivo -> data-URI (setContent não carrega caminho solto)
  const ext = path.extname(p).toLowerCase();
  const mime = ext === ".svg" ? "image/svg+xml"
             : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg"
             : ext === ".webp" ? "image/webp" : "image/png";
  return `data:${mime};base64,${fs.readFileSync(p).toString("base64")}`;
}
function resolveMarca(dados){                     // nome vem da peça; logo por cascata
  const nome = dados.marca || "Rafael Mendes Advogados";
  const inicial = (dados.inicial || nome.trim().charAt(0) || "•").toUpperCase();
  if(dados.logo && !fs.existsSync(path.join(BASE, "marca", dados.logo)))
    console.warn(`aviso: logo '${dados.logo}' não encontrado em marca/ — usando fallback`);
  const candidatos = [dados.logo, "logo.png", "logo.svg"].filter(Boolean);   // peça -> casa
  for(const c of candidatos){
    const p = path.join(BASE, "marca", c);
    if(fs.existsSync(p)) return { nome, logoData: dataURI(p) };
  }
  return { nome, inicial };                       // sem arquivo -> inicial estilizada
}
function marcaHTML(marca){
  // Logo por extenso já traz o nome escrito — mostra só o lockup, sem repetir o texto.
  // Sem arquivo: inicial estilizada + nome ao lado.
  return marca.logoData
    ? `<img class="logo-lockup" src="${marca.logoData}" alt="${marca.nome}">`
    : `<span class="logo">${marca.inicial}</span><span class="nome">${marca.nome}</span>`;
}
function slideHTML(d, marca){
  return `<div class="slide ${d.tema === "escuro" ? "escuro" : "claro"}">
    ${d.pagina ? `<span class="paginador">${d.pagina}</span>` : ""}
    <div class="marca">${marcaHTML(marca)}</div>
    <div class="corpo">
      ${d.eyebrow ? `<span class="eyebrow">${d.eyebrow}</span>` : ""}
      <div class="titulo" style="font-size:${ajustaTitulo((d.titulo||"").length)}px">${d.titulo || ""}</div>
      ${d.texto ? `<p class="texto">${d.texto}</p>` : ""}
    </div>
    ${ctaHTML(d.cta)}
  </div>`;
}

(async () => {
  const entrada = process.argv[2];
  if(!entrada){ console.error("Informe o arquivo: node motor/gerar.js conteudo/<arquivo>.json"); process.exit(1); }

  const dados = JSON.parse(fs.readFileSync(entrada, "utf8"));
  // Marca padrão vem do topo do arquivo; cada slide pode sobrescrever marca/logo/inicial.
  const marcaBase = resolveMarca(dados);
  const css = fs.readFileSync(path.join(BASE, "motor/template.html"), "utf8")
                .match(/<style>([\s\S]*?)<\/style>/)[1];
  const tokens = fs.readFileSync(path.join(BASE, "marca/tokens.css"), "utf8");

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });

  const nome = dados.arquivo_saida || "peca";
  let i = 0;
  for(const slide of dados.slides){
    i++;
    // slide declara marca/logo próprios? resolve por slide; senão usa o padrão do arquivo.
    const marca = (slide.marca || slide.logo || slide.inicial)
      ? resolveMarca({ marca: slide.marca || dados.marca, logo: slide.logo || dados.logo, inicial: slide.inicial || dados.inicial })
      : marcaBase;
    const html = `<!doctype html><meta charset="utf-8">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800&display=swap">
      <style>${tokens}\n${css}</style>${slideHTML(slide, marca)}`;
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);   // garante Montserrat carregada antes do print
    const el = await page.$(".slide");
    const saida = path.join(BASE, "saida", `${nome}-${String(i).padStart(2,"0")}.png`);
    await el.screenshot({ path: saida });
    console.log("gerado:", path.relative(BASE, saida));
  }
  await browser.close();
})();
