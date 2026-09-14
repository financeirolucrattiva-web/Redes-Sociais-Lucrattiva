# Agente de Redes Sociais - Lucrattiva Contabilidade

Configuração declarativa (arquivos versionados) do agente no Claude Platform,
para uso com o `ant` CLI:

- `agents/agente-de-redes-sociais-contabilidade-agricola.md`: o agente. O
  frontmatter YAML é o corpo de `POST /v1/agents`; o Markdown abaixo dele é o
  system prompt (inclui a identidade visual e o tom de voz da Lucrattiva).
- `environments/agente-redes-sociais-agro-env.yml`: o ambiente onde as sessões
  rodam (`POST /v1/environments`).
- `deployments/conteudo-diario-contabilidade-agricola.yml`: o deployment
  agendado (`POST /v1/deployments`), roda todo dia às 7h (horário de
  São Paulo) e aponta para o agente e o ambiente acima por caminho relativo.
- `INSTRUCOES-EMAIL.md`: passo a passo para ligar o envio automático do
  conteúdo diário por e-mail (Gmail via Zapier) para
  financeiro.lucrattiva@gmail.com.

Instale o `ant` CLI
(https://platform.claude.com/docs/en/cli-sdks-libraries/cli/quickstart),
veja o plano e aplique
(https://platform.claude.com/docs/en/cli-sdks-libraries/cli/scripting#version-controlling-api-resources):

```sh
cd agente
ant apply --dry-run .
ant apply .
```

`claude-lock.json` já guarda os IDs do que foi criado originalmente (o
agente, o ambiente e o deployment já existentes na organização Lucrattiva no
Claude Platform) — a primeira aplicação adota esses recursos (uma
atualização em cada, marcando como gerenciado pelo `ant`) e as próximas
mantêm tudo sincronizado com estes arquivos. Para criar cópias novas em vez
de atualizar (em outra organização/workspace, por exemplo), apague
`claude-lock.json` primeiro.

Mantenha `claude-lock.json` ao lado destes arquivos, e os nomes de arquivo
como estão (os IDs são indexados pelo caminho). Nenhuma credencial está
incluída aqui — a credencial do Gmail/Zapier fica num *vault* do Claude
Platform, não neste repositório (veja `INSTRUCOES-EMAIL.md`).
