---
title: Webhooks
description: A EmmiTec chama o seu endpoint HTTPS quando algo acontece com uma medição. Toda chamada é assinada, repetida por cerca de 22 horas e fica visível no registro de eventos.
---

Cada integração tem um webhook por modo: o de teste recebe os eventos da sandbox, o de produção recebe os de produção. Todos os endpoints de webhook usam a sua chave secreta.

## Configure o seu endpoint

`PUT /webhook`

| Campo | Obrigatório | Descrição |
|---|---|---|
| `url` | Sim | Precisa ser `https://`. No teste também: `http://localhost` não é aceito, use um túnel (ngrok, Cloudflare Tunnel) ou o webhook.site. |
| `events` | Não | `["reading.alert"]` por padrão. Acrescente `"reading.created"` para receber todas as medições. |
| `locale` | Não | Idioma dos textos do alerta: `en`, `pt` ou `es`. |

```bash title="Configurar o webhook"
curl -X PUT "$EMMITEC_API/webhook" \
  -H "Authorization: Bearer $EMMITEC_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.seu-app.com.br/webhooks/emmitec",
    "events": ["reading.alert", "reading.created"],
    "locale": "pt"
  }'
```

```json title="Resposta 200"
{
  "url": "https://api.seu-app.com.br/webhooks/emmitec",
  "events": ["reading.alert", "reading.created"],
  "locale": "pt",
  "active": true,
  "secretHint": "whsec_...a1b2",
  "createdAt": "2026-11-24T14:05:00Z",
  "updatedAt": "2026-11-24T14:05:00Z",
  "secret": "whsec_..."
}
```

::: warning A API mostra o segredo uma vez
O `secret` só vem na primeira criação do webhook (e quando você troca o segredo). Guarde no seu cofre de segredos. Depois, o `GET /webhook` mostra só o `secretHint`; para copiar o segredo de novo, use o [portal do cliente](/developers/customer-portal).
:::

Você também pode configurar o webhook, mandar um teste e acompanhar as entregas no portal do cliente, sem código. Portal e API mudam o mesmo webhook.

Os outros endpoints de webhook:

| Endpoint | O que faz |
|---|---|
| `GET /webhook` | A configuração atual, ou `404` quando não há nenhuma. |
| `POST /webhook/rotate-secret` | Cria um segredo novo e devolve em `secret`. O antigo para de assinar na hora. |
| `DELETE /webhook` | Remove o webhook: `{ "deleted": true }`. |
| `POST /webhook/test` | Manda um evento `ping` agora e conta o que aconteceu. |

## Eventos

| Tipo | Quando | Inscrição |
|---|---|---|
| `reading.alert` | Uma medição teve nível de atenção ou crítico, e os alertas estão ligados. | Padrão |
| `reading.created` | Toda medição nova, com ou sem alerta. | Opcional, em `events` |
| `ping` | Você chamou `POST /webhook/test`. | Sempre |

Com os alertas desligados para a sua integração (`PUT /settings`) ou para um paciente e tipo (`PUT /patients/{id}/alerts`), o `reading.alert` não é enviado para essas medições; o `reading.created` continua, com `alert: null`. Veja [Configurar alertas e limites](/developers/alert-settings).

## O envelope do evento

A EmmiTec manda um `POST` com `Content-Type: application/json`:

```json title="reading.alert"
{
  "id": "evt_9b2c4f0e1a7d4c3b8e6f5a4d3c2b1a09",
  "type": "reading.alert",
  "mode": "test",
  "createdAt": "2026-11-24T14:03:02Z",
  "apiVersion": "2026-11-24",
  "integrationId": "4b1e6d2a-9c3f-4e8b-a1d7-5f2c8e0b3a64",
  "data": {
    "patient": { "id": "3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21", "externalId": "acme-user-123" },
    "reading": {
      "id": "2104455",
      "patientId": "3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21",
      "type": "blood_pressure",
      "measuredAt": "2026-11-24T14:03:00Z",
      "receivedAt": "2026-11-24T14:03:02Z",
      "values": { "systolic": 182, "diastolic": 110, "pulse": 88 },
      "unit": "mmHg",
      "device": { "model": "td3140", "name": "TaiDoc TD-3140", "serial": "SN123", "mac": "AA:BB:CC:DD:EE:FF" },
      "source": "ble",
      "externalId": "acme-reading-9981",
      "level": "critical_high",
      "levels": { "systolic": "critical_high", "diastolic": "attention_high", "pulse": "normal" },
      "duplicate": false,
      "mode": "test"
    },
    "alert": {
      "level": "critical_high",
      "title": "Pressão arterial muito alta",
      "text": "Sua pressão arterial ficou em 182/110 mmHg, acima da sua faixa segura. Se você não estiver se sentindo bem, procure sua equipe de cuidado ou o serviço de emergência.",
      "reason": "Sistólica 182 mmHg está igual ou acima do limite crítico de 180 mmHg. Diastólica 110 mmHg está igual ou acima do limite de atenção de 90 mmHg.",
      "locale": "pt",
      "triggeredBy": [
        { "value": "systolic", "measured": 182, "unit": "mmHg", "level": "critical_high", "limit": 180 },
        { "value": "diastolic", "measured": 110, "unit": "mmHg", "level": "attention_high", "limit": 90 }
      ]
    }
  }
}
```

O `data.reading` é o objeto Reading sem o `alert`; o alerta vem em `data.alert`. Ou seja: texto = `data.alert.text`, motivo = `data.alert.reason`, medição que gerou o alerta = `data.reading`. Um evento `ping` traz `"data": { "message": "Webhook test from EmmiTec" }`.

### Cabeçalhos

| Cabeçalho | Exemplo |
|---|---|
| `User-Agent` | `EmmiTec-Webhooks/1.0` |
| `EmmiTec-Event-Id` | `evt_9b2c4f0e1a7d4c3b8e6f5a4d3c2b1a09` |
| `EmmiTec-Event-Type` | `reading.alert` |
| `EmmiTec-Signature` | `t=1795528982,v1=5b1f0c...` |

## Verifique a assinatura

O `EmmiTec-Signature` traz um horário Unix `t` e o `v1`, que é o HMAC-SHA256 em hexadecimal de `"<t>.<corpo cru>"`, com o segredo do webhook como chave. Para conferir:

1. Leia o corpo **cru** da requisição, antes de qualquer parse de JSON. JSON serializado de novo não bate.
2. Calcule o HMAC-SHA256 de `t`, um ponto e o corpo cru, com o seu segredo `whsec_...`.
3. Compare com o `v1` em tempo constante.
4. Recuse o evento se `t` estiver a mais de 300 segundos do seu relógio.

```js tab="Node.js (Express)"
import crypto from 'node:crypto'
import express from 'express'

const app = express()
const SECRET = process.env.EMMITEC_WEBHOOK_SECRET // whsec_...

function verify(rawBody, header, secret = SECRET) {
  const parts = Object.fromEntries((header ?? '').split(',').map((p) => p.trim().split('=')))
  const t = Number(parts.t)
  if (!t || !parts.v1) return false
  if (Math.abs(Date.now() / 1000 - t) > 300) return false
  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.`).update(rawBody).digest('hex')
  return expected.length === parts.v1.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1))
}

// express.raw mantém o corpo como Buffer: não use express.json() nesta rota
app.post('/webhooks/emmitec', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!verify(req.body, req.get('EmmiTec-Signature'))) return res.status(400).send('bad signature')

  const event = JSON.parse(req.body.toString('utf8'))
  if (await db.eventos.existe(event.id)) return res.sendStatus(200) // já tratado

  await db.eventos.inserir(event.id)
  fila.add(event) // o trabalho demorado (push, e-mail) fica para depois da resposta
  res.sendStatus(200)
})
```

```python tab="Python (Flask)"
import hashlib
import hmac
import json
import os
import time

from flask import Flask, abort, request

app = Flask(__name__)
SECRET = os.environ["EMMITEC_WEBHOOK_SECRET"].encode()  # whsec_...


def verify(raw_body: bytes, header: str) -> bool:
    parts = dict(p.strip().split("=", 1) for p in header.split(",") if "=" in p)
    t, v1 = parts.get("t", ""), parts.get("v1", "")
    if not t.isdigit() or not v1:
        return False
    if abs(time.time() - int(t)) > 300:
        return False
    expected = hmac.new(SECRET, f"{t}.".encode() + raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, v1)


@app.post("/webhooks/emmitec")
def emmitec_webhook():
    raw = request.get_data()  # bytes crus, antes de qualquer parse de JSON
    if not verify(raw, request.headers.get("EmmiTec-Signature", "")):
        abort(400)
    event = json.loads(raw)
    if not ja_tratado(event["id"]):
        enfileirar(event)  # responde rápido, trabalha depois
    return "", 200
```

```python tab="Python (FastAPI)"
import hashlib
import hmac
import json
import os
import time

from fastapi import FastAPI, HTTPException, Request

app = FastAPI()
SECRET = os.environ["EMMITEC_WEBHOOK_SECRET"].encode()  # whsec_...


def verify(raw_body: bytes, header: str) -> bool:
    parts = dict(p.strip().split("=", 1) for p in header.split(",") if "=" in p)
    t, v1 = parts.get("t", ""), parts.get("v1", "")
    if not t.isdigit() or not v1:
        return False
    if abs(time.time() - int(t)) > 300:
        return False
    expected = hmac.new(SECRET, f"{t}.".encode() + raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, v1)


@app.post("/webhooks/emmitec")
async def emmitec_webhook(request: Request):
    raw = await request.body()  # bytes crus, antes de qualquer parse de JSON
    if not verify(raw, request.headers.get("EmmiTec-Signature", "")):
        raise HTTPException(status_code=400, detail="bad signature")
    event = json.loads(raw)
    if not await ja_tratado(event["id"]):
        await enfileirar(event)  # responde rápido, trabalha depois
    return {"received": True}
```

Use o segredo inteiro, com o prefixo `whsec_`, como chave do HMAC.

## Responda rápido, trabalhe depois

A entrega conta como feita quando o seu endpoint responde qualquer `2xx` em até **10 segundos**. Grave o evento, responda `200` e mande push ou e-mail depois.

Qualquer outra coisa (tempo esgotado, `4xx`, `5xx`, erro de conexão) é repetida com espera crescente:

| Tentativa | Espera antes dela |
|---|---|
| 1 | Enviada na hora |
| 2 | 1 minuto |
| 3 | 5 minutos |
| 4 | 15 minutos |
| 5 | 1 hora |
| 6 | 3 horas |
| 7 | 6 horas |
| 8 | 12 horas |

Depois de 8 tentativas (cerca de 22 horas), o evento fica como `failed`. Ainda dá para [reenviar](#registro-de-eventos-e-reenvio).

## Repetições e ordem

- **Pelo menos uma vez.** Um evento pode chegar mais de uma vez, por exemplo quando a sua resposta se perdeu. Descarte repetidos pelo `id` do evento (que também vem no cabeçalho `EmmiTec-Event-Id`).
- **A ordem não é garantida.** Um evento repetido pode chegar depois de um mais novo. Use o `data.reading.measuredAt` para saber qual medição é a mais recente.

## Teste o seu endpoint

`POST /webhook/test`

Manda um evento `ping` na hora e espera até 10 segundos pela sua resposta:

```json title="Resposta 200"
{ "delivered": true, "statusCode": 200, "durationMs": 182, "eventId": "evt_3a1f9e0c2b7d4e5f8a6b1c0d9e8f7a65", "error": null }
```

Quando a entrega falha, o `delivered` vem `false` e o `error` explica o motivo. Para testar um alerta de verdade de ponta a ponta, use o [`POST /sandbox/simulate-alert`](/developers/testing#simule-um-alerta).

## Registro de eventos e reenvio

`GET /events`

Os eventos recentes da sua integração neste modo, do mais novo para o mais antigo, com a situação de cada entrega. Filtre com `?type=reading.alert` e pagine com `limit` e `cursor`.

```json title="Resposta 200"
{
  "data": [
    {
      "id": "evt_9b2c4f0e1a7d4c3b8e6f5a4d3c2b1a09",
      "type": "reading.alert",
      "createdAt": "2026-11-24T14:03:02Z",
      "status": "failed",
      "attempts": 8,
      "lastStatusCode": 500,
      "lastError": "HTTP 500",
      "deliveredAt": null,
      "nextAttemptAt": null,
      "data": { "patient": { "...": "..." }, "reading": { "...": "..." }, "alert": { "...": "..." } }
    }
  ],
  "hasMore": false,
  "nextCursor": null
}
```

O `status` é `pending`, `delivered` ou `failed`. Depois de corrigir o seu endpoint, reenvie:

`POST /events/{id}/resend`

O evento entra na fila de novo na hora, e a resposta é o próprio evento.

## Troque o segredo

O `POST /webhook/rotate-secret` devolve um `secret` novo, e o antigo para de assinar no mesmo instante. Para não recusar eventos durante a publicação, aceite os dois segredos por alguns minutos:

```js title="Durante a troca"
const ok = verify(req.body, header, SEGREDO_NOVO) || verify(req.body, header, SEGREDO_ANTIGO)
```

Os eventos recusados nesse intervalo são repetidos e passam com o segredo novo.

::: next
- [Alertas e notificações](/developers/alerts) Transforme o `data.alert` em notificação push.
- [Testes e sandbox](/developers/testing) Simule alertas e confira o registro de eventos.
:::
