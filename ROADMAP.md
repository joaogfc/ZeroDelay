# ZeroDelay — Plano de Melhorias e Implementação

> Documento de planejamento. Não altera comportamento por si só — descreve o quê,
> por quê e em que ordem. Cada item aponta `arquivo:linha` para ser acionável.

## Contexto (arquitetura em 4 linhas)

- `content.js` — content script (mundo isolado). Faz a ponte `chrome.storage` →
  página via `CustomEvent`, injeta `inject.js`, e cuida da UI de doação/stall.
- `inject.js` — o **motor**, roda no mundo da página (MAIN). A cada 250 ms lê
  APIs **privadas** do player (`getStatsForNerds`, `getProgressState`, …) e aplica
  `player.setPlaybackRate()`. Renderiza os indicadores no player.
- `common.js` — config compartilhada: chaves de storage, defaults, presets/modos,
  i18n, lógica de doação.
- `popup.js` / `background.js` / `pix.js` — UI de ajustes, service worker (badge de
  doação) e gerador de PIX (BR Code) local.

O ponto único de falha é o acoplamento do motor a APIs internas do YouTube, hoje
**sem nenhuma proteção**. Este plano prioriza blindar isso antes de recursos novos.

---

## Resumo priorizado

| ID | Melhoria | Prioridade | Esforço | Impacto |
| --- | --- | --- | --- | --- |
| ✅ R1 | `try/catch` + feature-detect no laço do motor | **P0** | 2–3 h | Alto |
| ✅ R2 | Re-detecção em navegação SPA (`yt-navigate-finish`) | **P0** | 2 h | Alto |
| ✅ R3 | Degradação visível quando as APIs somem | **P0** | 1 h | Médio |
| H1 | `package.json` + script de build/zip + version-stamp | **P1** | 2–3 h | Alto |
| H2 | Reconciliar versão (1.1 vs 1.0) e marca (“Live Sync” → ZeroDelay) | **P1** | 30 min | Médio |
| H3 | Extrair lógica pura + testes (PIX, modos, controlador) | **P1** | 4–6 h | Alto |
| H4 | ESLint + Prettier + CI (lint/test/build) | **P1** | 2 h | Médio |
| H5 | Remover código morto (`calc_threathold`/`calc_segduration`) | **P1** | 15 min | Baixo |
| U1 | Atalhos de teclado (`commands`: liga/desliga, ir ao vivo) | P2 | 2 h | Médio |
| U2 | A11y: navegação por setas no radiogroup + `aria-label` nos indicadores | P2 | 2 h | Médio |
| U3 | Suporte a Firefox (`browser_specific_settings`) | P2 | 1–2 h | Médio |
| U4 | Docs de dev (README dev, CHANGELOG, CONTRIBUTING) | P2 | 2 h | Baixo |
| U5 | Memória de modo por canal + chip “ir ao vivo” no popup | P2 | 3–4 h | Baixo |

---

## Fase 0 — Resiliência do motor (P0) — ✅ Concluída

> **✅ Concluída em 2026-06-30 — Resiliência do motor (R1–R3).**
> Loop de 250 ms blindado com `try/catch` + feature-detection das APIs privadas
> do player (desiste após 8 erros seguidos, com 1 aviso no console), re-detecção
> idempotente em navegação SPA (`yt-navigate-finish`) e indicadores que somem na
> degradação (nunca deixam valores congelados). Escopo: só `inject.js`
> (+166 −64). Não commitado; `manifest` segue em `1.1`.

O valor inteiro da extensão vive dentro de um `setInterval` de 250 ms
(`inject.js:359-399`) que chama APIs não documentadas do YouTube. Qualquer
refatoração do player derruba tudo — 4×/segundo, para sempre, sem sinal.

### R1 — Proteger o laço e detectar as APIs uma vez
- **Onde:** `inject.js:350-408` (handler `_live_catch_up_load_settings`) e o corpo
  do `setInterval`.
- **O quê:**
  1. Ao detectar o player, checar uma vez a presença de cada API usada
     (`getStatsForNerds`, `getProgressState`, `getVideoData`, `setPlaybackRate`,
     `getPlaybackRate`, `seekToLiveHead`, `getPlayerStateObject`). Guardar num
     objeto `caps`.
  2. Envolver o corpo do tick em `try/catch`. Em erro: incrementar
     `consecutiveErrors`; após ~8 falhas seguidas, `clearInterval`, esconder
     indicadores e `console.warn` **uma vez** (`[ZeroDelay] player API changed…`).
  3. Só chamar cada função se `caps` disser que existe; senão, pular aquele efeito
     (ex.: sem `seekToLiveHead` → desliga o skip, mantém o resto).
- **Aceite:** simular ausência de `getStatsForNerds` não gera loop de exceções; o
  restante (indicadores possíveis) continua; um único warn aparece.

### R2 — Re-detecção em navegação SPA
- **Onde:** `inject.js:414-450` (`detect_interval` roda **uma vez** e dá
  `clearInterval`); não há listener de navegação em `content.js`/`inject.js`.
- **Por quê:** YouTube é SPA. Trocar de live na mesma aba não recarrega o script;
  os indicadores podem ficar órfãos e o motor apontar para estado velho.
- **O quê:** ouvir `yt-navigate-finish` (e/ou `yt-player-updated`) para re-rodar a
  detecção do player e re-inserir os botões se o `time-display` foi reconstruído.
  Tornar a inserção idempotente (não duplicar botões se já presentes).
- **Aceite:** navegar entre duas lives sem reload mantém indicadores e catch-up
  funcionando; sem botões duplicados.

### R3 — Degradação visível
- **Onde:** consumidor do estado de erro de R1.
- **O quê:** quando o motor cai em modo degradado, esconder os indicadores em vez
  de mostrar valores congelados; opcionalmente refletir “indisponível” no popup
  via um flag em `chrome.storage` lido em `popup.js`.
- **Aceite:** nenhum indicador “travado” na tela após perda de API.

---

## Fase 1 — Higiene de release e manutenção (P1)

### H1 — Build reprodutível
- **Problema:** o `CHECKLIST.md:11` cita `build/zerodelay-1.0.zip`, mas **não há
  script** que o gere — é manual, e já divergiu (ver H2).
- **O quê:** `package.json` com scripts:
  - `build` → gera `build/zerodelay-<version>.zip` lendo a versão do `manifest.json`,
    **excluindo** `.git`, `publishing/`, `ROADMAP.md`, `test/`, `node_modules`,
    dev-config.
  - `version:patch|minor` → sobe a versão no `manifest.json` de forma atômica.
  - `validate` → checagem básica do manifest (campos obrigatórios, sem `key`/`update_url`).
  Zero dependências pesadas (bastam `zip`/`archiver` + Node).
- **Aceite:** `npm run build` produz um zip com `manifest.json` na raiz, nomeado
  pela versão real, sem arquivos de dev.

### H2 — Reconciliar versão e marca
- **Versão:** `manifest.json:32` está em `1.1`, mas `CHECKLIST.md` e o zip citam
  `1.0`. Definir a fonte da verdade (o manifest) e corrigir os textos.
- **Marca:** o popup mostra `label.appName` = **“Live Sync”** (en) /
  **“Sincronizador de Live”** (pt) — `common.js:19`, `_locales/en/messages.json:5`,
  enquanto o produto/manifest/README é **“ZeroDelay”**. Unificar `appName` para
  “ZeroDelay” nos dois locales (ou localizar o `name` do manifest via `__MSG__`).
- **Aceite:** cabeçalho do popup e nome da loja batem; checklist reflete a versão
  real.

### H3 — Extrair lógica pura + testes
Maior alavanca de qualidade. Tudo abaixo é determinístico e testável sem DOM:
- **PIX (`pix.js`):** `crc16` e `buildPixCode` contra códigos “copia e cola”
  conhecidos-bons (o CRC é a parte que mais quebra em silêncio).
- **Modos (`common.js`):** round-trip `presets[x]` → `deriveMode` === `x`;
  `limitValue`/`range`/`step`; `donateEligible`; `calmerMode`.
- **Controlador de catch-up:** extrair `calc_playbackRate`, `auto_buffer_target`,
  `accel_allowed_by_buffer` de `inject.js:151-186` para um módulo puro
  (ex.: `engine/controller.js`) sem estado global, e testar: buffer alto →
  acelera; buffer no piso → 1.0x; latência < `MIN_LATENCY` → 1.0x; histerese
  (`CATCH_UP_BAND`) não fica oscilando.
- **Runner:** `node:test` (nativo, sem dependência) ou `vitest`.
- **Aceite:** `npm test` verde cobrindo PIX, modos e controlador.

### H4 — Lint + formato + CI
- ESLint (regras leves, `no-unused-vars` pega o código morto de H5) + Prettier.
- GitHub Actions: `lint` + `test` + `build` em push/PR; anexar o zip em tags `v*`.
- **Aceite:** PR verde obrigatório; artefato de build publicado na release.

### H5 — Remover código morto
- **Onde:** `inject.js:188-210` — `calc_threathold` e `calc_segduration` são
  definidas e **nunca chamadas** (o skip usa a `skipThreathold` de config, não
  estas). Remover.
- **Aceite:** lint sem `no-unused`; comportamento idêntico.

---

## Fase 2 — UX, acessibilidade e recursos (P2)

### U1 — Atalhos de teclado
- `commands` no manifest + handler no `background.js`: liga/desliga o modo atual e
  “pular para o ao vivo” sem abrir o popup.

### U2 — Acessibilidade
- Cards de modo são `role="radio"` (`popup.js:90`) mas sem navegação por setas nem
  tab-stop único; implementar o padrão radiogroup (setas movem, um só tab-stop).
- Botões de indicador no player (`inject.js:294-306`) sem `aria-label`; adicionar
  rótulos (“velocidade”, “latência”, “buffer”).

### U3 — Firefox
- `content.js:46` já usa `cloneInto` (intenção de Firefox), mas falta
  `browser_specific_settings.gecko`. Adicionar id/versão mínima e validar o service
  worker MV3 no Firefox atual.

### U4 — Documentação de dev
- README de desenvolvimento (carregar sem empacotar, `npm run build`), `CHANGELOG.md`
  (começando em 1.1) e `CONTRIBUTING.md` (projeto GPL-3.0).

### U5 — Recursos opcionais
- Memória de modo por canal (lembrar o modo escolhido por `channelId`).
- Chip “ir ao vivo agora” no popup, além do skip automático.
- **Nota de migração:** a chave persistida `skipThreathold` (grafia incorreta de
  *threshold*, em `common.js`/`content.js`/`inject.js`) só deve ser renomeada com
  migração de storage — caso contrário zera o ajuste de usuários existentes. Baixa
  prioridade; puramente cosmético.

---

## Ordem de execução sugerida

1. ~~**R1 → R2 → R3** (blindar o motor)~~ — ✅ concluída em 2026-06-30.
2. **H5 + H2** (limpeza rápida de baixo risco).
3. **H1 + H4** (build + CI para travar regressões).
4. **H3** (extrair e testar — depende de H1/H4 para valer a pena).
5. **U1–U5** conforme apetite.

## O que já está bom (não mexer)
- Doação opcional bem-feita: respeita opt-out/snooze, gated em uso real, nunca
  bloqueia a extensão (`common.js:127-131`, `content.js:81-161`).
- PIX 100% local, sem rede (compatível com a regra MV3 de “sem código remoto”).
- Watchdog de stall que só oferece modo **mais calmo** — bom antídoto a mau uso.
- Controle de `setPlaybackRate` que cede ao usuário quando ele muda a velocidade
  manualmente (`inject.js:104-121`).
