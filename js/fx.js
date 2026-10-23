/**
 * Efeitos: sons (gerados na hora, sem arquivos), vibração e confete.
 */
const FX = (() => {
  "use strict";

  const MUTE_KEY = "esporotriquiz_mudo";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === "1"; } catch { /* ignora */ }

  /** O áudio só pode começar depois de um toque do usuário (regra dos navegadores). */
  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  function tone(freq, start, duration, { type = "sine", volume = 0.18, slideTo } = {}) {
    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  /** "Miau" sintetizado: sobe e desce a frequência com um filtro. */
  function meow(start = 0, pitch = 1) {
    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(520 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(900 * pitch, t + 0.15);
    osc.frequency.exponentialRampToValueAtTime(420 * pitch, t + 0.55);
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.exponentialRampToValueAtTime(1800, t + 0.15);
    filter.frequency.exponentialRampToValueAtTime(700, t + 0.55);
    filter.Q.value = 3;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.65);
  }

  const SOUNDS = {
    correct: () => { tone(660, 0, 0.12); tone(880, 0.1, 0.12); tone(1320, 0.2, 0.2); },
    wrong: () => meow(0, 0.8),
    streak: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.15, { type: "triangle" })),
    finish: () => { [523, 659, 784].forEach((f, i) => tone(f, i * 0.12, 0.2, { type: "triangle" })); tone(1047, 0.4, 0.5, { type: "triangle" }); },
    sad: () => { meow(0, 0.7); tone(392, 0.6, 0.4, { type: "triangle", slideTo: 262 }); },
    perfect: () => { SOUNDS.finish(); meow(0.9, 1.2); },
  };

  function play(name) {
    if (muted || !ctx || !SOUNDS[name]) return;
    try { SOUNDS[name](); } catch { /* sem áudio: segue o jogo */ }
  }

  function vibrate(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  function setMuted(value) {
    muted = value;
    try { localStorage.setItem(MUTE_KEY, value ? "1" : "0"); } catch { /* ignora */ }
  }

  // ---------- Confete de patinhas ----------
  function confetti(duration = 3500) {
    if (reducedMotion) return;
    const canvas = document.createElement("canvas");
    canvas.className = "confetti";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    const c = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const symbols = ["🐾", "😸", "✨", "🎉", "🐟", "⭐"];
    const colors = ["#cdb4f6", "#b5ead7", "#ffd6a5", "#ffadad", "#bde0fe", "#fdffb6"];
    const parts = Array.from({ length: 120 }, () => ({
      x: Math.random() * innerWidth,
      y: -20 - Math.random() * innerHeight * 0.6,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 3,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
      size: 14 + Math.random() * 14,
      emoji: Math.random() < 0.35 ? symbols[Math.floor(Math.random() * symbols.length)] : null,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const end = performance.now() + duration;
    (function frame(now) {
      c.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        if (p.emoji) {
          c.font = `${p.size}px serif`;
          c.fillText(p.emoji, -p.size / 2, p.size / 2);
        } else {
          c.fillStyle = p.color;
          c.fillRect(-p.size / 4, -p.size / 2, p.size / 2, p.size);
        }
        c.restore();
      });
      if (now < end) requestAnimationFrame(frame);
      else canvas.remove();
    })(performance.now());
  }

  return { unlock, play, vibrate, confetti, setMuted, isMuted: () => muted, reducedMotion };
})();
