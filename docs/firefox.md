# ZeroDelay no Firefox

O ZeroDelay roda no Firefox Desktop com o mesmo código que atende Chrome e Edge.
O motor de recuperação de latência, os modos e os indicadores no player são os
mesmos — muda apenas o manifesto, gerado à parte para o Firefox.

## Gerando o build

```
npm install
npm run build:firefox
```

Pronto: a pasta `dist/firefox` sai pronta para carregar no Firefox ou empacotar.

O script `scripts/build-firefox.js` copia os arquivos da extensão para
`dist/firefox` e usa o `manifest.firefox.json` como manifesto. É uma cópia
direta, sem bundler.

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run build:firefox` | Gera `dist/firefox` |
| `npm run lint:firefox` | Valida o build com `web-ext lint` |
| `npm run run:firefox` | Abre o Firefox já com a extensão carregada |
| `npm run package:firefox` | Empacota o `.zip` em `web-ext-artifacts` |

## Por que dois manifestos

Chrome e Edge carregam o `manifest.json` da raiz, com o `background` rodando como
*service worker*. O Firefox prefere `background.scripts`, então o
`manifest.firefox.json` troca esse trecho por `scripts` + `type: module` e
declara o `browser_specific_settings.gecko` (ID e versão mínima). Permissões,
content scripts e recursos web seguem iguais nos dois.

Duas particularidades do Gecko que o manifesto e o código já cobrem:

- o Firefox quer `author` como texto, e não como objeto, então cada manifesto o
  declara à sua maneira;
- ao entregar as configurações do content script para a página, a versão Firefox
  passa o objeto por `cloneInto`, respeitando o isolamento de mundo do Gecko.

Todas as APIs usadas (`storage`, `runtime`, `alarms`, `action`, `tabs`, `i18n`)
existem nos dois motores sob o namespace `chrome.*`, que o Firefox também expõe.

## Alcance

Suporta Firefox Desktop **121+**. Firefox para Android, Android TV e o aplicativo
do YouTube ficam de fora, assim como a publicação na loja de complementos (AMO),
que pede assinatura, capturas de tela e declaração de coleta de dados à parte.
