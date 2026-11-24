---
title: Webhooks
description: EmmiTec calls your HTTPS endpoint when something happens to a reading. Every call is signed, retried for about 22 hours and visible in the event log.
---

Each integration has one webhook per mode: the test webhook receives sandbox events, the live webhook receives live events. All webhook endpoints use your secret key.

## Configure your endpoint

`PUT /webhook`

| Field | Required | Description |
|---|---|---|
| `url` | Yes | Must be `https://`. In test mode too: `http://localhost` is not accepted, use a tunnel (ngrok, Cloudflare Tunnel) or webhook.site. |
| `events` | No | `["reading.alert"]` by default. Add `"reading.created"` to get every reading. |
| `locale` | No | Language of the alert texts: `en`, `pt` or `es`. |

```bash title="Configure the webhook"
curl -X PUT "$EMMITEC_API/webhook" \
  -H "Authorization: Bearer $EMMITEC_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.your-app.com/webhooks/emmitec",
    "events": ["reading.alert", "reading.created"],
    "locale": "en"
  }'
```

```json title="Response 200"
{
  "url": "https://api.your-app.com/webhooks/emmitec",
  "events": ["reading.alert", "reading.created"],
  "locale": "en",
  "active": true,
  "secretHint": "whsec_...a1b2",
  "createdAt": "2026-11-24T14:05:00Z",
  "updatedAt": "2026-11-24T14:05:00Z",
  "secret": "whsec_..."
}
```

::: warning The API shows the secret once
`secret` appears only when the webhook is first created (and when you rotate it). Save it in your secret manager. Later, `GET /webhook` shows only `secretHint`; to copy the secret again, use the [customer portal](/developers/customer-portal).
:::

You can also set up the webhook, send a test and follow the deliveries in the customer portal, without code. Portal and API change the same webhook.

Other webhook endpoints:

| Endpoint | What it does |
|---|---|
| `GET /webhook` | Current configuration, or `404` when there is none. |
| `POST /webhook/rotate-secret` | Creates a new secret and returns it in `secret`. The old one stops signing immediately. |
| `DELETE /webhook` | Removes the webhook: `{ "deleted": true }`. |
| `POST /webhook/test` | Sends a `ping` event now and tells you what happened. |

## Events

| Type | When | Subscription |
|---|---|---|
| `reading.alert` | A reading has an attention or critical level, and alerts are on. | Default |
| `reading.created` | Every new reading, with or without alert. | Opt in with `events` |
| `ping` | You called `POST /webhook/test`. | Always |

With alerts turned off for your integration (`PUT /settings`) or for a patient and type (`PUT /patients/{id}/alerts`), `reading.alert` is not sent for those readings; `reading.created` still is, with `alert: null`. See [Alert settings and thresholds](/developers/alert-settings).

## The event envelope

EmmiTec sends a `POST` with `Content-Type: application/json`:

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
      "title": "Very high blood pressure",
      "text": "Your blood pressure reading was 182/110 mmHg, above your safe range. If you feel unwell, contact your care team or emergency services.",
      "reason": "Systolic 182 mmHg is at or above the critical limit of 180 mmHg. Diastolic 110 mmHg is at or above the attention limit of 90 mmHg.",
      "locale": "en",
      "triggeredBy": [
        { "value": "systolic", "measured": 182, "unit": "mmHg", "level": "critical_high", "limit": 180 },
        { "value": "diastolic", "measured": 110, "unit": "mmHg", "level": "attention_high", "limit": 90 }
      ]
    }
  }
}
```

`data.reading` is the Reading object without `alert`; the alert is in `data.alert`. A `ping` event has `"data": { "message": "Webhook test from EmmiTec" }`.

### Headers

| Header | Example |
|---|---|
| `User-Agent` | `EmmiTec-Webhooks/1.0` |
| `EmmiTec-Event-Id` | `evt_9b2c4f0e1a7d4c3b8e6f5a4d3c2b1a09` |
| `EmmiTec-Event-Type` | `reading.alert` |
| `EmmiTec-Signature` | `t=1795528982,v1=5b1f0c...` |

## Verify the signature

`EmmiTec-Signature` has a Unix timestamp `t` and `v1`, the hex HMAC-SHA256 of `"<t>.<raw body>"` with your webhook secret as the key. To verify:

1. Read the **raw** request body, before any JSON parsing. Re-serialized JSON does not match.
2. Compute HMAC-SHA256 of `t`, a dot and the raw body, with your `whsec_...` secret.
3. Compare it with `v1` in constant time.
4. Reject the event if `t` is more than 300 seconds away from your clock.

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

// express.raw keeps the body as a Buffer: do not use express.json() on this route
app.post('/webhooks/emmitec', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!verify(req.body, req.get('EmmiTec-Signature'))) return res.status(400).send('bad signature')

  const event = JSON.parse(req.body.toString('utf8'))
  if (await db.events.exists(event.id)) return res.sendStatus(200) // already handled

  await db.events.insert(event.id)
  queue.add(event) // do the slow work (push, emails) after answering
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
    raw = request.get_data()  # raw bytes, before any JSON parsing
    if not verify(raw, request.headers.get("EmmiTec-Signature", "")):
        abort(400)
    event = json.loads(raw)
    if not already_handled(event["id"]):
        enqueue(event)  # answer fast, work later
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
    raw = await request.body()  # raw bytes, before any JSON parsing
    if not verify(raw, request.headers.get("EmmiTec-Signature", "")):
        raise HTTPException(status_code=400, detail="bad signature")
    event = json.loads(raw)
    if not await already_handled(event["id"]):
        await enqueue(event)  # answer fast, work later
    return {"received": True}
```

Use the whole secret, including the `whsec_` prefix, as the HMAC key.

## Answer fast, then work

A delivery counts as delivered when your endpoint answers any `2xx` within **10 seconds**. Save the event, answer `200`, and send pushes or emails afterwards.

Anything else (a timeout, a `4xx`, a `5xx`, a connection error) is retried with backoff:

| Attempt | Wait before it |
|---|---|
| 1 | Sent right away |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 15 minutes |
| 5 | 1 hour |
| 6 | 3 hours |
| 7 | 6 hours |
| 8 | 12 hours |

After 8 attempts (about 22 hours) the event is marked `failed`. You can still [resend it](#event-log-and-resend).

## Duplicates and order

- **At least once.** An event can arrive more than once, for example when your answer got lost. Deduplicate by the event `id` (also in the `EmmiTec-Event-Id` header).
- **Order is not guaranteed.** A retried event can arrive after a newer one. Use `data.reading.measuredAt` to know which reading is the latest.

## Test your endpoint

`POST /webhook/test`

Sends a `ping` event right away and waits up to 10 seconds for your answer:

```json title="Response 200"
{ "delivered": true, "statusCode": 200, "durationMs": 182, "eventId": "evt_3a1f9e0c2b7d4e5f8a6b1c0d9e8f7a65", "error": null }
```

When delivery fails, `delivered` is `false` and `error` explains why. To test a real alert end to end, use [`POST /sandbox/simulate-alert`](/developers/testing#simulate-an-alert).

## Event log and resend

`GET /events`

Recent events of your integration in this mode, newest first, with their delivery status. Filter with `?type=reading.alert`, paginate with `limit` and `cursor`.

```json title="Response 200"
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

`status` is `pending`, `delivered` or `failed`. After you fix your endpoint, resend:

`POST /events/{id}/resend`

The event is scheduled again right away and the response is the event object.

## Rotate the secret

`POST /webhook/rotate-secret` returns a new `secret`, and the old one stops signing at that moment. To avoid rejecting events during your deploy, accept both secrets for a few minutes:

```js title="During rotation"
const ok = verify(req.body, header, NEW_SECRET) || verify(req.body, header, OLD_SECRET)
```

Events you rejected in that window are retried and will pass with the new secret.

::: next
- [Alerts and notifications](/developers/alerts) Turn `data.alert` into a push notification.
- [Testing and sandbox](/developers/testing) Simulate alerts and check the event log.
:::
