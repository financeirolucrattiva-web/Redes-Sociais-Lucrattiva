# Painel Lucrattiva (versão Vercel)

Versão do painel que roda fora do Claude — qualquer pessoa com o link acessa,
sem precisar de conta Claude nem login. Site (`index.html`) + funções de
backend (`api/`) que guardam tudo no **Vercel Blob** (armazenamento de
arquivo da própria Vercel, sem precisar de banco de dados separado).

Sincronização: a página busca os posts a cada 6 segundos (não é
instantâneo como a versão Claude, mas atualiza sozinha sem precisar
recarregar).

## Colocar no ar (sem usar terminal)

### 1. Subir estes arquivos para o GitHub

1. Abre o repositório: https://github.com/financeirolucrattiva-web/Redes-Sociais-Lucrattiva
2. Cria uma pasta nova, por exemplo `painel-vercel`, e sobe todos os
   arquivos desta pasta dentro dela (botão **Add file → Upload files**,
   arrasta tudo — inclusive o `.gitignore`).

### 2. Conectar na Vercel

1. Cria conta em https://vercel.com (pode entrar com a conta do GitHub).
2. **Add New → Project**, escolhe o repositório
   `financeirolucrattiva-web/Redes-Sociais-Lucrattiva`.
3. Em **Root Directory**, aponta pra pasta `painel-vercel` (a que você
   criou no passo 1).
4. Framework preset: deixa em **Other**.
5. Clica **Deploy**.

### 3. Ligar o armazenamento de imagens (Vercel Blob)

1. Depois do primeiro deploy, vai na aba **Storage** do projeto na Vercel.
2. **Create Database → Blob**.
3. Conecta esse Blob ao projeto (a Vercel já cuida de criar a variável de
   ambiente `BLOB_READ_WRITE_TOKEN` sozinha).
4. Vai em **Deployments** e clica **Redeploy** uma vez (pra pegar a
   variável nova).

### 4. Ligar a sincronização automática com o agente

Isso faz o painel se preencher sozinho todo dia, sem precisar copiar nada
manualmente do Console.

1. **Settings → Environment Variables** do projeto → **Add New**:
   - Name: `ANTHROPIC_API_KEY`
   - Value: uma API key da organização Lucrattiva no Claude Platform
     (gera em https://platform.claude.com/settings/keys se não tiver uma
     só pra isso — recomendado ser uma key dedicada, fácil de revogar
     sem afetar mais nada)
   - Marca **Production**
2. **Redeploy** de novo (pra pegar a variável).
3. Isso já ativa o **Vercel Cron** configurado em `vercel.json`: todo dia
   às 07:15 (horário de SP) a própria Vercel busca a execução mais
   recente do agente e preenche o painel sozinha — sem passar pela minha
   sessão, então não trava mais por causa da minha rede.

### 5. Trazer o histórico agora (primeira vez)

O cron só roda a partir de amanhã. Pra trazer as execuções que já
aconteceram (incluindo a de hoje) agora mesmo, sem esperar, abre isso no
navegador uma vez, depois do passo 4:

```
https://SEU-DOMINIO.vercel.app/api/cron/sync
```

Ele responde um JSON com o que foi criado (`created`), pulado
(`skipped`, já existia ou não achou conteúdo) e algum erro (`errors`).
Pode abrir esse link de novo a qualquer momento — é seguro, ele nunca
cria post duplicado (pula o que já existe).

### 6. Pronto

A Vercel te dá uma URL tipo `painel-lucrattiva.vercel.app` — esse é o
link pra mandar pra equipe. Funciona em qualquer navegador, sem conta.

## Se algo der erro no primeiro deploy

Esse projeto foi escrito sem poder testar contra uma conta Vercel real —
é bem provável que o primeiro deploy precise de um ajuste pontual. Se
aparecer erro, copia a mensagem (na aba **Deployments → (o deploy) →
Logs** da Vercel, ou o erro que aparece no navegador ao usar o painel) e
manda que eu conserto.

## Estrutura

| Arquivo | O quê |
|---|---|
| `index.html` | O painel (site) |
| `api/posts/index.js` | Listar (`GET`) e criar (`POST`) conteúdos |
| `api/posts/[id].js` | Aprovar/marcar postado (`PATCH`) e excluir (`DELETE`) |
| `api/upload.js` | Recebe uma imagem e guarda no Vercel Blob |
| `api/cron/sync.js` | Busca as execuções do agente e preenche o painel sozinho (roda todo dia via `vercel.json`, ou manual abrindo a URL) |
| `lib/store.js` | Funções de leitura/escrita no Blob |
| `lib/anthropic.js` | Busca e interpreta o resultado das sessões do agente no Claude Platform |
| `vercel.json` | Agenda do cron (07:15 horário de SP, todo dia) |

## Sobre a extração automática

O agente escreve em texto livre — o `lib/anthropic.js` reconhece o
formato que ele já usa hoje (tabela com **Tema**/**Rede**/**Formato**/
**Horário recomendado**, e o arquivo `legenda_*.md` com `## LEGENDA
FINAL` / `## HASHTAGS`). Se o agente mudar muito esse formato no futuro,
a extração pode vir incompleta — o post ainda é criado, só que com
campos em branco, marcado em "Observações" pra alguém completar à mão.
