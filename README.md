# Captação de Parceiros — Bigou Delivery

Landing page para cadastro de restaurantes parceiros, com formulário integrado ao **Pipedrive** (funil de vendas) via **Netlify Functions**, e selects de **estado/cidade** alimentados pela **API do IBGE**.

## Stack

- [Vite](https://vitejs.dev/) — build e servidor de desenvolvimento do front-end estático
- [Netlify](https://www.netlify.com/) — hospedagem, `dist` como site e função serverless para o CRM
- [Pipedrive API v1](https://developers.pipedrive.com/) — organização → pessoa → negócio → nota

## Requisitos

- Node.js 20+ (recomendado; alinhado ao `netlify.toml`)

## Scripts

| Comando | Descrição |
|--------|-----------|
| `npm install` | Instala dependências |
| `npm run dev` | Sobe o Vite e atende **`POST /api/lead` no próprio servidor** (usa `lib/pipedriveLead.js` + `.env`). Não precisa do Netlify para testar o formulário |
| `npm run dev:netlify` | Opcional: ambiente Netlify local (mesma lógica via function em `netlify/functions/lead.js`) |
| `npm run build` | Gera a pasta `dist` |
| `npm run preview` | Pré-visualiza o build de produção localmente |

## Variáveis de ambiente (Netlify)

Configure em **Site configuration → Environment variables**:

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `PIPEDRIVE_TOKEN` | Sim | Token pessoal da API (Pipedrive → Ajustes → Preferências pessoais → API) |
| `PIPELINE_ID` | Não | ID do pipeline (padrão `1` se omitido) |
| `STAGE_ID` | Não | ID do estágio inicial do negócio (padrão `1` se omitido) |
| `DEAL_TITLE_PREFIX` | Não | Prefixo do título do negócio (padrão: `Lead Parceiro Bigou`) |
| `DEAL_LABEL_ID` / `DEAL_LABEL_NAME` | Não | Etiqueta do negócio (ver `.env-example`) |
| `LEAD_DEBUG` | Não | Se `1`, respostas 502 incluem `detail` do Pipedrive (apenas desenvolvimento) |
| `DISCORD_WEBHOOK_URL` | Não | URL do webhook do Discord: após criar org/pessoa/deal/nota no Pipedrive, envia um embed com os dados do parceiro (falha no Discord não cancela o lead) |

**Segurança:** o token fica só no servidor (Netlify Function ou dev middleware); o navegador só chama `/api/lead`. **Não** exponha `DISCORD_WEBHOOK_URL` no front — use só em `.env` / variáveis do Netlify.

### Opcional no front (build)

| Variável | Descrição |
|----------|-----------|
| `VITE_LEAD_URL` | URL absoluta do endpoint de lead, se precisar apontar para outro domínio no build |

## Fluxo da integração Pipedrive

A lógica está em `lib/pipedriveLead.js` e é usada pelo **`netlify/functions/lead.js`** (produção Netlify) e pelo **middleware do Vite** em `npm run dev`. O fluxo:

1. Cria uma **organização** com o nome do estabelecimento  
2. Cria uma **pessoa** (proprietário) vinculada à organização  
3. Cria um **negócio** no pipeline/estágio configurados  
4. Cria uma **nota** no negócio com os dados do formulário (incluindo “Faz entrega” e “Melhor horário para contato”, quando informados)

O front-end envia `POST` para **`/api/lead`** com corpo JSON no formato `{ "data": { ...campos do formulário } }`.

O `netlify.toml` redireciona `/api/lead` para `/.netlify/functions/lead`.

## Deploy no Netlify

1. Conecte o repositório ao Netlify (ou faça deploy manual da pasta do projeto).  
2. **Build command:** `npm run build`  
3. **Publish directory:** `dist`  
4. Cadastre as variáveis de ambiente listadas acima.  
5. Confirme que `PIPELINE_ID` e `STAGE_ID` correspondem ao funil real da sua conta (os padrões `1` podem não ser os corretos).

## Desenvolvimento local (sem Netlify)

1. Copie `.env-example` para `.env` e preencha pelo menos `PIPEDRIVE_TOKEN` (e `PIPELINE_ID` / `STAGE_ID` corretos da sua conta).  
2. Rode **`npm run dev`** e envie o formulário: o Vite expõe **`/api/lead`** internamente.  
3. Se aparecer **502**, o Pipedrive recusou a operação (pipeline/estágio inválidos, token, campo `label`, etc.). Com **`LEAD_DEBUG=1`** no `.env`, a resposta JSON inclui `detail` para diagnóstico.  
4. **`npm run preview`** só serve o `dist` estático: **`/api/lead` não existe** nesse modo — use `npm run dev` ou deploy no Netlify.

## Estrutura principal

```
├── index.html          # Página e formulário
├── script.js           # UI, IBGE, máscaras de telefone, envio do formulário
├── styles.css
├── vite.config.js      # Middleware /api/lead em desenvolvimento
├── lib/
│   └── pipedriveLead.js  # Lógica compartilhada (dev + Netlify)
├── netlify.toml
├── netlify/
│   └── functions/
│       └── lead.js     # Encaminha para lib/pipedriveLead.js
└── dist/               # Saída do build (gerada por `npm run build`)
```

## Licença e marca

Conteúdo e marca **Bigou Delivery** conforme uso interno do projeto.
