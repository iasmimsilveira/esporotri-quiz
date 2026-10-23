/**
 * QR Code do jogo — usado no telão e no cartaz impresso.
 */
const GameQR = (() => {
  "use strict";

  /** Endereço público do jogo (CONFIG.GAME_URL ou a pasta desta página). */
  function gameUrl() {
    if (CONFIG.GAME_URL) return CONFIG.GAME_URL;
    const url = new URL(window.location.href);
    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/[^/]*$/, "");
    return url.href;
  }

  /** true quando o endereço não abre no celular de um visitante. */
  function isLocalUrl(url) {
    return /^file:|\/\/(localhost|127\.|192\.168\.|10\.)/.test(url);
  }

  function render(box, size) {
    const url = gameUrl();
    box.innerHTML = "";
    if (typeof QRCode === "undefined") {
      box.textContent = "QR indisponível (sem internet). Endereço: " + url;
      return url;
    }
    new QRCode(box, {
      text: url,
      width: size,
      height: size,
      colorDark: "#3d3557",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M,
    });
    return url;
  }

  return { gameUrl, isLocalUrl, render };
})();
