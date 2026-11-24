---
title: Autenticação
description: Duas credenciais com papéis diferentes. A chave secreta fica no seu servidor. O token de sessão do paciente vai para o app e só vale para um paciente.
---

Toda chamada leva um token no cabeçalho:

```http title="Cabeçalho"
Authorization: Bearer emk_test_...
```

## Quem guarda o quê

<div class="dx-holders">
<div class="dx-holder"><span class="dx-holder__who">Seu backend</span><code>emk_live_...</code>Chave secreta. Cria pacientes, gera tokens de sessão, configura o webhook e lê qualquer paciente da sua integração. Nunca sai dos seus servidores.</div>
<div class="dx-holders__arrow">gera um token por paciente</div>
<div class="dx-holder"><span class="dx-holder__who">App do paciente (SDK)</span><code>emst_live_...</code>Token de sessão. Envia medições e lê os dados daquele paciente. Expira e pode ser revogado.</div>
</div>

| | Chave secreta | Token de sessão do paciente |
|---|---|---|
| Prefixo | `emk_test_` / `emk_live_` | `emst_test_` / `emst_live_` |
| Fica em | Seu backend (cofre de segredos) | O app do paciente |
| Quem emite | A EmmiTec, mostrada uma única vez | O seu backend, com `POST /patients/{id}/session-tokens` |
| Alcance | Tudo da sua integração, naquele modo | Um paciente |
| Validade | Até ser revogada | 7 dias por padrão, no máximo 30 dias |

::: warning Nunca coloque a chave secreta no app ou no site
Qualquer pessoa consegue extrair textos de um app ou ler o JavaScript de um site. Uma chave secreta vazada dá acesso a todos os pacientes da sua integração. O app só pode ver tokens de sessão.
:::

## O que um token de sessão pode chamar

Um token de sessão chama exatamente estes endpoints, e só para o próprio paciente:

| Endpoint | Para quê |
|---|---|
| `GET /ping` | Testar o token. A resposta traz `"auth": "session_token"` e o `patientId`. |
| `GET /me` | O paciente deste token. |
| `GET /devices` | O catálogo de aparelhos. |
| `POST /readings` | Enviar uma medição. O `patientId` pode ficar de fora (se vier, precisa ser o mesmo). |
| `POST /readings/batch` | Enviar até 100 medições de uma vez. |
| `GET /readings/{id}` | Uma medição deste paciente. |
| `GET /patients/{próprio id}/readings` | O histórico deste paciente. |
| `GET /patients/{próprio id}/thresholds` | Os limites que valem para este paciente. |

Qualquer outra chamada responde `403 forbidden`.

## Gere tokens de sessão no seu backend

O fluxo de sempre: o usuário entra no seu app, o app pede ao seu backend um token da EmmiTec, o seu backend confere quem é o usuário e gera um token para o paciente dele.

```js tab="Node.js"
// Seu backend (Express). O app chama esta rota depois do login.
app.post('/api/emmitec/session-token', requireUser, async (req, res) => {
  const patientId = req.user.emmitecPatientId // guardado quando você criou o paciente
  const r = await fetch(`${process.env.EMMITEC_API}/patients/${patientId}/session-tokens`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.EMMITEC_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresInSeconds: 7 * 24 * 3600 }),
  })
  if (!r.ok) return res.status(502).json({ error: 'emmitec_unavailable' })
  const { token, expiresAt } = await r.json()
  res.json({ token, expiresAt })
})
```

```python tab="Python"
# Seu backend (FastAPI). O app chama esta rota depois do login.
import os
import httpx
from fastapi import Depends, FastAPI, HTTPException

app = FastAPI()

@app.post("/api/emmitec/session-token")
async def emmitec_session_token(user=Depends(require_user)):
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{os.environ['EMMITEC_API']}/patients/{user.emmitec_patient_id}/session-tokens",
            headers={"Authorization": f"Bearer {os.environ['EMMITEC_KEY']}"},
            json={"expiresInSeconds": 7 * 24 * 3600},
        )
    if r.status_code != 201:
        raise HTTPException(status_code=502, detail="emmitec_unavailable")
    body = r.json()
    return {"token": body["token"], "expiresAt": body["expiresAt"]}
```

O `expiresInSeconds` é opcional: o padrão é 604800 (7 dias), o mínimo é 300 e o máximo é 2592000 (30 dias).

No app, entregue o token ao SDK e diga como conseguir um novo. O SDK chama `onTokenExpired` uma vez quando a API responde `401` e repete a chamada com o token novo:

```ts title="App.tsx"
import { EmmiTec } from 'emmitec-rpm'

EmmiTec.configure({
  sessionToken: token, // veio do seu backend
  locale: 'pt',
  onTokenExpired: async () => {
    const r = await fetch('https://api.seu-app.com.br/api/emmitec/session-token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwtDoSeuUsuario}` },
    })
    if (!r.ok) return null // o paciente precisa entrar de novo
    const { token } = await r.json()
    return token // um token do mesmo paciente
  },
})
```

::: tip
Não guardou o id do paciente na EmmiTec? Procure pelo seu próprio id: `GET /patients?externalId=acme-user-123`.
:::

## Revogar e trocar

**Tokens de sessão.** Revogue todos os tokens de um paciente quando o usuário sair de todos os aparelhos, perder o celular ou deixar o seu serviço:

`DELETE /patients/{id}/session-tokens`

```json title="Resposta 200"
{ "revoked": 3 }
```

Os tokens são aleatórios e ficam guardados só como hash: depois de gerado, a EmmiTec não consegue mostrar o token de novo.

**Chaves secretas.** Quem emite e revoga é a EmmiTec. Para trocar uma chave, peça uma nova ao seu contato, publique a nova no seu backend e só então peça a revogação da antiga. Se uma chave vazar, peça a revogação na hora: a partir daí ela responde `401`.

## Erros

| Status | `code` | Quando |
|---|---|---|
| 401 | `unauthorized` | O token não veio, é inválido ou foi revogado, ou expirou. A mensagem diz qual dos casos. |
| 403 | `forbidden` | Um token de sessão chamou algo fora do alcance dele, ou uma chave de produção foi usada quando a integração ainda não tem cliente em produção. |

```json title="401 Unauthorized"
{
  "error": {
    "type": "authentication_error",
    "code": "unauthorized",
    "message": "Token expired.",
    "param": null,
    "requestId": "req_01JDJ3K8Q5R4T6V8X0Z2B4D6F8"
  }
}
```

A API nunca devolve o seu token. Decida no código pelo `code`, não pela `message`: as mensagens são escritas para pessoas e podem mudar. Todos os códigos estão em [Erros e limites](/developers/errors).

::: next
- [Pacientes](/developers/patients) Crie pacientes, mantenha os dados em dia e gere os tokens deles.
- [SDK para Expo](/developers/sdk) Configure o SDK com o token de sessão.
:::
