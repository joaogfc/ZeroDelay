# ZeroDelay

Uma extensão de navegador que ajuda as lives do YouTube a voltarem ao tempo real
quando o player fica para trás.

Quando uma transmissão ao vivo com DVR ativado começa a atrasar, a extensão pode
aumentar temporariamente a velocidade de reprodução, monitorar a saúde do buffer,
opcionalmente pular de volta para o ao vivo se o atraso ficar grande demais e
exibir estatísticas extras da transmissão direto na interface do player do
YouTube.

## Recursos

- Modos de um toque, da recuperação suave (para conexões fracas) à latência
  mínima, que te mantém o mais perto possível do ao vivo
- Aumenta a velocidade automaticamente enquanto a live está atrás do ao vivo e
  volta para `1.0x` assim que alcança
- Modos mais próximos do ao vivo, que continuam puxando para a borda consumindo
  o buffer
- Pulo para o ao vivo quando o atraso passa do limite (ligado por padrão em 30s)
- Cada modo mostra a velocidade de internet com que funciona melhor
- Indicadores opcionais no player: velocidade de reprodução, latência ao vivo e
  saúde do buffer
- Os controles adicionados se integram à interface padrão do player do YouTube,
  continuando disponíveis até em tela cheia
- Funciona também no player incorporado do YouTube
- Atalhos de teclado para ligar/desligar (`Alt+Shift+Y`) e pular para o ao vivo
  (`Alt+Shift+L`) — `⌘+Shift+…` no Mac —, reconfiguráveis em
  `chrome://extensions/shortcuts`

## Configurações

Tudo é entregue por **modos** de um toque. O acelerador aumenta só o necessário
(suaves `1.25x`) para consumir o conteúdo já baixado e te puxar para o tempo
real, o que **reduz a latência ao vivo**. Depois descansa em `1.0x`, que *segura*
a latência — então age em rajadas curtas, não o tempo todo, e só volta a agir
quando você atrasa de novo (após uma travada). Cada modo mantém uma quantidade
diferente de **buffer**: menos buffer = mais perto do ao vivo, mas pede uma
conexão melhor. O pulo para o ao vivo vem ligado por padrão em 30s.

> **Nota:** as lives modernas do YouTube ("SABR / manifestless") ignoram
> mudanças diretas de `video.playbackRate`; o motor usa a API `setPlaybackRate()`
> do próprio player, que é o que realmente faz a recuperação funcionar nelas.

### Modos

| Modo | Mantém buffer | Internet recomendada |
| --- | --- | --- |
| **Desligado** | — | Qualquer |
| **Automático** ⭐ | adapta | Qualquer (se ajusta) |
| **Suave** | ~8s | Lenta/instável (~3+ Mbps) |
| **Equilibrado** | ~6s | ~5–10 Mbps |
| **Próximo** | ~4,5s | Estável ~15+ Mbps |
| **Latência Mínima** | ~3,5s | Rápida/estável ~25+ Mbps |

**Automático** (o padrão) mede sua conexão (banda, estabilidade do buffer,
travadas) e ajusta o alvo de buffer na hora — mais perto do ao vivo quando a
internet aguenta, mais buffer quando ela oscila. Um guarda de buffer nunca
acelera quando o buffer está baixo, em nenhum modo. A menor latência possível é o
próprio ponto ao vivo da transmissão (o piso de codificação → ingestão →
transcodificação → CDN do servidor), que nenhuma ferramenta do lado do
espectador consegue furar.

### Indicadores no player

Leituras opcionais exibidas na barra do player do YouTube (ao lado do selo de ao
vivo):

- `Exibir velocidade de reprodução atual`
- `Exibir latência atual da transmissão ao vivo`
- `Exibir saúde atual do buffer`

## Contribuindo

Contribuições são bem-vindas! Veja o [CONTRIBUTING.md](CONTRIBUTING.md) para
saber como rodar a extensão localmente, o estilo de código e como abrir uma boa
Pull Request. Ao participar, você concorda com o
[Código de Conduta](CODE_OF_CONDUCT.md).

- Encontrou um bug ou tem uma ideia? [Abra uma issue](https://github.com/joaogfc/ZeroDelay/issues/new/choose).
- Encontrou uma falha de segurança? Não abra issue pública — veja o
  [SECURITY.md](SECURITY.md).
- O histórico de mudanças fica no [CHANGELOG.md](CHANGELOG.md).

## Autor

Criado por **João Gustavo França**

- GitHub: [@joaogfc](https://github.com/joaogfc)
- E-mail: [joao@solitus.com.br](mailto:joao@solitus.com.br)

Curtiu? Toque no botão "Apoiar" no popup para me pagar um café via PIX. O QR Code e o
"copia e cola" são gerados localmente — nenhum dado sai do seu navegador.

## Licença

Copyright © 2026 João Gustavo França

Este programa é software livre: você pode redistribuí-lo e/ou modificá-lo sob os
termos da **Licença Pública Geral GNU v3.0 (GPL-3.0)**, conforme publicada pela
Free Software Foundation. É distribuído SEM NENHUMA GARANTIA. Veja
[LICENSE](LICENSE) para o texto completo.

### Trabalho derivado e componentes de terceiros

O ZeroDelay é um **trabalho derivado** da extensão
[live-catch-up](https://github.com/yudai-tiny-developer/live-catch-up), de
**yudai-tiny-developer**, originalmente licenciada sob **MIT** e **Apache-2.0**.
Essas licenças permitem o uso em um trabalho derivado relicenciado sob a GPL-3.0,
desde que seus avisos sejam preservados.

O gerador de QR Code incluído (`vendor/qrcode.js`) é © 2009 Kazuhiko Arase sob a
licença MIT, compatível com a GPL.

Os avisos de licença completos desses componentes estão em
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
