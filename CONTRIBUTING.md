# Contribuindo com o ZeroDelay

Obrigado pelo interesse em contribuir! Este guia explica como rodar a extensão
localmente, o estilo de código esperado e como enviar uma boa Pull Request.

O ZeroDelay é software livre sob a licença **GPL-3.0-or-later**. Ao contribuir,
você concorda que seu código será distribuído sob essa mesma licença.

## Pré-requisitos

- **Node.js 20+** (o CI usa a versão 22) e npm — necessários para lint, testes e
  build.
- **Google Chrome** (ou outro Chromium) e/ou **Firefox** para testar.

Instale as dependências de desenvolvimento:

```bash
npm install
```

## Rodando a extensão localmente

### Chrome / Chromium

1. Acesse `chrome://extensions`.
2. Ative o **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação** e selecione a **pasta raiz do
   repositório** (onde fica o `manifest.json`).
4. Abra uma live do YouTube com DVR ativado para testar. Após alterar arquivos,
   clique em **Atualizar** na página de extensões e recarregue a aba do YouTube.

### Firefox

O Firefox usa um manifesto próprio, gerado pelo build. Use o `web-ext`:

```bash
npm run run:firefox
```

Isso builda a versão Firefox em `dist/firefox` e abre uma instância temporária do
navegador com a extensão já carregada.

## Verificações antes de abrir uma PR

Rode as três verificações que o CI também executa:

```bash
npm run lint      # ESLint — estilo e corretude
npm test          # testes unitários (node --test)
npm run build     # valida e empacota a extensão em build/
```

Todas devem passar (exit 0). Para a validação específica de publicação no
Firefox/AMO, use `npm run lint:firefox`.

## Estilo de código

- O estilo é garantido pelo **ESLint** (`eslint.config.mjs`). Rode `npm run lint`
  e corrija os apontamentos antes de enviar.
- Escreva código no mesmo idioma e estilo dos arquivos ao redor. Comentários e
  textos voltados ao usuário ficam em **português (pt-BR)**; strings da interface
  devem ser localizadas em `_locales/en` e `_locales/pt_BR` (mantenha as duas em
  paridade).
- Evite dependências de runtime novas: a extensão roda sem bundler e sem passo de
  build no navegador.

## ⚠️ Restrição importante: chaves de storage

A extensão persiste configurações em `chrome.storage.local`. **Renomear ou
remover uma chave existente quebra a configuração já salva dos usuários.** Em
particular, a chave `skipThreathold` (com essa grafia histórica) **não pode ser
renomeada**. Ao adicionar configurações, crie chaves novas em vez de alterar as
existentes.

## Testando em uma live real

Antes de abrir a PR, teste o comportamento em uma **transmissão ao vivo real** do
YouTube (não um vídeo comum), preferencialmente uma com DVR/atraso, e verifique:

- A recuperação de latência funciona (a velocidade sobe quando você está atrás e
  volta a `1.0x` ao alcançar o ao vivo);
- Os indicadores no player aparecem corretamente, quando ativados;
- Nada quebra em tela cheia nem no player incorporado.

Diga na descrição da PR em qual(is) navegador(es) você testou.

## Convenções de commit

- Escreva mensagens claras e objetivas, no imperativo (ex.: "Corrige...",
  "Adiciona...").
- Um assunto conciso na primeira linha; detalhes no corpo, se necessário.
- Uma mudança lógica por PR sempre que possível — PRs pequenas são revisadas mais
  rápido.
- Referencie a issue relacionada (ex.: `Fecha #3`).

## Abrindo a Pull Request

1. Faça um fork e crie um branch a partir de `main`.
2. Faça suas mudanças e rode as verificações acima.
3. Abra a PR preenchendo o template — em especial o checklist de storage e de
   testes.
4. Atualize o [CHANGELOG.md](CHANGELOG.md) na seção *Não lançado* quando a
   mudança for relevante para os usuários.

## Código de Conduta

Este projeto adota o [Código de Conduta](CODE_OF_CONDUCT.md). Ao participar,
espera-se que você o respeite.
