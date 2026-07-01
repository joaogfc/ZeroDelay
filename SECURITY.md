# Política de Segurança

## Versões suportadas

O ZeroDelay é uma extensão de navegador distribuída pela Chrome Web Store e
buildada para Firefox. Apenas a **versão publicada mais recente** recebe
correções de segurança. Atualize sempre para a última versão antes de reportar.

## Como reportar uma vulnerabilidade

**Não abra uma issue pública** para relatar falhas de segurança. Isso exporia o
problema antes de uma correção estar disponível.

Prefira um dos canais privados abaixo:

1. **GitHub Security Advisories** (recomendado): use o botão
   [*Report a vulnerability*](https://github.com/joaogfc/ZeroDelay/security/advisories/new)
   na aba **Security** do repositório.
2. **E-mail:** envie os detalhes para
   [joao@solitus.com.br](mailto:joao@solitus.com.br) com o assunto começando por
   `[SECURITY] ZeroDelay`.

Inclua, se possível:

- Uma descrição da falha e do impacto potencial;
- Passos para reproduzir (URL da live, modo em uso, navegador e versão);
- Qualquer prova de conceito, log ou captura de tela relevante.

## O que esperar

- **Confirmação de recebimento:** em até 5 dias úteis.
- **Avaliação inicial e próximos passos:** em até 15 dias úteis.
- Manteremos você informado sobre o andamento da correção e combinaremos a
  divulgação pública somente depois que uma versão corrigida for publicada.

Pedimos que você dê um prazo razoável para a correção antes de divulgar a falha
publicamente. Contribuições responsáveis serão creditadas no
[CHANGELOG.md](CHANGELOG.md), se você desejar.

## Escopo

A extensão roda inteiramente no navegador e **não envia dados a servidores
externos**. Recursos como o QR Code PIX de doação são gerados **localmente**.
Relatórios especialmente úteis envolvem:

- Vazamento de dados do usuário para fora do navegador;
- Execução de código não confiável a partir de conteúdo da página;
- Escalonamento indevido de permissões da extensão.
