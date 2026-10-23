/**
 * Configurações do Esporotri-Quiz — edite aqui antes da feira.
 */
const CONFIG = {
  // URL do Apps Script publicado (termina em /exec). Veja o passo a passo no README.
  // Vazio = ranking salvo só neste navegador (bom para testar).
  API_URL: "",

  // Endereço público do jogo, usado no QR Code do telão e do cartaz.
  // Vazio = descobre sozinho a partir do endereço da página.
  GAME_URL: "",

  // Quantas perguntas de cada nível são sorteadas por partida (a dificuldade não aparece para o visitante).
  QUESTIONS_PER_LEVEL: { easy: 4, medium: 3, hard: 3 },

  // Quantas pessoas aparecem no ranking
  RANKING_SIZE: 10,

  // De quantos em quantos segundos o telão atualiza
  TELAO_REFRESH_SECONDS: 5,

  // Créditos exibidos no rodapé, no telão e no cartaz
  CREDITS: "Projeto dos alunos de Medicina Veterinária 🐾",
};
