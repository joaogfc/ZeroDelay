# Changelog

Todas as mudanças relevantes deste projeto são documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado

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

- Maior resiliência do motor de catch-up.
- Controle de catch-up **preditivo**: além do nível do buffer, o motor agora
  observa a *tendência* (a variação do buffer ao longo do tempo) e recua para
  `1.0x` de forma preventiva quando o buffer está drenando — mesmo ainda alto —
  reduzindo travamentos em redes instáveis (issue #12).

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
