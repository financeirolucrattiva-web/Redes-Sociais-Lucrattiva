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

### 4. Pronto

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
| `lib/store.js` | Funções de leitura/escrita no Blob |
