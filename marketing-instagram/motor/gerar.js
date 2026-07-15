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

// Onde entra o selo da marca em cada tipo.
//   "topo" / "rodape" -> a montagem genérica posiciona o selo.
//   "corpo"           -> o corpo do tipo posiciona o selo ele mesmo (ver CORPO_FECHA).
//   null              -> a peça não leva selo.
const SELO = {
  padrao: "topo",
  contagem: "rodape", depoimento: "rodape", provocacao: "rodape", urgencia: "rodape",
  carrossel: "rodape",
  anuncio: "corpo",
  caricato: "corpo",
  palestrantes: "corpo",
  estreia: "corpo",
  lote: "corpo",
  thread: null, legenda: null,
};
const TIPOS = Object.keys(SELO);

// NATIVO é o VISUAL de conteúdo orgânico — fonte de sistema, sem dourado, sem selo.
// Não é o mesmo que "não tem selo": quem não leva selo por decisão de FORMATO são só
// thread e legenda, que precisam parecer print. O caricato nasceu sem selo (a
// referência não tem), mas o dono pediu a marca nele — e a marca é dele. Leva selo.
const NATIVOS = ["thread", "legenda"];

// Tipos que montam o próprio fecho (foto, selo, botão, ressalva) dentro do corpo.
// O anúncio de tráfego tem uma ordem própria — foto, logo, botão, ressalva — que a
// montagem genérica (que joga o selo sempre por último) não consegue produzir.
const CORPO_FECHA = new Set(["anuncio", "caricato", "palestrantes", "estreia", "lote"]);

function erro(msg){ console.error("erro:", msg); process.exit(1); }
function esc(s){
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
// *palavra* vira a palavra-chave no acento — duas cores dentro da mesma frase.
// Realce curto ("3 dias") não pode rachar entre duas linhas: o destaque perde
// a força se o número fica numa linha e a unidade na outra. Realce longo pode
// quebrar à vontade — travar ele estouraria a margem.
function realce(t){
  return esc(t).replace(/\*([^*]+)\*/g, (_, m) =>
    `<span class="destaque${m.length <= 14 ? " junto" : ""}">${m}</span>`);
}
// No anúncio a quebra de linha é DECISÃO DE COPY, não sobra de largura: é ela que
// separa o problema ("Improviso custa caro") do agravante ("em escritório que já
// cresceu"). Por isso o `\n` do JSON vira quebra de verdade, em vez de virar espaço.
function linhas(t){ return realce(t).replace(/\n/g, "<br>"); }
function semMarcacao(t){ return String(t ?? "").replace(/\*/g, ""); }
// Num texto que já vem quebrado à mão, quem manda no tamanho da fonte é a LINHA MAIS
// LONGA — não a soma. Medir o total encolheria o título de duas linhas curtas sem
// motivo, e ainda deixaria a linha comprida estourar e rachar numa terceira linha.
function maiorLinha(t){
  return semMarcacao(t).split("\n").reduce((m, l) => Math.max(m, l.trim().length), 0);
}
function corpoFonteLinha(txt, faixas){
  const n = maiorLinha(txt);
  for(const [limite, px] of faixas) if(n < limite) return px;
  return faixas[faixas.length - 1][1];
}
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
// A imagem DENTRO do slide é escolha avulsa do dono: ele despeja em imagens/.
// A peça pode declarar `"pasta": "copa-do-mundo"` — uma pasta por carrossel, e aí o
// slide cita só o nome do arquivo. Procura na pasta da peça, depois na raiz de
// imagens/, e por fim no acervo (fotos/) e em marca/, pra quem quiser apontar pra lá.
function resolveImagem(nome, pasta){
  if(!nome) return null;
  const onde = [
    ...(pasta ? [path.join("imagens", pasta)] : []),
    "imagens", "fotos", "marca",
  ];
  for(const dir of onde){
    const p = path.join(BASE, dir, nome);
    if(fs.existsSync(p)) return dataURI(p);
  }
  const alvo = pasta ? `imagens/${pasta}/` : "imagens/";
  console.warn(`aviso: imagem '${nome}' não encontrada em ${alvo} — slide sai sem ela`);
  return null;
}
// Uma imagem, ou duas lado a lado. No modelo do X o normal é UMA (e muitos slides,
// nenhuma) — duas é exceção, pro contraste "antes × depois".
function resolveImagens(v, pasta){
  const lista = (Array.isArray(v) ? v : [v]).map(n => resolveImagem(n, pasta)).filter(Boolean);
  if(lista.length > 2) erro("slide 'thread' aceita no máximo 2 imagens (o X mostra lado a lado).");
  return lista;
}

// ---------- quem ASSINA o carrossel nativo ----------
const PERFIS = JSON.parse(fs.readFileSync(path.join(BASE, "marca", "perfis.json"), "utf8"));
function resolvePerfil(p){
  if(!p) return null;
  if(typeof p === "object") return p;             // perfil escrito à mão no JSON: passa direto
  const reg = PERFIS[p];
  if(!reg) erro(`perfil '${p}' desconhecido — use: ${Object.keys(PERFIS).filter(k => k[0] !== "_").join(" · ")} (ver marca/perfis.json).`);
  if(!reg.handle) erro(`o @ do perfil '${p}' ainda não foi confirmado pelo dono. Preencha "handle" em marca/perfis.json antes de gerar — chutar o @ publica uma peça com perfil errado.`);
  return reg;
}

function seloHTML(marca, posicao){
  // Logo por extenso já traz o nome escrito — mostra só o lockup, sem repetir o texto.
  // Sem arquivo: inicial estilizada + nome ao lado.
  // Nos tipos de tráfego o selo cai SOBRE a foto e sem o chip preto em volta — sem
  // essa moldura ele ocupa mais espaço ótico na mesma altura, e no tamanho dos outros
  // lugares acabaria tapando o rosto de quem está na imagem. Por isso entra menor.
  const base = posicao === "caricato" ? 72 : posicao === "anuncio" ? 78
             : posicao === "palestrantes" ? 70
             : posicao === "estreia" ? 56          // acima da moldura: o lockup não pode encostar nela
             : posicao === "lote" ? 66             // dentro do card: o preço é o assunto, não o logo
             : posicao === "rodape" ? 84 : 96;
  const altura = alturaLogo(marca.prop, base);
  const conteudo = marca.logoData
    ? `<img class="logo-lockup" style="height:${altura}px" src="${marca.logoData}" alt="${esc(marca.nome)}">`
    : `<span class="logo">${esc(marca.inicial)}</span><span class="nome">${esc(marca.nome)}</span>`;
  return `<div class="selo ${posicao}">${conteudo}</div>`;
}
function ctaHTML(cta){
  if(!cta) return "";
  // CTA é regra, não gosto: tráfego pago -> link (botão); orgânico -> chamada sublinhada.
  // "marca-dagua" -> assinatura discreta: a frase é a peça, o CTA não pode roubar a cena.
  const classe = cta.tipo === "link" ? "cta link"
               : cta.tipo === "marca-dagua" ? "cta marcadagua" : "cta organico";
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
  // Caixa alta serve frase curta de impacto. Citação longa em maiúscula vira
  // um paredão que ninguém lê — a partir de ~160 caracteres, cai pra sentence case.
  const longa = semMarcacao(d.citacao).length > 160 ? " longa" : "";
  return `<span class="aspas">&ldquo;</span>
    <div class="citacao${longa}" style="font-size:${px}px">${realce(d.citacao)}</div>
    <div class="autoria">
      <span class="autor">${esc(d.autor)}</span>${d.cargo ? ` <span class="cargo">— ${esc(d.cargo)}</span>` : ""}
      ${d.obs ? `<span class="obs-autor">${esc(d.obs)}</span>` : ""}
    </div>
    ${d.data ? `<span class="data marcadagua">${esc(d.data)}</span>` : ""}`;
}
function corpoUrgencia(d){                        // urgência: uma frase só, o número realçado NA linha
  const px = corpoFonte(d.titulo, [[50,96],[80,80],[120,66],[Infinity,56]]);
  return `${d.eyebrow ? `<span class="eyebrow">${esc(d.eyebrow)}</span>` : ""}
    <div class="impacto-txt" style="font-size:${px}px">${realce(d.titulo)}</div>
    ${d.texto ? `<p class="apoio">${realce(d.texto)}</p>` : ""}
    ${d.data ? `<span class="data">${esc(d.data)}</span>` : ""}`;
}
// Provocação NÃO é um bloco uniforme: o modelo empilha o número em display gigante
// e joga o texto de ligação pequeno entre eles. É o contraste de TAMANHO que
// carrega a peça — cor sozinha não faz o trabalho. Cada *realce* vira uma linha
// gigante; o que está fora dele vira linha de ligação.
function corpoProvocacao(d){
  const partes = String(d.titulo ?? "").split(/\*([^*]+)\*/);   // ímpares = realçados
  const linhas = partes.map((p, i) => {
    const t = p.trim();
    if(!t) return "";
    if(i % 2){
      const px = corpoFonte(t, [[9,190],[13,150],[18,118],[Infinity,92]]);
      return `<div class="provoca-num" style="font-size:${px}px">${esc(t)}</div>`;
    }
    const px = corpoFonte(t, [[26,62],[46,54],[Infinity,46]]);
    return `<div class="provoca-liga" style="font-size:${px}px">${esc(t)}</div>`;
  }).join("");
  return `${d.eyebrow ? `<span class="eyebrow">${esc(d.eyebrow)}</span>` : ""}
    <div class="provoca">${linhas}</div>
    ${d.data ? `<span class="data">${esc(d.data)}</span>` : ""}`;
}

// Carrossel de LEITURA: texto longo sobre foto. Aqui a tipografia serve o texto,
// não o impacto — sentence case, corpo médio, alinhado à esquerda. Caixa alta
// gigante num parágrafo de 3 linhas vira bloco grotesco e ninguém lê.
function corpoCarrossel(d){
  const px = corpoFonte(d.titulo, [[70,62],[120,54],[Infinity,46]]);
  return `${d.eyebrow ? `<span class="eyebrow">${esc(d.eyebrow)}</span>` : ""}
    ${d.titulo ? `<div class="lead" style="font-size:${px}px">${realce(d.titulo)}</div>` : ""}
    ${d.texto ? paragrafos(d.texto, "leitura") : ""}`;
}

// ---------- carrossel: thread do X ----------
const SELO_VERIFICADO = `<svg class="verificado" viewBox="0 0 22 22" aria-hidden="true"><path fill="#1d9bf0" d="M20.4 11c0-1-.5-1.9-1.3-2.5.3-1 .1-2-.5-2.8-.7-.8-1.7-1.1-2.6-1-.4-.9-1.3-1.5-2.4-1.5-.9 0-1.8.4-2.3 1.2-.6-.4-1.3-.6-2-.5-1 .1-1.9.7-2.3 1.6-1-.1-2 .3-2.6 1.1-.6.8-.7 1.8-.4 2.7-.8.6-1.3 1.6-1.3 2.6 0 1 .5 1.9 1.3 2.5-.3 1-.1 2 .5 2.8.7.8 1.7 1.1 2.6 1 .4.9 1.3 1.5 2.4 1.5.9 0 1.8-.4 2.3-1.2.6.4 1.3.6 2 .5 1-.1 1.9-.7 2.3-1.6 1 .1 2-.3 2.6-1.1.6-.8.7-1.8.4-2.7.8-.6 1.3-1.5 1.3-2.6z"></path><path fill="#fff" d="m9.8 14.9-2.7-2.7 1.3-1.3 1.4 1.4 3.8-3.8 1.3 1.3-5.1 5.1z"></path></svg>`;
function perfilHTML(p){
  if(!p || !p.nome) erro("carrossel 'thread' precisa de 'perfil': quem assina? Use o slug — \"perfil\": \"rm-summit\" | \"rafael-mendes\" | \"rafael-mendes-advogados\" (ver marca/perfis.json).");
  const av = resolveImagem(p.avatar);
  return `<div class="perfil">
    ${av ? `<img class="avatar ${p.encaixe === "contain" ? "contain" : ""}" src="${av}" alt="">`
         : `<span class="avatar vazio">${esc((p.nome[0]||"?").toUpperCase())}</span>`}
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

// ---------- estático: anúncio de captação (tráfego pago) ----------
// Ícones do chip de qualificação. Conjunto pequeno de propósito: o chip existe pra
// FILTRAR o lead (faturamento, tamanho do time, tempo de casa), não pra decorar.
const ICONES = {
  crescimento: `<path d="M4 20h16"/><rect x="6" y="12" width="3" height="7"/><rect x="11" y="8" width="3" height="11"/><rect x="16" y="4" width="3" height="15"/>`,
  equipe:      `<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5"/><path d="M16 6.6a3 3 0 0 1 0 5.3"/><path d="M17.6 15.2c2 .6 3.4 2 3.4 4.8"/>`,
  dinheiro:    `<rect x="3" y="7" width="18" height="10" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 12h.01M17.5 12h.01"/>`,
  relogio:     `<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3.4 2"/>`,
  alvo:        `<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>`,
  escudo:      `<path d="M12 3l7 3v5c0 5-3 8.2-7 10-4-1.8-7-5-7-10V6l7-3z"/>`,
  local:       `<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>`,
  calendario:  `<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>`,
  processo:    `<path d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z"/>`,
  balanca:     `<path d="M12 4v16M7 20h10M6 8h12"/><path d="M6 8l-3 6h6l-3-6zM18 8l-3 6h6l-3-6z"/>`,
};
// O chip parte a frase no `*asterisco*`: o que está fora vira a linha de cima
// (a condição, pequena); o realçado vira a linha de baixo (o número, em dourado).
function chipHTML(c){
  const partes = String(c.texto ?? "").split(/\*([^*]+)\*/);
  const cima  = partes.filter((_, i) => !(i % 2)).join(" ").trim();
  const baixo = partes.filter((_, i) =>   i % 2 ).join(" ").trim();
  const ico = ICONES[c.icone];
  if(c.icone && !ico)
    console.warn(`aviso: ícone '${c.icone}' não existe — use: ${Object.keys(ICONES).join(" · ")}`);
  return `<div class="chip"><div class="chip-in">
    ${ico ? `<span class="chip-ico"><svg viewBox="0 0 24 24">${ico}</svg></span>` : ""}
    <span class="chip-txt">
      ${cima  ? `<span class="l1">${esc(cima)}</span>`  : ""}
      ${baixo ? `<span class="l2">${esc(baixo)}</span>` : ""}
    </span>
  </div></div>`;
}
function corpoAnuncio(d, marca){
  const px = corpoFonteLinha(d.titulo, [[15,92],[21,80],[27,68],[33,56],[Infinity,48]]);
  const chips = Array.isArray(d.chips) ? d.chips : [];
  if(chips.length > 2)
    erro("'anuncio' aceita no máximo 2 chips de qualificação — o terceiro vira legenda, e ninguém lê legenda em anúncio.");
  const cta = d.cta || {};
  if(!cta.acao) erro("'anuncio' é peça de tráfego pago: precisa de 'cta.acao' — o texto do botão.");
  const foto = resolveFoto(d.foto);
  return `<div class="anuncio-topo">
      ${d.eyebrow ? `<span class="eyebrow">${esc(d.eyebrow)}</span>` : ""}
      <div class="anuncio-titulo" style="font-size:${px}px">${linhas(d.titulo)}</div>
      ${d.texto ? `<p class="anuncio-sub">${realce(d.texto)}</p>` : ""}
      ${chips.length ? `<div class="chips">${chips.map(chipHTML).join("")}</div>` : ""}
    </div>
    <div class="anuncio-palco">
      ${foto ? `<div class="foto ${["topo","baixo","esquerda","direita"].includes(d.foco) ? d.foco : ""}"
                     style="background-image:url('${foto}')"></div>
                <div class="anuncio-veu"></div>` : ""}
      ${seloHTML(marca, "anuncio")}
      <span class="botao">${esc(cta.acao)}</span>
      ${cta.obs ? `<span class="ressalva">${esc(cta.obs)}</span>` : ""}
    </div>`;
}

// ---------- estático: imagem caricata (tráfego pago) ----------
// Aqui a IMAGEM é a peça: ela sangra na arte inteira e o texto só remata embaixo.
// A imagem é escolha avulsa do dono (cena caricata, montagem) e vem de `imagens/`,
// não do acervo do evento.
const MAO = `<svg viewBox="0 0 24 24"><path d="M9 11.5V5.6a1.6 1.6 0 0 1 3.2 0v5.2m0-1.4a1.6 1.6 0 0 1 3.2 0v1.6m0-1a1.6 1.6 0 0 1 3.2 0v4.3a6.3 6.3 0 0 1-6.3 6.3h-1a5 5 0 0 1-4.2-2.3l-2.4-3.8a1.7 1.7 0 0 1 2.7-2l1.6 1.9V9"/></svg>`;
function corpoCaricato(d, marca, pasta){
  const img = resolveImagem(d.imagem, pasta);
  if(!img) console.warn("aviso: 'caricato' sem imagem — a imagem É a peça; sem ela sobra texto no preto.");
  const px = corpoFonteLinha(d.titulo, [[13,104],[19,88],[26,72],[34,60],[Infinity,52]]);
  const cta = d.cta || {};
  return `${img ? `<div class="caricato-img" style="background-image:url('${img}')"></div>` : ""}
    <div class="caricato-veu"></div>
    ${seloHTML(marca, "caricato")}
    <div class="caricato-txt">
      ${d.apoio ? `<p class="caricato-apoio" style="font-size:${
        corpoFonteLinha(d.apoio, [[31,46],[39,40],[47,34],[Infinity,30]])}px">${linhas(d.apoio)}</p>` : ""}
      <div class="caricato-titulo" style="font-size:${px}px">${linhas(d.titulo)}</div>
    </div>
    ${cta.acao ? `<div class="caricato-cta">
      <span class="badge">${MAO}</span><span class="chamada" style="font-size:${
        corpoFonteLinha(cta.acao, [[30,40],[38,36],[48,31],[Infinity,27]])}px">${realce(cta.acao)}</span>
    </div>` : ""}`;
}

// ---------- estático: line-up de palestrantes ----------
// O ativo desta peça são os NOMES: quem já confirmou é a prova de que o evento é
// grande. Por isso o rosto é meio e o nome é fim — nome ilegível mata a peça.
// O line-up é uma COLAGEM: os palestrantes se encostam, ombro a ombro. Isso não se
// faz com foto — se faz com RECORTE. Por isso o motor lê de `palestrantes/recorte/`,
// que é a saída do `tirar-fundo.js`, e não da foto crua.
function resolveRosto(nome){
  if(!nome) return null;
  const png = nome.replace(/\.(jpe?g|png)$/i, "") + ".png";
  const p = path.join(BASE, "palestrantes", "recorte", png);
  if(fs.existsSync(p)) return dataURI(p);
  erro(`palestrante '${nome}' não tem recorte em palestrantes/recorte/.\n` +
       `       Rode:  node motor/tirar-fundo.js "${nome}"\n` +
       `       (a colagem cola os corpos: com a foto crua o retângulo do fundo apareceria)`);
}
// O selo de informação (data, hora, lugar) é a última objeção antes do clique: quem
// se convenceu pelos nomes ainda precisa saber QUANDO. É uma linha só — não é o chip
// de qualificação do `anuncio`, que tem outro trabalho (desqualificar).
function palInfoHTML(c){
  const ico = ICONES[c.icone];
  if(c.icone && !ico)
    console.warn(`aviso: ícone '${c.icone}' não existe — use: ${Object.keys(ICONES).join(" · ")}`);
  return `<span class="pal-info">
    ${ico ? `<span class="pal-info-ico"><svg viewBox="0 0 24 24">${ico}</svg></span>` : ""}
    <span class="pal-info-txt">${esc(c.texto)}</span>
  </span>`;
}
function corpoPalestrantes(d, marca){
  const gente = Array.isArray(d.palestrantes) ? d.palestrantes : [];
  if(!gente.length) erro("'palestrantes' precisa da lista 'palestrantes': [{ nome, foto }].");
  if(gente.length > 6)
    erro("'palestrantes' vai de 1 a 6. Acima disso os corpos se comem na fileira e o nome vira ilegível — e o nome é o ativo da peça. Divida em duas peças.");

  const n = gente.length;
  const centro = (n - 1) / 2;
  // Quanto mais gente, menor o nome — mas o piso é alto de propósito: o nome É a peça.
  const pxNome = [0, 34, 31, 29, 27, 25, 23][n];

  const LARGURA = 1080, LARGURA_UTIL = 1010, ALTURA = 1350;
  // A fileira do modelo é quase PLANA: todo mundo do mesmo tamanho, o do centro só um
  // pouco à frente. A queda forte de escala (o "V") empurrava as pontas pra longe e
  // deixava o miolo gordo — o line-up vende IGUALDADE de peso entre os nomes.
  const escalas = gente.map((p, i) => Number(p.escala) || (1 - 0.05 * Math.abs(i - centro)));
  const props = gente.map(p => proporcaoPNG(path.join(BASE, "palestrantes", "recorte",
    p.foto.replace(/\.(jpe?g|png)$/i, "") + ".png")) || 0.6);

  // O TAMANHO DA GENTE SAI DO ENCAVALAMENTO, e o encavalamento é uma FRAÇÃO — nunca um
  // número de pixels chutado no JSON. Medindo o modelo: cada pessoa ocupa ~36% da largura
  // da arte e come ~30% do vizinho. Essa razão é o que faz a fileira parecer um grupo em
  // pé no mesmo palco; forçar mais (tentei 52%) engole o das pontas e faz o braço de quem
  // está no meio atravessar a cara do vizinho, e forçar menos abre buracos entre eles.
  // Daí a conta ser invertida em relação ao instinto: não se escolhe a altura e se torce
  // pra caber — escolhe-se o APERTO, e a altura é o que sobra dele.
  const soma = escalas.reduce((s, e, i) => s + e * props[i], 0);
  const media = soma / n;

  // O QUE PRECISA CABER NA ARTE É A CABEÇA E O NOME — NÃO O OMBRO.
  // A primeira versão desta conta obrigava o CORPO INTEIRO de quem está na ponta a caber
  // dentro dos 1080, e o preço foi gente pequena com meia peça de preto vazio em volta:
  // um recorte de peito é LARGO (ombro aberto dá proporção 1.10), então exigir que ele
  // caiba inteiro estrangula a fileira toda por causa de um ombro. Ombro pode sangrar na
  // borda — ninguém compra ingresso por causa de um ombro. Cabeça e nome, não.
  //
  // Daí a conta ter duas partes independentes:
  //   PASSO — a distância entre cabeças. Sai do orçamento do NOME: as cabeças das pontas
  //   têm que sobrar meia-etiqueta pra dentro da margem, e o resto se divide igualmente.
  //   É fixo pro tamanho do grupo, e é ele que garante que dois nomes nunca se toquem.
  //   APERTO — o quanto os corpos se comem NESSE passo. É o botão do TAMANHO: mais aperto,
  //   gente maior no mesmo espaçamento de cabeças. É o que enche a arte.
  const MARGEM_PONTA = 120;              // meia-etiqueta + meia-cabeça de quem está na ponta
  const APERTO_MAX = 0.62;               // além disso a cabeça de um começa a cobrir a do vizinho
  const aperto = Math.min(d.aperto !== undefined ? Number(d.aperto) : 0.60, APERTO_MAX);
  const passo = n > 1 ? (LARGURA - 2 * MARGEM_PONTA) / (n - 1) : 0;

  // O TÍTULO GIGANTE EM CAIXA ALTA SÓ SERVE FRASE CURTA — é a mesma regra do `depoimento`,
  // e aqui ela morde ainda mais forte: em itálico 900, caixa alta come ~35% mais largura
  // que a caixa baixa. Uma linha de 45 caracteres em maiúscula cai pra 32px pra caber —
  // menor que o subtítulo. Aí ela não é mais display, é um paredão que ninguém lê.
  // Frase curta (o "OPERAÇÃO LUCRO 2X" do modelo) sobe pra caixa alta e explode.
  const titCurto = maiorLinha(d.titulo) <= 28;
  const titPx = titCurto
    ? corpoFonteLinha(d.titulo, [[13,110],[18,94],[23,80],[Infinity,68]])
    : corpoFonteLinha(d.titulo, [[36,60],[44,54],[52,48],[Infinity,42]]);
  const cta = d.cta || {};
  const fundo = resolveImagem(d.fundo);
  const info = Array.isArray(d.info) ? d.info : [];
  if(info.length > 3)
    erro("'palestrantes' aceita no máximo 3 selos em 'info' — data, hora, lugar. O quarto quebra a linha e vira rodapé de contrato.");

  // O TETO VERTICAL É A FOLGA QUE SOBRA — não um número redondo.
  // A peça tem três andares e o do meio (a fileira) é o único elástico: o lockup e o bloco
  // de venda ocupam o que ocupam. Um teto fixo ignora isso, e foi o que empurrou o botão
  // pra fora da arte quando a fileira cresceu. Então o motor ORÇA o bloco de venda —
  // quanto cada linha vai comer — e entrega o resto pras pessoas.
  // A conta do título é a mais grosseira e a mais importante: em itálico 900 um caractere
  // come ~0.52 do corpo da fonte, e é isso que diz em quantas linhas cada linha declarada
  // vai rachar. Título de 4 linhas e título de 1 linha são peças com folgas MUITO diferentes.
  const porLinha = Math.max(8, Math.floor((LARGURA - 112) / (0.52 * titPx * (titCurto ? 1.35 : 1))));
  const linhasTit = semMarcacao(d.titulo).split("\n")
    .reduce((s, l) => s + Math.max(1, Math.ceil(l.trim().length / porLinha)), 0);
  const bloco = (d.eyebrow ? 47 : 0)
              + linhasTit * titPx * (titCurto ? 1.0 : 1.08)
              + (d.texto ? 120 : 0)
              + (info.length ? 86 : 0)
              + (cta.acao ? 155 : 0)
              + (cta.obs ? 56 : 0)
              + 52;                        // o respiro do pé da arte
  const LOCKUP = 140, RESPIRO = 40;        // o ar mínimo em cima das cabeças
  const folga = Math.max(240, ALTURA - LOCKUP - RESPIRO - bloco);
  const alturaPalco = Math.min(
    n > 1 ? Math.floor(passo / ((1 - aperto) * media)) : Math.floor(LARGURA_UTIL / media),
    Number(d.altura) || folga);

  // ONDE CADA UM PISA — em px, calculado, não chutado. O nome mora numa camada separada
  // (senão herdaria o z-index do dono e sumiria atrás do vizinho da frente), e pra se
  // alinhar ao dono ele precisa saber onde o dono está. Por isso a fileira não é mais um
  // `flex` com margem negativa: o motor resolve a conta e posiciona os dois pelo mesmo x.
  const centrosX = gente.map((_, i) => LARGURA / 2 + (i - centro) * passo);

  const nomes = [];
  const vultos = gente.map((p, i) => {
    const rosto = resolveRosto(p.foto);
    const alt = Math.round(alturaPalco * escalas[i]);
    // `x` (em % da largura) continua valendo: é a saída pra colagem manual, quando a
    // fileira calculada não serve. Sem ele, quem manda é a conta acima.
    const cx = p.x !== undefined ? Number(p.x) / 100 * LARGURA : centrosX[i];
    const sobe = Number(p.sobe) || 0;
    const z = p.z !== undefined ? Number(p.z) : 10 - Math.round(Math.abs(i - centro) * 2);
    // O plano sai do próprio z: quem a peça já colocou atrás recebe menos luz e menos foco.
    // Sem isso as cinco fotos chegam todas nítidas e igualmente iluminadas no mesmo plano,
    // e o olho lê o grupo como recorte colado — não como gente no mesmo palco.
    const plano = z >= 10 ? "" : z >= 7 ? " plano-meio" : " plano-fundo";

    // O NOME POUSA NO PEITO DO DONO, não acima da cabeça. É a virada do modelo, e ela
    // não é estética: a etiqueta em cima da cabeça precisa de um vão livre ali, e na
    // colagem cheia esse vão não existe — ela caía na testa de quem estava atrás. Aqui
    // o nome desce pra faixa em que a própria foto já está dissolvendo no fundo: sempre
    // sobra corpo embaixo do queixo, então sempre há lugar. `nomeem` (fração da altura
    // da pessoa) e `tagsobe`/`tagx` (px) fazem o ajuste fino.
    const baixo = sobe + Math.round(alt * (p.nomeem !== undefined ? Number(p.nomeem) : 0.15))
                + (Number(p.tagsobe) || 0);
    const [primeiro, ...resto] = String(p.nome ?? "").trim().split(/\s+/);
    nomes.push(`<span class="pal-nome" style="left:${Math.round(cx + (Number(p.tagx) || 0))}px;bottom:${baixo}px;font-size:${pxNome}px">
      <span class="n1">${esc(primeiro)}</span>${resto.length ? `<span class="n2">${esc(resto.join(" "))}</span>` : ""}
    </span>`);

    return `<div class="pal-vulto${plano}" style="z-index:${z};left:${Math.round(cx)}px;bottom:${sobe}px">
      <img style="height:${alt}px" src="${rosto}" alt="${esc(p.nome)}">
    </div>`;
  }).join("");

  return `${fundo ? `<div class="pal-fundo" style="background-image:url('${fundo}')"></div>` : ""}
    <div class="pal-fundoveu"></div>
    <div class="pal-marca">${seloHTML(marca, "palestrantes")}</div>
    <div class="pal-palco" style="height:${alturaPalco}px">
      <div class="pal-chao"></div>
      <div class="pal-grupo">${vultos}
        <div class="pal-grade"></div>
        <div class="pal-nomes">${nomes.join("")}</div>
      </div>
    </div>
    <div class="pal-baixo">
      ${d.eyebrow ? `<span class="eyebrow">${esc(d.eyebrow)}</span>` : ""}
      <div class="pal-titulo${titCurto ? " curto" : ""}" style="font-size:${titPx}px">${linhas(d.titulo)}</div>
      ${d.texto ? `<p class="pal-sub">${realce(d.texto)}</p>` : ""}
      ${info.length ? `<div class="pal-infos">${info.map(palInfoHTML).join("")}</div>` : ""}
      ${cta.acao ? `<span class="botao">${esc(semMarcacao(cta.acao))}</span>` : ""}
      ${cta.obs ? `<span class="ressalva">${esc(cta.obs)}</span>` : ""}
    </div>`;
}

// ---------- carrossel: "pela primeira vez" (revelação de line-up) ----------
// Um palestrante por slide, no formato do modelo: uma JANELA de cor com o rosto
// dentro e o corpo ESTOURANDO por baixo dela, sobre a foto do evento. É o estouro
// que faz o retrato virar peça — sem ele sobra um retângulo com foto dentro.
//
// O estouro EXIGE recorte, pelo mesmo motivo do line-up: a foto crua traria o
// retângulo do fundo junto, e ele apareceria justamente na parte que sangra.
// Quando a foto não se deixa recortar (terno escuro em fundo escuro é o caso que o
// algoritmo não vence — ver palestrantes/RECORTES.md), o slide declara
// `"recorte": false` e a foto passa a preencher a janela, sem sangrar. É pior, e é
// de propósito que fica pior: é o sinal de que falta pedir o PNG recortado à mão.
function resolveRetrato(p){
  const cru = path.join(BASE, "palestrantes", p.foto);
  if(p.recorte === false){
    if(!fs.existsSync(cru)) erro(`palestrante '${p.foto}' não está em palestrantes/.`);
    return { src: dataURI(cru), recortado: false };
  }
  const png = p.foto.replace(/\.(jpe?g|png)$/i, "") + ".png";
  const rec = path.join(BASE, "palestrantes", "recorte", png);
  if(fs.existsSync(rec)) return { src: dataURI(rec), recortado: true };
  erro(`palestrante '${p.foto}' não tem recorte em palestrantes/recorte/.\n` +
       `       Rode:  node motor/tirar-fundo.js "${p.foto}"\n` +
       `       (ou declare "recorte": false no slide, e a foto fica presa dentro da janela)`);
}
// O carimbo é a promessa da peça, dita em círculo: "pela primeira vez no RM Summit".
// Ele existe pra que a frase não precise ser repetida em texto corrido em todo slide.
// UMA volta só. Duas voltas de texto no mesmo círculo obrigam a fonte a encolher pra
// caber, e o carimbo — que existe pra ser LIDO — vira um risco em volta do monograma.
function carimboHTML(texto, inicial){
  const volta = `${texto} · `.toUpperCase();
  return `<svg class="est-carimbo" viewBox="0 0 200 200">
    <circle cx="100" cy="100" r="98" fill="#0a0a0a" stroke="#f4b661" stroke-width="2"/>
    <circle cx="100" cy="100" r="86" fill="none" stroke="#f4b661" stroke-width="1" opacity=".4"/>
    <defs><path id="volta" d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0"/></defs>
    <text fill="#f4b661" font-family="Montserrat" font-size="17" font-weight="800">
      <textPath href="#volta" startOffset="0" textLength="452" lengthAdjust="spacing">${esc(volta)}</textPath>
    </text>
    <text x="100" y="117" text-anchor="middle" fill="#f4b661"
          font-family="Montserrat" font-size="46" font-weight="900">${esc(inicial)}</text>
  </svg>`;
}
// A barra de ações do Instagram, desenhada. É o que o modelo faz: ela diz ao olho
// "isto acaba aqui, agora aja" sem gastar uma linha de copy com isso.
// ⚠️ Imitar a interface do Meta é a categoria de criativo que ele mais reprova. Num
// carrossel ORGÂNICO (link na bio) isso não é anúncio e não passa por revisão — mas
// se um dia esta peça virar tráfego pago, a barra é o primeiro item a sair.
const ACOES_IG = `<div class="est-acoes">
  <svg viewBox="0 0 24 24"><path d="M12 20.5C7 17.5 3 14.3 3 10.2 3 7.3 5.2 5.2 7.9 5.2c1.6 0 3.2.8 4.1 2.1.9-1.3 2.5-2.1 4.1-2.1 2.7 0 4.9 2.1 4.9 5 0 4.1-4 7.3-9 10.3z"/></svg>
  <svg viewBox="0 0 24 24"><path d="M12 3.5c-4.7 0-8.5 3.2-8.5 7.2 0 2.3 1.3 4.3 3.3 5.6v4l3.9-2.5c.4.1.9.1 1.3.1 4.7 0 8.5-3.2 8.5-7.2s-3.8-7.2-8.5-7.2z"/></svg>
  <svg viewBox="0 0 24 24"><path d="M21.5 3.2 2.8 10.1l6.6 2.6 2.6 6.6 9.5-16.1z"/><path d="m9.4 12.7 5.1-5.1"/></svg>
  <svg class="fim" viewBox="0 0 24 24"><path d="M6 3.5h12v17l-6-4.6-6 4.6z"/></svg>
</div>`;
// A moldura de cantos chanfrados é a assinatura gráfica do modelo — é ela que
// amarra os três layouts como um carrossel só. Vai em SVG porque borda e clip-path
// não convivem: o clip corta a própria borda nas diagonais (ver o chip do anúncio).
// A borda de cima passa ABAIXO do logo, não atrás dele: no modelo o lockup fica fora da
// moldura, e uma linha cruzando o wordmark é o tipo de defeito que só aparece na imagem
// — no console tudo "gerou". Por isso ela desce nos slides que levam logo (capa e fecho).
// No CARD não há logo: quem assina é o carimbo, e aí a moldura sobe pro topo — se ficasse
// no mesmo lugar, a linha cortaria a janela dourada no meio.
function moldura(topo){
  const q = topo + 58;                            // o chanfro do canto
  return `<svg class="est-moldura" viewBox="0 0 1080 1350" preserveAspectRatio="none">
    <path d="M30 ${q} L88 ${topo} L992 ${topo} L1050 ${q} L1050 1262 L992 1320 L88 1320 L30 1262 Z"
          fill="none" stroke="currentColor" stroke-width="2.5"/>
  </svg>`;
}
const MOLDURA = moldura(128);                     // capa e fecho: abaixo do logo
const MOLDURA_CARD = moldura(34);                 // card: acima da janela
function corpoEstreia(d, marca, pasta){
  const carimbo = carimboHTML(d.carimbo || `Pela primeira vez no ${marca.nome}`, d.inicial || "RM");

  // CAPA — a grade de rostos. O ativo são os NOMES: por isso cada célula leva a
  // etiqueta do dono dela, mesmo que o modelo (que só mostra caras) não leve.
  if(Array.isArray(d.grade) && d.grade.length){
    const px = corpoFonteLinha(d.titulo, [[20,82],[28,72],[36,62],[Infinity,54]]);
    return `${MOLDURA}${seloHTML(marca, "estreia")}
      <div class="est-caixa">
        <div class="est-caixa-t" style="font-size:${px}px">${linhas(d.titulo)}</div>
        ${d.texto ? `<p class="est-caixa-s">${realce(d.texto)}</p>` : ""}
      </div>
      <div class="est-grade">${d.grade.map(p => {
        const r = resolveRetrato(p);
        return `<div class="est-cel">
          <img class="${r.recortado ? "recorte" : "cru"}" src="${r.src}" alt="${esc(p.nome)}">
          <span class="est-cel-tag">${esc(p.nome)}</span>
        </div>`;
      }).join("")}</div>`;
  }

  // FECHO — a cor chapada. Aqui o logo dourado sumiria no dourado do fundo: ele
  // entra no chip preto (o lockup padrão da casa), que é o que o modelo faz com
  // o logo preto dele sobre a cor.
  if(!d.palestrante){
    const px = corpoFonteLinha(d.titulo, [[18,92],[24,80],[30,70],[Infinity,60]]);
    const cta = d.cta || {};
    return `${MOLDURA}${seloHTML(marca, "estreia")}
      <div class="est-fecho-txt">
        <div class="est-fecho-t" style="font-size:${px}px">${linhas(d.titulo)}</div>
        ${d.texto ? `<p class="est-fecho-s">${realce(d.texto)}</p>` : ""}
        ${cta.acao ? `<p class="est-fecho-cta">${realce(cta.acao)}</p>` : ""}
      </div>
      ${ACOES_IG}`;
  }

  // CARD — o palestrante. `altura` e `desce` são o ajuste fino do enquadramento:
  // cada recorte corta a pessoa num lugar (um na cintura, outro no peito), então
  // não existe um número que sirva aos seis. A cabeça tem que cair DENTRO da janela.
  const p = d.palestrante;
  const r = resolveRetrato(p);
  const alt = Number(p.altura) || 720;
  // A bio mais longa é que manda: no primeiro teste a do Gonçalves (354 caracteres)
  // encostou na borda de baixo. Aqui a fonte cede antes de a peça estourar.
  const px = corpoFonte(d.texto, [[280,32],[340,30],[400,28],[Infinity,26]]);
  const fundo = resolveImagem(d.fundo, pasta);
  return `${fundo ? `<div class="est-fundo" style="background-image:url('${fundo}')"></div>` : ""}
    <div class="est-fundoveu"></div>
    ${MOLDURA_CARD}
    <div class="est-palco">
      <div class="est-janela">
        ${r.recortado ? "" : `<div class="est-preso" style="background-image:url('${r.src}')"></div>`}
      </div>
      ${r.recortado ? `<img class="est-figura" style="height:${alt}px;bottom:${Number(p.desce) || 0}px"
                            src="${r.src}" alt="${esc(p.nome)}">` : ""}
      ${carimbo}
    </div>
    <div class="est-quem">
      <div class="est-nome">${esc(p.nome)}</div>
      ${d.texto ? `<div class="est-bios" style="font-size:${px}px">${paragrafos(d.texto, "est-bio")}</div>` : ""}
    </div>`;
}
// A capa, o card e o fecho são o MESMO carrossel em três registros — não três tipos.
// O que muda entre eles é o que o slide traz: grade de rostos, um palestrante, ou nada
// (o fecho). A classe sai daí, e é ela que troca o fundo: preto, foto, dourado chapado.
function varianteEstreia(d){
  return Array.isArray(d.grade) && d.grade.length ? "est-capa"
       : d.palestrante ? "est-card" : "est-fecho";
}

// ---------- estático: virada de lote ----------
// Esta peça não vende o evento: vende o RELÓGIO. Quem a lê já sabe o que é o Summit
// — o que falta é a data em que ele fica mais caro. Por isso ela é uma TABELA de
// preços, e não uma frase de efeito: o ativo é o número velho riscado ao lado do novo.
//
// A SIRENE é o gatilho. Ela grita "alarme" antes de a primeira palavra ser lida, e é
// o que faz a peça parar o scroll — o título sozinho seria só mais um aviso. Vai em
// SVG porque emoji depende da fonte do sistema: o mesmo JSON renderizaria diferente
// em outra máquina, e a peça é gerada, não desenhada à mão.
const SIRENE = `<svg class="lote-alerta" viewBox="0 0 320 250" style="height:HH">
  <defs>
    <linearGradient id="cupula" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff6b5e"/><stop offset="55%" stop-color="#e0271c"/>
      <stop offset="100%" stop-color="#9d100a"/></linearGradient>
    <linearGradient id="base" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a4a52"/><stop offset="100%" stop-color="#15151a"/></linearGradient>
    <linearGradient id="aviso" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffc24d"/><stop offset="100%" stop-color="#f08a1c"/></linearGradient>
  </defs>
  <!-- os raios: é o que diz que a sirene está LIGADA, e não apenas em cima da mesa -->
  <g stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".92">
    <path d="M62 92 L38 74"/><path d="M76 58 L64 30"/><path d="M108 38 L104 8"/>
  </g>
  <!-- o triângulo entra ATRÁS da cúpula, encavalado: dois ícones lado a lado seriam
       dois assuntos; encavalados são um só — "alerta" -->
  <path d="M232 46 L308 182 Q314 194 300 194 L164 194 Q150 194 156 182 Z"
        fill="url(#aviso)" stroke="#8a4a06" stroke-width="4" stroke-linejoin="round"/>
  <path d="M232 96 v46" stroke="#3a1f02" stroke-width="15" stroke-linecap="round"/>
  <circle cx="232" cy="168" r="9" fill="#3a1f02"/>
  <path d="M100 196 V150 a58 46 0 0 1 116 0 v46 Z" fill="url(#cupula)"/>
  <ellipse cx="136" cy="150" rx="18" ry="26" fill="#fff" opacity=".38"/>
  <rect x="86" y="192" width="144" height="34" rx="12" fill="url(#base)"/>
  <rect x="72" y="222" width="172" height="22" rx="10" fill="#0d0d10"/>
</svg>`;
// "R$ 1.497,00" -> moeda | inteiro | centavos. A hierarquia do varejo mora nessa
// separação: o olho tem que bater no número redondo, não no "R$" nem no ",00".
function fatiaPreco(v){
  const m = String(v ?? "").trim().match(/^([^\d]*)([\d.\s]*\d)(,\d+)?\s*$/);
  if(!m) return { moeda: "", num: String(v ?? "").trim(), cent: "" };
  return { moeda: m[1].trim(), num: m[2].trim(), cent: m[3] || "" };
}
function corpoLote(d, marca){
  const ings = Array.isArray(d.ingressos) ? d.ingressos : [];
  if(!ings.length) erro("'lote' precisa de 'ingressos': [{ nome, de, por }] — a peça É a tabela de preço.");
  if(ings.length > 3)
    erro("'lote' vai de 1 a 3 ingressos. Com quatro colunas o número encolhe até não ser mais lido de relance — e o número é a peça.");

  const precos = ings.map(g => fatiaPreco(g.por));
  // UM tamanho para TODOS os preços, tirado do mais comprido. Dimensionar cada
  // coluna sozinha faria "R$ 597" sair maior que "R$ 1.497" — e aí o ingresso caro
  // pareceria o barato. O preço só se compara se os dois têm o mesmo corpo.
  const digitos = Math.max(...precos.map(p => p.num.length));
  const largo = corpoFonte("x".repeat(digitos + (ings.length - 1) * 2),
    [[4,112],[6,94],[8,78],[Infinity,64]]);
  const pxNome = corpoFonteLinha(ings.map(g => g.nome).join("\n"),
    [[9,60],[13,52],[Infinity,44]]);
  const pxTit = corpoFonteLinha(d.titulo, [[8,148],[12,122],[16,100],[Infinity,84]]);

  // O fundo da virada raramente é foto de evento: é a CIDADE (a Paulista, aqui) — e
  // cidade mora em `imagens/`, não no acervo. Procura lá primeiro e cai no acervo
  // depois, então os dois caminhos servem.
  const foto = resolveImagem(d.foto);
  const alerta = d.alerta === false ? ""
    : SIRENE.replace("HH", `${Number(d.alerta) || 200}px`);

  const colunas = ings.map((g, i) => {
    const p = precos[i];
    // "PARA" só existe se houver um "DE" — a ponte liga dois preços. Sozinha, ela
    // anunciaria uma virada que a copy não fez: aqui o preço é o de hoje, não o novo.
    return `<div class="lote-ing">
      <div class="lote-nome" style="font-size:${pxNome}px">${linhas(g.nome)}</div>
      ${g.de ? `<span class="lote-de" style="font-size:${Math.round(largo * .34)}px">De <span class="risco">${esc(g.de)}</span></span>
                <span class="lote-para" style="font-size:${Math.round(largo * .5)}px">${esc(d.ponte || "Para")}</span>` : ""}
      <span class="lote-por"${g.de ? "" : ` style="margin-top:26px"`}>
        ${p.moeda ? `<span class="moeda" style="font-size:${Math.round(largo * .52)}px">${esc(p.moeda)}</span>` : ""}
        <span class="num" style="font-size:${largo}px">${esc(p.num)}</span>
        ${p.cent ? `<span class="cent" style="font-size:${Math.round(largo * .44)}px">${esc(p.cent)}</span>` : ""}
      </span>
      ${g.parcelas ? `<span class="lote-parcela" style="font-size:${
        corpoFonteLinha(g.parcelas, [[18,34],[24,30],[Infinity,26]])}px">${esc(g.parcelas)}</span>` : ""}
    </div>`;
  }).join("");

  return `${foto ? `<div class="foto ${["topo","baixo","esquerda","direita"].includes(d.foco) ? d.foco : ""}"
                        style="background-image:url('${foto}')"></div>
            <div class="veu ${["leve","medio","forte"].includes(d.veu) ? d.veu : "forte"}"></div>` : ""}
    <div class="lote-card">
      ${alerta}
      <div class="lote-titulo" style="font-size:${pxTit}px">${linhas(d.titulo)}</div>
      ${d.aviso ? `<div class="lote-aviso" style="font-size:${
        corpoFonteLinha(d.aviso, [[16,64],[24,54],[Infinity,44]])}px">${realce(d.aviso)}</div>` : ""}
      ${d.texto ? `<p class="lote-sub" style="font-size:${
        corpoFonte(d.texto, [[40,42],[60,36],[Infinity,31]])}px">${realce(d.texto)}</p>` : ""}
      <div class="lote-grade">${colunas}</div>
      ${d.nota ? `<p class="lote-nota" style="font-size:${
        corpoFonte(d.nota, [[60,29],[90,26],[Infinity,23]])}px">${realce(d.nota)}</p>` : ""}
      <div class="lote-pe">
        ${seloHTML(marca, "lote")}
        ${d.rodape ? `<span class="lote-datas" style="font-size:${
          corpoFonteLinha(d.rodape, [[26,40],[36,34],[Infinity,28]])}px">${esc(d.rodape)}</span>` : ""}
        ${ctaHTML(d.cta)}
      </div>
    </div>`;
}

const CORPOS = {
  padrao: corpoPadrao,
  contagem: corpoContagem,
  depoimento: corpoDepoimento,
  provocacao: corpoProvocacao,
  urgencia: corpoUrgencia,
  carrossel: corpoCarrossel,
  anuncio: corpoAnuncio,
  caricato: corpoCaricato,
  palestrantes: corpoPalestrantes,
  estreia: corpoEstreia,
  lote: corpoLote,
  thread: corpoThread,
  legenda: corpoLegenda,
};

function slideHTML(d, marca, perfil, pasta){
  const tipo = d.tipo || "padrao";
  if(!TIPOS.includes(tipo)) erro(`tipo '${tipo}' desconhecido — use: ${TIPOS.join(" · ")}`);
  const selo = SELO[tipo];
  const nativo = NATIVOS.includes(tipo);          // thread/legenda: visual de conteúdo orgânico
  const fecha = CORPO_FECHA.has(tipo);            // anuncio/caricato: o corpo monta o próprio rodapé
  const impacto = !nativo && !fecha && tipo !== "padrao";
  // thread nasce no dark mode do X: é o fundo do print que a peça imita.
  // Anúncio e caricato também nascem escuros — é o fundo em que o dourado acende.
  const escuroPorPadrao = impacto || fecha || tipo === "thread";
  const tema = d.tema === "escuro" ? "escuro" : d.tema === "claro" ? "claro" : escuroPorPadrao ? "escuro" : "claro";
  // Quem fecha o próprio corpo também resolve a própria imagem, no lugar certo dela:
  // no anúncio a foto é uma FAIXA embaixo, não um fundo com véu por cima de tudo.
  const foto = (!nativo && !fecha) ? resolveFoto(d.foto) : null;
  const imagens = tipo === "thread" ? resolveImagens(d.imagem, pasta) : [];
  const semImg = tipo === "thread" && !imagens.length;   // card centrado no preto
  const variante = tipo === "estreia" ? varianteEstreia(d) : "";

  return `<div class="slide ${tema} ${tipo} ${variante} ${impacto ? "impacto" : ""} ${nativo ? "nativo" : ""} ${semImg ? "sem-img" : ""}">
    ${foto ? `<div class="foto ${["topo","baixo","esquerda","direita"].includes(d.foco) ? d.foco : ""}"
                   style="background-image:url('${foto}')"></div>
             <div class="veu ${["leve","medio","forte"].includes(d.veu) ? d.veu : "medio"}"></div>` : ""}
    ${d.pagina ? `<span class="paginador">${esc(d.pagina)}</span>` : ""}
    ${selo === "topo" ? seloHTML(marca, "topo") : ""}
    ${tipo === "thread" ? perfilHTML(perfil) : ""}
    <div class="corpo ${impacto ? "centro" : ""}">
      ${CORPOS[tipo](d, marca, pasta)}
      ${impacto ? ctaHTML(d.cta) : ""}
    </div>
    ${imagens.length ? `<div class="thread-imgs ${imagens.length === 2 ? "duas" : ""} ${["topo","baixo","esquerda","direita"].includes(d.foco) ? d.foco : ""}">
      ${imagens.map(src => `<img src="${src}" alt="">`).join("")}
    </div>` : ""}
    ${selo === "rodape" ? seloHTML(marca, "rodape")
      : (!impacto && !nativo && !fecha) ? ctaHTML(d.cta) : ""}
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

  // Uma pasta por carrossel: `"pasta": "copa-do-mundo"` -> imagens/copa-do-mundo/.
  // Erra o nome da pasta e a peça sairia inteira sem imagem, sem ninguém notar até
  // olhar o PNG — melhor parar aqui e dizer.
  const pasta = (dados.pasta || "").trim() || null;
  if(pasta && !fs.existsSync(path.join(BASE, "imagens", pasta)))
    erro(`a peça declara "pasta": "${pasta}", mas imagens/${pasta}/ não existe. Crie a pasta e despeje as imagens do carrossel lá.`);

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
    const perfil = resolvePerfil(slide.perfil || dados.perfil);
    const html = `<!doctype html><meta charset="utf-8">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800;900&family=Roboto:wght@400;500;700;900&display=swap">
      <style>${tokens}\n${css}</style>${slideHTML({ ...slide, tipo: slide.tipo || dados.tipo }, marca, perfil, pasta)}`;
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);   // garante as fontes carregadas antes do print
    const el = await page.$(".slide");
    const saida = path.join(BASE, "saida", `${nome}-${String(i).padStart(2,"0")}.png`);
    await el.screenshot({ path: saida });
    console.log("gerado:", path.relative(BASE, saida));
  }
  await browser.close();
})();
