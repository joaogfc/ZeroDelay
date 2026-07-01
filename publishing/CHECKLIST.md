# Checklist de Publicação — ZeroDelay

## Prontos (código e pacote)

- [x] `manifest.json`: sem `update_url` (bloquearia o envio) e sem `key`.
- [x] `manifest_version: 3`, `name`, `version` (1.1), `description`, `icons` presentes.
- [x] Descrições localizadas com ≤ 132 caracteres (en e pt-BR).
- [x] Sem código hospedado remotamente (gerador de QR em `vendor/qrcode.js`).
- [x] Permissões mínimas: `storage`, `alarms` + host `youtube.com` (content script).
- [x] Licenciado sob GPL-3.0 (`LICENSE`).
- [x] Pacote gerado por `npm run build` → `build/zerodelay-1.1.zip` (manifesto na raiz do ZIP).

## Você precisa configurar a conta

- [ ] **Conta de desenvolvedor** da Chrome Web Store (taxa única de US$ 5).
- [ ] Verificar o e-mail/contato da conta.

## Você precisa fornecer (recursos da listagem)

- [ ] **Ícone da loja** 128×128 (reusar `icons/128.png`).
- [ ] **Pelo menos 1 captura** 1280×800 (prontas em `publishing/assets/`).
- [ ] **Bloco promocional pequeno** 440×280 (pronto em `publishing/assets/`).
- [ ] (Opcional) Letreiro 1400×560 (pronto) e vídeo promocional.
- [ ] **URL da Política de Privacidade** — publique `publishing/PRIVACY.md` e cole o link.

## Passos do envio

1. Acesse o Painel do Desenvolvedor da Chrome Web Store → **Adicionar novo item**.
2. Gere com `npm run build` e envie **`build/zerodelay-1.1.zip`**.
3. Preencha a aba **Loja** usando `publishing/STORE_LISTING.md`.
4. Preencha a aba **Privacidade**: único propósito, as 3 justificativas de
   permissão, "código remoto = Não", divulgações de coleta de dados (nenhuma) +
   as 3 certificações, e a URL da política de privacidade.
5. Preencha a aba **Distribuição** (Pública/Não listada, Grátis, regiões).
6. **Envie para análise.** Extensões com permissão de host podem demorar mais.

## Lembretes

- Após enviar, você tem até 30 dias para publicar antes de virar rascunho.
- **Não é possível publicar uma versão menor que a já publicada.** Esta é a `1.1`;
  atualizações futuras precisam aumentar a `version` (ex.: `1.1.1`) antes de reenviar.
- A chave de manifesto `author` é ignorada pela loja (inofensiva); seu nome de
  desenvolvedor vem da conta.
