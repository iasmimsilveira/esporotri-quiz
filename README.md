# 🐱🔬 Esporotri-Quiz

Quiz interativo sobre **esporotricose** para a feira dos alunos de Medicina Veterinária.
O visitante lê o QR Code do cartaz, joga no celular, o gato reage a cada resposta com um meme e o resultado aparece no **ranking ao vivo do telão** do estande.

## Como funciona
- **30 perguntas** com fonte oficial. Cada partida sorteia 10 (4 fáceis, 3 médias e 3 difíceis, nessa ordem). A dificuldade não aparece para o visitante.
- **Reação do gato a cada resposta:** meme com GIF, som e vibração no erro. Com 3, 5 e 7 acertos seguidos aparecem as sequências ("Gato em chamas 🔥").
- **O cronômetro pausa** enquanto a pessoa lê a explicação, para não punir quem lê.
- **Resultado** com título engraçado por faixa, confete, posição no ranking e revisão do que a pessoa errou.
- **Ranking compartilhado** numa Planilha Google: vale o melhor resultado de cada nome, e o empate é decidido pelo menor tempo. Tem filtro de palavrões.
- **Sem internet?** O jogo continua, e o resultado é reenviado quando a conexão voltar.

## Arquivos
```
index.html          # o jogo (o que abre no celular)
telao.html          # ranking ao vivo + QR Code, para a TV/notebook do estande
cartaz.html         # cartaz A4 com QR Code, para imprimir
css/style.css       # estilos do jogo
css/telao.css       # estilos do telão
js/config.js        # ⚙️ CONFIGURAÇÕES (URL da planilha, créditos...)
js/questions.js     # banco de perguntas + fontes
js/reactions.js     # memes, GIFs e faixas de resultado
js/ranking.js       # envio/leitura do ranking + filtro de nomes
js/fx.js            # sons, vibração e confete
js/qr.js            # QR Code do telão e do cartaz
js/app.js           # lógica do jogo
js/telao.js         # lógica do telão
apps-script/Codigo.gs  # "servidor" do ranking (vai dentro da Planilha Google)
```

## Passo a passo para a feira

### 1. Publicar o jogo no GitHub Pages (grátis)
1. Crie uma conta em github.com e clique em **New repository** (ex.: `esporotri-quiz`, público).
2. Envie os arquivos: pelo site (**Add file → Upload files**, arrastando todo o conteúdo da pasta) ou pelo terminal:
   ```bash
   git remote add origin https://github.com/SEU-USUARIO/esporotri-quiz.git
   git push -u origin main
   ```
3. No repositório: **Settings → Pages → Branch: main / (root) → Save**.
4. Em 1 ou 2 minutos o jogo estará em `https://SEU-USUARIO.github.io/esporotri-quiz/`.

### 2. Criar o ranking na Planilha Google
1. Crie uma planilha nova em sheets.google.com (ex.: "Ranking Esporotri-Quiz").
2. Menu **Extensões → Apps Script**. Apague o que estiver lá e cole todo o conteúdo de `apps-script/Codigo.gs`. Salve.
3. Clique em **Implantar → Nova implantação**, engrenagem → **App da Web**:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
4. Autorize. O Google vai avisar que o app não foi verificado: clique em **Avançado → Acessar**. É o seu próprio script.
5. Copie a **URL do app da Web** (termina em `/exec`) e cole em `js/config.js`:
   ```js
   API_URL: "https://script.google.com/macros/s/XXXX/exec",
   ```
6. Envie o `config.js` atualizado para o GitHub.

> Se mudar o código do script depois, use **Implantar → Gerenciar implantações → editar → Nova versão**. Assim a URL continua a mesma.

### 3. Ajustar os créditos
Em `js/config.js`, troque `CREDITS` pelos nomes do grupo, do curso e da instituição.

### 4. Imprimir o cartaz
Abra `https://SEU-USUARIO.github.io/esporotri-quiz/cartaz.html` e clique em **Imprimir cartaz**. Escolha A4, margens "Nenhuma" e ative "Gráficos de fundo".
⚠️ Abra o cartaz pelo endereço publicado: se abrir pelo arquivo do computador, o QR Code aponta para um endereço que não funciona no celular (a página avisa quando isso acontece).

### 5. No estande
- Abra `.../telao.html` no notebook/TV, clique em **⛶ Tela cheia** (esse clique também libera o som do telão) e deixe aberto. Ele atualiza sozinho a cada 5 segundos.
- **Apagar um nome inadequado:** apague a linha na aba "Jogadas" da planilha.
- **Zerar o ranking** (ex.: novo dia): apague todas as linhas abaixo do cabeçalho.
- No fim, a planilha tem todas as jogadas, prontas para apresentar números ("120 pessoas jogaram, média de 6,8").

### Checklist antes da feira
- [ ] Testar o QR Code impresso num **iPhone** e num **Android**, usando os **dados móveis** (a internet da feira pode ser fraca).
- [ ] Jogar uma partida e ver o nome aparecer no telão.
- [ ] Pedir a um professor que revise as perguntas.
- [ ] Trocar os GIFs provisórios pelos memes escolhidos pelo grupo (veja abaixo).
- [ ] Deixar o notebook do telão na tomada e com a proteção de tela desligada.

## Testar no computador
```bash
python3 -m http.server 8080
```
Abra `http://localhost:8080` (jogo) e `http://localhost:8080/telao.html` (telão).
Sem `API_URL`, o ranking fica salvo só no navegador. Isso basta para testar o jogo e o telão abertos no mesmo navegador.

## Personalizar
- **Perguntas:** `js/questions.js`. `answer` é o índice da alternativa certa (0 a 3) e `source` aponta para a fonte em `SOURCES`. Mantenha as alternativas com tamanhos parecidos, para a certa não ser sempre a mais longa.
- **Quantidade por nível:** `QUESTIONS_PER_LEVEL` em `js/config.js`.
- **Memes e GIFs:** `js/reactions.js`. Os GIFs atuais (cataas.com) são provisórios e pesados. O ideal é salvar GIFs **leves (até ~500 KB)** numa pasta `img/` e usar `"img/gato-da-lixa.gif"`. Se um GIF não carregar, aparece o emoji com o meme, e o jogo segue normal.
- **Palavras bloqueadas:** listas `BLOCKED_PARTS` e `BLOCKED_WORDS`, em `js/ranking.js` **e** em `apps-script/Codigo.gs` (mantenha as duas iguais).

## Fontes do conteúdo
- [Ministério da Saúde: Esporotricose humana](https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/e/esporotricose-humana)
- [Secretaria da Saúde do Paraná: Esporotricose](https://www.saude.pr.gov.br/Pagina/Esporotricose)
- [Portaria GM/MS nº 6.734/2025: esporotricose humana na Lista Nacional de Notificação Compulsória](https://app.wiki.saude.es.gov.br/vigilancia/sistemas/portaria_gm_ms_n%C2%BA_6.734_de_18_de_mar%C3%A7o_de_2025_-_esporotricose_humana_na_lista_nacional.pdf)
- [Fiocruz: Sporothrix brasiliensis em gatos](https://www.arca.fiocruz.br/handle/icict/58830)
- [Fiocruz: Esporotricose felina no Rio de Janeiro](https://www.arca.fiocruz.br/handle/icict/9310)

> Projeto educativo. Em caso de suspeita de esporotricose, procure um veterinário (para o animal) ou uma unidade de saúde (para pessoas).
