/**
 * Esporotri-Quiz — lógica principal
 * Fluxo: Início (nome) → Perguntas sorteadas (o gato reage a cada uma) → Resultado → Ranking ao vivo
 */
(() => {
  "use strict";

  // ---------- Constantes ----------
  const NAME_KEY = "esporotriquiz_nome";
  // Modo teste (endereço com ?teste): joga normal, mas não envia nada para o ranking
  const TEST_MODE = new URLSearchParams(window.location.search).has("teste");
  const LETTERS = ["A", "B", "C", "D"];
  const LEVELS = ["easy", "medium", "hard"];

  // ---------- Estado do jogo ----------
  const state = {
    player: "",
    questions: [],      // perguntas da partida (com alternativas embaralhadas)
    seen: new Set(),    // ids já sorteados nesta visita (evita repetir ao jogar de novo)
    index: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    mistakes: [],
    answered: false,
    elapsedMs: 0,       // tempo acumulado (pausa durante a explicação)
    runningSince: null,
    timerId: null,
    gifQueues: new Map(),
  };

  // ---------- Atalhos de DOM ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = {
    nameInput: $("#player-name"),
    nameError: $("#name-error"),
    quizPlayer: $("#quiz-player"),
    timer: $("#timer"),
    streak: $("#streak"),
    progress: $(".progress"),
    progressBar: $("#progress-bar"),
    qCount: $("#question-count"),
    scoreLive: $("#score-live"),
    qText: $("#question-text"),
    options: $("#options"),
    reaction: $("#reaction"),
    feedbackTitle: $(".feedback-title"),
    feedbackAnswer: $(".feedback-answer"),
    feedbackText: $(".feedback-text"),
    feedbackSource: $(".feedback-source"),
    btnNext: $("#btn-next"),
    resultPlayer: $("#result-player"),
    resultScore: $("#result-score"),
    resultTotal: $("#result-total"),
    resultTime: $("#result-time"),
    resultStreak: $("#result-streak"),
    resultPosition: $("#result-position"),
    tierLabel: $("#tier-label"),
    tierTitle: $("#tier-title"),
    tierText: $("#tier-text"),
    resultMeme: $("#result-meme"),
    review: $("#review"),
    reviewList: $("#review-list"),
    rankingList: $("#ranking-list"),
    rankingStatus: $("#ranking-status"),
  };

  // ---------- Utilitários ----------

  /** Embaralha um array (Fisher–Yates) sem alterar o original. */
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /** Formata segundos como m:ss (ou m:ss,d com décimos). */
  function formatTime(totalSeconds, tenths = false) {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    const base = `${m}:${String(s).padStart(2, "0")}`;
    return tenths ? `${base},${Math.floor((totalSeconds * 10) % 10)}` : base;
  }

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* ignora */ } },
  };

  // ---------- Navegação entre telas ----------
  function showScreen(name) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    const screen = $(`#screen-${name}`);
    screen.classList.add("active");
    window.scrollTo({ top: 0, behavior: FX.reducedMotion ? "auto" : "smooth" });
    // leva o foco para o título da tela (ajuda leitores de tela e teclado)
    const heading = $("[tabindex='-1']", screen);
    if (heading) heading.focus({ preventScroll: true });
    if (name === "ranking") renderRanking();
    if (name === "home") stopClock();
  }

  document.querySelectorAll("[data-go]").forEach((btn) =>
    btn.addEventListener("click", () => showScreen(btn.dataset.go))
  );

  // ---------- Som ----------
  function syncMuteButtons() {
    document.querySelectorAll(".js-mute").forEach((b) => {
      const muted = FX.isMuted();
      b.textContent = muted ? "🔇" : "🔊";
      b.setAttribute("aria-pressed", String(muted));
      b.setAttribute("aria-label", muted ? "Ligar som" : "Desligar som");
    });
  }
  document.querySelectorAll(".js-mute").forEach((b) =>
    b.addEventListener("click", () => {
      FX.setMuted(!FX.isMuted());
      syncMuteButtons();
    })
  );

  // ---------- Cronômetro (pausa enquanto a pessoa lê a explicação) ----------
  const currentSeconds = () =>
    (state.elapsedMs + (state.runningSince ? performance.now() - state.runningSince : 0)) / 1000;

  function resumeClock() {
    if (state.runningSince) return;
    state.runningSince = performance.now();
    clearInterval(state.timerId);
    state.timerId = setInterval(() => (el.timer.textContent = formatTime(currentSeconds())), 250);
  }

  function pauseClock() {
    if (!state.runningSince) return;
    state.elapsedMs += performance.now() - state.runningSince;
    state.runningSince = null;
    clearInterval(state.timerId);
    el.timer.textContent = formatTime(currentSeconds());
  }

  function stopClock() {
    pauseClock();
    clearInterval(state.timerId);
  }

  // ---------- GIFs: pré-carregamento e sorteio sem repetir ----------
  const loadedGifs = new Set();

  function preloadGifs() {
    const all = new Set([
      ...REACTIONS.correct.gifs,
      ...REACTIONS.wrong.gifs,
      ...RESULT_TIERS.flatMap((t) => t.gifs),
    ]);
    all.forEach((src) => {
      if (loadedGifs.has(src)) return;
      const img = new Image();
      img.onload = () => loadedGifs.add(src);
      img.src = src;
    });
  }

  /** Próximo GIF de uma lista, passando por todos antes de repetir. */
  function nextGif(list) {
    const key = list.join("|");
    let queue = state.gifQueues.get(key);
    if (!queue || !queue.length) {
      queue = shuffle(list);
      state.gifQueues.set(key, queue);
    }
    return queue.shift();
  }

  /** Monta o meme: emoji na hora, GIF por cima assim que carregar. */
  function renderMeme(box, { emoji, gif, top, bottom }) {
    const img = $(".meme-gif", box);
    const emojiBox = $(".meme-emoji", box);
    $(".meme-top", box).textContent = top;
    $(".meme-bottom", box).textContent = bottom;
    emojiBox.textContent = emoji;
    emojiBox.classList.remove("hidden");
    img.classList.add("hidden");
    img.onload = img.onerror = null;
    img.removeAttribute("src");
    if (!gif) return;

    const token = String(Math.random());
    box.dataset.token = token;
    img.onload = () => {
      if (box.dataset.token !== token) return; // chegou atrasado: já é outra reação
      loadedGifs.add(gif);
      img.classList.remove("hidden");
      emojiBox.classList.add("hidden");
    };
    img.onerror = () => { /* fica o emoji */ };
    img.src = gif;
  }

  // ---------- Início do jogo ----------
  el.nameInput.value = store.get(NAME_KEY) || "";

  $("#login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    FX.unlock();
    const name = Ranking.cleanName(el.nameInput.value);
    let error = "";
    if (name.replace(/[^\p{L}]/gu, "").length < 2) error = "Digite um nome com pelo menos 2 letras 🐾";
    else if (Ranking.isBlockedName(name)) error = "Esse nome não passou no filtro dos gatos 😾 Escolha outro apelido.";

    el.nameError.textContent = error;
    if (error) {
      el.nameInput.focus();
      return;
    }
    state.player = name;
    store.set(NAME_KEY, name);
    startGame();
  });

  $("#btn-retry").addEventListener("click", () => {
    FX.unlock();
    startGame();
  });

  /** Sorteia as perguntas de um nível, priorizando as que a pessoa ainda não viu. */
  function drawLevel(level, amount) {
    const pool = QUESTIONS.filter((q) => q.difficulty === level);
    const fresh = shuffle(pool.filter((q) => !state.seen.has(q.id)));
    const used = shuffle(pool.filter((q) => state.seen.has(q.id)));
    return [...fresh, ...used].slice(0, amount);
  }

  function startGame() {
    // Começa pelas mais fáceis (sem avisar) e termina com as difíceis
    const drawn = LEVELS.flatMap((lvl) => drawLevel(lvl, CONFIG.QUESTIONS_PER_LEVEL[lvl] || 0));
    drawn.forEach((q) => state.seen.add(q.id));
    if (state.seen.size >= QUESTIONS.length) state.seen.clear();

    // Embaralha as alternativas guardando qual é a correta
    state.questions = drawn.map((q) => ({
      ...q,
      options: shuffle(q.options.map((text, i) => ({ text, correct: i === q.answer }))),
    }));

    Object.assign(state, { index: 0, score: 0, streak: 0, bestStreak: 0, mistakes: [], elapsedMs: 0, runningSince: null });
    el.quizPlayer.textContent = state.player;
    el.scoreLive.textContent = "0";
    el.timer.textContent = "0:00";
    el.streak.classList.add("hidden");
    el.progress.setAttribute("aria-valuemax", state.questions.length);

    preloadGifs();
    showScreen("quiz");
    renderQuestion();
  }

  // ---------- Perguntas ----------
  function renderQuestion() {
    const q = state.questions[state.index];
    const total = state.questions.length;
    state.answered = false;

    el.qCount.textContent = `Pergunta ${state.index + 1} de ${total}`;
    el.qText.textContent = q.question;
    el.progressBar.style.width = `${(state.index / total) * 100}%`;
    el.progress.setAttribute("aria-valuenow", state.index);

    el.reaction.classList.add("hidden");
    el.reaction.classList.remove("ok", "fail");
    el.btnNext.classList.add("hidden");

    el.options.innerHTML = "";
    q.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option";
      const letter = document.createElement("span");
      letter.className = "letter";
      letter.textContent = LETTERS[i];
      const text = document.createElement("span");
      text.textContent = opt.text;
      btn.append(letter, text);
      btn.addEventListener("click", () => handleAnswer(i));
      el.options.appendChild(btn);
    });

    // reinicia a animação de entrada
    el.qText.classList.remove("pop");
    void el.qText.offsetWidth;
    el.qText.classList.add("pop");
    el.qText.focus({ preventScroll: true });

    resumeClock();
  }

  function handleAnswer(choice) {
    if (state.answered) return;
    state.answered = true;
    pauseClock();

    const q = state.questions[state.index];
    const buttons = [...el.options.children];
    const isCorrect = q.options[choice].correct;
    const correctOpt = q.options.find((o) => o.correct);

    buttons.forEach((b, i) => {
      b.disabled = true;
      if (q.options[i].correct) b.classList.add("correct");
    });

    let meme;
    if (isCorrect) {
      state.score++;
      state.streak++;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      el.scoreLive.textContent = state.score;
      el.reaction.classList.add("ok");
      el.feedbackTitle.textContent = pick(REACTIONS.correct.titles);
      el.feedbackAnswer.textContent = "";

      const streak = REACTIONS.streak[state.streak];
      meme = {
        emoji: streak ? "🔥" : pick(REACTIONS.correct.emojis),
        gif: nextGif(REACTIONS.correct.gifs),
        ...(streak ? { top: streak.top, bottom: streak.bottom } : pick(REACTIONS.correct.memes)),
      };
      if (streak) {
        el.streak.textContent = streak.badge;
        el.streak.classList.remove("hidden", "bump");
        void el.streak.offsetWidth;
        el.streak.classList.add("bump");
        FX.play("streak");
      } else {
        FX.play("correct");
      }
    } else {
      state.streak = 0;
      el.streak.classList.add("hidden");
      buttons[choice].classList.add("wrong", "shake");
      el.reaction.classList.add("fail");
      el.feedbackTitle.textContent = pick(REACTIONS.wrong.titles);
      el.feedbackAnswer.textContent = `Resposta certa: ${correctOpt.text}`;
      state.mistakes.push({ question: q.question, answer: correctOpt.text, explanation: q.explanation });
      meme = { emoji: pick(REACTIONS.wrong.emojis), gif: nextGif(REACTIONS.wrong.gifs), ...pick(REACTIONS.wrong.memes) };
      FX.play("wrong");
      FX.vibrate([90, 50, 90]);
    }

    renderMeme($(".meme", el.reaction), meme);
    el.feedbackText.textContent = q.explanation;
    const source = SOURCES[q.source];
    el.feedbackSource.classList.toggle("hidden", !source);
    if (source) {
      el.feedbackSource.textContent = `Fonte: ${source.label}`;
      el.feedbackSource.href = source.url;
    }
    el.reaction.classList.remove("hidden");

    const isLast = state.index === state.questions.length - 1;
    el.btnNext.textContent = isLast ? "Ver resultado 🏁" : "Próxima ▶";
    el.btnNext.classList.remove("hidden");
    el.btnNext.focus({ preventScroll: true });
    el.reaction.scrollIntoView({ behavior: FX.reducedMotion ? "auto" : "smooth", block: "nearest" });
  }

  function goNext() {
    if (state.index < state.questions.length - 1) {
      state.index++;
      renderQuestion();
      el.qText.scrollIntoView({ behavior: FX.reducedMotion ? "auto" : "smooth", block: "center" });
    } else {
      finishGame();
    }
  }
  el.btnNext.addEventListener("click", goNext);

  // Atalhos de teclado: 1–4 ou A–D escolhem, Enter avança
  document.addEventListener("keydown", (e) => {
    if (!$("#screen-quiz").classList.contains("active") || e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key.toLowerCase();
    const idx = ["1", "2", "3", "4"].indexOf(key) >= 0 ? Number(key) - 1 : ["a", "b", "c", "d"].indexOf(key);
    if (!state.answered && idx >= 0 && idx < state.questions[state.index].options.length) {
      e.preventDefault();
      handleAnswer(idx);
    } else if (state.answered && key === "enter" && document.activeElement !== el.btnNext) {
      e.preventDefault();
      goNext();
    }
  });

  // ---------- Resultado ----------
  function tierFor(score, total) {
    if (score === total) return RESULT_TIERS.find((t) => t.id === "perfect");
    const s10 = Math.min(9, Math.round((score / total) * 10));
    return RESULT_TIERS.find((t) => s10 >= t.min && s10 <= t.max);
  }

  function finishGame() {
    stopClock();
    const total = state.questions.length;
    const time = Math.round(currentSeconds() * 10) / 10;
    el.progressBar.style.width = "100%";
    el.progress.setAttribute("aria-valuenow", total);

    const tier = tierFor(state.score, total);
    el.resultPlayer.textContent = state.player;
    el.resultTotal.textContent = total;
    el.resultTime.textContent = formatTime(time, true);
    el.resultStreak.textContent = state.bestStreak;
    el.tierLabel.textContent = tier.label;
    el.tierLabel.style.background = tier.color;
    el.tierTitle.textContent = tier.title;
    el.tierText.textContent = tier.text;
    renderMeme(el.resultMeme, { emoji: tier.emoji, gif: nextGif(tier.gifs), ...tier.meme });
    renderReview();

    showScreen("result");
    animateScore(state.score);

    if (tier.id === "perfect") {
      FX.play("perfect");
      FX.confetti(5000);
    } else if (tier.id === "good") {
      FX.play("finish");
      FX.confetti();
    } else {
      FX.play(tier.id === "bad" ? "sad" : "finish");
    }

    sendScore({ name: state.player, score: state.score, total, time });
  }

  async function sendScore(entry) {
    el.resultPosition.textContent = "Enviando para o ranking… 🐾";
    el.resultPosition.className = "result-position";
    if (TEST_MODE) {
      el.resultPosition.textContent = "🧪 Modo teste: este resultado não foi para o ranking.";
      return;
    }
    const { position, offline, rejected } = await Ranking.submit(entry);
    if (rejected) {
      el.resultPosition.textContent = "😾 O ranking não aceitou este resultado. Chame um aluno do estande!";
      return;
    }
    if (offline) {
      el.resultPosition.textContent = "📶 Sem internet agora: seu resultado será enviado assim que a conexão voltar.";
      return;
    }
    if (!position) {
      el.resultPosition.textContent = "Resultado salvo no ranking! 🐾";
      return;
    }
    const inTop = position <= CONFIG.RANKING_SIZE;
    el.resultPosition.classList.add(inTop ? "is-top" : "is-out");
    el.resultPosition.textContent = inTop
      ? `🏆 Você está em ${position}º lugar no ranking da feira! Olha o telão!`
      : `Você está em ${position}º lugar. Faltou pouco para o top ${CONFIG.RANKING_SIZE}: bora revanche? 😼`;
  }

  function renderReview() {
    el.reviewList.innerHTML = "";
    el.review.open = false;
    el.review.classList.toggle("hidden", state.mistakes.length === 0);
    state.mistakes.forEach((m) => {
      const li = document.createElement("li");
      const q = document.createElement("strong");
      q.textContent = m.question;
      const a = document.createElement("span");
      a.className = "review-answer";
      a.textContent = `✅ ${m.answer}`;
      const ex = document.createElement("span");
      ex.textContent = m.explanation;
      li.append(q, a, ex);
      el.reviewList.appendChild(li);
    });
  }

  /** Contador animado de 0 até a pontuação final. */
  let scoreAnim = null;
  function animateScore(target) {
    clearInterval(scoreAnim);
    let n = 0;
    el.resultScore.textContent = FX.reducedMotion ? target : "0";
    if (FX.reducedMotion || target === 0) return;
    scoreAnim = setInterval(() => {
      el.resultScore.textContent = ++n;
      if (n >= target) clearInterval(scoreAnim);
    }, 90);
  }

  // ---------- Ranking ----------
  async function renderRanking() {
    el.rankingStatus.textContent = "Carregando ranking… 🐾";
    el.rankingStatus.classList.remove("hidden");
    try {
      const data = await Ranking.fetchRanking();
      el.rankingList.innerHTML = "";
      if (!data.top.length) {
        el.rankingStatus.textContent = "Ninguém jogou ainda... 😿 Seja o primeiro!";
        return;
      }
      el.rankingStatus.classList.add("hidden");
      const me = Ranking.nameKey(state.player || el.nameInput.value);
      const medals = ["🥇", "🥈", "🥉"];
      data.top.forEach((r, i) => {
        const li = document.createElement("li");
        li.className = `rank-row${i < 3 ? ` top-${i + 1}` : ""}${me && Ranking.nameKey(r.name) === me ? " is-me" : ""}`;
        const pos = document.createElement("span");
        pos.className = "rank-pos";
        pos.textContent = medals[i] || `${i + 1}º`;
        const name = document.createElement("span");
        name.className = "rank-name";
        name.textContent = r.name;
        const score = document.createElement("span");
        score.className = "rank-score";
        score.textContent = `${r.score}/${r.total || 10}`;
        const time = document.createElement("span");
        time.className = "rank-time";
        time.textContent = formatTime(r.time, true);
        li.append(pos, name, score, time);
        el.rankingList.appendChild(li);
      });
    } catch {
      el.rankingStatus.textContent = "Não deu para carregar o ranking agora 😿 Confira a internet e toque em Atualizar.";
    }
  }

  $("#btn-refresh").addEventListener("click", renderRanking);

  // ---------- Patinhas decorativas ----------
  function renderPaws() {
    const container = $(".paws");
    for (let i = 0; i < 14; i++) {
      const p = document.createElement("span");
      p.textContent = "🐾";
      p.style.left = `${Math.random() * 100}%`;
      p.style.top = `${Math.random() * 100}%`;
      p.style.fontSize = `${18 + Math.random() * 26}px`;
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      p.style.animationDelay = `${Math.random() * 6}s`;
      container.appendChild(p);
    }
  }

  // ---------- Inicialização ----------
  $("#credits").textContent = CONFIG.CREDITS;
  $("#test-banner").classList.toggle("hidden", !TEST_MODE);
  syncMuteButtons();
  renderPaws();
  Ranking.flushPending();
})();
