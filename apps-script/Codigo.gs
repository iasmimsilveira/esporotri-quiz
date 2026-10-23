/**
 * Esporotri-Quiz — "servidor" do ranking, dentro de uma Planilha Google.
 *
 * Como instalar (passo a passo completo no README):
 *  1. Crie uma Planilha Google e abra Extensões → Apps Script.
 *  2. Apague o conteúdo e cole este arquivo inteiro.
 *  3. Implantar → Nova implantação → Tipo "App da Web"
 *     · Executar como: Eu   · Quem pode acessar: Qualquer pessoa
 *  4. Copie a URL que termina em /exec e cole em CONFIG.API_URL (js/config.js).
 *
 * As jogadas ficam na aba "Jogadas". Para apagar um nome feio, apague a linha.
 * Para zerar o ranking (ex.: novo dia de feira), apague todas as linhas abaixo do cabeçalho.
 */

const SHEET_NAME = "Jogadas";
const HEADERS = ["data", "nome", "chave", "acertos", "total", "tempo_s"];
const MAX_NAME = 16;

// Mesmo filtro do js/ranking.js
const BLOCKED_PARTS = [
  "porra", "caralh", "merd", "puta", "buceta", "boceta", "foder", "fuder", "fodas", "cacete",
  "piroca", "viado", "bosta", "arrombad", "otario", "corno", "vagabund", "punheta", "xoxota",
  "xereca", "penis", "vagina", "rapariga", "safad", "babaca", "cuzao", "desgraca", "hitler",
];
const BLOCKED_WORDS = ["cu", "fdp", "pqp", "vsf", "tnc", "krl", "pau", "rola", "bct", "nazi", "nazista", "foda", "porr", "cuz"];
const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", 8: "b", "@": "a", $: "s" };

/** GET: devolve o ranking. Ex.: .../exec?limit=10 */
function doGet(e) {
  const limit = Math.min(50, Number(e && e.parameter && e.parameter.limit) || 10);
  const result = buildRanking(readPlays(), limit);
  delete result.ordered;
  return json(result);
}

/** POST: registra uma jogada e devolve a posição da pessoa. */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    const name = cleanName(data.name);
    const score = Number(data.score);
    const total = Number(data.total);
    const time = Math.round(Number(data.time) * 10) / 10;

    if (name.replace(/[^A-Za-zÀ-ÿ]/g, "").length < 2) throw new Error("Nome inválido");
    if (isBlockedName(name)) throw new Error("Nome bloqueado");
    if (!(total >= 1 && total <= 50) || !(score >= 0 && score <= total) || score % 1) throw new Error("Pontuação inválida");
    if (!(time >= 1 && time <= 3600)) throw new Error("Tempo inválido");

    sheet().appendRow([new Date(), name, nameKey(name), score, total, time]);

    const result = buildRanking(readPlays(), 10);
    const key = nameKey(name);
    result.position = result.ordered.findIndex((p) => nameKey(p.name) === key) + 1;
    delete result.ordered;
    return json(result);
  } catch (err) {
    return json({ ok: false, error: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

// ---------- Planilha ----------
function sheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function readPlays() {
  const values = sheet().getDataRange().getValues().slice(1);
  return values
    .filter((r) => r[1] !== "" && r[3] !== "")
    .map((r) => ({
      date: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      name: String(r[1]),
      score: Number(r[3]),
      total: Number(r[4]) || 10,
      time: Number(r[5]),
    }));
}

// ---------- Ranking (mesmas regras do js/ranking.js) ----------
function better(a, b) {
  return b.score - a.score || a.time - b.time;
}

function buildRanking(plays, limit) {
  const best = {};
  plays.forEach((p) => {
    const key = nameKey(p.name);
    if (!best[key] || better(p, best[key]) < 0) best[key] = p;
  });
  const ordered = Object.keys(best).map((k) => best[k]).sort(better);
  const total = plays.length;
  const avg = total ? plays.reduce((s, p) => s + p.score, 0) / total : 0;
  return {
    ok: true,
    top: ordered.slice(0, limit),
    recent: plays.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8),
    stats: {
      plays: total,
      players: ordered.length,
      avg: Math.round(avg * 10) / 10,
      perfect: plays.filter((p) => p.score === p.total).length,
    },
    ordered: ordered,
  };
}

// ---------- Nomes ----------
function normalize(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[013457@$8]/g, (c) => LEET[c]);
}

function cleanName(name) {
  return String(name || "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
}

function nameKey(name) {
  return normalize(cleanName(name)).replace(/[^a-z0-9]/g, "");
}

function isBlockedName(name) {
  const norm = normalize(name);
  const compact = norm.replace(/[^a-z]/g, "");
  if (BLOCKED_PARTS.some((w) => compact.indexOf(w) >= 0)) return true;
  return norm.split(/[^a-z]+/).filter(String).some((w) => BLOCKED_WORDS.indexOf(w) >= 0);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
