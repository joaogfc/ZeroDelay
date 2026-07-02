# Contribuidores

O ZeroDelay é um trabalho colaborativo. Obrigado a quem contribuiu com código
(a autoria de cada commit é preservada no histórico do Git). Este arquivo é
atualizado a cada nova contribuição mesclada.

## Suporte a Firefox
- **Emanoel** ([@emanoeI](https://github.com/emanoeI)) — build do Firefox Desktop:
  `manifest.firefox.json` + build em Node + tooling `web-ext` — **PR #4 (mesclada)**;
  alinhamento da documentação Firefox ao manifesto — **PR #14 (mesclada)**.
- **Kweripx** ([@kweripx](https://github.com/kweripx)) — suporte inicial a Firefox
  no manifesto — **PR #1** (base para a #4).

## Motor, testes e automação
- **juansilvadesign** ([@juansilvadesign](https://github.com/juansilvadesign)) —
  resiliência do motor de catch-up, testes (`node:test`) e tooling de release —
  **PR #5 (mesclada)**.
- **jrlucas1** ([@jrlucas1](https://github.com/jrlucas1)) — catch-up **preditivo**
  pela tendência do buffer — **PR #13 (mesclada)** — além da base de pipeline de
  CI e automação de releases (**PR #2**).
- **bruno-gianini** ([@brunogianini](https://github.com/brunogianini)) — correção de
  vazamentos de memória em listeners do player e do `chrome.storage` — **PR #17 (mesclada)**.

## UX e acessibilidade
- **huandrey** ([@huandrey](https://github.com/huandrey)) — **atalhos de teclado**
  (liga/desliga e ir ao vivo, **PR #8**), **acessibilidade** por teclado + `aria-label`
  nos indicadores (**PR #9**) e o check de paridade de locales no CI (**PR #7**) —
  todas mescladas.
- **MoreiraGustav** ([@MoreiraGustav](https://github.com/MoreiraGustav)) — atalhos
  de teclado (**PR #10**); registrou a ideia de o "ir ao vivo" agir só na aba ativa,
  incorporada na **PR #16**.
- **Emanoel** ([@emanoeI](https://github.com/emanoeI)) — atalho "ir ao vivo" restrito
  à aba ativa (via `chrome.tabs.sendMessage`) — **PR #16 (mesclada)**.
- **Guilherme** ([@ventgui28](https://github.com/ventgui28)) — **Botão "Ir ao Vivo"** de ação rápida diretamente no popup da extensão — **PR #15 (mesclada)**.

## Ideias e relatos
- **Habini86** ([@Habini86](https://github.com/Habini86)) — ideia do gerenciamento
  dinâmico de buffer pela variação de chegada (**issue #12**), implementada na PR #13.
- **fsousac** ([@fsousac](https://github.com/fsousac)) — proposta de padronização da
  governança do projeto (**issue #3**).

---

O projeto deriva da extensão [live-catch-up](https://github.com/yudai-tiny-developer/live-catch-up),
de yudai-tiny-developer (ver [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)).
