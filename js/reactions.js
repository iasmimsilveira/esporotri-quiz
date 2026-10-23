/**
 * Reações do gato: aparecem sozinhas a cada resposta e no resultado final.
 *
 * Cada meme tem um texto de cima (top) e um de baixo (bottom), escritos por cima do GIF.
 * O emoji aparece na hora; o GIF entra assim que carregar (todos são pré-carregados
 * no início da partida). Sem internet, fica só o emoji com o meme, e o jogo segue normal.
 *
 * Para trocar os GIFs: coloque arquivos leves (até ~500 KB) em img/ e use "img/arquivo.gif",
 * ou cole o link de qualquer GIF (Giphy, Tenor...).
 */
const CAT_GIFS = {
  happy: [
    "https://cataas.com/cat/FeTFNaYroXqkDYTZ?width=320",
    "https://cataas.com/cat/JQ7LZczsRvPnDPAe?width=320",
    "https://cataas.com/cat/Gb4wBVoaXOOrmXMp?width=320",
  ],
  judging: [
    "https://cataas.com/cat/LVxEssLs2D6pQaDy?width=320",
    "https://cataas.com/cat/60qItVZj8MctIDlg?width=320",
    "https://cataas.com/cat/bgOtqq1YmQ3fxTeH?width=320",
  ],
  sad: [
    "https://cataas.com/cat/3mEJCz1Oj7l1E2tm?width=320",
    "https://cataas.com/cat/HByo6o7TssCW9brP?width=320",
    "https://cataas.com/cat/6QhBxfMg4BuXGetL?width=320",
  ],
};

const REACTIONS = {
  correct: {
    titles: ["Acertou! 😸", "Miaravilhoso! 🎉", "Isso aí! 🐾", "Purrfeito! ✨", "Na mosca! 🎯"],
    gifs: CAT_GIFS.happy,
    emojis: ["😸", "😻", "😹", "🐱"],
    memes: [
      { top: "Acertou", bottom: "O fungo tá com medo de você" },
      { top: "Miau-ravilhoso", bottom: "Seu veterinário ficaria orgulhoso" },
      { top: "Cérebro de gato", bottom: "Sempre cai de pé" },
      { top: "Purrfeito", bottom: "+1 pro ranking" },
      { top: "Sporothrix:", bottom: "“Esse aí não dá pra enganar”" },
      { top: "Eu quando", bottom: "Sei a resposta" },
    ],
  },
  wrong: {
    titles: ["Errou! 😿", "Ops, quase! 🙀", "Nãooo! 😾", "Arranhou na trave! 🐾"],
    gifs: [...CAT_GIFS.judging, ...CAT_GIFS.sad],
    emojis: ["😿", "🙀", "😾", "💅"],
    memes: [
      { top: "Errou", bottom: "Mas errou com confiança" },
      { top: "O gato da lixa", bottom: "Tá te julgando 💅" },
      { top: "Não foi dessa vez", bottom: "Aceita um sachê de consolo?" },
      { top: "O fungo", bottom: "Agradece a sua ajuda" },
      { top: "Derrubei o copo", bottom: "Igual você derrubou essa" },
      { top: "Calma", bottom: "Nem todo gato cai de pé" },
    ],
  },
  // Sequência de acertos seguidos
  streak: {
    3: { badge: "🔥 3 seguidas!", top: "3 seguidas", bottom: "Gato em chamas 🔥" },
    5: { badge: "👑 5 seguidas!", top: "5 seguidas", bottom: "Gato lendário 👑" },
    7: { badge: "🩺 7 seguidas!", top: "7 seguidas", bottom: "Isso é um veterinário disfarçado?" },
  },
};

/** Faixas do resultado final (por número de acertos). */
const RESULT_TIERS = [
  {
    id: "bad",
    min: 0,
    max: 3,
    label: "Ruim 😿",
    title: "Gato que derruba o copo da mesa",
    meme: { top: "Esporo... o quê?", bottom: "Eu só vim pelo sachê" },
    text: "Bora conversar com os alunos do estande: eles explicam tudo e você volta pra revanche!",
    color: "var(--rose)",
    emoji: "🙀",
    gifs: CAT_GIFS.sad,
  },
  {
    id: "regular",
    min: 4,
    max: 6,
    label: "Regular 😼",
    title: "Gato da lixa",
    meme: { top: "Sabe alguma coisa...", bottom: "Mas eu ainda tô te julgando 💅" },
    text: "Quase lá! Mais uma rodada e você entra no top 10.",
    color: "var(--peach)",
    emoji: "😼",
    gifs: CAT_GIFS.judging,
  },
  {
    id: "good",
    min: 7,
    max: 9,
    label: "Bom 😸",
    title: "Doutor Gato 🩺",
    meme: { top: "Ronronando", bottom: "De orgulho" },
    text: "Você manja de esporotricose e ajuda a proteger os bichanos!",
    color: "var(--mint)",
    emoji: "😸",
    gifs: CAT_GIFS.happy,
  },
  {
    id: "perfect",
    min: 10,
    max: 10,
    label: "Gabaritou! 🏆",
    title: "PhD em Sporothrix 🎓",
    meme: { top: "10 de 10", bottom: "Os veterinários querem te contratar" },
    text: "Gabarito completo! Mostre esta tela para os alunos do estande.",
    color: "var(--butter)",
    emoji: "😻",
    gifs: CAT_GIFS.happy,
  },
];
