// imagem.js — gera imagem no Gemini e salva na pasta do carrossel.
//
// Por que existe: às vezes o slide pede uma imagem que não existe e não dá pra
// fotografar — uma cena histórica, uma metáfora, um render. O acervo (`fotos/`)
// é o evento, e `imagens/` é o que o dono despeja. Isto é a terceira fonte, e a
// última: se existe foto de verdade, ela ganha. Ver o rodapé deste arquivo.
//
// Uso:
//   node motor/imagem.js "<prompt>" <pasta>/<nome.png> [modelo] [proporcao] [de:<foto>]
//   node motor/imagem.js "sala de tribunal vazia ao amanhecer" copa-do-mundo/tribunal.png
//   node motor/imagem.js "..." odisseia/mar.png pro          ← modelo melhor, mais caro
//   node motor/imagem.js "..." odisseia/mar.png pro 1:1      ← e quadrado
//   node motor/imagem.js modelos                             ← o cardápio e os preços
//
// `de:<foto>` — TRATAR uma foto que já existe em vez de inventar do zero:
//   node motor/imagem.js "troque o fundo por um salão escuro" summit/rafael.png de:rafael-sorriso.jpg
// A foto sai de `imagens/` ou de `fotos/` (procura nessa ordem, como o resto do motor).
// É ISTO que se usa quando a imagem tem gente de verdade: o rosto vem da FOTO, não do
// modelo. Prompt de texto puro não sabe quem é o Rafael e devolve um estranho — ver o
// rodapé deste arquivo.
//
// Os três últimos vão em QUALQUER ordem: `n:n` é proporção, `de:` é a foto de origem,
// o resto é modelo. Padrão: `flash` em 4:5 (o slide do feed). Pra mudar o padrão sem
// mexer no código, ponha GEMINI_MODELO=<apelido> no .env.
//
// A chave mora em marketing-instagram/.env (GEMINI_API_KEY=...), que o .gitignore
// barra. Pegar em https://aistudio.google.com/apikey

const fs = require("fs");
const path = require("path");

const BASE = path.resolve(__dirname, "..");
const DIR_IMAGENS = path.join(BASE, "imagens");
const ENV = path.join(BASE, ".env");

// O CARDÁPIO. Apelido curto → modelo de verdade, porque o nome real muda de versão
// toda hora e ninguém decora "gemini-3.1-flash-image". `node motor/imagem.js modelos`
// confere este cardápio contra o que a chave enxerga HOJE e acusa o que saiu do ar.
//
// `familia` decide o caminho de código, e não é detalhe: os gemini-* falam
// `generateContent`, os imagen-* falam `predict` — endpoint, corpo e resposta
// diferentes. Conferido em 2026-07-16 pelo supportedGenerationMethods de cada um.
const MODELOS = {
  flash:       { id: "gemini-3.1-flash-image",      familia: "gemini", nota: "padrão. Rápido e barato — serve pra ilustração de slide" },
  pro:         { id: "gemini-3-pro-image",          familia: "gemini", nota: "o melhor da casa, e o mais caro. Use quando a imagem FOR a peça" },
  lite:        { id: "gemini-3.1-flash-lite-image", familia: "gemini", nota: "o mais barato. Pra rascunho e teste de ideia" },
  "2.5":       { id: "gemini-2.5-flash-image",      familia: "gemini", nota: "a geração antiga. Só se a nova sair pior no seu caso" },
  imagen:      { id: "imagen-4.0-generate-001",     familia: "imagen", nota: "fotorrealismo. NÃO faz 4:5 — o corte pro slide fica por sua conta" },
  "imagen-ultra": { id: "imagen-4.0-ultra-generate-001", familia: "imagen", nota: "o Imagen caprichado. Mesma limitação de proporção" },
  "imagen-fast":  { id: "imagen-4.0-fast-generate-001",  familia: "imagen", nota: "o Imagen rápido. Mesma limitação de proporção" },
};
const PADRAO = "flash";

// Proporção é POR FAMÍLIA. O Imagen 4 não tem 4:5 — e 4:5 é o formato do slide,
// então pedir Imagen pro feed significa recortar depois, à mão. Aceitar calado e
// devolver 3:4 entregaria uma imagem que não encaixa e ninguém ia entender por quê.
const PROPORCOES = {
  gemini: ["1:1", "4:5", "3:4", "4:3", "16:9", "9:16", "2:3", "3:2", "5:4", "21:9"],
  imagen: ["1:1", "3:4", "4:3", "16:9", "9:16"],
};

// Sai sem estrondo: marca o código e deixa a pilha desenrolar até o catch lá
// embaixo. `process.exit` com a conexão do fetch ainda viva faz o libuv cuspir um
// "Assertion failed" POR CIMA da mensagem — e aí o dono lê um crash onde havia
// um recado.
const SAIDA = Symbol("saida");
function encerrar(codigo) {
  process.exitCode = codigo;
  throw SAIDA;
}

// .env mínimo: CHAVE=valor, uma por linha. Sem dependência — é um arquivo de
// duas linhas, não vale um pacote.
function lerEnv(nome) {
  if (!fs.existsSync(ENV)) return null;
  for (const linha of fs.readFileSync(ENV, "utf8").split(/\r?\n/)) {
    const m = linha.match(new RegExp(`^\\s*${nome}\\s*=\\s*(.+?)\\s*$`));
    if (m && m[1]) return m[1].replace(/^["']|["']$/g, "");
  }
  return null;
}

function lerChave() {
  const chave = lerEnv("GEMINI_API_KEY");
  if (chave) return chave;
  console.error(`erro: GEMINI_API_KEY vazia ou ausente em ${path.relative(BASE, ENV)}`);
  console.error(`\nCrie/edite o arquivo com a linha:\n  GEMINI_API_KEY=<sua chave>`);
  console.error(`A chave sai de https://aistudio.google.com/apikey (o .gitignore já barra o .env).`);
  encerrar(1);
}

function escolherModelo(apelido) {
  const escolha = apelido || lerEnv("GEMINI_MODELO") || PADRAO;
  const m = MODELOS[escolha.toLowerCase()];
  if (m) return { apelido: escolha.toLowerCase(), ...m };
  // Nome completo também vale: quando o Google lançar um modelo que não está no
  // cardápio, o dono não fica preso esperando eu editar este arquivo.
  if (escolha.includes("-")) {
    const familia = escolha.startsWith("imagen") ? "imagen" : "gemini";
    console.log(`(modelo fora do cardápio: "${escolha}" — tratando como família ${familia})`);
    return { apelido: escolha, id: escolha, familia, nota: "" };
  }
  console.error(`erro: não conheço o modelo "${escolha}".`);
  console.error(`\nApelidos: ${Object.keys(MODELOS).join(" · ")}`);
  console.error(`Ou passe o nome completo. O cardápio inteiro: node motor/imagem.js modelos`);
  encerrar(1);
}

async function api(caminho, opcoes = {}) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/${caminho}`, {
    ...opcoes,
    // `connection: close` — sem isso o socket fica vivo por keep-alive e o Node
    // segura o processo aberto uns segundos depois do trabalho ter acabado.
    headers: { "x-goog-api-key": lerChave(), "content-type": "application/json", "connection": "close", ...opcoes.headers },
  });
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = corpo?.error?.message || `HTTP ${r.status}`;
    console.error(`\nGemini recusou: ${msg}\n`);
    if (r.status === 400 && /API key/i.test(msg)) {
      console.error(`A chave em .env parece inválida. Confira em https://aistudio.google.com/apikey\n`);
    }
    // "limit: 0" não é cota estourada — é cota que nunca existiu. Gerar imagem não
    // está na camada gratuita; sem faturamento no projeto, NENHUMA espera resolve.
    // Tratar os dois como a mesma coisa manda o dono esperar por nada.
    else if (r.status === 429 && /limit: 0/.test(msg)) {
      console.error(`Gerar imagem não está na camada gratuita desta chave (limit: 0).`);
      console.error(`Não é cota estourada — esperar não resolve. Ative o faturamento no projeto`);
      console.error(`da chave em https://aistudio.google.com/apikey (Plan: Free → Set up billing).\n`);
    }
    else if (r.status === 429) console.error(`Cota estourada por minuto/dia. Espere o tempo que a mensagem indica.\n`);
    else if (r.status === 404) console.error(`O Google aposentou ou renomeou este modelo. Rode: node motor/imagem.js modelos\n`);
    else if (r.status === 503) console.error(`Modelo sobrecarregado no Google. É temporário — tente de novo em alguns minutos.\n`);
    encerrar(1);
  }
  return corpo;
}

// A foto de origem. Mesma ordem de busca do resto do motor: `imagens/` (o que o dono
// despeja) ganha do acervo `fotos/`.
function acharFoto(rel) {
  for (const dir of [DIR_IMAGENS, path.join(BASE, "fotos")]) {
    const p = path.join(dir, rel);
    if (fs.existsSync(p)) return p;
  }
  console.error(`erro: não achei "${rel}" nem em imagens/ nem em fotos/.`);
  console.error(`  o caminho é relativo a essas pastas — ex.: de:rafael-sorriso.jpg`);
  console.error(`  ou  de:"FOTOS/DIA 1/0017_xxx.jpg"`);
  encerrar(1);
}

function lerFoto(rel) {
  const p = acharFoto(rel);
  const ext = path.extname(p).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  return { inlineData: { mimeType: mime, data: fs.readFileSync(p).toString("base64") } };
}

// Os dois caminhos. Cada família devolve a imagem num lugar diferente do JSON;
// quem chama só quer o base64.
async function gerar(modelo, prompt, proporcao, origem) {
  if (modelo.familia === "imagen") {
    const r = await api(`models/${modelo.id}:predict`, {
      method: "POST",
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: proporcao },
      }),
    });
    return {
      dados: r.predictions?.[0]?.bytesBase64Encoded,
      motivo: r.predictions?.[0]?.raiFilteredReason || "desconhecido",
    };
  }
  // Com foto de origem, ela vai ANTES do texto: a ordem importa pro modelo — primeiro
  // ele vê o que tem em mãos, depois o que fazer com aquilo.
  const parts = origem ? [lerFoto(origem), { text: prompt }] : [{ text: prompt }];
  const r = await api(`models/${modelo.id}:generateContent`, {
    method: "POST",
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: proporcao } },
    }),
  });
  const candidato = r.candidates?.[0];
  return {
    dados: candidato?.content?.parts?.find(p => p.inlineData)?.inlineData?.data,
    motivo: candidato?.finishReason || r.promptFeedback?.blockReason || "desconhecido",
  };
}

async function principal() {
  // `modelos` — o cardápio, conferido contra o que a chave enxerga AGORA.
  if (process.argv[2] === "modelos") {
    const { models = [] } = await api("models");
    const vivos = new Set(models.map(m => m.name.replace("models/", "")));
    const padrao = lerEnv("GEMINI_MODELO") || PADRAO;

    console.log(`\nModelos que você pode pedir (apelido → modelo):\n`);
    for (const [apelido, m] of Object.entries(MODELOS)) {
      const marca = apelido === padrao.toLowerCase() ? " ← padrão" : "";
      const morto = vivos.has(m.id) ? "" : "  ⚠️ SUMIU da API";
      console.log(`  ${apelido.padEnd(14)}${m.id.padEnd(32)}${morto || marca}`);
      console.log(`  ${" ".repeat(14)}${m.nota}\n`);
    }
    console.log(`Pra trocar de modelo numa peça só:  node motor/imagem.js "<prompt>" <pasta>/<n.png> pro`);
    console.log(`Pra trocar o padrão de vez:         GEMINI_MODELO=pro   no .env\n`);

    const fora = [...vivos].filter(id => /image|imagen/i.test(id) && !Object.values(MODELOS).some(m => m.id === id));
    if (fora.length) {
      console.log(`A chave também enxerga estes, fora do cardápio (dá pra passar o nome completo):\n`);
      for (const id of fora) console.log(`  ${id}`);
      console.log();
    }
    return;
  }

  const [prompt, destino, ...resto] = process.argv.slice(2);
  if (!prompt || !destino) {
    console.error(`uso: node motor/imagem.js "<prompt>" <pasta>/<nome.png> [modelo] [proporcao] [de:<foto>]`);
    console.error(`     node motor/imagem.js modelos`);
    encerrar(1);
  }

  // Ordem livre: `n:n` é proporção, `de:` é a foto de origem, o resto é modelo.
  // Obrigar a ordem certa só rende erro besta na pressa.
  const proporcao = resto.find(a => /^\d+:\d+$/.test(a)) || "4:5";
  const origem = (resto.find(a => a.startsWith("de:")) || "").slice(3) || null;
  const modelo = escolherModelo(resto.find(a => !/^\d+:\d+$/.test(a) && !a.startsWith("de:")));

  // Imagen só faz texto→imagem por `predict`. Aceitar `de:` e ignorar a foto calado
  // devolveria uma imagem inventada onde o dono pediu a foto DELE tratada — o erro
  // exato que `de:` existe pra impedir.
  if (origem && modelo.familia === "imagen") {
    console.error(`erro: ${modelo.apelido} não trata foto de entrada — ele só inventa do zero.`);
    console.error(`  Pra partir de uma foto, use um modelo gemini: flash · pro · lite`);
    encerrar(1);
  }

  const validas = PROPORCOES[modelo.familia];
  if (!validas.includes(proporcao)) {
    console.error(`erro: ${modelo.apelido} (família ${modelo.familia}) não faz ${proporcao}.`);
    console.error(`  faz: ${validas.join(" ")}`);
    if (modelo.familia === "imagen" && proporcao === "4:5") {
      console.error(`\n  ⚠️ 4:5 é o formato do slide, e NENHUM Imagen faz 4:5. Pra peça de feed`);
      console.error(`     use um modelo gemini (flash · pro · lite), ou gere em 3:4 e recorte`);
      console.error(`     depois com  node motor/recortar.js.`);
    }
    encerrar(1);
  }

  // Exigir <pasta>/<arquivo>: uma pasta por carrossel é a regra da casa
  // (imagens/LEIA-ME.md). Gerar solto na raiz espalha o carrossel.
  const partes = destino.replace(/\\/g, "/").split("/");
  if (partes.length !== 2 || !partes[0] || !partes[1]) {
    console.error(`erro: o destino é <pasta>/<nome.png> — uma pasta por carrossel.`);
    console.error(`  ex.: node motor/imagem.js "${prompt.slice(0, 30)}..." copa-do-mundo/taca.png`);
    encerrar(1);
  }
  const [pasta, nome] = partes;
  if (!/\.png$/i.test(nome)) {
    console.error(`erro: a saída é PNG — o nome tem que terminar em .png (veio "${nome}").`);
    encerrar(1);
  }

  const arquivo = path.join(DIR_IMAGENS, pasta, nome);
  if (fs.existsSync(arquivo)) {
    console.error(`erro: imagens/${pasta}/${nome} já existe. Escolha outro nome ou apague o antigo.`);
    console.error(`  (sobrescrever calado apagaria imagem que o dono pôs lá à mão)`);
    encerrar(1);
  }

  lerChave(); // antes de anunciar: "gerando..." seguido de erro de chave é mentira
  if (origem) acharFoto(origem); // idem: conferir a foto ANTES de dizer que está tratando

  console.log(`\n${origem ? "tratando" : "gerando"}  ${proporcao}  ${modelo.apelido} (${modelo.id})`);
  if (origem) console.log(`  a partir de: ${origem}`);
  console.log(`  "${prompt}"\n`);

  const { dados, motivo } = await gerar(modelo, prompt, proporcao, origem);
  if (!dados) {
    // O filtro de segurança devolve 200 com resposta vazia — não é erro de rede, e
    // sem esta mensagem o script "funcionaria" sem gerar nada.
    console.error(`o Gemini respondeu sem imagem (motivo: ${motivo}).`);
    if (/SAFETY|PROHIBITED|BLOCK|FILTER/i.test(motivo)) console.error(`O filtro barrou o prompt. Reescreva — pessoa real e marca registrada costumam ser o gatilho.`);
    encerrar(1);
  }

  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, Buffer.from(dados, "base64"));

  // Procedência. O uso de foto do acervo é DERIVADO das peças (acervo.js), mas o
  // prompt não se deriva de lugar nenhum: sem este registro, daqui a um mês
  // ninguém sabe qual imagem é gerada, com que texto nem por qual modelo.
  // A ORIGEM é a linha mais importante: "tratada a partir de uma foto real" e
  // "inventada do zero" são coisas muito diferentes de se ter numa peça, e daqui
  // a seis meses o arquivo PNG não conta qual das duas ele é.
  const registro = path.join(DIR_IMAGENS, pasta, "_geradas.md");
  if (!fs.existsSync(registro)) fs.writeFileSync(registro, `# Imagens geradas por IA nesta pasta\n\nCada linha: arquivo · data · modelo · origem · prompt.\n"do zero" = inventada pelo modelo. "de <foto>" = foto REAL tratada — o rosto é o de verdade.\n\n`);
  fs.appendFileSync(registro, `- \`${nome}\` · ${new Date().toISOString().slice(0, 10)} · ${modelo.id} ${proporcao} · ${origem ? `de \`${origem}\`` : "do zero"} · "${prompt}"\n`);

  const kb = Math.round(fs.statSync(arquivo).size / 1024);
  console.log(`gerado: imagens/${pasta}/${nome}  (${kb} KB)`);
  console.log(`\n  "pasta": "${pasta}"  →  { "imagem": "${nome}" }`);
  console.log(`\n⚠️  ABRA e olhe antes de fechar a peça. O Gemini erra mão, texto dentro da`);
  console.log(`   imagem e número de dedos — e isso só aparece no olho, nunca no console.\n`);
}

principal().catch(e => {
  if (e === SAIDA) return; // saída limpa: a mensagem já foi impressa
  console.error(e);
  process.exitCode = 1;
});

// ⚠️ O QUE NÃO SE GERA AQUI (regra do dono, e ela vem de antes deste script):
//   - Rosto de pessoa real DO ZERO, por prompt de texto. O modelo não sabe quem é o
//     Rafael: ele devolve um advogado genérico de meia-idade, e a peça sai estampando
//     um estranho com o nome dele. Pessoa real tem foto real — e quando a foto precisa
//     de tratamento (outro fundo, outra luz), é `de:<foto>` que se usa: aí o rosto vem
//     da FOTO e continua sendo o dele. Rosto inventado é prova social falsa, e prova
//     social falsa é o único jeito de perder a conta de vez.
//   - O evento. Plateia, palco, salão cheio saem de `fotos/` — é o acervo do que
//     ACONTECEU. Plateia gerada é plateia que nunca veio.
//   - Print, número, depoimento, "resultado de aluno".
// Isto é pra imagem ILUSTRATIVA e assumida: a cena histórica, a metáfora, o objeto.
