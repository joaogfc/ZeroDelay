<!--
Obrigado por contribuir com o ZeroDelay! Preencha o checklist abaixo.
Antes de abrir a PR, leia o CONTRIBUTING.md.
-->

## Descrição da mudança

<!-- O que esta PR faz e por quê. Se resolve uma issue, referencie: "Fecha #123". -->

## Tipo de mudança

- [ ] Correção de bug (não quebra nada existente)
- [ ] Novo recurso (não quebra nada existente)
- [ ] Mudança que quebra compatibilidade (comportamento existente muda)
- [ ] Documentação / tooling (sem alteração no código da extensão)

## Impacto em storage

<!-- A extensão persiste configurações em chrome.storage.local. Renomear ou
     remover uma chave existente quebra a configuração já salva dos usuários. -->

- [ ] Não mexe em chaves de storage
- [ ] Adiciona uma chave nova (não renomeia nem remove as existentes)
- [ ] **Atenção:** renomeia/remove uma chave existente (explique a migração abaixo)

> ⚠️ A chave `skipThreathold` (com essa grafia) é persistida e **não pode ser
> renomeada** sem quebrar instalações existentes.

## Testes

- [ ] Rodei `npm run lint` sem erros
- [ ] Rodei `npm test` sem falhas
- [ ] Testei manualmente em uma live real do YouTube — **Sim / Não**
  - Navegador testado: <!-- Chrome / Firefox / ambos -->

## Screenshots

<!-- Se a mudança mexe no popup ou nos indicadores do player, anexe antes/depois. -->

## Checklist final

- [ ] O código segue o estilo do projeto (ESLint passa)
- [ ] Atualizei a documentação relevante (README, CHANGELOG, etc.) quando aplicável
- [ ] Estou de acordo com a licença GPL-3.0-or-later do projeto
