---
title: Quickstart
description: About 10 minutes in test mode. Create a patient, send a reading the way your app will, then receive and verify a signed alert webhook.
---

You need a test secret key (`emk_test_...`), a terminal with `curl`, and a URL that receives HTTPS requests. For this guide, [webhook.site](https://webhook.site) is the fastest option: it gives you a unique HTTPS address and shows every request it gets. Everything runs in the sandbox, so no clinician is ever notified.

::: steps

## Get your test key

Your EmmiTec contact sends you a test secret key. Keep it in environment variables, never in code.

```bash title="Terminal"
export EMMITEC_API="https://v2-prod-api-patients.emmitec.health/partner/v1"
export EMMITEC_KEY="emk_test_..."
```

Check that the key works:

```bash title="Ping"
curl "$EMMITEC_API/ping" \
  -H "Authorization: Bearer $EMMITEC_KEY"
```

```json title="Response 200"
{
  "ok": true,
  "mode": "test",
  "auth": "secret_key",
  "integration": { "id": "4b1e6d2a-9c3f-4e8b-a1d7-5f2c8e0b3a64", "name": "Acme Health" },
  "patientId": null,
  "serverTime": "2026-11-24T14:03:00Z",
  "apiVersion": "2026-11-24"
}
```

`"mode": "test"` confirms you are in the sandbox.

## Create a patient

Use your own user id as `externalId`. Sending the same `externalId` again returns the same patient with status 200 instead of 201, so retries are safe.

```bash tab="cURL"
curl -X POST "$EMMITEC_API/patients" \
  -H "Authorization: Bearer $EMMITEC_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "acme-user-123",
    "firstName": "Maria",
    "lastName": "Silva",
    "birthDate": "1956-03-14",
    "sex": "female",
    "phone": "+15551234567",
    "language": "en",
    "heightCm": 162
  }'
```

```js tab="Node.js"
const res = await fetch(`${process.env.EMMITEC_API}/patients`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.EMMITEC_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    externalId: 'acme-user-123',
    firstName: 'Maria',
    lastName: 'Silva',
    birthDate: '1956-03-14',
    sex: 'female',
    phone: '+15551234567',
    language: 'en',
    heightCm: 162,
  }),
})
const patient = await res.json()
console.log(res.status, patient.id) // 201, or 200 if it already existed
```

```python tab="Python"
import os
import requests

res = requests.post(
    f"{os.environ['EMMITEC_API']}/patients",
    headers={"Authorization": f"Bearer {os.environ['EMMITEC_KEY']}"},
    json={
        "externalId": "acme-user-123",
        "firstName": "Maria",
        "lastName": "Silva",
        "birthDate": "1956-03-14",
        "sex": "female",
        "phone": "+15551234567",
        "language": "en",
        "heightCm": 162,
    },
)
patient = res.json()
print(res.status_code, patient["id"])  # 201, or 200 if it already existed
```

```json title="Response 201"
{
  "id": "3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21",
  "externalId": "acme-user-123",
  "firstName": "Maria",
  "lastName": "Silva",
  "birthDate": "1956-03-14",
  "sex": "female",
  "email": null,
  "phone": "+15551234567",
  "language": "en",
  "heightCm": 162,
  "mode": "test",
  "createdAt": "2026-11-24T14:03:00Z"
}
```

```bash title="Terminal"
export PATIENT_ID="3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21"
```

## Mint a session token

Your backend creates a session token for this one patient and hands it to the app. The app never sees your secret key.

```bash title="Mint a session token"
curl -X POST "$EMMITEC_API/patients/$PATIENT_ID/session-tokens" \
  -H "Authorization: Bearer $EMMITEC_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "expiresInSeconds": 604800 }'
```

```json title="Response 201"
{
  "token": "emst_test_...",
  "patientId": "3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21",
  "expiresAt": "2026-12-01T14:03:00Z"
}
```

```bash title="Terminal"
export EMMITEC_SESSION="emst_test_..."
```

## Send a reading

Now act as the app. Send a blood pressure of 182/110 using the session token. With a session token you can leave out `patientId`: the token already says who the patient is.

```bash title="Send a reading (as the app)"
curl -X POST "$EMMITEC_API/readings" \
  -H "Authorization: Bearer $EMMITEC_SESSION" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "blood_pressure",
    "measuredAt": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
    "values": { "systolic": 182, "diastolic": 110, "pulse": 88 },
    "device": { "model": "td3140", "serial": "SN123", "mac": "AA:BB:CC:DD:EE:FF" },
    "source": "ble",
    "externalId": "acme-reading-9981"
  }'
```

The response already tells the app what happened, with the text ready to show:

```json title="Response 201"
{
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
  },
  "duplicate": false,
  "mode": "test"
}
```

::: note
The level depends on the patient's thresholds. If no threshold is configured for a value, its level is `unknown` and `alert` is `null`. See the limits that apply with `GET /patients/{id}/thresholds`.
:::

## Point a webhook to your URL

Open [webhook.site](https://webhook.site) and copy your unique URL. Then register it for this integration's test mode:

```bash title="Configure the webhook"
curl -X PUT "$EMMITEC_API/webhook" \
  -H "Authorization: Bearer $EMMITEC_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://webhook.site/your-unique-id",
    "events": ["reading.alert"],
    "locale": "en"
  }'
```

The first time you configure it, the response includes the signing secret. It is shown only once:

```json title="Response 200"
{
  "url": "https://webhook.site/your-unique-id",
  "events": ["reading.alert"],
  "locale": "en",
  "active": true,
  "secretHint": "whsec_...a1b2",
  "createdAt": "2026-11-24T14:05:00Z",
  "updatedAt": "2026-11-24T14:05:00Z",
  "secret": "whsec_..."
}
```

```bash title="Terminal"
export EMMITEC_WEBHOOK_SECRET="whsec_..."
```

## Trigger an alert

The sandbox can create a reading that crosses the patient's limits and run the full pipeline, webhook included:

```bash title="Simulate an alert"
curl -X POST "$EMMITEC_API/sandbox/simulate-alert" \
  -H "Authorization: Bearer $EMMITEC_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "patientId": "'"$PATIENT_ID"'", "type": "blood_pressure", "level": "critical_high" }'
```

It answers `201` with the new reading. A few seconds later, webhook.site shows a `POST` with these headers:

```http title="Request received by your URL"
POST /your-unique-id HTTP/1.1
Content-Type: application/json
User-Agent: EmmiTec-Webhooks/1.0
EmmiTec-Event-Id: evt_9b2c4f0e1a7d4c3b8e6f5a4d3c2b1a09
EmmiTec-Event-Type: reading.alert
EmmiTec-Signature: t=1795528982,v1=5b1f0c...
```

The body is the event envelope, with `data.patient`, `data.reading` and `data.alert`. See [the full envelope](/developers/webhooks#the-event-envelope).

## Verify the signature

The signature proves the request came from EmmiTec and was not changed. In webhook.site, save the **raw** body to `body.json` exactly as received (not the formatted view: one extra space breaks the signature), then run:

```js title="verify.mjs"
import crypto from 'node:crypto'
import fs from 'node:fs'

const secret = process.env.EMMITEC_WEBHOOK_SECRET // whsec_...
const header = process.argv[2] // the EmmiTec-Signature value: "t=...,v1=..."
const rawBody = fs.readFileSync('body.json') // the exact bytes received

const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')))
const expected = crypto
  .createHmac('sha256', secret)
  .update(`${parts.t}.`)
  .update(rawBody)
  .digest('hex')

const ok =
  expected.length === parts.v1.length &&
  crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1))
console.log(ok ? 'Signature is valid' : 'Signature does NOT match')
```

```bash title="Terminal"
node verify.mjs "t=1795528982,v1=5b1f0c..."
```

:::

## You are done

You created a patient, sent a reading as the app, received a signed alert and verified it. In your product, the same pieces map to:

- **Your backend** creates the patient when the user signs up and mints a session token when the app asks for one.
- **Your app** uses the [Expo SDK](/developers/sdk) to read the device and send the reading, and shows `alert.text` right away.
- **Your webhook handler** verifies the signature, deduplicates by event `id`, and sends the push notification.

::: next
- [Alerts and notifications](/developers/alerts) Map the alert to a push notification and an in-app banner.
- [Webhooks](/developers/webhooks) Signature checks in Express, Flask and FastAPI, retries and the event log.
- [Expo SDK](/developers/sdk) Read Bluetooth devices from your React Native app.
- [Testing and sandbox](/developers/testing) The checklist before you switch to live keys.
:::
