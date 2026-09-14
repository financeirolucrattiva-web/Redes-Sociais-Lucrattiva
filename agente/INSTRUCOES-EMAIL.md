# Como ativar o envio automático por e-mail (Gmail)

Pré-requisito: a organização precisa estar ativa (resolver primeiro o
`organization_disabled_error`).

## 1. Conectar o Gmail via Zapier MCP (uma vez, pela web, sem código)

1. Acesse https://mcp.zapier.com e entre com uma conta Zapier (crie uma
   grátis se não tiver).
2. Clique em **Create a new MCP Server** (ou similar).
3. Dê um nome, ex: "Contabilidade Agrícola - Gmail".
4. Em **Add tools/actions**, procure e adicione a ação **Gmail: Send Email**.
5. Quando pedir para conectar a conta, autorize com
   **financeiro.lucrattiva@gmail.com**.
6. Copie dois valores que aparecem na tela do servidor:
   - A **Server URL** (algo como `https://mcp.zapier.com/api/mcp/s/....../mcp`)
   - A **API key** (chave de acesso ao servidor)

Guarde os dois — são usados nos passos 2 e 3.

## 2. Colar a Server URL no agente

Abra `agents/agente-de-redes-sociais-contabilidade-agricola.md` e troque:

```yaml
url: https://mcp.zapier.com/api/mcp/s/SUBSTITUA_PELO_SEU_ID/mcp
```

pela Server URL copiada no passo 1.

## 3. Criar o vault com a API key (via `ant` CLI)

Com o `ant` CLI já instalado e autenticado na sua organização:

```sh
# Cria o vault (guarda o VAULT_ID retornado)
VAULT_ID=$(ant beta:vaults create --transform id --raw-output <<YAML
display_name: Contabilidade Agrícola - Gmail
YAML
)
echo "$VAULT_ID"

# Registra a API key do Zapier dentro do vault, associada à mesma
# Server URL usada no agente (passo 2)
ant beta:vaults:credentials create --vault-id "$VAULT_ID" <<YAML
display_name: Zapier Gmail
auth:
  type: static_bearer
  mcp_server_url: COLE_AQUI_A_MESMA_SERVER_URL_DO_PASSO_2
  token: COLE_AQUI_A_API_KEY_DO_ZAPIER
YAML
```

## 4. Ligar o vault ao deployment

Abra `deployments/conteudo-diario-contabilidade-agricola.yml` e troque:

```yaml
vault_ids:
  - SUBSTITUA_PELO_SEU_VAULT_ID
```

pelo `VAULT_ID` obtido no passo 3.

## 5. Aplicar tudo

```sh
cd agente-de-redes-sociais-contabilidade-agricola
ant apply --dry-run .   # confere o que vai mudar
ant apply .             # aplica de fato
```

## 6. Testar sem esperar o cron das 7h

```sh
ant beta:deployments run --deployment-id "$(jq -r '.resources."./deployments/conteudo-diario-contabilidade-agricola.yml".id' claude-lock.json)"
```

Isso dispara uma execução imediata. Acompanhe a sessão pelo Console
(platform.claude.com) e confirme que o e-mail chegou em
financeiro.lucrattiva@gmail.com.

## Notas

- A "Server URL" do Zapier funciona como uma senha: não a compartilhe fora
  deste arquivo/vault. Depois de configurar, pode remover o valor real
  deste README se for versionar o repositório.
- Se quiser trocar de conta Gmail no futuro, é só reconectar dentro do
  próprio painel do Zapier (não precisa mexer nos arquivos aqui).
