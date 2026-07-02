# Changelog

Todas as mudanças relevantes deste projeto são documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado

- **Memória de modo por canal**: o ZeroDelay agora lembra o modo selecionado para cada canal do YouTube e reaplica a preferência ao retornar ao mesmo canal.

### Corrigido

- Botão CTA **"Apoiar via PIX"** agora alterna o painel de doação (abre **e**
  fecha), em vez de apenas abrir — mesmo comportamento do botão "Apoiar".

### Removido

- **Botão "Ir ao Vivo"** do popup — destoava da interface. O atalho de teclado
  (`Alt+Shift+L`) continua pulando para o ao vivo.

## [1.1.1] - 2026-07-02

### Adicionado

- **Botão "Ir ao Vivo"**: Adicionado botão de ação rápida diretamente no popup para saltar manualmente para o tempo real da live.
- **Idiomas**: interface em espanhol (`es`) e francês (`fr`), além de inglês e
  português. A doação segue o idioma (Buy me a coffee fora do pt-BR). O
  `check:locales` agora valida todos os locales contra o `en`.
- **Atalhos de teclado** para ativar/desativar o ZeroDelay (`Alt+Shift+Y`) e
  pular para o ao vivo (`Alt+Shift+L`) — `⌘+Shift+…` no Mac —, sem abrir o popup.
  Reconfiguráveis em `chrome://extensions/shortcuts`.
- **Acessibilidade**: navegação por setas (padrão ARIA radiogroup, um único
  tab-stop) nos cartões de modo e `aria-label` nos indicadores do player.
- Suporte ao **Firefox Desktop**: `manifest.firefox.json`, build em Node e
  tooling `web-ext` (`run:firefox`, `lint:firefox`, `package:firefox`).
- Pipeline de **CI** (GitHub Actions) rodando lint, testes e build a cada push e
  pull request.
- **Testes unitários** do motor de catch-up (`node --test`).
- Tooling de release: validação (`scripts/validate.mjs`), build
  (`scripts/build.mjs`) e bump de versão (`scripts/bump.mjs`).
- Estrutura de governança: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`,
  `SECURITY.md`, templates de issue e de pull request e este `CHANGELOG.md`.
- `CONTRIBUTORS.md` creditando os autores das PRs da comunidade.

### Alterado

- **Interface do popup repaginada** com a linguagem visual "degradado → nítido":
  tipografia **Departure Mono** (self-hosted) em títulos e números; ícones de modo
  que fazem *morph* de pixelado (**Pixelarticons**) para nítido (**Lucide**) no
  hover/foco/seleção; paleta de sinal cinza↔vermelho espelhando o selo de "ao
  vivo" do YouTube; o "o" de Zer**o**Delay como selo LIVE que morfa de pixel-art
  para um disco vermelho ao sincronizar; sistema de "sticker" com sombra dura nos
  botões; CTA de apoio como balão que sai do botão; área do PIX como cupom
  destacável com um ícone de bebida por valor; e textura de scanline que some ao
  sincronizar. Puramente visual — nenhuma mudança de comportamento, storage ou
  chaves i18n. Fontes e ícones são vendorados localmente (sem CDN) e creditados no
  `THIRD-PARTY-NOTICES.md` (Departure Mono — SIL OFL; Pixelarticons — MIT;
  Lucide — ISC).
- Maior resiliência do motor de catch-up.
- Controle de catch-up **preditivo**: além do nível do buffer, o motor agora
  observa a *tendência* (a variação do buffer ao longo do tempo) e recua para
  `1.0x` de forma preventiva quando o buffer está drenando — mesmo ainda alto —
  reduzindo travamentos em redes instáveis (issue #12).
- **Modos repaginados**: "Latência Mínima" vira **"Extremo"** (buffer ~2s) e os
  demais ficam mais perto do ao vivo (Suave 8→5, Equilibrado 6→4, Próximo
  4,5→3s). Sem novas chaves de storage.
- **Tema cerveja no apoio (Brasil)**: no `pt-BR` o convite de doação usa
  "cerveja"/"cervejinha" 🍺 (título, nota, CTA, nudge e banner) e ícones de
  bebida (copo americano → lata → long neck → caneca); os demais idiomas seguem
  café/coffee. Chips do PIX reorganizados em grade de 4 colunas com "Outro" em
  linha própria. Ramificado por idioma, como o PIX × doação internacional.

### Corrigido

- **Build**: a pasta `fonts/` (Departure Mono) passou a ser incluída no pacote
  (Chrome e Firefox). Sem isso, a fonte ficava de fora do `.zip`/`dist` e a
  tipografia da repaginação caía no fallback do sistema.

- Ícones dos modos (e demais glifos SVG do popup) não apareciam — sobrava só o
  fundo circular. Os SVG inline sem `xmlns` caíam no namespace nulo ao serem
  parseados como `image/svg+xml`; `parseSvg` agora usa `text/html`, que aplica o
  namespace SVG corretamente. O QR Code do PIX segue funcionando.
- **Firefox**: a detecção de `cloneInto` passou a ser por feature detection em
  vez de sniffing de user agent — com `privacy.resistFingerprinting` (ou UA
  alterado) a extensão ficava silenciosamente inoperante. O motor também ignora
  eventos de settings cujo `detail` não atravessou os mundos (X-ray).
- PIX restrito a `pt-BR`: usuários de `pt-PT` viam o QR do PIX (inutilizável em
  Portugal) em vez do link internacional de doação.
- O contador de uso da doação não infla mais com várias abas abertas (só uma
  aba contabiliza cada minuto de relógio).
- O atalho de ativar/desativar (`Alt+Shift+Y`) voltava a gravar "desligado" em
  dados legados (`enabled=false` sem preset completo) — agora religa na
  primeira pressão.
- O popup se mantém sincronizado com mudanças externas (atalho de teclado,
  oferta de troca de modo no player) enquanto está aberto.
- O estado do controlador de catch-up (EMAs, histerese) é zerado ao navegar
  entre lives — decisões dos primeiros segundos não usam mais dados da
  transmissão anterior.
- Indicadores não exibem mais `NaN` quando o player não reporta latência ou
  buffer; o chip de "copiar link" não gera mais URL com `v=undefined`.
- `bump.mjs` agora versiona também `manifest.firefox.json` e
  `package-lock.json`; `validate.mjs` valida os dois manifests e acusa
  divergência de versão entre eles.
- Vazamentos de memória em navegações consecutivas: listener preso ao
  `<video>` antigo quando o YouTube trocava o elemento (ex.: live → live) sem
  removê-lo; risco de listeners duplicados em `chrome.storage.onChanged` caso
  o content script fosse reinicializado na mesma aba; e uma race condition no
  `setInterval` de detecção do player quando `yt-navigate-finish` disparava em
  sequência rápida (PR #17).

### Alterado (interno)

- Pacote da Chrome Web Store gerado por **whitelist** de arquivos (como no
  build do Firefox) — um arquivo estranho na árvore não pode mais vazar no zip.
- Detecção do player com back-off (20s rápidos, depois sondagem lenta) em vez
  de polling de 500ms para sempre em páginas/frames sem live; recarga de
  settings só quando uma chave do motor realmente muda.
- Deduplicações: resolução de settings unificada em `common.resolveSettings`,
  cards flutuantes (doação/stall) num único construtor, `ensureInstalledAt`
  compartilhado; removidos eventos e UI mortos
  (`_live_catch_up_onPlaybackRateChange`, `_live_catch_up_reset_playback_rate`,
  `#mode-warning`/`minWarning`).
- Radiogroup de valores do PIX navegável por teclado (setas/Home/End), `lang`
  do popup segue o idioma real da interface.
- CI usa `npm ci`; `package.json` declara `engines.node >= 22.2`; versões dos
  manifests normalizadas para `1.1.0`.

## [1.1.0] - 2026-06-30

### Adicionado

- Doação opcional adaptada ao idioma: PIX (com QR Code local) para pt-BR e
  Buy Me a Coffee para en.
- Aviso de travamento da transmissão, sugerindo trocar de modo quando a conexão
  não sustenta o alvo de buffer.

### Alterado

- Conformidade de licença: atribuição explícita ao projeto base
  [live-catch-up](https://github.com/yudai-tiny-developer/live-catch-up)
  (MIT/Apache-2.0) em `THIRD-PARTY-NOTICES.md`.

## [1.0] - 2026-06-23

### Adicionado

- Lançamento inicial na Chrome Web Store (Manifest V3).
- Motor de catch-up que reduz a latência das lives acelerando temporariamente a
  reprodução e voltando a `1.0x` ao alcançar o ao vivo.
- Popup de configurações com modos de um toque e indicadores opcionais no player
  (velocidade, latência ao vivo e saúde do buffer).
- Localização em inglês e português (BR).
- Doação opcional via PIX com QR Code gerado localmente.
