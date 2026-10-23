/**
 * Ranking compartilhado — usado pelo jogo (index.html) e pelo telão (telao.html).
 *
 * Com CONFIG.API_URL preenchido, as jogadas vão para a Planilha Google (Apps Script).
 * Sem ele, tudo fica no localStorage deste navegador (útil para testar).
 * Se a internet cair, a jogada fica guardada e é reenviada depois.
 *
 * Regras (iguais às do apps-script/Codigo.gs):
 *  - cada nome aparece uma vez, com o seu melhor resultado;
 *  - mais acertos primeiro; empate → menor tempo.
 */
const Ranking = (() => {
  "use strict";

  const LOCAL_KEY = "esporotriquiz_jogadas";
  const PENDING_KEY = "esporotriquiz_pendentes";
  const TIMEOUT_MS = 12000;

  // ---------- Filtro de nomes ----------
  // Palavras bloqueadas em qualquer parte do nome (já sem acento e com "leet" convertido)
  const BLOCKED_PARTS = [
    "porra", "caralh", "merd", "puta", "buceta", "boceta", "foder", "fuder", "fodas", "cacete",
    "piroca", "viado", "bosta", "arrombad", "otario", "corno", "vagabund", "punheta", "xoxota",
    "xereca", "penis", "vagina", "rapariga", "safad", "babaca", "cuzao", "desgraca", "hitler",
  ];
  // Palavras bloqueadas só quando aparecem sozinhas (evita barrar "Carolina" por causa de "rola")
  const BLOCKED_WORDS = ["cu", "fdp", "pqp", "vsf", "tnc", "krl", "pau", "rola", "bct", "nazi", "nazista", "foda", "porr", "cuz"];
  const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", 8: "b", "@": "a", $: "s" };

  function normalize(text) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[013457@$8]/g, (c) => LEET[c]);
  }

  /** Limpa espaços e corta no tamanho máximo. */
  function cleanName(name) {
    return String(name).replace(/\s+/g, " ").trim().slice(0, 16);
  }

  /** true se o nome tiver palavrão (ou tentativa disfarçada). */
  function isBlockedName(name) {
    const norm = normalize(name);
    const compact = norm.replace(/[^a-z]/g, "");
    if (BLOCKED_PARTS.some((w) => compact.includes(w))) return true;
    const words = norm.split(/[^a-z]+/).filter(Boolean);
    return words.some((w) => BLOCKED_WORDS.includes(w));
  }

  /** Chave usada para juntar jogadas da mesma pessoa ("Ana", " ana " e "ANA" são iguais). */
  function nameKey(name) {
    return normalize(cleanName(name)).replace(/[^a-z0-9]/g, "");
  }

  // ---------- Montagem do ranking (versão local) ----------
  const better = (a, b) => b.score - a.score || a.time - b.time;

  function buildRanking(plays, limit) {
    const best = new Map();
    plays.forEach((p) => {
      const key = nameKey(p.name);
      const current = best.get(key);
      if (!current || better(p, current) < 0) best.set(key, p);
    });
    const ordered = [...best.values()].sort(better);
    const total = plays.length;
    const avg = total ? plays.reduce((s, p) => s + p.score, 0) / total : 0;
    return {
      ok: true,
      top: ordered.slice(0, limit),
      recent: [...plays].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8),
      stats: {
        plays: total,
        players: ordered.length,
        avg: Math.round(avg * 10) / 10,
        perfect: plays.filter((p) => p.score === p.total).length,
      },
      ordered,
    };
  }

  function positionOf(ordered, name) {
    const key = nameKey(name);
    return ordered.findIndex((p) => nameKey(p.name) === key) + 1;
  }

  // ---------- Armazenamento local ----------
  function readLocal(key) {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function writeLocal(key, list) {
    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch {
      /* armazenamento indisponível (ex.: aba anônima) */
    }
  }

  // ---------- Comunicação com a planilha ----------
  async function request(url, options = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...options, signal: ctrl.signal, redirect: "follow" });
      const data = await res.json();
      if (!data.ok) {
        // a planilha recebeu, mas recusou (nome bloqueado, pontuação inválida): não adianta reenviar
        const err = new Error(data.error || "Erro no servidor");
        err.rejected = true;
        throw err;
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  // text/plain evita a checagem extra (preflight) que o Apps Script não aceita
  const post = (entry) =>
    request(CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(entry),
    });

  /** Reenvia jogadas que ficaram guardadas por falta de internet (uma rodada por vez). */
  let flushing = null;
  function flushPending() {
    if (!CONFIG.API_URL) return Promise.resolve();
    if (!flushing) {
      flushing = (async () => {
        const pending = readLocal(PENDING_KEY);
        const left = [];
        for (const entry of pending) {
          try {
            await post(entry);
          } catch (err) {
            if (!err.rejected) left.push(entry);
          }
        }
        // mantém o que chegou na fila enquanto enviava
        const added = readLocal(PENDING_KEY).slice(pending.length);
        writeLocal(PENDING_KEY, [...left, ...added]);
      })().finally(() => (flushing = null));
    }
    return flushing;
  }

  /**
   * Salva uma jogada e devolve a posição da pessoa no ranking.
   * Retorna { position, offline, rejected } — offline = guardada para reenvio; rejected = recusada pela planilha.
   */
  async function submit(entry) {
    entry = { ...entry, name: cleanName(entry.name), date: new Date().toISOString() };

    if (!CONFIG.API_URL) {
      const plays = readLocal(LOCAL_KEY);
      plays.push(entry);
      writeLocal(LOCAL_KEY, plays);
      return { position: positionOf(buildRanking(plays, 0).ordered, entry.name), offline: false };
    }

    try {
      await flushPending();
      const data = await post(entry);
      return { position: data.position, offline: false };
    } catch (err) {
      if (err.rejected) return { position: 0, offline: false, rejected: true };
      writeLocal(PENDING_KEY, [...readLocal(PENDING_KEY), entry]);
      return { position: 0, offline: true };
    }
  }

  /** Busca { top, recent, stats } para mostrar no ranking/telão. */
  async function fetchRanking(limit = CONFIG.RANKING_SIZE) {
    if (!CONFIG.API_URL) return buildRanking(readLocal(LOCAL_KEY), limit);
    const url = `${CONFIG.API_URL}?limit=${limit}&t=${Date.now()}`;
    return request(url);
  }

  return { submit, fetchRanking, flushPending, isBlockedName, cleanName, nameKey };
})();
