/**
 * Telão do estande: QR Code + ranking ao vivo, atualizando sozinho.
 */
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const medals = ["🥇", "🥈", "🥉"];
  let previous = null;     // ranking anterior (para destacar quem entrou/subiu)
  let lastRecent = null;   // data da última jogada já anunciada
  let toastTimer = null;

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")},${Math.floor((sec * 10) % 10)}`;
  };

  function toast(text, big = false) {
    const box = $("#toast");
    box.textContent = text;
    box.classList.toggle("is-big", big);
    box.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.add("hidden"), big ? 6000 : 4000);
  }

  function renderBoard(top) {
    const board = $("#board");
    $("#board-empty").classList.toggle("hidden", top.length > 0);
    const before = new Map((previous || []).map((r) => [Ranking.nameKey(r.name), r]));

    board.innerHTML = "";
    top.forEach((r, i) => {
      const old = before.get(Ranking.nameKey(r.name));
      const isNew = previous && (!old || old.score !== r.score || old.time !== r.time);
      const li = document.createElement("li");
      li.className = `t-row${i < 3 ? ` top-${i + 1}` : ""}${isNew ? " is-new" : ""}`;
      const pos = document.createElement("span");
      pos.className = "t-pos";
      pos.textContent = medals[i] || `${i + 1}º`;
      const name = document.createElement("span");
      name.className = "t-name";
      name.textContent = r.name;
      const score = document.createElement("span");
      score.className = "t-score";
      score.textContent = `${r.score}/${r.total || 10}`;
      const time = document.createElement("span");
      time.className = "t-time";
      time.textContent = `⏱️ ${formatTime(r.time)}`;
      li.append(pos, name, score, time);
      board.appendChild(li);
    });

    // Novo líder?
    if (previous && top[0] && (!previous[0] || Ranking.nameKey(previous[0].name) !== Ranking.nameKey(top[0].name))) {
      toast(`👑 Novo líder: ${top[0].name}!`, true);
      FX.play("perfect");
      FX.confetti(4000);
    }
    previous = top;
  }

  function renderRecent(recent) {
    const box = $("#recent");
    box.innerHTML = "";
    recent.forEach((p) => {
      const span = document.createElement("span");
      span.className = "t-chip";
      span.textContent = `${p.name} · ${p.score}/${p.total || 10}`;
      box.appendChild(span);
    });

    const newest = recent[0];
    if (newest && lastRecent !== null && newest.date !== lastRecent) {
      toast(`🐾 ${newest.name} acabou de fazer ${newest.score}/${newest.total || 10}!`);
    }
    if (newest) lastRecent = newest.date;
    else lastRecent = "";
  }

  async function refresh() {
    try {
      const data = await Ranking.fetchRanking(CONFIG.RANKING_SIZE);
      renderBoard(data.top);
      renderRecent(data.recent || []);
      $("#stat-plays").textContent = data.stats.plays;
      $("#stat-avg").textContent = String(data.stats.avg).replace(".", ",");
      $("#stat-perfect").textContent = data.stats.perfect;
      $("#status").textContent = `Atualizado às ${new Date().toLocaleTimeString("pt-BR")}`;
      $("#status").classList.remove("is-error");
    } catch {
      $("#status").textContent = "Sem conexão com o ranking, tentando de novo…";
      $("#status").classList.add("is-error");
    } finally {
      setTimeout(refresh, CONFIG.TELAO_REFRESH_SECONDS * 1000);
    }
  }

  // Tela cheia (o primeiro clique também libera o som do telão)
  $("#btn-fullscreen").addEventListener("click", () => {
    FX.unlock();
    const root = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (root.requestFullscreen) root.requestFullscreen();
  });
  document.addEventListener("click", () => FX.unlock(), { once: true });

  // Patinhas de fundo
  const paws = $(".paws");
  for (let i = 0; i < 18; i++) {
    const p = document.createElement("span");
    p.textContent = "🐾";
    p.style.left = `${Math.random() * 100}%`;
    p.style.top = `${Math.random() * 100}%`;
    p.style.fontSize = `${24 + Math.random() * 30}px`;
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    p.style.animationDelay = `${Math.random() * 6}s`;
    paws.appendChild(p);
  }

  // ---------- Inicialização ----------
  const url = GameQR.render($("#qrcode"), 260);
  $("#game-url").textContent = url.replace(/^https?:\/\//, "");
  $("#url-warning").classList.toggle("hidden", !GameQR.isLocalUrl(url));
  $("#top-size").textContent = CONFIG.RANKING_SIZE;
  $("#credits").textContent = CONFIG.CREDITS;
  refresh();
})();
