// gerar.js — lê um arquivo de conteúdo e cospe PNGs prontos pra publicar.
// Uso:  node motor/gerar.js conteudo/exemplo.json
//
// Depende de Playwright (navegador headless) pra renderizar HTML -> imagem.
// Instalar uma vez:  npm install  &&  npx playwright install chromium

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = path.resolve(__dirname, "..");
const MAX_INSTAGRAM = 20;                         // limite de imagens por carrossel no Instagram

// Onde entra o selo da marca em cada tipo. `null` = peça NATIVA, sem selo:
// thread e legenda imitam conteúdo orgânico — carimbar logo mataria o efeito.
// A assinatura delas é o perfil (avatar + @), não a marca do produto.
const SELO = {
  padrao: "topo",
  contagem: "rodape", depoimento: "rodape", provocacao: "rodape", urgencia: "rodape",
  thread: null, legenda: null,
};
const TIPOS = Object.keys(SELO);
const NATIVOS = TIPOS.filter(t => !SELO[t]);

function erro(msg){ console.error("erro:", msg); process.exit(1); }
function esc(s){
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
// *palavra* vira a palavra-chave no acento — duas cores dentro da mesma frase.
function realce(t){
  return esc(t).replace(/\*([^*]+)\*/g, '<span class="destaque">$1</span>');
}
function semMarcacao(t){ return String(t ?? "").replace(/\*/g, ""); }
// escolhe o corpo da fonte pelo tamanho do texto — a arte se adapta ao texto, nunca o contrário
function corpoFonte(txt, faixas){
  const n = semMarcacao(txt).length;
  for(const [limite, px] of faixas) if(n < limite) return px;
  return faixas[faixas.length - 1][1];
}
function dataURI(p){                              // arquivo -> data-URI (setContent não carrega caminho solto)
  const ext = path.extname(p).toLowerCase();
  const mime = ext === ".svg" ? "image/svg+xml"
             : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg"
             : ext === ".webp" ? "image/webp" : "image/png";
  return `data:${mime};base64,${fs.readFileSync(p).toString("base64")}`;
}

function proporcaoPNG(p){                         // largura/altura, lida do IHDR do PNG
  if(path.extname(p).toLowerCase() !== ".png") return null;
  const b = fs.readFileSync(p);
  if(b.length < 24 || b.toString("ascii", 12, 16) !== "IHDR") return null;
  const [w, h] = [b.readUInt32BE(16), b.readUInt32BE(20)];
  return h ? w / h : null;
}
function alturaLogo(prop, base){
  // Wordmark largo e selo empilhado não podem ter a mesma altura: na mesma altura,
  // o selo vira uma pulga ao lado do wordmark. Normaliza o peso ótico pela proporção.
  if(!prop) return base;
  return Math.round(base * (prop >= 4 ? 1 : prop >= 2.2 ? 1.3 : prop >= 1.2 ? 1.8 : 2.2));
}

function resolveMarca(dados){                     // marca e logo vêm SEMPRE da peça — não existe default
  // Os produtos são marcas próprias: um default carimbaria a marca errada na peça.
  const nome = (dados.marca || "").trim();
  if(!nome) erro("peça sem 'marca': cada peça declara seu produto (ver marca/LOGOS.md).");
  const inicial = (dados.inicial || nome.charAt(0) || "•").toUpperCase();
  if(dados.logo){
    const p = path.join(BASE, "marca", dados.logo);
    if(fs.existsSync(p)) return { nome, logoData: dataURI(p), prop: proporcaoPNG(p) };
    console.warn(`aviso: logo '${dados.logo}' não encontrado em marca/ — usando a inicial`);
  }
  return { nome, inicial };                       // sem logo declarado -> inicial neutra, de propósito
}
function resolveFoto(nome){                       // fotos vêm do banco de fotos da pessoa, em fotos/
  if(!nome) return null;
  const p = path.join(BASE, "fotos", nome);
  if(fs.existsSync(p)) return dataURI(p);
  console.warn(`aviso: foto '${nome}' não encontrada em fotos/ — peça sai sem foto de fundo`);
  return null;
}

function seloHTML(marca, posicao){
  // Logo por extenso já traz o nome escrito — mostra só o lockup, sem repetir o texto.
  // Sem arquivo: inicial estilizada + nome ao lado.
  const altura = alturaLogo(marca.prop, posicao === "rodape" ? 84 : 96);
  const conteudo = marca.logoData
    ? `<img class="logo-lockup" style="height:${altura}px" src="${marca.logoData}" alt="${esc(marca.nome)}">`
    : `<span class="logo">${esc(marca.inicial)}</span><span class="nome">${esc(marca.nome)}</span>`;
  return `<div class="selo ${posicao}">${conteudo}</div>`;
}
function ctaHTML(cta){
  if(!cta) return "";
  // CTA é regra, não gosto: tráfego pago -> link; orgânico -> chamada sublinhada.
  const classe = cta.tipo === "link" ? "cta link" : "cta organico";
  return `<div class="${classe}"><span class="pill">${esc(cta.acao)}</span>` +
         (cta.obs ? `<span class="obs">${esc(cta.obs)}</span>` : "") + `</div>`;
}

// ---------- os corpos, um por tipo ----------
function corpoPadrao(d){
  const px = corpoFonte(d.titulo, [[22,96],[40,76],[70,60],[Infinity,48]]);
  return `${d.eyebrow ? `<span class="eyebrow">${esc(d.eyebrow)}</span>` : ""}
    <div class="titulo" style="font-size:${px}px">${realce(d.titulo)}</div>
    ${d.texto ? `<p class="texto">${realce(d.texto)}</p>` : ""}`;
}
function corpoContagem(d){
  const linha = `${d.numero ?? ""} ${d.unidade ?? "dias"}`;
  const px = corpoFonte(linha, [[8,230],[11,190],[15,150],[Infinity,120]]);
  return `${d.prefixo ? `<span class="prefixo">${esc(d.prefixo)}</span>` : ""}
    <div class="numerao" style="font-size:${px}px">
      <span class="num">${esc(d.numero)}</span> <span class="uni">${esc(d.unidade || "dias")}</span>
    </div>
    ${d.texto ? `<p class="apoio">${realce(d.texto)}</p>` : ""}
    ${d.data ? `<span class="data">${esc(d.data)}</span>` : ""}`;
}
function corpoDepoimento(d){
  const px = corpoFonte(d.citacao, [[60,88],[100,72],[150,60],[Infinity,50]]);
  return `<span class="aspas">&ldquo;</span>
    <div class="citacao" style="font-size:${px}px">${realce(d.citacao)}</div>
    <div class="autoria">
      <span class="autor">${esc(d.autor)}</span>${d.cargo ? ` <span class="cargo">— ${esc(d.cargo)}</span>` : ""}
      ${d.obs ? `<span class="obs-autor">${esc(d.obs)}</span>` : ""}
    </div>`;
}
function corpoImpacto(d){                         // provocação e urgência: a copy é a peça
  const px = corpoFonte(d.titulo, [[50,96],[80,80],[120,66],[Infinity,56]]);
  return `${d.eyebrow ? `<span class="eyebrow">${esc(d.eyebrow)}</span>` : ""}
    <div class="impacto-txt" style="font-size:${px}px">${realce(d.titulo)}</div>
    ${d.texto ? `<p class="apoio">${realce(d.texto)}</p>` : ""}
    ${d.data ? `<span class="data">${esc(d.data)}</span>` : ""}`;
}

// ---------- carrossel: thread do X ----------
const SELO_VERIFICADO = `<svg class="verificado" viewBox="0 0 22 22" aria-hidden="true"><path fill="#1d9bf0" d="M20.4 11c0-1-.5-1.9-1.3-2.5.3-1 .1-2-.5-2.8-.7-.8-1.7-1.1-2.6-1-.4-.9-1.3-1.5-2.4-1.5-.9 0-1.8.4-2.3 1.2-.6-.4-1.3-.6-2-.5-1 .1-1.9.7-2.3 1.6-1-.1-2 .3-2.6 1.1-.6.8-.7 1.8-.4 2.7-.8.6-1.3 1.6-1.3 2.6 0 1 .5 1.9 1.3 2.5-.3 1-.1 2 .5 2.8.7.8 1.7 1.1 2.6 1 .4.9 1.3 1.5 2.4 1.5.9 0 1.8-.4 2.3-1.2.6.4 1.3.6 2 .5 1-.1 1.9-.7 2.3-1.6 1 .1 2-.3 2.6-1.1.6-.8.7-1.8.4-2.7.8-.6 1.3-1.5 1.3-2.6z"></path><path fill="#fff" d="m9.8 14.9-2.7-2.7 1.3-1.3 1.4 1.4 3.8-3.8 1.3 1.3-5.1 5.1z"></path></svg>`;
function perfilHTML(p){
  if(!p || !p.nome) erro("carrossel 'thread' precisa de 'perfil' com 'nome' (e de preferência 'handle' e 'avatar').");
  const av = resolveFoto(p.avatar);
  return `<div class="perfil">
    ${av ? `<img class="avatar" src="${av}" alt="">` : `<span class="avatar vazio">${esc((p.nome[0]||"?").toUpperCase())}</span>`}
    <div class="quem">
      <span class="nome-perfil">${esc(p.nome)}${p.verificado === false ? "" : SELO_VERIFICADO}</span>
      ${p.handle ? `<span class="handle">${esc(p.handle)}</span>` : ""}
    </div>
  </div>`;
}
function paragrafos(t, classe){                   // linha em branco separa parágrafo, como no X
  return String(t ?? "").split(/\n\s*\n/).filter(Boolean)
    .map(p => `<p class="${classe}">${realce(p).replace(/\n/g, "<br>")}</p>`).join("");
}
function corpoThread(d){
  if(d.titulo){                                   // capa da thread: título curto + gancho
    return `<div class="thread-capa">
      <div class="thread-titulo">${realce(d.titulo)}</div>
      ${d.gancho ? `<div class="thread-gancho">${realce(d.gancho)}</div>` : ""}
    </div>`;
  }
  const px = corpoFonte(d.texto, [[180,52],[320,46],[520,40],[Infinity,34]]);
  return `<div class="thread-txt" style="font-size:${px}px">${paragrafos(d.texto, "tp")}</div>`;
}
// ---------- carrossel: foto com caixa de legenda ----------
function corpoLegenda(d){
  const paineis = Array.isArray(d.paineis) ? d.paineis : [];
  if(!paineis.length){                            // sem foto: slide de texto (o fecho do carrossel)
    const px = corpoFonte(d.texto, [[80,64],[160,56],[Infinity,46]]);
    return `<div class="legenda-fecho" style="font-size:${px}px">${paragrafos(d.texto, "lf")}</div>`;
  }
  if(paineis.length > 2) erro("'legenda' aceita no máximo 2 painéis (foto única ou duas lado a lado).");
  return `<div class="paineis">${paineis.map(p => {
    const f = resolveFoto(p.foto);
    return `<div class="painel" ${f ? `style="background-image:url('${f}')"` : ""}>
      ${p.legenda ? `<span class="caixa">${esc(p.legenda)}</span>` : ""}
    </div>`;
  }).join("")}</div>`;
}

const CORPOS = {
  padrao: corpoPadrao,
  contagem: corpoContagem,
  depoimento: corpoDepoimento,
  provocacao: corpoImpacto,
  urgencia: corpoImpacto,
  thread: corpoThread,
  legenda: corpoLegenda,
};

function slideHTML(d, marca, perfil){
  const tipo = d.tipo || "padrao";
  if(!TIPOS.includes(tipo)) erro(`tipo '${tipo}' desconhecido — use: ${TIPOS.join(" · ")}`);
  const selo = SELO[tipo];
  const nativo = !selo;                           // thread/legenda: sem selo, visual de conteúdo orgânico
  const impacto = !nativo && tipo !== "padrao";
  const tema = d.tema === "escuro" ? "escuro" : d.tema === "claro" ? "claro" : impacto ? "escuro" : "claro";
  const foto = !nativo ? resolveFoto(d.foto) : null;
  const imagem = tipo === "thread" ? resolveFoto(d.imagem) : null;

  return `<div class="slide ${tema} ${tipo} ${impacto ? "impacto" : ""} ${nativo ? "nativo" : ""}">
    ${foto ? `<div class="foto ${["topo","baixo","esquerda","direita"].includes(d.foco) ? d.foco : ""}"
                   style="background-image:url('${foto}')"></div>
             <div class="veu ${["leve","medio","forte"].includes(d.veu) ? d.veu : "medio"}"></div>` : ""}
    ${d.pagina ? `<span class="paginador">${esc(d.pagina)}</span>` : ""}
    ${selo === "topo" ? seloHTML(marca, "topo") : ""}
    ${tipo === "thread" ? perfilHTML(perfil) : ""}
    <div class="corpo ${impacto ? "centro" : ""}">
      ${CORPOS[tipo](d)}
      ${impacto ? ctaHTML(d.cta) : ""}
    </div>
    ${imagem ? `<img class="thread-img" src="${imagem}" alt="">` : ""}
    ${selo === "rodape" ? seloHTML(marca, "rodape") : !impacto && !nativo ? ctaHTML(d.cta) : ""}
  </div>`;
}

(async () => {
  const entrada = process.argv[2];
  if(!entrada) erro("informe o arquivo: node motor/gerar.js conteudo/<arquivo>.json");

  let dados;
  try { dados = JSON.parse(fs.readFileSync(entrada, "utf8")); }
  catch(e){ erro(e.code === "ENOENT" ? `arquivo não encontrado: ${entrada}` : `JSON inválido em ${entrada} — ${e.message}`); }
  if(!Array.isArray(dados.slides) || !dados.slides.length) erro("peça sem 'slides'.");
  if(dados.slides.length > MAX_INSTAGRAM)
    console.warn(`aviso: ${dados.slides.length} slides — o Instagram publica no máximo ${MAX_INSTAGRAM} por carrossel.`);

  // Só exige marca quem carimba selo. Peça nativa (thread/legenda) assina com o perfil.
  const usaSelo = dados.slides.some(s => SELO[s.tipo || dados.tipo || "padrao"]);
  const marcaBase = usaSelo ? resolveMarca(dados) : null;
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
    // perfil (thread) vem do topo do arquivo; o slide pode trocar de perfil se quiser.
    const perfil = slide.perfil || dados.perfil;
    const html = `<!doctype html><meta charset="utf-8">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800;900&family=Roboto:wght@400;500;700;900&display=swap">
      <style>${tokens}\n${css}</style>${slideHTML({ ...slide, tipo: slide.tipo || dados.tipo }, marca, perfil)}`;
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);   // garante as fontes carregadas antes do print
    const el = await page.$(".slide");
    const saida = path.join(BASE, "saida", `${nome}-${String(i).padStart(2,"0")}.png`);
    await el.screenshot({ path: saida });
    console.log("gerado:", path.relative(BASE, saida));
  }
  await browser.close();
})();
