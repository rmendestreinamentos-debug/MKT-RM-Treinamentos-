// motor-slides.js — lê um JSON de aula e cospe um .pptx editável.
// Uso:  node motor-slides.js conteudo/aula-11-sdr.json
//
// Formato NOVO (deck 16:9), separado do motor de feed do Instagram.
// O motor de feed (marketing-instagram/motor/) faz 1080x1350 e não é tocado aqui.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const sharp = require("sharp");
const pptxgen = require("pptxgenjs");

const BASE = __dirname;
const ACERVO = path.resolve(BASE, "..", "marketing-instagram");

// ---------- tokens (espelham marca/tokens.css) ----------
const PRETO = "0B0B0C";  // tinta
const PAPEL = "FFFFFF";
const CINZA = "9A9A9A";  // suave
const VERMELHO = "E5484D"; // só pra marcar o que NÃO fazer

// A paleta da TABELA do layout homônimo, medida nos pixels do .pptx do Rafael. Ela é a
// única área CLARA de um deck que é preto de ponta a ponta, e isso não é acidente: a
// grade de honorários é o documento em cima da mesa, e documento é papel. Fora daqui
// nenhuma dessas quatro cores aparece — por isso vivem juntas, e não soltas no layout.
// A serif é a mesma escolha: número de contrato não se lê em letra de manchete. Cambria
// é nativa do Windows, ao contrário da Montserrat e da Rubik One (ver o LEIA-ME).
const TAB = { cabeca: "072B57", corpo: "F2F2F3", tinta: "0A2251",
              borda: "DBA441", fonte: "Cambria" };

// ---------- o ACENTO: a única cor da página ----------
// O deck é preto com letra branca, e o acento é o resto: a palavra realçada, a régua,
// a tarja do card, o número, a seta, a borda da etapa ativa. Ele nasceu dourado porque
// os dois modelos do dono são dourados, mas cada PRODUTO tem a sua cor, e um deck de
// produto azul carimbado de dourado lê como arquivo do produto errado — o mesmo erro de
// pôr o logo de outra marca, só que em cor. Por isso a cor sai daqui e não do layout:
// espalhada solta pelos vinte lugares onde aparece, trocar uma exigiria caçar as vinte.
//
//   cor    — o acento propriamente: palavra realçada, régua, tarja, número, seta.
//   apoio  — o segundo tom, pro 2º lugar do `ranking`. Nunca sozinho numa página.
//   escada — o pódio do `ranking`, do 1º ao 4º. As duas últimas casas descem pra
//            neutro de propósito: é o apagar que faz o 1º lugar parecer primeiro.
//   fundo  — o quase-preto TINGIDO da cor, pro cartão da etapa ativa no `fluxo`.
//            Preto neutro ali deixaria a etapa ativa igual às outras.
//
// `azul` é o AZUL REAL (#4169E1) — pedido do dono pro deck da Imersão Master MAT
// (2026-07-30): fundo preto, letra branca, detalhe em azul.
//
// Do `COMERCIAL 365` vieram sete cores de uma vez, e elas NÃO são sete produtos: ali o
// acento muda por SEÇÃO dentro do mesmo deck (verde na regra, laranja e vermelho na dor,
// azul nas funções, âmbar no fechamento, rosa e ciano nas etapas do fluxo). Por isso o
// acento passou a poder ser declarado por SLIDE, e não só no topo do arquivo. Os hexas
// foram medidos nos pixels do PDF do dono, não escolhidos: ver `modelo` em cada linha.
const ACENTOS = {
  ouro: { cor: "F4B661", apoio: "F3C223",
          escada: ["F4B661", "F3C223", "C89B5E", "4A4A50"], fundo: "1F1810" },
  azul: { cor: "4169E1", apoio: "6E93FF",
          escada: ["4169E1", "6E93FF", "2A4699", "4A4A50"], fundo: "101A33" },
  // — os do Comercial 365 —
  verde: { cor: "14FF00", apoio: "00BF63",                       // o acento da marca
           escada: ["14FF00", "00BF63", "0A8C46", "4A4A50"], fundo: "0A1F0A" },
  jade: { cor: "00BF63", apoio: "14FF00",                        // o verde fechado
          escada: ["00BF63", "14FF00", "0A6E3C", "4A4A50"], fundo: "071B12" },
  laranja: { cor: "BB3B17", apoio: "E79F13",                     // a página de dor
             escada: ["BB3B17", "E79F13", "7E2A11", "4A4A50"], fundo: "24100A" },
  vermelho: { cor: "FF3131", apoio: "BB3B17",                    // o alerta
              escada: ["FF3131", "BB3B17", "8E2020", "4A4A50"], fundo: "260C0C" },
  ambar: { cor: "E79F13", apoio: "F4B661",                       // o fechamento
           escada: ["E79F13", "F4B661", "9A6A0D", "4A4A50"], fundo: "231805" },
  ciano: { cor: "0097B2", apoio: "4974FF",                       // o agendamento
           escada: ["0097B2", "4974FF", "066277", "4A4A50"], fundo: "04222A" },
  rosa: { cor: "E2A9F1", apoio: "C77FD9",                        // o acolhimento
          escada: ["E2A9F1", "C77FD9", "8A529C", "4A4A50"], fundo: "1E1224" },
  // — os dois modelos em .pptx do RAFAEL (subidos em 2026-08-03) —
  // Os dois são dourados, e nenhum dos dois é o `ouro` da casa. A distância parece
  // preciosismo no hexa e não é na página: o #F4B661 é bege e estes dois têm CROMA —
  // um puxa pro laranja, o outro pro amarelo. Lado a lado com o modelo do dono, um deck
  // gerado no `ouro` lê como cópia desbotada. Medidos nos pixels dos .pptx, não escolhidos.
  ocre: { cor: "F59A00", apoio: "FFC23D",                        // "Contrato de Honorários"
          escada: ["F59A00", "FFC23D", "A76B08", "4A4A50"], fundo: "241503" },
  trigo: { cor: "FFC455", apoio: "FFA800",                       // "Múltiplas formas de prospecção"
           escada: ["FFC455", "FFA800", "B07600", "4A4A50"], fundo: "241B06" },
};
let A_ = ACENTOS.ouro;                // trocado em main() pelo "acento" do JSON
let ACENTO = A_.cor, ACENTO2 = A_.apoio;

// ---------- os dois TEMAS ----------
// Os modelos do dono (`Modelos/`) são dois dialetos do mesmo deck: a gramática é a
// mesma (título em caixa alta com uma palavra em ouro, régua dourada embaixo, foto,
// uma linha de fecho, logo no rodapé ESQUERDO), mas a voz é outra.
//
//   summit — "O propósito". Montserrat, fundo preto, a foto entra EMOLDURADA em ouro.
//            O título mistura pesos na mesma frase (leve + forte + ouro): é a mistura
//            que dá o ritmo, não o tamanho.
//   mat    — "Comercial para motoristas". Rubik One, um peso só (a fonte já é pesada
//            demais pra misturar), e a foto SANGRA por trás de tudo, com véu à esquerda.
//
// As fontes foram instaladas no perfil do Windows (não eram nativas). Se um dia o deck
// abrir em outra máquina sem elas, o PowerPoint substitui e o layout dança.
// `pesa` = a família tem pesos pra misturar. `alta` = o CORPO do texto também vai em
// caixa alta (no MAT vai; no summit só o título — parágrafo de história em maiúscula
// vira paredão e ninguém lê).
// `largura` = largura média de uma MAIÚSCULA, em em. É o que permite prever se a linha
// cabe. Não é o mesmo número pras duas: a Rubik One é pesada mas ESTREITA (0.66); a
// Montserrat ExtraBold é larga (0.78). Usar um número só faz o título de uma delas
// rachar em cinco linhas ou o da outra sair pequeno à toa.
const TEMAS = {
  summit: { fonte: "Montserrat", leve: "Montserrat Light", forte: "Montserrat ExtraBold",
            display: "Montserrat Black", pesa: true, alta: false, largura: 0.78 },
  mat:    { fonte: "Rubik One", leve: "Rubik One", forte: "Rubik One",
            display: "Rubik One", pesa: false, alta: true, largura: 0.68 },
  // c365 — "COMERCIAL 365 - DIA 1", do Gabriel Anício. Mesmo esqueleto dos outros dois
  // (preto, letra branca, texto à esquerda, foto sangrando à direita), com três desvios
  // que são a identidade do modelo e por isso viram BANDEIRA, não código espalhado:
  //   regua: false     — o modelo NÃO risca embaixo do título. O que separa o título do
  //                      corpo ali é o trecho colorido dentro dele, não uma linha.
  //   logo_topo: true  — o lockup assina no canto SUPERIOR DIREITO de toda página (nos
  //                      outros dois ele mora no rodapé esquerdo).
  //   alta: false      — o corpo vai em caixa baixa. O modelo oscila (as primeiras
  //                      páginas em caixa alta, as últimas em baixa) e a caixa baixa é a
  //                      que aguenta os bullets longos deste roteiro sem virar paredão.
  //   painel: 5.6      — a foto NÃO sangra a página: ela ocupa o painel da direita e a
  //                      esquerda é preto chapado, com a emenda dissolvida. É o que o
  //                      modelo faz em quase toda página, e resolve de quebra o formato
  //                      do acervo: 83 das 115 fotos de evento são VERTICAIS, e num
  //                      corte 16:9 elas guardam 42% da altura (a linha de corte cai no
  //                      queixo). No painel de 7,7"×7,5" o corte é quase quadrado e
  //                      guarda ~70% — a diferença entre uma pessoa e um pescoço.
  c365:   { fonte: "Montserrat", leve: "Montserrat Light", forte: "Montserrat ExtraBold",
            display: "Montserrat Black", pesa: true, alta: false, largura: 0.78,
            regua: false, logo_topo: true, painel: 5.6, titulo_encolhe: true },
  // mat-centro — "Contrato de Honorários Duas Vezes Mais Rentável", .pptx do Rafael.
  // É o `mat` falado de FRENTE: mesma Rubik One, mesmo logo no rodapé esquerdo, mesmo
  // escritório desfocado ao fundo — e todo o bloco de texto CENTRADO, com uma régua
  // branca curta sob o título e um subtítulo abaixo dela. No `mat` só a capa centra; o
  // miolo alinha à esquerda porque a foto ocupa a direita. Aqui a foto nunca é assunto,
  // é papel de parede, e a página inteira é simétrica: título, régua, subtítulo, e o
  // conteúdo (quase sempre uma TABELA) no meio.
  //   centrado: true   — título, régua e subtítulo centram na coluna cheia.
  //   regua_larg: 3.8  — a régua tem largura FIXA e centrada (medida no modelo), em vez
  //                      de sangrar pela esquerda até 62% da coluna como nos outros.
  //   halo: true       — a mancha quente no meio da página, atrás do conteúdo. Está em
  //                      TODA página do modelo, e sem ela o fundo de escritório vira
  //                      preto uniforme e a tabela branca flutua sobre o nada.
  "mat-centro": { fonte: "Rubik One", leve: "Rubik One", forte: "Rubik One",
                  display: "Rubik One", pesa: false, alta: true, largura: 0.68,
                  centrado: true, regua_larg: 3.8, halo: true, titulo_encolhe: true },
  // summit-bh — "múltiplas formas de prospecção de clientes", .pptx do Rafael.
  // Assina RM SUMMIT · BELO HORIZONTE no rodapé esquerdo, e mistura DUAS famílias na
  // mesma página: o título é Rubik One (a placa) e todo o resto é Montserrat (a fala).
  // Os outros três temas usam uma família só, então a mistura precisa de dois campos:
  //   titulo_fonte  — a fonte do título, independente da `forte` do corpo.
  //   largura_tit   — a régua de largura de maiúscula DELA. Medir o título de Rubik One
  //                   (0.68) com a régua da Montserrat (0.78) o encolheria ~13% à toa.
  //   forte_bold    — o `**` do corpo é Montserrat BOLD, e Bold não é família instalada
  //                   aqui (só Light, ExtraBold e Black): tem que ir como `bold: true`.
  //   regua: "composta" — a régua do modelo é um par: um fio fino longo atravessando e
  //                   um trecho grosso curto por cima. E ela não mora sob o título: mora
  //                   entre as duas linhas de apoio (ver o layout `chamada`).
  //   vinheta: true — a imagem que sangra tem as QUATRO bordas dissolvidas no preto.
  //                   Mesmo entrando 16:9 exata e sem corte, a beirada crua encostando no
  //                   preto do slide vira emenda dura, e o slide passa a ler como imagem
  //                   colada por cima do fundo.
  "summit-bh": { fonte: "Montserrat", leve: "Montserrat Light", forte: "Montserrat",
                 display: "Rubik One", pesa: true, alta: true, largura: 0.78,
                 titulo_fonte: "Rubik One", largura_tit: 0.68, forte_bold: true,
                 regua: "composta", titulo_y: 1.5, vinheta: true, titulo_encolhe: true },
};
let T = TEMAS.summit;                 // trocado em main() pelo "tema" do JSON
let FONTE = T.fonte, FONTE_TIT = T.forte, FONTE_LEVE = T.leve;
// A fonte de DISPLAY: a que carrega a palavra grande da página (capa, declaração,
// divisória, título). Nos temas de uma família só ela É a `forte`; no `summit-bh`, que
// mistura duas, ela é a Rubik One e a `forte` continua sendo a Montserrat do corpo.
// Separar as duas foi o que impediu a manchete de sair em letra de parágrafo.
let FONTE_DISPLAY = T.forte;
// Quando a display é uma família PRÓPRIA, o `**` não troca a fonte dentro dela — a ênfase
// ali é a COR, como no `mat`. Sem isso, metade da manchete sai em outra letra.
const soCorDisplay = () => !!T.titulo_fonte;

const L = 13.333, A = 7.5;          // 16:9 em polegadas
const MG = 0.9;                      // margem
const COL = L - MG * 2;              // largura útil
const FIM_X = 5.6;                   // onde a foto do fecho começa

// A caixa que cada layout reserva pra foto — é dela que sai a proporção do corte.
// Foto que SANGRA usa o slide inteiro; foto EMOLDURADA usa a caixa da moldura.
const SANGRA = { w: L, h: A };
const CAIXA = {
  moldura:    { w: 6.2, h: 4.25 },   // layout "foto": a moldura à direita
  capa:       { w: 5.4, h: 6.05 },   // capa com moldura: retrato alto
  duas_fotos: { w: 5.18, h: 4.0 },   // cada uma das duas
  final:      { w: L - FIM_X, h: A },
};

// ---------- véu: PNG de gradiente, gerado na unha ----------
// Retângulo com transparência dá banda visível sobre foto. Um PNG de gradiente
// real resolve, e o pptx aceita imagem embutida em base64.
function crc32(buf){
  let c, tabela = crc32.t || (crc32.t = (() => {
    const t = [];
    for(let n = 0; n < 256; n++){
      c = n;
      for(let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for(const b of buf) crc = tabela[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(tipo, dados){
  const tam = Buffer.alloc(4); tam.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, "ascii"), dados]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tam, corpo, crc]);
}
// paradas: [{ p: 0..1, a: 0..1 }] — p = posição no eixo, a = opacidade do preto
function veu(direcao, paradas){
  const N = 256;
  const horizontal = direcao === "esquerda" || direcao === "direita";
  const w = horizontal ? N : 1, h = horizontal ? 1 : N;
  const linhas = [];
  const alfaEm = (t) => {
    for(let i = 0; i < paradas.length - 1; i++){
      const a = paradas[i], b = paradas[i + 1];
      if(t >= a.p && t <= b.p){
        const k = b.p === a.p ? 0 : (t - a.p) / (b.p - a.p);
        return a.a + (b.a - a.a) * k;
      }
    }
    return paradas[paradas.length - 1].a;
  };
  for(let y = 0; y < h; y++){
    const linha = [0];                       // filtro 0 (none)
    for(let x = 0; x < w; x++){
      let t = horizontal ? x / (N - 1) : y / (N - 1);
      if(direcao === "direita" || direcao === "baixo") t = 1 - t;
      linha.push(0x0b, 0x0b, 0x0c, Math.round(alfaEm(t) * 255));
    }
    linhas.push(Buffer.from(linha));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;                  // 8 bits, RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(linhas))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return "image/png;base64," + png.toString("base64");
}
// O texto sempre tem que ganhar da foto: escuro onde a letra pousa.
// VEU_ESQ escurece a ESQUERDA (capa: título à esquerda, rosto respira à direita).
// VEU_EMENDA escurece a borda onde a foto encosta no painel preto — sem ele a
// emenda vira uma linha dura entre o preto do slide e o claro da foto.
const VEU_ESQ = veu("esquerda", [{ p: 0, a: 0.94 }, { p: 0.42, a: 0.86 }, { p: 0.78, a: 0.35 }, { p: 1, a: 0.15 }]);
const VEU_EMENDA = veu("esquerda", [{ p: 0, a: 0.97 }, { p: 0.28, a: 0.7 }, { p: 0.68, a: 0.32 }, { p: 1, a: 0.18 }]);

// A VINHETA: preto que cresce nas QUATRO bordas e some no meio. Existe pro caso de a
// imagem sangrar a página inteira e ainda assim precisar não parecer colada: mesmo uma
// imagem 16:9 exata, que entra sem corte nenhum, encosta nas quatro beiradas com a cor
// crua dela, e o encontro com o preto do slide vira uma emenda dura — é o que dá o ar
// amador de "retângulo por cima do fundo". Com o fade, a imagem nasce do escuro.
// ⚠️ É diferente do VEU_ESQ, e os dois trabalham juntos: o VEU_ESQ escurece um LADO
// inteiro (é onde o texto pousa), a vinheta escurece só a MOLDURA. Um sozinho não faz o
// serviço do outro — véu de lado deixa a borda de cima dura, vinheta sozinha não dá chão
// pra letra.
// `fade` é a fatia da dimensão que o degradê ocupa (0.16 = 16% de cada lado).
function vinheta(fade, forca){
  const N = 160;
  const linhas = [];
  for(let y = 0; y < N; y++){
    const linha = [0];
    const fy = Math.min(Math.min(y, N - 1 - y) / (N * fade), 1);
    for(let x = 0; x < N; x++){
      const fx = Math.min(Math.min(x, N - 1 - x) / (N * fade), 1);
      // O produto (e não o mínimo) é o que arredonda os CANTOS: no mínimo, o canto teria
      // o mesmo peso da beirada e apareceria um L de sombra em cada quina.
      const k = 1 - fx * fy;
      linha.push(0x0b, 0x0b, 0x0c, Math.round(k ** 1.35 * forca * 255));
    }
    linhas.push(Buffer.from(linha));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return "image/png;base64," + Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(linhas))),
    chunk("IEND", Buffer.alloc(0)),
  ]).toString("base64");
}
const VEU_VINHETA = vinheta(0.17, 0.96);

// O HALO: uma mancha RADIAL quente no meio da página, atrás do conteúdo. É o que o
// modelo "Contrato de Honorários" tem por baixo de cada tabela, e não é enfeite — sem
// ele o fundo de escritório fica preto uniforme e a grade branca flutua sobre o nada.
// O halo dá chão à tabela e devolve à página o calor que o véu tirou.
// ⚠️ Ele é RADIAL, e por isso não sai do `veu()`, que interpola num eixo só. O gradiente
// radial do PowerPoint existe, mas é ele quem o desenha na hora de abrir — e o mesmo
// arquivo em outra máquina sai com outro raio. PNG resolvido aqui não dança.
// A cor sai do ACENTO, não é fixa: num deck azul um halo dourado seria a única coisa
// quente da página, o mesmo erro de carimbar a marca errada, só que em luz.
function halo(hex, forca){
  const N = 192, meio = (N - 1) / 2;
  const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  const linhas = [];
  for(let y = 0; y < N; y++){
    const linha = [0];
    for(let x = 0; x < N; x++){
      const d = Math.hypot(x - meio, y - meio) / meio;
      // `1 - d²` cai devagar no miolo e rápido na borda: é a curva de uma luz, e não a
      // rampa reta, que deixa um anel visível onde o gradiente termina.
      const k = d >= 1 ? 0 : (1 - d * d) ** 1.6;
      linha.push(r, g, b, Math.round(k * forca * 255));
    }
    linhas.push(Buffer.from(linha));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(linhas))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return "image/png;base64," + png.toString("base64");
}
const HALOS = new Map();
function haloDoAcento(){
  if(!HALOS.has(ACENTO)) HALOS.set(ACENTO, halo(ACENTO, 0.3));
  return HALOS.get(ACENTO);
}

// ---------- utilidades ----------
function erro(msg){ console.error("erro:", msg); process.exit(1); }
function caixa(t){ return T.alta ? String(t).toUpperCase() : String(t); }
// Texto que não cabe na caixa QUEBRA em mais linhas do que o layout reservou, e aí o
// bloco de baixo entra por cima dele. Aqui a linha mais longa decide o corpo: o título
// cede antes de invadir a imagem.
// A largura da maiúscula vem do TEMA (ver TEMAS.largura). Medi 0.62 no primeiro teste,
// com um número só pras duas fontes, e o título de Montserrat rachou em cinco linhas:
// caixa alta em peso pesado é muito mais larga que a média de uma fonte de texto.
// Quanto a RÉGUA precisa descer por causa do rabo da última linha. A caixa de texto
// mede a linha até a base da MAIÚSCULA; a cedilha do Ç, o rabo do Q e a vírgula moram
// abaixo dela e passavam POR DENTRO da régua ("SEGURANÇA", "DIREÇÃO", "PROSPECÇÃO" —
// palavra terminada em -ÇÃO é metade dos títulos em português, então não é caso raro).
// A folga é CONDICIONAL de propósito: dar a todo mundo empurraria o corpo de todo slide
// 0,15" pra baixo e estouraria o pé das páginas que já estavam no limite (os decks de
// aula têm lista de sete itens). Sem rabo na última linha, nada muda.
const RABO = /[ÇQ,;]/;
function descida(linha, corpo){
  return RABO.test(String(linha).toUpperCase()) ? corpo * 0.004 : 0;
}
// `piso` é o menor corpo aceitável. Ele existe porque em TÍTULO encolher a 9pt não é
// solução, é outro defeito — ali o remédio é encurtar a copy. Mas em texto de APOIO
// (o elo da cascata, o item do cartão de plano) o piso alto vira armadilha: a conta
// pede 10pt, o piso devolve 14, o texto quebra em duas linhas numa caixa de uma linha
// e encosta no de baixo. Quem chama diz até onde pode ceder.
// `lw` é a largura da maiúscula quando o texto NÃO vai na fonte do corpo. Existe por
// causa do `summit-bh`, que põe título em Rubik One (0.68) e corpo em Montserrat (0.78)
// na mesma página: medir o título com a régua do corpo o encolheria ~13% sem motivo.
// Omitido, cai no `T.largura` — que é o caso dos três temas de uma família só.
function corpoQueCabe(chars, larg, teto, piso, lw){
  // 0.94 é folga, não preciosismo: a conta é uma MÉDIA de largura de letra, e uma
  // linha cheia de M e W estoura a estimativa por pouco — aí ela quebra em duas e o
  // bloco de baixo entra por cima. Barato de dar a folga, caro de não dar.
  const cabe = Math.floor(larg * 72 * 0.94 / ((lw || T.largura) * Math.max(chars, 1)));
  return Math.max(piso === undefined ? 14 : piso, Math.min(teto, cabe));
}
// Quantas linhas o bloco vai REALMENTE ocupar depois que o PowerPoint quebrar o que
// não coube. Reservar só o número de `\n` do JSON foi o que fez a régua da capa cair
// EM CIMA da segunda linha do título — o texto tinha quebrado e o layout não sabia.
function linhasReais(linhas, corpo, larg, lw){
  return linhas.reduce((n, l) => n + Math.max(1,
    Math.ceil(l.replace(/\*/g, "").length * (lw || T.largura) * corpo / 72 / larg)), 0);
}
// O deck não come só do acervo do evento. Os modelos usam foto de família, print de
// hospital, imagem gerada — coisa que o dono despeja avulsa. Por isso a busca começa
// em `slides/imagens/` (a pasta do deck), passa pelas imagens do feed e só então cai
// no acervo. O primeiro que existir vence.
const ONDE = [
  path.resolve(BASE, "imagens"),
  path.resolve(ACERVO, "imagens"),
  path.resolve(ACERVO, "fotos"),
];
function foto(rel){
  for(const dir of ONDE){
    const p = path.resolve(dir, rel);
    if(fs.existsSync(p)) return p;
  }
  erro(`imagem não encontrada: ${rel}\n       procurei em: ${ONDE.map(d => path.relative(BASE, d)).join(" · ")}`);
}
function logoPath(arq){
  const p = path.resolve(ACERVO, "marca", arq);
  return fs.existsSync(p) ? p : null;
}

// ---------- imagem: recortar ANTES, nunca esticar depois ----------
// O `sizing: cover` do pptxgenjs não lê a dimensão do arquivo: ele ESTICA a foto
// até encher a caixa. Foto 3:2 numa caixa 16:9 sai 18% mais larga (engorda o rosto);
// no painel do fecho ela era espremida a 69%. Então o corte é feito aqui, na mão,
// e o slide recebe uma imagem que já tem exatamente a proporção da caixa.
const CACHE = new Map();
const DPI = 150;
const FOCO = {
  topo: "top", baixo: "bottom", esquerda: "left", direita: "right", centro: "centre",
};
async function recorta(rel, larg, alt, foco){
  const chave = `${rel}|${larg}x${alt}|${foco || "centro"}`;
  if(CACHE.has(chave)) return CACHE.get(chave);
  const buf = await sharp(foto(rel))
    .resize(Math.round(larg * DPI), Math.round(alt * DPI), {
      fit: "cover",
      position: FOCO[foco || "centro"] || "centre",
    })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
  const uri = "image/jpeg;base64," + buf.toString("base64");
  CACHE.set(chave, uri);
  return uri;
}
// O QR entra INTEIRO, sem corte e sem reamostragem: recortar um QR come os módulos
// da borda e a câmera para de ler. Ele é o único ativo do slide de contato — se ele
// não lê, a página não existe.
async function imagemCrua(rel){
  const p = foto(rel);
  const ext = path.extname(p).toLowerCase();
  const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
  return `${mime};base64,` + fs.readFileSync(p).toString("base64");
}
// A imagem que entra INTEIRA, sem corte: o print de planilha, o gráfico exportado, o
// documento. É o oposto da `recorta` — lá a caixa manda e a foto cede as bordas; aqui a
// imagem manda e a caixa cede, porque cortar um print come justamente a coluna de dado
// que a página existe pra mostrar. Só a proporção é medida; o arquivo entra por `path`.
const IMAGENS = new Map();
async function medeImagem(rel){
  if(IMAGENS.has(rel)) return IMAGENS.get(rel);
  const p = foto(rel);
  const m = await sharp(p).metadata();
  const dado = { path: p, razao: m.width / m.height };
  IMAGENS.set(rel, dado);
  return dado;
}
// O logo também estava espremido: 4.34 de proporção real numa caixa de 3.81.
// Aqui ele entra pela ALTURA e a largura sai da proporção verdadeira.
const LOGOS = new Map();
async function medeLogo(arq){
  if(LOGOS.has(arq)) return LOGOS.get(arq);
  const p = logoPath(arq);
  if(!p){ LOGOS.set(arq, null); return null; }
  const m = await sharp(p).metadata();
  const dado = { path: p, razao: m.width / m.height };
  LOGOS.set(arq, dado);
  return dado;
}
function porAltura(arq, h){
  const lg = LOGOS.get(arq);
  return lg ? { path: lg.path, w: h * lg.razao, h } : null;
}
// DOIS marcadores, porque os modelos usam DUAS ênfases na mesma frase:
//   *palavra*   → ACENTO (a palavra que a frase existe pra dizer). Uma por frase.
//   **palavra** → branco em peso FORTE (o esqueleto da frase: "NOSSA **HISTÓRIA
//                 COMEÇOU** ANTES DELE *NASCER*"). É a mistura de pesos que dá o
//                 ritmo do título — sem ela sobra um bloco uniforme de caixa alta.
// No tema `mat` a Rubik One tem um peso só: o `**` não muda nada, e é assim que o
// modelo faz. Ali a ênfase é a COR, e ponto.
// `soCor` desliga a troca de FONTE e deixa só a cor do `*`. Existe pro texto que já
// está numa família própria — o título do `summit-bh` é Rubik One, e trocar o peso ali
// pela `forte` do corpo (Montserrat) faria metade da manchete sair em outra letra.
// É o mesmo comportamento que o `mat` tem de fábrica (uma família só, ênfase pela cor),
// só que decidido pelo trecho e não pelo tema inteiro.
function realce(txt, base, soCor){
  const partes = String(txt).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  const troca = T.pesa && !soCor;
  // O `**` do `summit-bh` é Montserrat BOLD, e Bold não é uma família instalada nesta
  // máquina (só Light, ExtraBold e Black): ali o peso tem que ir por `bold: true`.
  const peso = troca ? { fontFace: T.forte, ...(T.forte_bold ? { bold: true } : {}) } : {};
  return partes.map(pp => {
    let p = pp;
    if(p.startsWith("**") && p.endsWith("**"))
      return { text: p.slice(2, -2), options: { ...base, ...peso } };
    if(p.startsWith("*") && p.endsWith("*"))
      return { text: p.slice(1, -1), options: { ...base, color: ACENTO, ...peso } };
    // Marcador que não fecha DENTRO da mesma linha (o `**` aberto numa linha e
    // fechado na outra é o erro fácil de cometer) sobraria como asterisco impresso
    // na arte. Some com ele e reclama alto — texto errado no slide não se vê no log.
    if(p.includes("*")){
      console.warn(`aviso: marcador de ênfase não fechado em "${p.trim()}" — ` +
        `o * e o ** têm que abrir e fechar na MESMA linha.`);
      p = p.replace(/\*/g, "");
    }
    return { text: p, options: base };
  });
}
// Uma frase realçada vira VÁRIOS runs. Se cada run levar `breakLine`, a frase
// racha em três linhas no meio do destaque — a quebra é só do ÚLTIMO run da linha.
function paragrafos(linhas, base, soCor){
  return linhas.flatMap((l, i) => {
    const runs = realce(l, typeof base === "function" ? base(i) : base, soCor);
    runs[runs.length - 1].options = { ...runs[runs.length - 1].options, breakLine: true };
    return runs;
  });
}

// ---------- cromo comum a todo slide ----------
// TODO slide leva foto — é a mesma regra do feed, e os dois modelos a cumprem em
// todas as páginas. A foto ou SANGRA por trás de tudo (com véu à esquerda, pra letra
// ganhar dela) ou entra EMOLDURADA em ouro. Slide sem foto é o preto puro, e nos
// modelos ele só aparece na página de declaração, onde a frase é a peça.
// O deck do MAT compõe DUAS imagens, e é isso que dá o ar de cena montada em vez de
// "foto com texto por cima": o CENÁRIO (o escritório escuro) sangra na página inteira,
// e o PERSONAGEM entra num painel à direita, com a borda esquerda dissolvida no cenário.
// Sozinho, o personagem viraria um retângulo colado; sozinho, o cenário viraria papel
// de parede. Juntos, viram um palco.
const PAINEL_X = 6.3;                 // onde o painel do personagem começa
// O véu do cenário era fixo em 55% de preto, calibrado em foto de PALCO — que já nasce
// escura. Ilustração e pintura não: a gravura de vaso grego é creme e laranja de ponta a
// ponta, e a 55% ela virava a página mais clara do deck inteiro, brigando com o texto e
// destoando das outras 18. `"veu": "forte"` é a saída, e ela é por SLIDE porque a mesma
// imagem pode servir de fundo discreto num layout e de assunto em outro.
// O número é a TRANSPARÊNCIA do preto: quanto menor, mais escuro o resultado.
const VEU_CENARIO = { leve: 62, medio: 45, forte: 26, apagado: 14 };
function fundo(s, d){
  s.background = { color: PRETO };
  if(d._cenario){
    s.addImage({ data: d._cenario, x: 0, y: 0, w: L, h: A });
    const t = VEU_CENARIO[d.veu];
    if(d.veu && t === undefined)
      console.warn(`aviso: véu '${d.veu}' desconhecido — use: ${Object.keys(VEU_CENARIO).join(" · ")}`);
    s.addShape("rect", { x: 0, y: 0, w: L, h: A,
      fill: { color: PRETO, transparency: t === undefined ? VEU_CENARIO.medio : t },
      line: { type: "none" } });
  }
  if(d.foto && !d._emoldurada){
    if(d._cenario){
      s.addImage({ data: d._recorte, x: PAINEL_X, y: 0, w: L - PAINEL_X, h: A });
      s.addImage({ data: VEU_EMENDA, x: PAINEL_X, y: 0, w: L - PAINEL_X, h: A });
    } else if(T.painel){
      // Painel do c365: a foto mora só na direita e a esquerda é preto chapado. O véu
      // de emenda dissolve a borda; sem ele fica uma linha dura entre o preto e a foto.
      s.addImage({ data: d._recorte, x: T.painel, y: 0, w: L - T.painel, h: A });
      s.addImage({ data: VEU_EMENDA, x: T.painel, y: 0, w: L - T.painel, h: A });
      return;                       // o VEU_ESQ abaixo escureceria a foto de novo
    } else {
      s.addImage({ data: d._recorte, x: 0, y: 0, w: L, h: A });
      // A VINHETA dissolve as quatro bordas da imagem que sangra. Ela vem ANTES do
      // VEU_ESQ de propósito: o véu tem que poder escurecer por cima dela do lado do
      // texto, senão a moldura clareia de volta justamente a beirada esquerda.
      if(T.vinheta && d.vinheta !== false)
        s.addImage({ data: VEU_VINHETA, x: 0, y: 0, w: L, h: A });
      // O `veu` era exclusivo do `cenario`, e isso deixava a foto que SANGRA sem controle
      // nenhum: o VEU_ESQ foi calibrado em retrato de palco, que já nasce escuro, e uma
      // ilustração de pilar dourado ou de pôr do sol laranja passa por baixo dele com
      // brilho de sobra. O texto branco some, e o console diz "ok". Agora ela usa a mesma
      // escala do cenário, por SLIDE — porque numa série de quinze ilustrações o que
      // define o quanto de preto entra é cada imagem, não o arquivo.
      const tv = VEU_CENARIO[d.veu];
      if(d.veu && tv === undefined)
        console.warn(`aviso: véu '${d.veu}' desconhecido — use: ${Object.keys(VEU_CENARIO).join(" · ")}`);
      if(tv !== undefined)
        s.addShape("rect", { x: 0, y: 0, w: L, h: A,
          fill: { color: PRETO, transparency: tv }, line: { type: "none" } });
    }
  }
  if(d._cenario || (d.foto && !d._emoldurada))
    s.addImage({ data: VEU_ESQ, x: 0, y: 0, w: L, h: A });
  // O halo vem DEPOIS do véu, senão o véu o apaga junto com a foto. Ele é quadrado e
  // maior que a altura da página de propósito: cortado em cima e embaixo, o que sobra é
  // a faixa larga do meio, que é o que o modelo faz. `"halo": false` no slide desliga —
  // numa página de foto clara ele empasta.
  if(T.halo && d.halo !== false){
    const lado = 9.4;
    s.addImage({ data: haloDoAcento(), x: (L - lado) / 2, y: 4.3 - lado / 2, w: lado, h: lado });
  }
}
// A moldura dourada do tema summit: um retângulo de ouro por baixo, a foto por cima.
// Fazer a borda com `line` na própria imagem não funciona — o pptx desenha a linha
// POR DENTRO e ela come a foto no primeiro pixel.
function moldura(s, dados, x, y, w, h){
  const b = 0.035;
  s.addShape("rect", { x: x - b, y: y - b, w: w + b * 2, h: h + b * 2,
    fill: { color: ACENTO }, line: { type: "none" },
    shadow: { type: "outer", blur: 14, offset: 5, angle: 90, color: "000000", opacity: 0.65 } });
  s.addImage({ data: dados, x, y, w, h });
}

// O logo assina no rodapé ESQUERDO — é onde os dois modelos o põem. (O motor antigo
// punha à direita, com o número da página à esquerda; os modelos não numeram nada.)
function selo(s, d){
  // No c365 o lockup assina no canto SUPERIOR DIREITO (T.logo_topo), e não no rodapé
  // esquerdo. Não é capricho de posição: ali o rodapé inteiro fica livre pro @ e pro
  // texto respirar, e o topo direito é a única faixa que nenhum layout do modelo usa.
  if(T.logo_topo){
    const lg = d.logo && porAltura(d.logo, 0.34);
    if(lg) s.addImage({ path: lg.path, x: L - MG - lg.w + 0.28, y: 0.3, w: lg.w, h: lg.h });
    arroba(s, d);
    return;
  }
  const lg = d.logo && porAltura(d.logo, 0.52);
  if(lg) s.addImage({ path: lg.path, x: MG - 0.25, y: A - 0.92, w: lg.w, h: lg.h });
  else if(d.marca)
    s.addText(d.marca.toUpperCase(), { x: MG, y: A - 0.8, w: 3.4, h: 0.35,
      fontFace: FONTE, fontSize: 9, color: CINZA, charSpacing: 1.5 });
  arroba(s, d);
}
// O @ de quem apresenta, no canto oposto ao logo — em TODO slide (pedido do dono,
// 2026-07-30). O logo diz de que PRODUTO é a aula; o @ diz quem está falando, e num
// deck que circula em print de story os dois precisam viajar juntos.
// Sai de `marca/perfis.json` pelo slug (`"perfil": "joao-vitor"`) e **nunca digitado à
// mão**: @ errado manda a plateia pra conta de outra pessoa, e é o tipo de erro que só
// se descobre depois de projetado. Handle `null` no arquivo PARA o motor, como no feed.
// Fica no acento e pequeno: é assinatura, não manchete. A 10pt o azul não disputa com a
// palavra realçada, que é 3 a 5 vezes maior.
// ⚠️ Ele mora num CHIP escuro, e isso não é enfeite. O véu do slide escurece a ESQUERDA
// (é lá que o texto pousa); o canto de baixo à direita fica com a imagem crua, e ali
// passa de tudo — a beira clara da gravura do Botticelli apagou o @ azul na primeira
// versão. O chip garante chão escuro em qualquer imagem, e sobre slide preto ele
// simplesmente desaparece: preto sobre preto.
function arroba(s, d){
  if(!d._arroba) return;
  const corpo = 10;
  // Largura medida no texto, não chutada: caixa fixa larga deixaria o chip sobrando à
  // esquerda do @ (o texto é alinhado dentro dela) e ele viraria uma tarja solta.
  const larg = d._arroba.length * (T.largura * corpo + 1.2) / 72 + 0.34;
  const x = L - MG - larg + 0.2, y = A - 0.79, alt = 0.31;
  // ⚠️ `rectRadius` acima da METADE da altura gera um ajuste que o PowerPoint recusa: o
  // arquivo abre, e o export de PNG morre no meio com E_FAIL. Aqui a altura é 0,31, então
  // o raio fica em 0,12 — arredondado o suficiente pra ler como pílula, longe do limite.
  s.addShape("roundRect", { x, y, w: larg, h: alt, rectRadius: 0.12,
    fill: { color: PRETO, transparency: 12 }, line: { type: "none" } });
  s.addText(d._arroba, { x, y, w: larg, h: alt, fontFace: FONTE, fontSize: corpo,
    color: ACENTO, charSpacing: 1.2, align: "center", valign: "middle" });
}
function rodape(s, d, n){
  // Numerar é opcional e nasce DESLIGADO: nenhum dos dois modelos numera. Numa aula
  // longa ajuda a se achar, e aí a peça pede com "numerar": true.
  // ⚠️ O número dividia o canto direito com o @. Com os dois ligados ele SOBE, senão
  // um sai impresso por cima do outro (e no console os dois "geraram").
  if(d.numerar)
    s.addText(String(n).padStart(2, "0"), { x: L - MG - 0.8, y: d._arroba ? A - 1.15 : A - 0.75,
      w: 0.8, h: 0.35, fontFace: FONTE_TIT, fontSize: 11, color: "3A3A3C",
      align: "right", valign: "middle" });
  selo(s, d);
}
// Título de página. A RÉGUA embaixo é a assinatura gráfica dos dois modelos — ela
// sangra pela esquerda (nasce fora do slide) e para antes do meio: é o que ancora o
// bloco de texto no canto e o separa da foto.
// A RÉGUA COMPOSTA do `summit-bh`: um fio fino que atravessa quase a coluna inteira e
// um trecho GROSSO curto por cima dele, os dois no acento. Uma régua só, do peso do fio,
// somia contra a foto; do peso do trecho, viraria uma tarja. O par é o que dá o gesto de
// "sublinhado à mão" que o modelo tem — e ele fecha num PONTO à direita, que é o que
// impede o fio de parecer um corte acidental na página.
function reguaComposta(s, y){
  const fio = 0.006, grosso = 0.026;
  s.addShape("rect", { x: 0, y: y + (grosso - fio) / 2, w: 7.3, h: fio,
    fill: { color: A_.apoio }, line: { type: "none" } });
  s.addShape("rect", { x: MG - 0.17, y, w: 5.1, h: grosso,
    fill: { color: ACENTO }, line: { type: "none" } });
  s.addShape("ellipse", { x: 7.3, y: y + (grosso - 0.055) / 2, w: 0.055, h: 0.055,
    fill: { color: A_.apoio }, line: { type: "none" } });
}
function titulo(s, txt, y, larg){
  // O `summit-bh` começa o título mais baixo (1.5"), porque no modelo o alto da página
  // fica vazio de propósito: é lá que a foto respira antes da letra entrar.
  if(y === undefined) y = T.titulo_y || 0.72;
  // Centrado, o título usa a coluna INTEIRA: preso aos 7.2" da esquerda, ele centraria
  // no meio do bloco de texto e não no meio da página — desalinhado da régua e do
  // subtítulo, que centram na página. O olho pega isso na hora numa página simétrica.
  if(larg === undefined) larg = T.centrado ? COL : 7.2;
  const T_LW = T.largura_tit || T.largura;
  const al = T.centrado ? "center" : "left";
  const t = String(txt);
  const linhas = t.split("\n");
  const maior = Math.max(...linhas.map(l => l.replace(/\*/g, "").length));
  // O título QUEBRA, não encolhe até sumir. Espremer uma linha de 31 caracteres até
  // caber num só verso jogou "QUEM NORMALMENTE TEM DIFICULDADE" pra 20pt — menor que
  // os itens da própria lista. Título curto é grande, longo é médio, e o que passar da
  // largura cai pra segunda linha (que o `linhasReais` já reserva).
  // Por faixa de comprimento (o comportamento dos dois modelos antigos): o título NÃO
  // encolhe pra caber, ele quebra, e a faixa foi calibrada na Rubik One — que é estreita.
  // Na Montserrat do c365 a mesma régua racha: a maiúscula é 15% mais larga, uma linha de
  // 20 letras cai na faixa dos 40pt e só cabem ~16. Como este deck tem 53 títulos escritos
  // por outra pessoa, calibrar a copy slide a slide seria empurrar pro dono um trabalho que
  // a conta faz sozinha — aqui o corpo CEDE à linha mais longa, como no `final` e na `capa`.
  const corpo = T.titulo_encolhe ? corpoQueCabe(maior, larg, 40, undefined, T_LW)
    : maior > 30 ? 30 : maior > 20 ? 34 : 40;
  // A base é FORTE. Ela só afina pra Light quando a copy pede a mistura de pesos com
  // `**`: aí o Light é o fundo contra o qual o negrito aparece. Sem marcador, um título
  // inteiro em Light fica anêmico — e foi o que aconteceu no primeiro deck.
  // Tema com fonte de título PRÓPRIA (o `summit-bh`) não entra nessa dança: lá o título
  // é Rubik One de ponta a ponta e a ênfase é a cor, como no `mat`. Trocar o peso pela
  // `forte` do corpo poria metade da manchete em Montserrat no meio da palavra.
  const base = T.titulo_fonte || ((T.pesa && t.includes("**")) ? FONTE_LEVE : FONTE_TIT);
  const runs = paragrafos(linhas, { fontFace: base, fontSize: corpo, color: PAPEL },
    !!T.titulo_fonte);
  const alt = linhasReais(linhas, corpo, larg, T_LW) * (corpo * 1.22 / 72);
  // NADA de `fit: shrink` aqui. O `<a:normAutofit/>` que ele gera é "encolher no
  // overflow", e o PowerPoint RE-CALCULA esse encolhimento toda vez que ABRE o arquivo,
  // com as métricas reais da fonte — não com a conta do motor. Como a caixa nasce do
  // tamanho MÍNIMO, a margem interna do PowerPoint já conta como estouro e ele derruba
  // o título (vimos capa inteira cair a 25% no re-export). `fit: none` + `margin: 0`
  // TRAVA o corpo que o motor escolheu: WYSIWYG, não dança na segunda abertura. O preço
  // é que um título subestimado vaza pra baixo em vez de encolher — mas isso se VÊ e se
  // conserta na peça; encolher a 25% passa batido e sai impresso.
  s.addText(runs.map(r => ({ ...r, text: r.text.toUpperCase() })), {
    x: MG, y, w: larg, h: alt, valign: "top", align: al,
    lineSpacing: corpo * 1.22, fit: "none", margin: 0,
  });
  // A régua é dourada no summit e BRANCA no mat — é o que cada modelo faz. No deck do
  // MAT o ouro já está reservado pra palavra realçada do bullet; uma régua dourada
  // por cima dela roubaria o único ponto de cor da página.
  // A folga não é estética: `alt` conta linhas de altura CHEIA, e a última linha ainda
  // desce o descendente (o Ç de NOTIFICAÇÃO) por fora dela. Com 0.06 a régua passava
  // por dentro da cedilha.
  // A régua CENTRADA passa pelo meio da página — exatamente onde cai o Ç de "COBRANÇA",
  // que é a última palavra de metade dos títulos deste modelo. Nos outros temas ela sangra
  // pela esquerda e o encontro é raro; aqui é a regra, então a folga é maior de saída.
  const yr = y + alt + (T.centrado ? 0.24 : 0.13) + descida(linhas[linhas.length - 1], corpo);
  // O c365 não risca embaixo do título: ali quem separa título de corpo é o TRECHO
  // colorido dentro da própria frase. Pôr a régua "porque os outros dois têm" faria a
  // página deixar de ser aquele modelo. Sem ela o corpo sobe, senão fica um vão órfão.
  if(T.regua === false) return yr - 0.06;
  // A régua composta do `summit-bh` NÃO mora aqui: no modelo ela separa as duas linhas
  // de apoio, não o título do corpo. Quem a desenha é o layout `chamada`, na altura
  // certa. Pôr uma sob o título faria a página ter duas.
  if(T.regua === "composta") return yr - 0.06;
  // Centrada, a régua tem largura FIXA e nasce no meio da página. Nos outros temas ela
  // SANGRA pela esquerda (começa fora do slide) — ali ela ancora o bloco no canto; aqui
  // sangrar quebraria a simetria, que é a única coisa que este modelo tem de próprio.
  if(T.centrado)
    s.addShape("rect", { x: (L - T.regua_larg) / 2, y: yr, w: T.regua_larg, h: 0.018,
      fill: { color: PAPEL }, line: { type: "none" } });
  else
    s.addShape("rect", { x: 0, y: yr, w: MG + larg * 0.62, h: 0.018,
      fill: { color: T.pesa ? ACENTO : PAPEL }, line: { type: "none" } });
  return yr + 0.1;
}
// O fecho é a última linha da página: a frase que o aluno leva embora. Nos dois
// modelos ela mora no pé, sozinha, sem régua e sem itálico.
// O fecho SEGUE o fim do conteúdo — nunca sobe pra buscar uma altura fixa. Um piso
// ("no mínimo em 5.2") parece inofensivo e é o pior dos dois mundos: numa lista longa
// ele puxa a frase pra DENTRO da lista. O teto existe só pra ela não cair fora do
// slide; a folga até o logo (6.58) cabe as duas linhas de um fecho comprido.
const FECHO_MAX = 5.9;
function fecho(s, txt, y){
  if(!txt) return;
  y = Math.min(y, FECHO_MAX);
  // No c365 o fecho para na coluna de texto. Na largura cheia ele atravessava o painel da
  // foto: sobre o retrato ESCURO de palco ainda dava pra ler, e foi por isso que passou
  // batido — mas a mesma linha sobre uma foto clara simplesmente some, e o fecho é a frase
  // que o aluno leva embora. Duas linhas curtas no escuro ganham de uma comprida na foto.
  // Num tema CENTRADO o fecho também centra, na coluna cheia. Alinhado à esquerda ele é a
  // única coisa fora do eixo numa página em que título, régua, subtítulo e tabela estão
  // todos no meio — e é justo a última linha, a que o aluno leva embora.
  const larg = T.centrado ? COL : T.painel ? 7.6 : COL - 1;
  s.addText(realce(String(txt).toUpperCase(), { fontFace: FONTE_TIT, fontSize: 16, color: PAPEL }), {
    x: MG, y, w: larg, h: T.painel ? 0.85 : 0.6, valign: "top", align: T.centrado ? "center" : "left",
    lineSpacing: 20, fit: "none", margin: 0,
  });
}

// ---------- os layouts ----------
const LAYOUTS = {
  // capa: título grande à esquerda, régua, subtítulo. A foto sangra (mat) ou entra
  // emoldurada à direita (summit, com "moldura": true).
  // Os dois modelos abrem diferente, e a diferença é de VOZ, não de capricho:
  //   summit — bloco à ESQUERDA, o retrato emoldurado ao lado. É uma história: quem
  //            fala tem rosto, e o texto se alinha como parágrafo.
  //   mat    — bloco CENTRADO sobre a foto que sangra. É uma aula: o título é uma
  //            placa, e placa se lê de frente.
  capa(s, d){
    fundo(s, d);
    if(d._emoldurada) moldura(s, d._recorte, L - MG - CAIXA.capa.w, 0.72, CAIXA.capa.w, CAIXA.capa.h);
    const esq = T.pesa;                                 // summit alinha à esquerda
    const larg = d._emoldurada ? 5.9 : 7.4;
    const al = esq ? "left" : "center";
    let y = d.eyebrow ? 1.9 : 2.35;
    if(d.eyebrow){
      s.addText(caixa(d.eyebrow).toUpperCase(), { x: MG, y, w: larg, h: 0.4, align: al,
        fontFace: FONTE, fontSize: 13, color: ACENTO, bold: T.pesa, charSpacing: 3 });
      y += 0.55;
    }
    const t = String(d.titulo).split("\n");
    const maior = Math.max(...t.map(l => l.replace(/\*/g, "").length));
    const LWD = T.largura_tit || T.largura;
    const corpo = corpoQueCabe(maior, larg, maior > 22 ? 40 : 52, undefined, LWD);
    const alt = linhasReais(t, corpo, larg, LWD) * (corpo * 1.2 / 72);
    s.addText(paragrafos(t, { fontFace: FONTE_DISPLAY, fontSize: corpo, color: PAPEL, align: al },
      soCorDisplay()).map(r => ({ ...r, text: r.text.toUpperCase() })), {
      x: MG, y, w: larg, h: alt, valign: "top", lineSpacing: corpo * 1.2, fit: "none", margin: 0,
    });
    const yr = y + alt + 0.24 + descida(t[t.length - 1], corpo);
    s.addShape("rect", { x: esq ? MG : MG + 1.4, y: yr, w: esq ? larg * 0.72 : larg - 2.8, h: 0.018,
      fill: { color: esq ? ACENTO : PAPEL }, line: { type: "none" } });
    if(d.texto)
      s.addText(paragrafos(String(d.texto).split("\n").map(caixa),
        { fontFace: T.pesa ? FONTE : FONTE_TIT, fontSize: 17, color: "E4E4E6", align: al }),
        { x: MG, y: yr + 0.3, w: larg, h: 1.2, valign: "top", lineSpacing: 27 });
    if(d.fecho)
      s.addText(realce(caixa(d.fecho), { fontFace: T.pesa ? T.forte : FONTE_TIT, fontSize: 17,
        color: PAPEL, align: al }), { x: MG, y: 5.35, w: larg, h: 0.5, valign: "middle" });
    selo(s, d);
  },

  // foto: o layout de contar história — título + apoio à esquerda, um retrato
  // EMOLDURADO em ouro à direita. É a página que mais se repete em "O propósito".
  foto(s, d, n){
    fundo(s, d);
    // A coluna de texto para ONDE A MOLDURA COMEÇA. Sem essa conta o título transborda
    // e passa por baixo da foto — e no console tudo "gerou".
    const col = L - MG - CAIXA.moldura.w - MG - 0.2;
    const y = titulo(s, d.titulo, 1.35, col);
    if(d._emoldurada) moldura(s, d._recorte, L - MG - CAIXA.moldura.w, 1.5, CAIXA.moldura.w, CAIXA.moldura.h);
    // Apoio em BOLD, não em ExtraBold: o ExtraBold é do título, e no corpo ele fica
    // largo demais — a linha estourava a coluna e rachava no meio da frase.
    if(d.texto)
      s.addText(paragrafos(String(d.texto).split("\n").map(caixa),
        { fontFace: FONTE, bold: T.pesa, fontSize: 18, color: PAPEL }),
        { x: MG, y: y + 0.45, w: col, h: 2.2, valign: "top", lineSpacing: 28 });
    fecho(s, d.fecho, 5.9);
    rodape(s, d, n);
  },

  // duas-fotos: o antes × depois. Título centrado no alto, as duas fotos emolduradas
  // lado a lado, e a legenda embaixo — a segunda linha é o remate, em peso forte.
  "duas-fotos"(s, d, n){
    fundo(s, d);
    const t = String(d.titulo).split("\n");
    const corpoT = 34;
    const nl = linhasReais(t, corpoT, COL);
    s.addText(paragrafos(t, { fontSize: corpoT, color: PAPEL, align: "center",
      fontFace: (T.pesa && d.titulo.includes("**")) ? FONTE_LEVE : FONTE_TIT,
    }).map(r => ({ ...r, text: r.text.toUpperCase() })), {
      x: MG, y: 0.5, w: COL, h: nl * (corpoT * 1.24 / 72), valign: "top", lineSpacing: corpoT * 1.24 });
    const fotos = d._recortes || [];
    const vao = 0.22;
    const topo = 0.6 + nl * (corpoT * 1.24 / 72) + 0.12;
    // A ALTURA manda, não a largura. Preenchendo a largura toda, as duas fotos ficam
    // tão altas que a legenda cai em cima do logo — e é a legenda que faz o par de
    // fotos dizer alguma coisa. Aqui elas encolhem juntas até sobrar o pé da página.
    const razao = CAIXA.duas_fotos.w / CAIXA.duas_fotos.h;
    const teto = (d.linhas ? 5.45 : 6.3) - topo;
    let larg = (COL - vao * (fotos.length - 1)) / fotos.length;
    const alt = Math.min(larg / razao, teto);
    larg = alt * razao;
    const esq = (L - (larg * fotos.length + vao * (fotos.length - 1))) / 2;
    fotos.forEach((f, i) => moldura(s, f, esq + i * (larg + vao), topo, larg, alt));
    if(d.linhas)
      s.addText(paragrafos(d.linhas, i => ({
        fontFace: i === d.linhas.length - 1 && T.pesa ? T.forte : FONTE,
        bold: !T.pesa, fontSize: 17, color: PAPEL, align: "center" })),
        { x: MG, y: topo + alt + 0.18, w: COL, h: 0.9, valign: "top", lineSpacing: 26 });
    rodape(s, d, n);
  },

  // declaracao: a frase É a página. Sem foto, sem bullet, sem card — só o título
  // centrado, a régua, e uma ou duas linhas de apoio. É o slide que respira.
  declaracao(s, d, n){
    fundo(s, d);
    const t = String(d.titulo).split("\n");
    const maior = Math.max(...t.map(l => l.replace(/\*/g, "").length));
    const corpo = maior > 26 ? 36 : 44;
    const alt = linhasReais(t, corpo, COL, T.largura_tit || T.largura) * (corpo * 1.25 / 72);
    const topo = (A - alt - 1.4) / 2;
    const base = T.titulo_fonte || ((T.pesa && d.titulo.includes("**")) ? FONTE_LEVE : FONTE_TIT);
    s.addText(paragrafos(t, { fontFace: base, fontSize: corpo,
      color: PAPEL, align: "center" }, soCorDisplay()).map(r => ({ ...r, text: r.text.toUpperCase() })), {
      x: MG, y: topo, w: COL, h: alt, valign: "top", lineSpacing: corpo * 1.25, fit: "none", margin: 0 });
    const yr = topo + alt + 0.16 + descida(t[t.length - 1], corpo);
    s.addShape("rect", { x: L / 2 - 3, y: yr, w: 6, h: 0.018, fill: { color: ACENTO }, line: { type: "none" } });
    if(d.linhas)
      s.addText(paragrafos(d.linhas.map(caixa), i => ({
        fontFace: i === 0 && T.pesa ? T.forte : FONTE, fontSize: 19, color: PAPEL, align: "center" })),
        { x: MG, y: yr + 0.28, w: COL, h: 1.4, valign: "top", lineSpacing: 30 });
    rodape(s, d, n);
  },

  // contato: o fecho que pede AÇÃO — o bloco de dados à esquerda, o QR à direita.
  // O QR não leva moldura dourada: ele precisa da borda branca pra ser LIDO pela câmera.
  contato(s, d, n){
    fundo(s, d);
    const y = titulo(s, d.titulo, 1.9, 5.6);
    if(d.linhas)
      // `caixa` porque o tema manda: num deck em que TODO o corpo vai em maiúscula (o
      // `mat`), a única página em caixa baixa é a de contato — e ela é justamente a que
      // fica projetada enquanto a plateia aponta a câmera. Nos temas de caixa baixa a
      // função não faz nada, então nada muda nos decks que já existem.
      s.addText(paragrafos(d.linhas.map(caixa), i => ({
        fontFace: T.pesa && d.fortes && d.fortes.includes(i) ? T.forte : FONTE,
        fontSize: 16, color: PAPEL })),
        { x: MG, y: y + 0.4, w: 5.6, h: 3.2, valign: "top", lineSpacing: 26 });
    if(d._qr){
      const lado = 4.3;
      s.addShape("rect", { x: L - MG - lado, y: (A - lado) / 2, w: lado, h: lado,
        fill: { color: PAPEL }, line: { type: "none" } });
      s.addImage({ data: d._qr, x: L - MG - lado + 0.25, y: (A - lado) / 2 + 0.25,
        w: lado - 0.5, h: lado - 0.5 });
    }
    selo(s, d);
  },

  // texto corrido: 1 a 4 linhas, a primeira em display
  texto(s, d, n){
    fundo(s, d);
    let y = titulo(s, d.titulo);
    const linhas = d.linhas || [];
    const grande = linhas.length <= 3;
    s.addText(paragrafos(linhas, i => ({
      fontFace: grande && i === 0 ? FONTE_TIT : FONTE,
      fontSize: grande ? (i === 0 ? 30 : 22) : 20,
      color: i === 0 ? PAPEL : "C8C8CA",
    })), { x: MG, y: y + 0.35, w: COL - 1.2, h: 3.4, valign: "top", lineSpacing: grande ? 42 : 34,
           paraSpaceAfter: grande ? 8 : 4 });
    fecho(s, d.fecho, 5.55);
    rodape(s, d, n);
  },

  // lista com marca: bullet (o padrão dos modelos) / check (ouro) / x (vermelho) / número.
  // É a página que mais aparece no deck do MAT: título, régua, três a cinco itens com
  // UMA palavra em ouro cada, e o fecho embaixo. O texto ocupa só a METADE ESQUERDA
  // quando há foto — a direita é da imagem, e escrever por cima dela é o defeito nº 1.
  lista(s, d, n){
    fundo(s, d);
    let y = titulo(s, d.titulo);
    // Com foto sangrando o texto se recolhe — mas pode passar um pouco do painel: a
    // borda esquerda dele está dissolvida no escuro, e é ali que a letra ainda ganha.
    const meia = d.foto && !d._emoldurada;
    const util = meia ? 7.0 : COL;
    const intro = d.intro ? [].concat(d.intro) : [];
    if(intro.length){
      // No summit o corpo é Montserrat BOLD, não ExtraBold: o ExtraBold é peso de
      // TÍTULO, e usado no item da lista faz tudo na página gritar igual.
      // No summit o corpo é Montserrat BOLD, não ExtraBold: o ExtraBold é peso de TÍTULO,
      // e no item da lista faz tudo na página gritar igual. No mat a Rubik One não TEM
      // negrito — pedir `bold` faria o PowerPoint falsificar um, e o traço engorda torto.
      // ⚠️ A altura sai das linhas REAIS, não do número de entradas do array. Reservando
      // 0,4" por entrada, uma intro de uma frase longa (que o PowerPoint quebra em três)
      // ocupava 1,1" e recebia 0,4": o primeiro item da lista saía IMPRESSO por cima da
      // última linha dela, e o console dizia "ok". É o mesmo erro que a régua da capa já
      // tinha cometido, e a conta que conserta é a mesma: `linhasReais`.
      const nl = linhasReais(intro, 17, util);
      s.addText(paragrafos(intro.map(caixa), { fontFace: FONTE, bold: T.pesa,
        fontSize: 17, color: PAPEL }),
        { x: MG, y: y + 0.18, w: util, h: 0.37 * nl, valign: "top", lineSpacing: 26 });
      y += 0.28 + 0.37 * nl;
    }
    const itens = d.itens || [];
    const cols = !meia && itens.length > 6 ? 2 : 1;
    const porCol = Math.ceil(itens.length / cols);
    const larg = cols === 2 ? (util - 0.7) / 2 : util - 0.4;
    // O vão entre os itens é o que faz a lista respirar — nos modelos ele é quase o
    // dobro da altura da linha. Lista apertada vira parágrafo picado.
    // Com fecho o chão da lista SOBE. Fixo em 5.4, uma lista de sete itens descia até
    // 5.9 e o fecho (que tem teto ali) encostava no último bullet — os dois viravam um
    // parágrafo de oito linhas, e some o remate, que é a frase que o aluno leva embora.
    const sobra = (d.fecho ? 5.1 : 5.4) - (y + 0.3);
    // O piso de 0,5" foi calibrado em item de 20pt. Acima de seis itens o corpo já cai
    // pra 17pt sozinho (ver `corpo`, abaixo), e aí 0,44" continua arejado — sem isso uma
    // lista de sete com fecho não tinha como caber: o piso segurava a lista em 5,75" e o
    // fecho, que tem teto em 5,9", encostava nela.
    const alt = Math.min(0.86, Math.max(itens.length > 6 ? 0.44 : 0.5, sobra / porCol));
    // Cada item ocupa UMA linha, e é por isso que ele existe: bullet que racha em duas
    // encosta no de baixo (a altura da linha é fixa) e a lista vira um borrão. O item
    // mais comprido é quem decide o corpo de todos.
    const largTexto = larg - 0.42;
    const maiorItem = Math.max(...itens.map(it => it.replace(/\*/g, "").length), 1);
    const corpo = Math.min(itens.length > 6 ? 17 : itens.length > 4 ? 19 : 21,
      corpoQueCabe(maiorItem, largTexto, 21));
    const marca = d.marca_item || "bullet";
    const cor = marca === "x" ? VERMELHO : marca === "bullet" ? PAPEL : ACENTO;
    const largMarca = marca === "numero" ? 0.6 : 0.34;   // "04" racha em dois se a caixa aperta
    const topo = y + 0.3;

    itens.forEach((it, i) => {
      const c = Math.floor(i / porCol), r = i % porCol;
      const x = MG + c * (larg + 0.7);
      const yy = topo + r * alt;
      const sinal = marca === "x" ? "✕" : marca === "check" ? "✓"
                  : marca === "numero" ? String(i + 1).padStart(2, "0") : "•";
      s.addText(sinal, { x, y: yy, w: largMarca, h: alt,
        fontFace: marca === "numero" ? FONTE_TIT : FONTE,
        fontSize: marca === "numero" ? corpo - 4 : corpo,
        color: cor, bold: T.pesa, valign: "middle" });
      s.addText(realce(caixa(it), { fontFace: FONTE, bold: T.pesa, fontSize: corpo, color: PAPEL }),
        { x: x + largMarca + 0.08, y: yy, w: larg - largMarca - 0.08, h: alt, valign: "middle" });
    });
    fecho(s, d.fecho, Math.max(topo + porCol * alt + 0.3, 5.5));
    rodape(s, d, n);
  },

  // cascata: a corrente vertical do "↓". No roteiro do Comercial 365 ela é o desenho
  // mais repetido (o mapa do dia, os 5 estágios, o fluxo completo, a hierarquia do
  // vínculo), e o `fluxo` horizontal não serve: com nove elos ele quebra em duas fileiras
  // e a ordem deixa de ser óbvia — que é a única coisa que a página existe pra dizer.
  //
  // A seta desenhada entre um elo e outro comeria a altura que os elos precisam, então o
  // encadeamento vira um TRILHO: uma linha vertical contínua à esquerda com um ponto em
  // cada elo. Diz "isto vem depois daquilo" ocupando 0,14" de largura e zero de altura.
  // O último ponto é maior e vai no acento: é onde a corrente chega.
  //
  // Cada item é uma string ou { titulo, texto } — o par existe porque metade dos slides
  // nomeia o elo e explica embaixo ("SDR" / "Acolhe, qualifica e agenda").
  cascata(s, d, n){
    fundo(s, d);
    let y = titulo(s, d.titulo);
    const itens = (d.itens || []).map(it => typeof it === "string" ? { texto: it } : it);
    const meia = d.foto && !d._emoldurada;
    const util = (meia ? 7.0 : COL) - 0.5;
    if(d.intro){
      const intro = [].concat(d.intro);
      // Mesma conta da `lista`: linhas REAIS depois da quebra, senão o primeiro elo da
      // corrente sobe pra cima da última linha da intro.
      const nl = linhasReais(intro, 16, util);
      s.addText(paragrafos(intro.map(caixa), { fontFace: FONTE, bold: T.pesa,
        fontSize: 16, color: "C8C8CA" }),
        { x: MG, y: y + 0.16, w: util, h: 0.34 * nl, valign: "top", lineSpacing: 24 });
      y += 0.26 + 0.34 * nl;
    }
    const topo = y + 0.34;
    // O pé da cascata é o fecho, se houver; senão o rodapé. Os elos cedem altura até
    // caber — nove elos numa página que já tem título de duas linhas é o caso real.
    const pe = (d.fecho ? 5.45 : 6.45);
    const par = itens.some(it => it.titulo);
    // O teto do elo existe pra que uma cascata de dois não vire dois blocos jogados no meio
    // de uma página vazia. Só que o elo COM RÓTULO empilha DUAS linhas na caixa em que o elo
    // simples põe uma: com 0,78" sobravam 0,44" pro texto, e 0,44" só aceita uma linha se o
    // corpo cair pra 11pt. Onze pontos se lê no monitor a 60cm e some no telão a dez metros,
    // que é onde este deck vive. O par ganha caixa maior; o elo simples segue como estava.
    const alt = Math.max(0.32, Math.min(par ? 1.06 : 0.78,
      (pe - topo) / Math.max(itens.length, 1)));
    const xTrilho = MG + 0.13, xTexto = MG + 0.46;
    const largTexto = util - 0.46;
    // O corpo cede ao elo mais comprido: item que racha em duas linhas encosta no de
    // baixo, e numa corrente isso faz dois elos virarem um borrão só.
    // O elo não precisa caber em UMA linha: ele precisa caber na CAIXA dele. A diferença
    // não é acadêmica — numa cascata de dois elos a caixa comporta três linhas com folga,
    // e numa de oito ela comporta uma só. Medir "cabe em uma linha?" reprovava as duas
    // por igual e mandava encurtar copy que estava perfeita. Aqui a conta é a real: quantas
    // linhas a caixa aceita neste corpo, contra quantas o elo mais longo precisa.
    //
    // `linhasReais` cobra T.largura por caractere, que é a largura de uma MAIÚSCULA: a
    // medida certa pro título em caixa alta e cara demais pra frase em caixa mista, que é
    // o que o elo tem. Medido no render do próprio deck: 0,56 em por caractere contra os
    // 0,78 cobrados. Pagando o preço cheio, um cronograma que comportava 17pt saía a 10pt
    // — não porque faltava página, mas porque a régua estava errada.
    //
    // O desconto é 0,80 e não os 0,71 medidos de propósito: errar a régua pra CIMA custa
    // texto menor que o necessário, errar pra BAIXO custa linha sobreposta em cima do elo
    // seguinte. Os dois são defeito, só que um se lê apertado e o outro não se lê.
    // (As caixas do elo levam `margin: 0` — sem isso o PowerPoint come 0,1" de cada lado
    // e a conta, que mede pela largura declarada, promete espaço que a caixa não tem.)
    const MISTA = 0.80;
    // No elo DEITADO o rótulo vira uma COLUNA de largura fixa, medida pelo rótulo mais
    // comprido. Deixar cada texto começar onde o seu rótulo acabou dava uma margem esquerda
    // serrilhada ("AULA 6" e "AULA 10" não têm a mesma largura), e oito começos diferentes
    // numa lista de oito itens é o tipo de detalhe que ninguém sabe nomear mas todo mundo vê.
    const largRotulo = c => Math.max(...itens.map(it => String(it.titulo || "").length)) *
      (T.largura * Math.max(10, c - 3) + 1.2) / 72 + 0.34;
    // O elo com rótulo tem dois desenhos possíveis. EMPILHADO: nome em cima, definição
    // embaixo — mais bonito, e o que o deck usa quando sobra altura. DEITADO: nome e
    // definição na mesma linha, o nome numa coluna à esquerda — aproveita a largura que
    // sobra quando a altura acabou. Regra fixa ("deita se o elo for baixo") errava dos dois
    // lados: deitava página que comportava o empilhado e mantinha empilhado cronograma que
    // por isso saía a 10pt. Então o motor resolve os dois e fica com o que lê de mais longe,
    // que é o único critério que importa num deck de palco.
    function resolver(deitado){
      const hT = (par && !deitado) ? alt * 0.62 : alt;
      const cabem = c => Math.max(1, Math.floor(hT / (c * 1.25 / 72)));
      const precisa = c => Math.max(...itens.map(it =>
        linhasReais([it.texto || ""], (par && !deitado ? c - 2 : c) * MISTA,
          deitado ? largTexto - largRotulo(c) : largTexto)), 1);
      let c = Math.min(alt > 0.6 ? 19 : alt > 0.45 ? 17 : 15, 19);
      while(c > 10 && precisa(c) > cabem(c)) c--;
      return { corpo: c, estoura: precisa(c) > cabem(c), hT };
    }
    const empilhado = resolver(false);
    const deitado = par ? resolver(true) : null;
    if(d.elo && !["deitado", "empilhado"].includes(d.elo))
      console.warn(`aviso: elo '${d.elo}' desconhecido — use: deitado · empilhado.`);
    // Ganho de um ponto não paga a troca de desenho: o empilhado é o elo do deck, e trocar
    // por 19pt onde o empilhado já dava 18 mudaria metade das páginas por nada. Só deita
    // quando o empilhado está de fato quebrando (três pontos ou mais de diferença) — ou
    // quando o slide manda, via `"elo": "deitado"`, que é o caso das páginas irmãs que
    // precisam sair iguais mesmo tendo quantidade diferente de elo.
    const inline = par && (d.elo ? d.elo === "deitado"
      : deitado.corpo >= empilhado.corpo + 3);
    const escolha = inline ? deitado : empilhado;
    const corpo = escolha.corpo, hTexto = escolha.hT;
    if(process.env.DEBUG_CASCATA) console.log(`[cascata] "${String(d.titulo).split("\n")[0]}" ` +
      `n=${itens.length} topo=${topo.toFixed(2)} alt=${alt.toFixed(3)} par=${par} ` +
      `inline=${inline} corpo=${corpo}` +
      (par ? ` (empilhado=${empilhado.corpo} deitado=${deitado.corpo})` : "") +
      ` estoura=${escolha.estoura}`);
    // A 10pt e ainda estourando é copy comprida demais pro layout, não fonte grande demais:
    // espremer mais deixaria ilegível e o texto sairia por cima do elo de baixo do mesmo
    // jeito. O motor avisa e segue — quem conserta é a copy.
    if(escolha.estoura)
      console.warn(`aviso: os elos de "${String(d.titulo).split("\n")[0].replace(/\*/g, "")}" ` +
        `não cabem nem a 10pt (${itens.length} elos, o mais longo com ` +
        `${Math.max(...itens.map(it => (it.texto || "").length))} caracteres) — encurte o texto.`);
    // O trilho nasce e morre NO PONTO, não na borda da caixa: sobrando, ele vira um
    // risco solto pendurado embaixo do último elo.
    const yIni = topo + alt / 2, yFim = topo + (itens.length - 1) * alt + alt / 2;
    if(itens.length > 1)
      s.addShape("rect", { x: xTrilho, y: yIni, w: 0.022, h: yFim - yIni,
        fill: { color: "3A3A40" }, line: { type: "none" } });
    // O ponto cheio no acento marca ONDE A CORRENTE CHEGA, e o padrão é o último elo —
    // que é o certo quando a lista é uma sequência que termina em algo ("Pós-venda",
    // "Documentação"). Mas nem toda cascata sobe: a HIERARQUIA DO VÍNCULO vai do melhor
    // (presencial) ao pior (texto), e marcar o último elo pintava "Texto" como o destino,
    // dizendo o contrário da página. `destaque` escolhe: ultimo (padrão) · primeiro · nenhum.
    const destaque = d.destaque || "ultimo";
    if(!["ultimo", "primeiro", "nenhum"].includes(destaque))
      console.warn(`aviso: destaque '${destaque}' desconhecido — use: ultimo · primeiro · nenhum.`);
    itens.forEach((it, i) => {
      const yy = topo + i * alt;
      const ult = destaque === "primeiro" ? i === 0
        : destaque === "nenhum" ? false
        : i === itens.length - 1;
      const raio = ult ? 0.075 : 0.05;
      s.addShape("ellipse", { x: xTrilho + 0.011 - raio, y: yy + alt / 2 - raio,
        w: raio * 2, h: raio * 2,
        fill: { color: ult ? ACENTO : "6A6A72" }, line: { type: "none" } });
      if(it.titulo && inline){
        const lr = largRotulo(corpo);
        s.addText(String(it.titulo).toUpperCase(), { x: xTexto, y: yy, w: lr, h: alt,
          fontFace: FONTE_TIT, fontSize: Math.max(10, corpo - 3), color: ACENTO,
          charSpacing: 1.2, valign: "middle", margin: 0 });
        s.addText(realce(caixa(it.texto || ""), { fontFace: FONTE, bold: T.pesa,
          fontSize: corpo, color: PAPEL }),
          { x: xTexto + lr, y: yy, w: largTexto - lr, h: alt, valign: "middle", margin: 0 });
      } else if(it.titulo){
        // Rótulo do elo: pequeno, no acento, espaçado. É ele que faz "SDR" e "Acolhe,
        // qualifica e agenda" lerem como nome e definição, não como duas frases soltas.
        s.addText(String(it.titulo).toUpperCase(), { x: xTexto, y: yy, w: largTexto, h: alt * 0.36,
          fontFace: FONTE_TIT, fontSize: Math.max(10, corpo - 7), color: ACENTO,
          charSpacing: 1.4, valign: "middle", margin: 0 });
        s.addText(realce(caixa(it.texto || ""), { fontFace: FONTE, bold: T.pesa,
          fontSize: corpo - 2, color: PAPEL }),
          { x: xTexto, y: yy + alt * 0.34, w: largTexto, h: alt * 0.62,
            valign: "middle", margin: 0 });
      } else {
        s.addText(realce(caixa(it.texto || ""), { fontFace: ult ? FONTE_TIT : FONTE,
          bold: T.pesa && !ult, fontSize: corpo, color: ult ? PAPEL : "E4E4E6" }),
          { x: xTexto, y: yy, w: largTexto, h: alt, valign: "middle", margin: 0 });
      }
    });
    fecho(s, d.fecho, topo + itens.length * alt + 0.22);
    rodape(s, d, n);
  },

  // secao: a divisória de bloco — UMA palavra gigante no acento sobre a foto que sangra.
  // É a página que dá ritmo ao deck longo: sem ela, 53 slides de título-e-bullet viram
  // uma esteira sem começo nem fim. No modelo do dono cada divisória repete a COR da
  // etapa que anuncia, e é por isso que o `acento` por slide existe.
  // Sem título de página, sem régua, sem bullet: a palavra É a página.
  secao(s, d, n){
    fundo(s, d);
    const t = String(d.titulo).split("\n");
    const maior = Math.max(...t.map(l => l.replace(/\*/g, "").length));
    // A coluna é a metade esquerda quando há foto sangrando — escrever por cima do
    // assunto da imagem é o defeito nº 1 do layout de foto.
    const larg = d.foto && !d._emoldurada ? 6.6 : COL;
    const LWD = T.largura_tit || T.largura;
    const corpo = corpoQueCabe(maior, larg, 54, undefined, LWD);
    const alt = linhasReais(t, corpo, larg, LWD) * (corpo * 1.14 / 72);
    const temApoio = d.linhas && d.linhas.length;
    // `abaixo` é a frase que EXPLICA a divisória, e ela vem depois da palavra, não antes:
    // o rótulo de cima diz onde você está no deck ("PILAR 2"), a palavra é o nome do
    // pilar, e a frase é o que ele significa. Numa sequência de dez divisórias, alguns
    // pilares se explicam sozinhos e outros não — sem este campo, os que precisam de uma
    // linha teriam que ir em OUTRO layout, e a sequência perderia o ritmo, que é a única
    // coisa que dez páginas iguais têm a oferecer.
    const ab = d.abaixo ? [].concat(d.abaixo) : [];
    const altAb = ab.length ? 0.42 * ab.length + 0.3 : 0;
    // O rótulo ("BLOCO 2") vai ACIMA da palavra, pequeno e espaçado, em cinza. Embaixo e
    // em branco ele lia como uma frase que ficou pela metade; em cima ele é o que é, uma
    // etiqueta de capítulo, e deixa a palavra colorida ser o único peso da página.
    const altRot = temApoio ? 0.52 : 0;
    // ⚠️ Centrado verticalmente, o título PULA de altura entre uma divisória e outra: uma
    // de uma linha nasce mais baixa que uma de duas. Isolada no meio de um deck isso não
    // aparece, e no c365 (que é onde a `secao` nasceu) ela é sempre isolada. Numa
    // SEQUÊNCIA — os dez pilares desta palestra, um slide atrás do outro — o pulo é a
    // primeira coisa que se vê, e só aparece com as páginas lado a lado na folha de
    // contato. Tema que declara onde o texto começa (`titulo_y`) ancora ali e todas as
    // páginas da série nascem na mesma linha; os outros continuam centrando.
    const y = T.titulo_y !== undefined ? T.titulo_y + altRot
      : (A - alt - altRot - altAb) / 2 + altRot;
    if(temApoio)
      s.addText(d.linhas.map(l => String(l).toUpperCase()).join("   ·   "),
        { x: MG, y: y - altRot - 0.06, w: larg, h: 0.4, fontFace: FONTE, bold: T.pesa,
          fontSize: 13, color: "8A8A92", charSpacing: 3.2, valign: "middle" });
    s.addText(paragrafos(t, { fontFace: FONTE_DISPLAY, fontSize: corpo, color: ACENTO },
      soCorDisplay()).map(r => ({ ...r, text: r.text.toUpperCase() })), {
      x: MG, y, w: larg, h: alt, valign: "top", lineSpacing: corpo * 1.14, fit: "none", margin: 0 });
    // A frase de baixo vai em BRANCO e no corpo do texto, não no acento: a página já tem
    // a palavra inteira colorida, e dois blocos na mesma cor deixariam de ter hierarquia.
    // A folga leva a DESCIDA da última linha do título: "EXECUÇÃO." termina em Ç, e a
    // cedilha de um display de 54pt desce bem abaixo da caixa de texto — sem isso ela
    // encosta na primeira palavra da frase de baixo.
    if(ab.length)
      s.addText(paragrafos(ab.map(caixa), { fontFace: FONTE, fontSize: 17, color: "D8D8DA" }),
        { x: MG, y: y + alt + 0.34 + descida(t[t.length - 1], corpo),
          w: Math.min(larg, 8.6), h: 0.42 * ab.length,
          valign: "top", lineSpacing: 26, fit: "none", margin: 0 });
    rodape(s, d, n);
  },

  // cards: 3 a 5 chips grandes lado a lado (as características, os pilares)
  cards(s, d, n){
    fundo(s, d);
    let y = titulo(s, d.titulo);
    const itens = d.itens || [];
    const vao = 0.28;
    const larg = (COL - vao * (itens.length - 1)) / itens.length;
    const topo = y + 0.75;
    // A altura do cartão CEDE ao que sobrou da página, como no `ranking` e no `colunas`.
    // Cravada em 2,1", um título de três linhas (que é o que acontece quando a copy do dono
    // não cabe em duas) empurrava os cartões até 5,9" — exatamente o teto do `fecho` — e a
    // frase saía IMPRESSA por cima deles. O console dizia "ok"; só a imagem mostrava.
    const alt = Math.max(1.5, Math.min(2.1, (d.fecho ? 5.35 : 6.2) - topo));
    // palavra comprida ("COMUNICAÇÃO") racha no meio se a fonte não ceder ao card
    const maiorPalavra = Math.max(...itens.map(it => Math.max(...it.split(/\s+/).map(p => p.length))));
    const corpo = maiorPalavra > 10 ? 15 : itens.length > 4 ? 18 : 21;
    itens.forEach((it, i) => {
      const x = MG + i * (larg + vao);
      s.addShape("roundRect", { x, y: topo, w: larg, h: alt, rectRadius: 0.08,
        fill: { color: "141416" }, line: { color: "26262A", width: 1 } });
      s.addShape("rect", { x, y: topo, w: larg, h: 0.05, fill: { color: ACENTO }, line: { type: "none" } });
      s.addText(String(i + 1).padStart(2, "0"), { x, y: topo + 0.28, w: larg, h: 0.4,
        fontFace: FONTE_TIT, fontSize: 13, color: ACENTO, align: "center" });
      s.addText(realce(it.toUpperCase(), { fontFace: FONTE_TIT, fontSize: corpo, color: PAPEL }),
        { x: x + 0.06, y: topo + 0.75, w: larg - 0.12, h: 1.1, align: "center", valign: "middle", lineSpacing: 24 });
    });
    fecho(s, d.fecho, topo + alt + 0.4);
    rodape(s, d, n);
  },

  // numeros: cards numerados com título + apoio (as 3 prospecções)
  numeros(s, d, n){
    fundo(s, d);
    let y = titulo(s, d.titulo);
    const itens = d.itens || [];
    const vao = 0.32;
    const larg = (COL - vao * (itens.length - 1)) / itens.length;
    const alt = 2.7, topo = y + 0.7;
    itens.forEach((it, i) => {
      const x = MG + i * (larg + vao);
      s.addShape("roundRect", { x, y: topo, w: larg, h: alt, rectRadius: 0.08,
        fill: { color: "141416" }, line: { color: "26262A", width: 1 } });
      s.addText(String(i + 1), { x: x + 0.35, y: topo + 0.3, w: 0.9, h: 0.9,
        fontFace: FONTE_TIT, fontSize: 46, color: "2E2E33", valign: "middle" });
      s.addText(realce(caixa(it), { fontFace: FONTE, fontSize: 19, color: "E4E4E6" }),
        { x: x + 0.35, y: topo + 1.25, w: larg - 0.7, h: 1.2, valign: "top", lineSpacing: 26 });
    });
    fecho(s, d.fecho, topo + alt + 0.35);
    rodape(s, d, n);
  },

  // fluxo: etapas encadeadas por seta. Até 4 = horizontal; mais = 2 fileiras.
  fluxo(s, d, n){
    fundo(s, d);
    let y = titulo(s, d.titulo);
    // Qual card fica ACESO (fundo tingido, borda no acento). O padrão é o ÚLTIMO, que é o
    // certo quando a fila é um caminho e a página fala do destino ("… → Contrato"). Mas
    // nem toda fila termina no assunto: no mapa dos cinco pilares (marketing → vendas →
    // ENTREGA → custos → lucro) a aula trata do TERCEIRO, e acender o quinto pintava o
    // lucro como tema da página. `"aceso": 3` escolhe (1-based); `0` não acende nenhum.
    // É a mesma correção que o `destaque` da `cascata` já tinha recebido, pela mesma razão:
    // a cor tem semântica, e cor no elo errado diz o contrário do texto.
    const aceso = d.aceso === undefined ? null : d.aceso;
    if(aceso !== null && (aceso < 0 || aceso > (d.etapas || []).length))
      console.warn(`aviso: "aceso": ${aceso} em "${String(d.titulo).split("\n")[0]}" está fora ` +
        `da fila (1 a ${(d.etapas || []).length}) — nenhum card vai acender.`);
    const desenha = (etapas, topo, porFila) => {
      porFila = porFila || (etapas.length <= 4 ? etapas.length : Math.ceil(etapas.length / 2));
      const filas = Math.ceil(etapas.length / porFila);
      const corpo = porFila >= 6 ? 13 : porFila === 5 ? 15 : porFila === 4 ? 16 : 18;
      const vao = porFila >= 6 ? 0.38 : 0.5;
      const larg = (COL - vao * (porFila - 1)) / porFila;
      const alt = 0.78;
      etapas.forEach((e, i) => {
        const f = Math.floor(i / porFila), c = i % porFila;
        const x = MG + c * (larg + vao);
        const yy = topo + f * (alt + 0.42);
        const ult = aceso === null ? i === etapas.length - 1 : i === aceso - 1;
        s.addShape("roundRect", { x, y: yy, w: larg, h: alt, rectRadius: 0.1,
          fill: { color: ult ? A_.fundo : "141416" },
          line: { color: ult ? ACENTO : "2A2A2E", width: ult ? 1.5 : 1 } });
        s.addText(realce(caixa(e), { fontFace: ult ? FONTE_TIT : FONTE, fontSize: corpo,
          color: ult ? ACENTO : "E4E4E6", bold: !ult }),
          { x: x + 0.08, y: yy, w: larg - 0.16, h: alt, align: "center", valign: "middle" });
        if(c < porFila - 1 && i < etapas.length - 1)
          s.addText("→", { x: x + larg, y: yy, w: vao, h: alt, fontFace: FONTE, fontSize: 20,
            color: ACENTO, align: "center", valign: "middle" });
      });
      return topo + filas * alt + (filas - 1) * 0.42;
    };
    let cursor = y + 0.5;
    if(d.intro){
      s.addText(realce(caixa(d.intro), { fontFace: FONTE, fontSize: 16, color: CINZA }),
        { x: MG, y: cursor - 0.42, w: COL, h: 0.4, valign: "middle" });
    }
    cursor = desenha(d.etapas || [], cursor, d.por_fila);
    if(d.etapas2){
      cursor += 0.8;
      s.addText(realce(caixa(d.intro2 || ""), { fontFace: FONTE, fontSize: 16, color: CINZA }),
        { x: MG, y: cursor - 0.45, w: COL, h: 0.4, valign: "middle" });
      cursor = desenha(d.etapas2, cursor, d.por_fila2);
    }
    if(d.linhas)
      s.addText(paragrafos(d.linhas, { fontFace: FONTE, fontSize: 19, color: "C8C8CA" }),
        { x: MG, y: cursor + 0.35, w: COL, h: 1, valign: "top", lineSpacing: 28 });
    fecho(s, d.fecho, 5.9);
    rodape(s, d, n);
  },

  // ranking: pódio de prioridade
  ranking(s, d, n){
    fundo(s, d);
    let y = titulo(s, d.titulo);
    const itens = d.itens || [];
    const topo = y + 0.45;
    // A escada é ELÁSTICA, e não era: com altura fixa de 0.7 a quarta linha passava de
    // 5.9 e o `fecho` (que tem teto ali) subia PRA DENTRO dela — a frase saía impressa
    // por cima do 4º lugar. Aqui as linhas cedem até o fecho caber embaixo. Piso em 0.5
    // porque o texto é 20pt: abaixo disso a linha aperta a letra.
    const teto = (d.fecho ? 5.35 : 6.2) - topo;
    const alt = Math.max(0.5, Math.min(0.7, teto / Math.max(itens.length, 1) - 0.13));
    const cores = A_.escada;
    itens.forEach((it, i) => {
      const yy = topo + i * (alt + 0.13);
      const larg = COL - i * 0.55;                       // escada: prioridade encurta
      s.addShape("roundRect", { x: MG, y: yy, w: larg, h: alt, rectRadius: 0.08,
        fill: { color: "141416" }, line: { color: "26262A", width: 1 } });
      s.addShape("rect", { x: MG, y: yy, w: 0.07, h: alt, fill: { color: cores[i] || "4A4A50" }, line: { type: "none" } });
      s.addText(String(i + 1) + "º", { x: MG + 0.35, y: yy, w: 0.8, h: alt,
        fontFace: FONTE_TIT, fontSize: 20, color: cores[i] || "4A4A50", valign: "middle" });
      s.addText(realce(caixa(it), { fontFace: FONTE, fontSize: 20, color: "E4E4E6", bold: true }),
        { x: MG + 1.2, y: yy, w: larg - 1.4, h: alt, valign: "middle" });
    });
    fecho(s, d.fecho, topo + itens.length * (alt + 0.13) + 0.25);
    rodape(s, d, n);
  },

  // colunas: blocos com subtítulo + itens (o dia perfeito, os indicadores)
  colunas(s, d, n){
    fundo(s, d);
    let y = titulo(s, d.titulo);
    const g = d.grupos || [];
    const vao = 0.3;
    const larg = (COL - vao * (g.length - 1)) / g.length;
    const topo = y + 0.55;
    // cards de altura igual, texto fluindo de cima. Item que quebra em duas linhas
    // empurra o seguinte — por isso a lista é UM bloco, não um item por caixa.
    const alt = (d.fecho ? 5.5 : 6.1) - topo;
    const estreito = g.length >= 4;
    // O corpo CEDE até a lista caber dentro do cartão. Fixo em 14/15, uma coluna de sete
    // itens transbordava a borda de baixo e o 7º saía impresso FORA do cartão, no preto
    // (foi o "para cada inferno, uma saída"). O cartão não cresce — quem cede é a letra.
    // Conta em pt: cada item ocupa as linhas que ele REALMENTE quebra (item longo em
    // coluna estreita vira duas) mais 6pt de respiro depois dele.
    const hCaixa = (alt - 1.05) * 72;
    const largTexto = larg - 0.36;
    const maxItens = Math.max(...g.map(x => x.itens.length), 1);
    const ocupa = c => Math.max(...g.map(x => linhasReais(x.itens, c, largTexto))) * (c + 6)
      + 6 * maxItens;
    let corpo = estreito ? 14 : 15;
    while(corpo > 10 && ocupa(corpo) > hCaixa) corpo--;
    if(ocupa(corpo) > hCaixa)
      console.warn(`aviso: as colunas de "${String(d.titulo).split("\n")[0]}" não cabem ` +
        `nem a 10pt — encurte os itens ou tire um do grupo.`);
    // O cartão ENCOLHE quando o conteúdo é curto. Esticado até o pé da página, um grupo de
    // um item só virava um retângulo oco com uma linha no alto e 4" de vazio embaixo (foi
    // o "O mapa", com três perguntas). A altura é a que o conteúdo pede, com teto na folga
    // da página (senão a lista de sete transbordaria de novo) e piso em 1,6" — abaixo
    // disso o cabeçalho e a tarja de acento comem o cartão e ele deixa de ler como cartão.
    const altCheia = (ocupa(corpo) / 72) + 1.05 + 0.25;
    const alt2 = Math.max(1.6, Math.min(alt, altCheia));
    g.forEach((grupo, i) => {
      const x = MG + i * (larg + vao);
      // Cada coluna pode ter o SEU acento (`"acento"` no grupo). Nasceu do cardápio de
      // planos, onde as três colunas não são três exemplos da mesma coisa: são níveis, e
      // é a cor que diz qual é o do meio (o recomendado). Sem isso as três saem iguais e
      // o olho não escolhe. Grupo sem `acento` herda o do slide, como sempre.
      const cor = grupo.acento && ACENTOS[grupo.acento] ? ACENTOS[grupo.acento].cor : ACENTO;
      if(grupo.acento && !ACENTOS[grupo.acento])
        console.warn(`aviso: acento '${grupo.acento}' (coluna "${grupo.titulo}") desconhecido.`);
      s.addShape("roundRect", { x, y: topo, w: larg, h: alt2, rectRadius: 0.08,
        fill: { color: "121214" }, line: { color: "26262A", width: 1 } });
      s.addShape("rect", { x, y: topo, w: larg, h: 0.045, fill: { color: cor }, line: { type: "none" } });
      s.addText(grupo.titulo.toUpperCase(), { x: x + 0.22, y: topo + 0.2, w: larg - 0.44, h: 0.55,
        fontFace: FONTE_TIT, fontSize: 12.5, color: cor, valign: "top", charSpacing: 0.8, lineSpacing: 16 });
      s.addText(
        paragrafos(grupo.itens.map(caixa), {
          fontFace: FONTE, fontSize: corpo, color: "D4D4D8",
          // Marcador de lista com UM item é ruído: ele promete uma lista que não vem.
          // Grupo de um item é uma frase dentro do cartão, e sai sem bolinha.
          ...(grupo.itens.length > 1 ? { bullet: { characterCode: "2022", indent: 12 } } : {}),
        }),
        { x: x + 0.18, y: topo + 0.85, w: larg - 0.36, h: alt2 - 1.05,
          valign: "top", lineSpacing: corpo + 6, paraSpaceAfter: 6 });
    });
    fecho(s, d.fecho, topo + alt2 + 0.22);
    rodape(s, d, n);
  },

  // planos: o cardápio de preço, com o REVELAR progressivo.
  // No modelo do dono os três planos não aparecem juntos: ele mostra o cartão vazio de
  // todos, revela o Básico, depois o Avançado, depois o Individual — e a mesma página se
  // repete quatro vezes. Não é preguiça de slide, é a mecânica de venda: o preço alto
  // aparece DEPOIS que o barato já ancorou. Aqui isso é um campo, `revelado`, e o slide
  // sem ele desenha só o cabeçalho colorido e o corpo vazio.
  //
  // O bloco de preço tem três degraus e a hierarquia é o que faz ele funcionar: o valor
  // ANTIGO pequeno e riscado, o à vista GRANDE e branco, o parcelado embaixo em corpo
  // médio. Riscado no pptx é `strike: true` no run — não é uma forma desenhada por cima,
  // que dançaria se a fonte trocasse de máquina.
  planos(s, d, n){
    fundo(s, d);
    let y = titulo(s, d.titulo);
    if(d.intro){
      s.addText(realce(caixa([].concat(d.intro).join(" ")), { fontFace: FONTE, bold: T.pesa,
        fontSize: 15, color: "C8C8CA" }),
        { x: MG, y: y + 0.12, w: COL, h: 0.34, valign: "top" });
      y += 0.42;
    }
    const g = d.planos || [];
    const vao = 0.28;
    const larg = (COL - vao * (g.length - 1)) / g.length;
    const topo = y + 0.34;
    const alt = 6.55 - topo;
    // O corpo dos itens é UM só pras três colunas, decidido pela mais apertada. Calculado
    // por coluna, cada plano saía num tamanho (12, 11 e 8pt na primeira versão) e o
    // cardápio lia como três slides colados: o olho compara preço, e pra comparar as
    // linhas precisam ter o mesmo peso. O Individual, que sempre tem mais item, é quem
    // manda — e é ele que estava saindo ilegível.
    const largCol = larg - 0.42;
    let corpoItem = 12;
    const cabeTudo = c => g.every(p => {
      if(p.revelado !== true || !p.itens || !p.itens.length) return true;
      let usado = 0.62 + 0.3 + (p.de ? 0.44 : 0) + (p.por ? 0.76 : 0)
        + (p.por && p.parcelas ? 0.8 : 0) + (p.selo ? 0.5 : 0) + (p.bonus ? 1.02 : 0);
      return linhasReais(p.itens, c, largCol) * (c + 5) / 72 <= alt - usado - 0.25;
    });
    while(corpoItem > 8 && !cabeTudo(corpoItem)) corpoItem--;
    if(!cabeTudo(corpoItem))
      console.warn(`aviso: os itens dos planos não cabem nem a 8pt — encurte a lista do plano mais cheio.`);
    g.forEach((p, i) => {
      const x = MG + i * (larg + vao);
      const A2 = ACENTOS[p.acento] || A_;
      if(p.acento && !ACENTOS[p.acento])
        console.warn(`aviso: acento '${p.acento}' (plano "${p.nome}") desconhecido.`);
      // Cartão do plano. O revelado ganha o fundo TINGIDO da cor e a borda acesa; o que
      // ainda não foi revelado fica no cinza morto — é o contraste que faz a plateia
      // olhar pro que o apresentador acabou de virar.
      s.addShape("roundRect", { x, y: topo, w: larg, h: alt, rectRadius: 0.1,
        fill: { color: p.revelado ? A2.fundo : "121214" },
        line: { color: p.revelado ? A2.cor : "26262A", width: p.revelado ? 1.5 : 1 } });
      const hCab = 0.62;
      s.addShape("roundRect", { x, y: topo, w: larg, h: hCab, rectRadius: 0.1,
        fill: { color: A2.cor }, line: { type: "none" } });
      // O nome do plano pousa SOBRE a faixa colorida, então ele é preto: branco sobre
      // #14FF00 ou #E79F13 não tem contraste nenhum.
      s.addText(String(p.nome).toUpperCase(), { x: x + 0.1, y: topo, w: larg - 0.2, h: hCab,
        fontFace: FONTE_TIT, fontSize: p.nome.length > 12 ? 15 : 18, color: PRETO,
        align: "center", valign: "middle", charSpacing: 0.6 });
      if(!p.revelado) return;
      // `revelado: "ancora"` é o degrau do meio: mostra SÓ o valor riscado, sem o preço
      // real. É o momento em que a plateia vê quanto a coisa vale antes de saber quanto
      // vai pagar, e é a metade do trabalho que a âncora faz. Sem esse passo, riscado e
      // preço aparecem juntos e o desconto vira só uma decoração ao lado do número.
      const soAncora = p.revelado === "ancora";
      let cur = topo + hCab + 0.2;
      // `resumo` é a linha que DIFERENCIA os planos, logo abaixo do nome: "10 aulas" x
      // "13 aulas". Estava numa lista de bullets no pé do cartão e não cabia junto com a
      // faixa de bônus; aqui ocupa 0,3" e fica onde o olho já está, comparando.
      if(p.resumo && !soAncora){
        s.addText(String(p.resumo), { x: x + 0.15, y: cur, w: larg - 0.3, h: 0.3,
          fontFace: FONTE, bold: T.pesa, fontSize: 12, color: A2.cor,
          align: "center", valign: "middle" });
        cur += 0.34;
      }
      if(p.de){
        // Sozinho na tela, o riscado é o assunto da página: entra grande e branco. Ao lado
        // do preço real ele vira nota de rodapé, e aí encolhe e apaga.
        s.addText(p.de, { x, y: cur, w: larg, h: soAncora ? 0.72 : 0.4,
          fontFace: soAncora ? FONTE_TIT : FONTE, bold: T.pesa,
          fontSize: soAncora ? 26 : 17, color: soAncora ? PAPEL : "8A8A92",
          strike: true, align: "center", valign: "middle" });
        cur += soAncora ? 0.8 : 0.40;
      }
      if(soAncora) return;
      if(p.por){
        s.addText(p.por, { x, y: cur, w: larg, h: 0.68, fontFace: FONTE_TIT, fontSize: 30,
          color: PAPEL, align: "center", valign: "middle" });
        cur += 0.70;
        if(p.parcelas){
          s.addText("ou", { x, y: cur, w: larg, h: 0.28, fontFace: FONTE, fontSize: 13,
            color: "8A8A92", align: "center", valign: "middle" });
          s.addText(p.parcelas, { x, y: cur + 0.28, w: larg, h: 0.44, fontFace: FONTE_TIT,
            fontSize: 17, color: A2.cor, align: "center", valign: "middle" });
          cur += 0.74;
        }
      }
      if(p.selo){
        s.addText(String(p.selo).toUpperCase(), { x: x + 0.2, y: cur + 0.12, w: larg - 0.4, h: 0.36,
          fontFace: FONTE_TIT, fontSize: 12, color: A2.cor, align: "center", valign: "middle",
          charSpacing: 1.6 });
        cur += 0.42;
      }
      // ⚠️ ALTURA NEGATIVA MATA O ARQUIVO INTEIRO. Com a faixa de bônus no pé, o cartão do
      // Individual (que já tem riscado, preço, parcelamento E selo) ficava com sobra de
      // -0,32" pros itens; o pptx sai com um `cy` negativo e o PowerPoint recusa ABRIR o
      // arquivo — `Presentations.Open` devolve E_FAIL, zero PNG, e nem o motor nem o Node
      // reclamam de nada. Foram 61 slides gerados "ok" e nenhum exportado.
      // Aqui a lista só entra se sobrar altura de verdade: entre a lista e o bônus, o
      // bônus fica, porque é ele que faz a pessoa decidir hoje.
      const sobra = topo + alt - cur - 0.2 - (p.bonus ? 1.02 : 0);
      if(p.itens && p.itens.length && sobra >= 0.3)
        s.addText(paragrafos(p.itens.map(caixa), { fontFace: FONTE, fontSize: corpoItem,
          color: "D4D4D8", bullet: { characterCode: "2022", indent: 10 } }),
          { x: x + 0.2, y: cur + 0.1, w: larg - 0.4, h: sobra, valign: "top",
            lineSpacing: corpoItem + 5, paraSpaceAfter: 4 });
      else if(p.itens && p.itens.length)
        console.warn(`aviso: os itens do plano "${p.nome}" não couberam no cartão ` +
          `(sobra ${sobra.toFixed(2)}") e foram OMITIDOS — o bônus tem prioridade.`);
      // O bônus não é mais um bullet: é uma FAIXA cheia na cor, colada no pé do cartão,
      // com "SÓ HOJE" em cima. Como bullet ele desaparecia no meio da lista, e o prazo é
      // justamente o que faz a pessoa decidir agora em vez de pensar no assunto em casa.
      // Fundo chapado na cor, letra preta: é o único bloco invertido do deck, e por isso
      // o olho vai nele.
      if(p.bonus){
        const hB = 0.82, yB = topo + alt - hB - 0.16;
        s.addShape("roundRect", { x: x + 0.16, y: yB, w: larg - 0.32, h: hB, rectRadius: 0.09,
          fill: { color: A2.cor }, line: { type: "none" } });
        s.addText(String(p.bonus.rotulo || "Bônus só hoje").toUpperCase(),
          { x: x + 0.16, y: yB + 0.05, w: larg - 0.32, h: 0.26, fontFace: FONTE_TIT,
            fontSize: 10.5, color: PRETO, align: "center", valign: "middle", charSpacing: 1.8 });
        s.addText(String(p.bonus.texto), { x: x + 0.24, y: yB + 0.29, w: larg - 0.48, h: 0.48,
          fontFace: FONTE, bold: T.pesa, fontSize: 11, color: PRETO,
          align: "center", valign: "middle", lineSpacing: 14 });
      }
    });
    rodape(s, d, n);
  },

  // tabela: a grade de FAIXA × VALOR do "Contrato de Honorários". Três das dez páginas
  // daquele modelo são isto, e é a única coisa que ele tem que nenhum dos dezessete
  // layouts anteriores fazia — nem o `colunas` (que é cartão, não grade) nem o `planos`
  // (que é cardápio de preço com revelação progressiva).
  //
  // ⚠️ No .pptx do dono a tabela é uma IMAGEM colada (exportada de fora), e isso custa
  // três coisas que aqui não se paga: ela não é editável, ela borra quando o slide é
  // projetado grande, e ela traz o PRÓPRIO título dentro do PNG — que na página 3 do
  // modelo sai IMPRESSO por cima do título do slide (abrir `Slide3.PNG` do modelo pra
  // ver). Aqui a tabela é nativa: o título é o do slide, e mais nada.
  //
  // A paleta é a do modelo, medida nos pixels: cabeçalho azul-marinho, corpo quase-branco,
  // fio dourado, tinta azul-marinho. Ela é a ÚNICA área clara do deck, e é de propósito —
  // é o documento em cima da mesa. A fonte é SERIF (Cambria, nativa do Windows) pelo mesmo
  // motivo: número de contrato não se lê em letra de manchete.
  tabela(s, d, n){
    fundo(s, d);
    let y = titulo(s, d.titulo);
    if(d.subtitulo){
      const sub = [].concat(d.subtitulo).map(caixa);
      // Teto em 26pt: no modelo o subtítulo é quase dois terços do título, e é ele que
      // diz de QUAL das sete formas de cobrança a página trata. A 20pt ele lia como
      // legenda da tabela, e a página passava a ter dois títulos concorrendo.
      const corpoSub = corpoQueCabe(Math.max(...sub.map(l => l.length), 1), COL, 26, 12);
      const nl = linhasReais(sub, corpoSub, COL);
      s.addText(paragrafos(sub, { fontFace: FONTE_TIT, fontSize: corpoSub, color: PAPEL }),
        { x: MG, y: y + 0.1, w: COL, h: 0.34 * nl, align: T.centrado ? "center" : "left",
          valign: "top", lineSpacing: corpoSub * 1.3, fit: "none", margin: 0 });
      y += 0.18 + 0.34 * nl;
    }
    const cab = d.cabecalho ? [].concat(d.cabecalho) : null;
    const linhas = (d.linhas || []).map(l => [].concat(l));
    if(!linhas.length) erro(`slide ${n} (tabela): sem 'linhas' — a página é a grade.`);
    const cols = Math.max(cab ? cab.length : 0, ...linhas.map(l => l.length));
    // A largura de cada coluna sai do texto mais comprido DELA, não de uma divisão igual:
    // "De R$ 50.000,00 a R$ 100.000,00" e "R$ 100,00" em colunas iguais deixariam a
    // primeira rachando em duas linhas com a segunda vazia pela metade.
    const peso = [];
    for(let c = 0; c < cols; c++)
      peso.push(Math.max(6, ...linhas.map(l => String(l[c] ?? "").length),
        cab ? String(cab[c] ?? "").length : 0));
    const somaPeso = peso.reduce((a, b) => a + b, 0);
    // 6.6" é a largura do modelo, não a coluna cheia: a grade não é a página, é o objeto
    // no meio dela. Esticada até a margem, ela vira uma planilha e o slide perde o ar.
    const largTab = Math.min(d.largura || 6.6, COL);
    const colW = peso.map(p => largTab * p / somaPeso);
    // O chão da tabela é o rodapé, não o fim da página: abaixo de 6.5" ela encosta no
    // logo. Com fecho, sobe mais, porque o fecho mora entre as duas.
    const chao = d.fecho ? 5.5 : 6.45;
    const nLin = linhas.length + (cab ? 1 : 0);
    const altLin = Math.min(0.52, Math.max(0.3, (chao - y - 0.2) / nLin));
    // Um corpo só pra grade inteira, decidido pela célula mais cheia: calculado célula a
    // célula, a coluna dos valores sairia maior que a das faixas e o olho leria os valores
    // como o assunto da página. Numa tabela de comparação as linhas têm o mesmo peso.
    // 0.52 é a largura da maiúscula da Cambria em caixa MISTA — a célula é "De R$ 5.000,00",
    // não caixa alta. Cobrar aqui os 0.68 da Rubik One (o `T.largura` deste tema) daria
    // 9pt numa grade que comporta 13: é o mesmo erro que a régua da `cascata` já cometeu.
    const corpo = Math.min(15, ...peso.map((p, c) => corpoQueCabe(p, colW[c] - 0.18, 15, 9, 0.52)));
    const linha = { type: "solid", color: TAB.borda, pt: 1 };
    const grade = [];
    if(cab) grade.push(cab.map(t => ({ text: String(t).toUpperCase(),
      options: { fill: { color: TAB.cabeca }, color: PAPEL, bold: true } })));
    for(const l of linhas)
      grade.push(peso.map((_, c) => ({ text: String(l[c] ?? ""),
        options: { fill: { color: TAB.corpo }, color: TAB.tinta } })));
    s.addTable(grade, {
      x: MG + (COL - largTab) / 2, y: y + 0.12, w: largTab, colW,
      rowH: altLin, border: linha, fontFace: TAB.fonte, fontSize: corpo,
      align: "center", valign: "middle", margin: 0.04, autoPage: false,
    });
    fecho(s, d.fecho, y + 0.12 + nLin * altLin + 0.22);
    rodape(s, d, n);
  },

  // print: a página que mostra um ARQUIVO — o print da planilha, o gráfico exportado, a
  // tela do sistema. Veio da palestra do Renan ("A engenharia de caixa"), onde nove das
  // vinte e quatro páginas são a planilha de acordos sendo operada passo a passo.
  //
  // ⚠️ Ele é o ÚNICO layout em que a imagem NÃO é recortada. Todos os outros mandam a
  // foto caber na caixa (`recorta`, com `foco` escolhendo o que fica de fora), porque num
  // retrato o que se perde é fundo. Num print o que se perde é DADO: cortar 20% da direita
  // come a coluna de valores, e o slide passa a mostrar meia planilha com cara de inteira.
  // Aqui a imagem entra por `contain` — quem cede é a caixa, e a página existe pra isso.
  //
  // O quadro branco de 0,06" atrás dela não é enfeite: o print de planilha já é branco, e
  // sem a borda ele encosta no preto do slide com uma emenda dura de pixel (é a mesma razão
  // da `vinheta`, resolvida ao contrário — ali se dissolve a beira, aqui se declara).
  //
  // `titulo` + `subtitulo` em vez de um título comprido: numa SÉRIE de passos ("PASSO 1",
  // "PASSO 2"…) o título é a placa e o subtítulo é a instrução, e as páginas irmãs saem
  // com o texto começando na mesma linha. Título de 45 caracteres racharia em três linhas
  // e cada página da série quebraria numa altura diferente.
  print(s, d, n){
    fundo(s, d);
    let y = titulo(s, d.titulo);
    if(d.subtitulo){
      const sub = [].concat(d.subtitulo).map(caixa);
      const corpoSub = corpoQueCabe(Math.max(...sub.map(l => l.length), 1), COL, 21, 12);
      const nl = linhasReais(sub, corpoSub, COL);
      s.addText(paragrafos(sub, { fontFace: FONTE, bold: T.pesa, fontSize: corpoSub,
        color: "D8D8DA" }),
        { x: MG, y: y + 0.08, w: COL, h: 0.32 * nl, align: T.centrado ? "center" : "left",
          valign: "top", lineSpacing: corpoSub * 1.3, fit: "none", margin: 0 });
      y += 0.14 + 0.32 * nl;
    }
    const img = d._print;
    if(!img) erro(`slide ${n} (print): sem 'print' — a página é a imagem.`);
    // O chão é o rodapé, não o fim da página: abaixo de 6.45" a imagem encosta no logo.
    const chao = d.fecho ? 5.55 : 6.45;
    const topo = y + 0.16;
    const altMax = chao - topo, largMax = COL;
    let w = largMax, h = w / img.razao;
    if(h > altMax){ h = altMax; w = h * img.razao; }
    if(altMax < 1.2)
      console.warn(`aviso: sobrou ${altMax.toFixed(2)}" pro print de ` +
        `"${String(d.titulo).split("\n")[0].replace(/\*/g, "")}" — encurte o título ou o subtítulo.`);
    const x = MG + (COL - w) / 2;
    // A imagem CENTRA na faixa que sobrou, na vertical também. Ancorada no topo, um print
    // largo (3:1) deixava 1,5" de preto morto entre ele e o logo, e a página lia como se
    // alguém tivesse esquecido de terminá-la. Centrado, o vazio se divide e vira respiro.
    const yy = topo + (altMax - h) / 2;
    const b = 0.06;
    s.addShape("rect", { x: x - b, y: yy - b, w: w + b * 2, h: h + b * 2,
      fill: { color: PAPEL }, line: { type: "none" },
      shadow: { type: "outer", blur: 16, offset: 5, angle: 90, color: "000000", opacity: 0.6 } });
    s.addImage({ path: img.path, x, y: yy, w, h });
    fecho(s, d.fecho, yy + h + 0.22);
    rodape(s, d, n);
  },

  // metricas: o número que É o argumento. Dois arranjos, e quem escolhe é a presença de
  // `itens` — o mesmo par de desenhos que a `cascata` tem (empilhado/deitado), pela mesma
  // razão: são a mesma página dita com quantidade diferente de conteúdo, e separá-las em
  // dois layouts faria duas páginas irmãs saírem com letra de tamanho diferente.
  //   sem `itens` → 2 a 4 cartões lado a lado (a operação em proporções: "2-3 de 10",
  //                 "38%", "nº 1"). O número é o assunto e o texto é a legenda dele.
  //   com `itens` → UM cartão à esquerda e a lista de razões à direita, sob um `rotulo`
  //                 ("Por que a regra existe:"). O número dá a régua, os itens explicam.
  //
  // Ele não é o `cards` nem o `numeros`: os dois numeram sozinhos (01, 02, 03) e o número
  // ali é ordem, não medida. Aqui o número é o CONTEÚDO, e "R$ 5 mil" não é o quinto de
  // nada. Também não é o `colunas`, onde o título do grupo sai a 12,5pt — corpo de rótulo,
  // não de manchete, e o número deixaria de ser a primeira coisa que se lê.
  metricas(s, d, n){
    fundo(s, d);
    let y = titulo(s, d.titulo);
    const ms = (d.metricas || []).map(m => typeof m === "string" ? { numero: m } : m);
    if(!ms.length) erro(`slide ${n} (metricas): sem 'metricas' — a página é o número.`);
    const itens = d.itens || [];
    const chao = d.fecho ? 5.45 : 6.2;
    const topo = y + 0.4;
    const alt = Math.min(2.8, chao - topo);
    // O corpo do número é UM só pra todos os cartões, decidido pelo mais comprido: "38%"
    // sozinho sairia a 44pt ao lado de "2-3 DE 10" a 26pt, e a página diria que um dos três
    // números vale mais que os outros — quando a única coisa que muda é quantas letras ele
    // tem. É a mesma regra do corpo único do `planos` e da `tabela`.
    const desenha = (m, x, larg) => {
      s.addShape("roundRect", { x, y: topo, w: larg, h: alt, rectRadius: 0.1,
        fill: { color: A_.fundo }, line: { color: ACENTO, width: 1.5 } });
      const temTexto = !!m.texto;
      const linhas = temTexto ? [].concat(m.texto) : [];
      // O número mora na faixa de CIMA e a legenda na de baixo, com um vão real entre as
      // duas. Na primeira versão a caixa do número (ancorada no pé) terminava DEPOIS de
      // onde a legenda começava: os dois se encostavam e o cartão lia como um bloco só de
      // texto, perdendo justamente a hierarquia que ele existe pra criar.
      s.addText(realce(String(m.numero), { fontFace: FONTE_DISPLAY, fontSize: corpoNum,
        color: PAPEL }), { x: x + 0.12, y: topo + (temTexto ? 0.18 : 0),
        w: larg - 0.24, h: temTexto ? alt * 0.40 : alt,
        align: "center", valign: temTexto ? "bottom" : "middle", margin: 0 });
      if(temTexto)
        s.addText(paragrafos(linhas.map(caixa), { fontFace: FONTE, fontSize: corpoTxt,
          color: "D4D4D8", align: "center" }),
          { x: x + 0.2, y: topo + alt * 0.54, w: larg - 0.4, h: alt * 0.42,
            valign: "top", lineSpacing: corpoTxt + 6, margin: 0 });
    };
    let corpoNum, corpoTxt;
    if(itens.length){
      // Um cartão à esquerda, as razões à direita. O cartão não passa de 4,3": mais largo
      // que isso ele deixa de ser um bloco e vira metade da página, e a lista (que é o
      // porquê do número) fica espremida numa coluna de bullet quebrado.
      const largC = Math.min(4.3, COL * 0.38);
      corpoNum = corpoQueCabe(String(ms[0].numero).replace(/\*/g, "").length, largC - 0.5, 40, 18,
        T.largura_tit || T.largura);
      corpoTxt = 13;
      desenha(ms[0], MG, largC);
      const xL = MG + largC + 0.6, largL = COL - largC - 0.6;
      let yL = topo + 0.06;
      if(d.rotulo){
        s.addText(String(d.rotulo).toUpperCase(), { x: xL, y: yL, w: largL, h: 0.36,
          fontFace: FONTE_TIT, fontSize: 13, color: ACENTO, charSpacing: 1.6, valign: "middle" });
        yL += 0.46;
      }
      // O corpo cede à lista, como no `colunas`: item que racha em duas linhas encosta no
      // de baixo, e três razões viram um parágrafo picado.
      const hL = topo + alt - yL;
      let c = 16;
      while(c > 10 && linhasReais(itens, c, largL - 0.3) * (c + 10) / 72 > hL) c--;
      s.addText(paragrafos(itens.map(caixa), { fontFace: FONTE, fontSize: c, color: "D4D4D8",
        bullet: { characterCode: "2022", indent: 12 } }),
        { x: xL, y: yL, w: largL, h: hL, valign: "top", lineSpacing: c + 10, paraSpaceAfter: 8 });
    } else {
      const vao = 0.3;
      const larg = (COL - vao * (ms.length - 1)) / ms.length;
      corpoNum = Math.min(...ms.map(m => corpoQueCabe(
        String(m.numero).replace(/\*/g, "").length, larg - 0.5, 40, 18, T.largura_tit || T.largura)));
      // A legenda CEDE à altura que sobrou, como no `colunas`. Fixa em 14pt, um título de
      // três linhas (que é o que acontece quando a copy do dono não cabe em duas) espremia
      // o cartão e a legenda saía POR FORA da borda de baixo — impressa no preto, e o
      // console dizia "ok". Quem encolhe é a letra; o cartão já está no limite da página.
      const hTxt = alt * 0.42 - 0.06;
      const largTxt = larg - 0.4;
      corpoTxt = ms.length > 3 ? 12 : 14;
      while(corpoTxt > 9 && Math.max(...ms.map(m => m.texto
        ? linhasReais([].concat(m.texto), corpoTxt, largTxt) : 0)) * (corpoTxt + 6) / 72 > hTxt)
        corpoTxt--;
      ms.forEach((m, i) => desenha(m, MG + i * (larg + vao), larg));
    }
    fecho(s, d.fecho, topo + alt + 0.3);
    rodape(s, d, n);
  },

  // chamada: a página de virada do modelo "múltiplas formas de prospecção" — título
  // grande, uma AFIRMAÇÃO curta embaixo, a régua composta, e a linha que ABRE o que vem
  // depois ("A combinação estratégica garante:"). Os três andares não são decoração: a
  // afirmação fecha o assunto anterior, a régua é a virada, e a abertura anuncia o
  // próximo. Sem a régua no meio, as duas linhas viram um parágrafo de duas frases e a
  // página perde a dobradiça — que é a única coisa que ela faz.
  chamada(s, d, n){
    fundo(s, d);
    let y = titulo(s, d.titulo);
    // A coluna para em 7.3": à direita mora a foto, e no modelo ela é o assunto (a mão
    // com a peça de xadrez). Texto atravessando ela some sobre a parte clara.
    const util = 7.3 - MG;
    if(d.linha){
      const ls = [].concat(d.linha).map(caixa);
      const c1 = corpoQueCabe(Math.max(...ls.map(l => l.length), 1), util, 19, 12,
        T.largura_tit || T.largura);
      s.addText(paragrafos(ls, { fontFace: T.titulo_fonte || FONTE_TIT, fontSize: c1,
        color: PAPEL }, !!T.titulo_fonte),
        { x: MG, y: y + 0.16, w: util, h: 0.34 * ls.length, valign: "top",
          lineSpacing: c1 * 1.35, fit: "none", margin: 0 });
      y += 0.2 + 0.34 * ls.length;
    }
    if(T.regua === "composta"){ reguaComposta(s, y + 0.14); y += 0.2; }
    if(d.abre){
      const as = [].concat(d.abre).map(caixa);
      const c2 = corpoQueCabe(Math.max(...as.map(l => l.length), 1), util, 18, 11);
      // ⚠️ A base vai em peso NORMAL, e isso é o contrário do resto do motor (que abre com
      // `bold: T.pesa`). É a linha onde o `**` trabalha: no modelo ela diz "sensação de
      // **pertencimento** e maior **retenção da equipe**", e com a base já em negrito não
      // sobra contraste pro marcador — as duas palavras saem iguais ao resto e a ênfase
      // que a frase inteira existe pra carregar simplesmente não aparece.
      s.addText(paragrafos(as, { fontFace: FONTE, fontSize: c2, color: PAPEL }),
        { x: MG, y: y + 0.2, w: util, h: 0.34 * as.length, valign: "top",
          lineSpacing: c2 * 1.35, fit: "none", margin: 0 });
      y += 0.24 + 0.34 * as.length;
    }
    fecho(s, d.fecho, y + 0.24);
    rodape(s, d, n);
  },

  // citacao: a pergunta que o SDR faz, em aspas, + o objetivo dela
  citacao(s, d, n){
    fundo(s, d);
    let y = titulo(s, d.titulo);
    s.addText("“", { x: MG - 0.12, y: y + 0.35, w: 1, h: 1,
      fontFace: "Georgia", fontSize: 90, color: "2A2A2E", valign: "top" });
    s.addText(realce(d.pergunta, { fontFace: FONTE, fontSize: 27, color: PAPEL, italic: true }), {
      x: MG + 0.75, y: y + 0.6, w: COL - 1.6, h: 1.5, valign: "top", lineSpacing: 38,
    });
    if(d.objetivo){
      // O rótulo era "OBJETIVO" fixo, herdado do deck de SDR onde a citação era a
      // pergunta que o vendedor faz. Reusada pra citar uma FRASE (a promessa, a desculpa,
      // o que o cliente diz), "objetivo" mente sobre o que está escrito embaixo. `rotulo`
      // troca a palavra sem inventar layout novo; sem ele, nada muda pros decks antigos.
      s.addText(String(d.rotulo || "OBJETIVO").toUpperCase(), { x: MG, y: y + 2.45, w: 3.2, h: 0.35,
        fontFace: FONTE_TIT, fontSize: 12, color: ACENTO, charSpacing: 2 });
      s.addText(realce(d.objetivo, { fontFace: FONTE, fontSize: 20, color: "C8C8CA" }),
        { x: MG, y: y + 2.85, w: COL - 1.5, h: 0.9, valign: "top", lineSpacing: 28 });
    }
    fecho(s, d.fecho, 5.9);
    rodape(s, d, n);
  },

  // final: foto sangrando à direita, frase à esquerda
  final(s, d, n){
    s.background = { color: PRETO };
    if(d.foto){
      s.addImage({ data: d._recorte, x: FIM_X, y: 0, w: L - FIM_X, h: A });
      s.addImage({ data: VEU_EMENDA, x: FIM_X, y: 0, w: L - FIM_X, h: A });
      s.addShape("rect", { x: 0, y: 0, w: FIM_X, h: A, fill: { color: PRETO }, line: { type: "none" } });
    }
    s.addShape("rect", { x: MG, y: 2.55, w: 1.1, h: 0.06, fill: { color: ACENTO }, line: { type: "none" } });
    // Via `realce` direto, o "\n" ia DENTRO do run e o pptx quebrava linha nele E entre
    // os runs do realce: "AGORA O MAPA / É / SEU" em três linhas, com o É sozinho. Quem
    // sabe quebrar sem rachar o destaque é o `paragrafos` — é o que todo outro layout usa.
    const linhas = String(d.titulo).split("\n");
    // 30pt era CRAVADO, e a coluna do fecho tem só 5,9" (a foto come o resto): uma linha
    // de 21 letras estourava e rachava, deixando "DECIDIR" sozinho no meio da frase. Aqui
    // o corpo cede à linha mais longa, como no título das outras páginas — a frase de
    // fecho é a última coisa que o aluno lê, e não pode sair picada.
    const maior = Math.max(...linhas.map(l => l.replace(/\*/g, "").length));
    const corpo = corpoQueCabe(maior, 5.9, 30);
    const alt = linhasReais(linhas, corpo, 5.9) * (corpo * 1.33 / 72);
    s.addText(paragrafos(linhas.map(caixa),
      { fontFace: FONTE_TIT, fontSize: corpo, color: PAPEL }), {
      x: MG, y: 2.85, w: 5.9, h: Math.max(alt, 2.6), valign: "top", lineSpacing: corpo * 1.33,
    });
    // `linhas` é o apoio do fecho: a frase que completa a última e a assinatura de quem
    // falou ("Obrigado. Fulano · Produto"). Sem ela, um deck que termina agradecendo
    // obrigava a espremer as três frases no título — que aí cede corpo até 14pt e a
    // ÚLTIMA página do deck sai em letra de rodapé. Fica em corpo de texto, sob o título.
    // A altura é a REAL do título (`alt`), não a da caixa: a caixa tem piso de 2,6" pra
    // não encolher o bloco antigo, e ancorar o apoio nela empurraria a frase pro pé da
    // página num título de duas linhas.
    if(d.linhas)
      s.addText(paragrafos([].concat(d.linhas).map(caixa),
        { fontFace: FONTE, bold: T.pesa, fontSize: 15, color: "D8D8DA" }),
        { x: MG, y: 2.85 + alt + 0.22, w: 5.9, h: 1.5, valign: "top", lineSpacing: 23,
          fit: "none", margin: 0 });
    selo(s, d);
  },
};

// ---------- roda ----------
async function main(){
  const entrada = process.argv[2];
  if(!entrada) erro("uso: node motor-slides.js conteudo/<arquivo>.json");
  const d = JSON.parse(fs.readFileSync(path.resolve(BASE, entrada), "utf8"));
  if(!d.marca) erro("peça sem 'marca' — cada peça declara a sua (ver marca/LOGOS.md).");
  if(!Array.isArray(d.slides) || !d.slides.length) erro("peça sem 'slides'.");

  const tema = d.tema || "summit";
  if(!TEMAS[tema]) erro(`tema '${tema}' desconhecido — use: ${Object.keys(TEMAS).join(" · ")}`);
  T = TEMAS[tema];
  FONTE = T.fonte; FONTE_TIT = T.forte; FONTE_LEVE = T.leve;
  FONTE_DISPLAY = T.titulo_fonte || T.forte;

  // O acento é do PRODUTO, não do tema — um deck `mat` pode ser dourado ou azul, e é a
  // peça que diz qual. Nome errado PARA aqui em vez de cair no dourado: cair no default
  // sairia um deck inteiro na cor errada e o console diria "ok".
  const acento = d.acento || "ouro";
  if(!ACENTOS[acento]) erro(`acento '${acento}' desconhecido — use: ${Object.keys(ACENTOS).join(" · ")}`);
  A_ = ACENTOS[acento];
  ACENTO = A_.cor; ACENTO2 = A_.apoio;

  // O @ de quem apresenta sai do MESMO arquivo que o feed usa, pelo slug. Guardar dois
  // cadastros do mesmo handle é garantir que um dia eles divirjam — e o que estiver
  // errado vai pro projetor. Aqui só se declara `"perfil": "joao-vitor"`.
  if(d.perfil){
    const arq = path.resolve(ACERVO, "marca", "perfis.json");
    if(!fs.existsSync(arq)) erro(`perfil '${d.perfil}' pedido, mas não achei ${path.relative(BASE, arq)}.`);
    const perfis = JSON.parse(fs.readFileSync(arq, "utf8"));
    const p = perfis[d.perfil];
    if(!p) erro(`perfil '${d.perfil}' não existe em marca/perfis.json — ` +
      `slugs: ${Object.keys(perfis).filter(k => !k.startsWith("_")).join(" · ")}`);
    if(!p.handle) erro(`o perfil '${d.perfil}' está com handle null em marca/perfis.json — ` +
      `peça o @ real ao dono e preencha lá antes de gerar.`);
    d._arroba = p.handle;
  }

  // recorte e medida das imagens ANTES de montar o slide: o pptx só recebe
  // imagem que já tem a proporção da caixa onde vai entrar.
  const logos = new Set([d.logo, ...d.slides.map(s => s.logo)].filter(Boolean));
  await Promise.all([...logos].map(medeLogo));
  for(const slide of d.slides){
    // A MOLDURA é decisão de layout, não de tema: `foto` e `duas-fotos` sempre
    // emolduram (é o que a página é); nos outros a foto sangra, salvo pedido.
    slide._emoldurada = slide.layout === "foto" || slide.layout === "duas-fotos"
      || (slide.moldura === true && slide.layout !== "contato");

    if(Array.isArray(slide.fotos) && slide.fotos.length){
      const c = CAIXA.duas_fotos;
      slide._recortes = [];
      for(const f of slide.fotos) slide._recortes.push(await recorta(f, c.w, c.h, slide.foco));
    }
    if(slide.qr) slide._qr = await imagemCrua(slide.qr);
    // O print entra INTEIRO: aqui só se mede a proporção, o corte é que não existe.
    if(slide.print) slide._print = await medeImagem(slide.print);
    if(slide.cenario) slide._cenario = await recorta(slide.cenario, SANGRA.w, SANGRA.h, slide.foco_cenario);
    if(!slide.foto) continue;
    // A regra é UMA: recortar SEMPRE na proporção da caixa ONDE a foto vai aparecer.
    // Se o corte sai numa proporção e a exibição é outra, o pptxgenjs estica a imagem
    // pra encher a caixa e a pessoa deforma — é o mesmo erro que o `sizing: cover` dele
    // comete. Por isso cada caso abaixo casa com o `addImage` do layout correspondente:
    //   emoldurada → a caixa da moldura (foto/capa/duas-fotos)
    //   cenário    → o PERSONAGEM mora no painel da direita (x=PAINEL_X..L)
    //   final      → a foto SANGRA só no painel direito (x=FIM_X..L), NÃO no slide todo.
    //                Recortar no 16:9 e espremer nesse painel estreito engorda o rosto.
    //   resto      → sangra o slide inteiro (16:9)
    const caixa = slide._emoldurada
      ? (slide.layout === "capa" ? CAIXA.capa : CAIXA[slide.layout] || CAIXA.moldura)
      : slide.cenario ? { w: L - PAINEL_X, h: A }
      : slide.layout === "final" ? CAIXA.final
      // No c365 a foto é recortada na proporção do PAINEL, não do slide: recortar em
      // 16:9 e exibir num painel quase quadrado espremeria a pessoa em 40%.
      : T.painel ? { w: L - T.painel, h: A }
      : SANGRA;
    slide._recorte = await recorta(slide.foto, caixa.w, caixa.h, slide.foco);
  }

  const pptx = new pptxgen();
  pptx.defineLayout({ name: "16x9", width: L, height: A });
  pptx.layout = "16x9";
  pptx.author = "RM Treinamentos";
  pptx.title = d.titulo || d.aula || "Aula";

  d.slides.forEach((slide, i) => {
    const layout = slide.layout || "texto";
    if(!LAYOUTS[layout]) erro(`layout '${layout}' desconhecido — use: ${Object.keys(LAYOUTS).join(" · ")}`);
    // O acento pode ser trocado POR SLIDE, e isso veio do modelo do Comercial 365: lá
    // ele muda por SEÇÃO do deck (verde na regra, vermelho na dor, ciano no agendamento),
    // com cada divisória repetindo a cor da etapa que anuncia. Sem isso, ou o deck inteiro
    // sai de uma cor só (e some a divisão em blocos), ou a cor seria escrita à mão em vinte
    // lugares por slide. Slide sem `acento` herda o do topo do arquivo, como sempre foi.
    if(slide.acento){
      if(!ACENTOS[slide.acento])
        erro(`acento '${slide.acento}' (slide ${i + 1}) desconhecido — use: ${Object.keys(ACENTOS).join(" · ")}`);
      A_ = ACENTOS[slide.acento];
    } else {
      A_ = ACENTOS[acento];
    }
    ACENTO = A_.cor; ACENTO2 = A_.apoio;
    const s = pptx.addSlide();
    LAYOUTS[layout](s, { ...d, ...slide }, i + 1);
  });

  const saida = path.resolve(BASE, "saida", `${d.arquivo_saida || "deck"}.pptx`);
  fs.mkdirSync(path.dirname(saida), { recursive: true });
  await pptx.writeFile({ fileName: saida });
  console.log(`ok: ${d.slides.length} slides → ${path.relative(BASE, saida)}`);
}
main().catch(e => erro(e.message));
