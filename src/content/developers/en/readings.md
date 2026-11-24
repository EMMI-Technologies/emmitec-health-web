---
title: Readings
description: Five measurement types, one format. Every reading is stored with its device, checked against the patient's limits and returned with a level and, when needed, an alert.
---

The app usually sends readings through the [Expo SDK](/developers/sdk), with a session token. Your backend can also send them with the secret key, for example readings that come from another system.

## Types and values

| `type` | `values` | Optional | Unit in responses |
|---|---|---|---|
| `blood_pressure` | `systolic` integer 40 to 300, `diastolic` integer 20 to 200 (lower than systolic) | `pulse` integer 20 to 250, `irregularHeartbeat` boolean | mmHg (pulse in bpm) |
| `oxygen_saturation` | `spo2` number 50 to 100 | `pulse` integer 20 to 250, `perfusionIndex` number 0 to 30 | % |
| `temperature` | `temperature` number, 30 to 45 C | `unit`: `C` (default) or `F` | C |
| `glucose` | `glucose` number, 10 to 700 mg/dL | `unit`: `mg/dL` (default) or `mmol/L`, `context` | mg/dL |
| `weight` | `weight` number, 2 to 400 kg | `unit`: `kg` (default) or `lb` | kg, plus `bmi` when the patient has `heightCm` |

Units you send are converted and stored in the canonical unit: mmol/L x 18.0182 to mg/dL, lb x 0.453592 to kg, F to C. `unit` and `context` go next to `values`, not inside it.

Glucose `context` says when the measurement was taken: `fasting`, `before_meal`, `after_meal`, `bedtime`, `after_medication`, `after_exercise`, `casual` or `generic` (default).

## Send a reading

`POST /readings`

```bash tab="cURL"
curl -X POST "$EMMITEC_API/readings" \
  -H "Authorization: Bearer $EMMITEC_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21",
    "type": "blood_pressure",
    "measuredAt": "2026-11-24T14:03:00Z",
    "values": { "systolic": 182, "diastolic": 110, "pulse": 88 },
    "device": { "model": "td3140", "serial": "SN123", "mac": "AA:BB:CC:DD:EE:FF" },
    "source": "ble",
    "externalId": "acme-reading-9981"
  }'
```

```js tab="Node.js"
const res = await fetch(`${process.env.EMMITEC_API}/readings`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.EMMITEC_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    patientId: '3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21',
    type: 'blood_pressure',
    measuredAt: '2026-11-24T14:03:00Z',
    values: { systolic: 182, diastolic: 110, pulse: 88 },
    device: { model: 'td3140', serial: 'SN123', mac: 'AA:BB:CC:DD:EE:FF' },
    source: 'ble',
    externalId: 'acme-reading-9981',
  }),
})
const reading = await res.json() // 201 created, 200 if it was a duplicate
if (reading.alert) console.log(reading.alert.title, reading.alert.text)
```

```python tab="Python"
res = requests.post(
    f"{EMMITEC_API}/readings",
    headers={"Authorization": f"Bearer {EMMITEC_KEY}"},
    json={
        "patientId": "3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21",
        "type": "blood_pressure",
        "measuredAt": "2026-11-24T14:03:00Z",
        "values": {"systolic": 182, "diastolic": 110, "pulse": 88},
        "device": {"model": "td3140", "serial": "SN123", "mac": "AA:BB:CC:DD:EE:FF"},
        "source": "ble",
        "externalId": "acme-reading-9981",
    },
)
reading = res.json()  # 201 created, 200 if it was a duplicate
if reading["alert"]:
    print(reading["alert"]["title"], reading["alert"]["text"])
```

```ts tab="TypeScript SDK"
import { EmmiTec } from 'emmitec-rpm'

// In the app, with the session token already configured.
// measuredAt defaults to now, source to 'manual', externalId is generated.
const { queued, reading } = await EmmiTec.readings.create({
  type: 'blood_pressure',
  values: { systolic: 182, diastolic: 110, pulse: 88 },
})
if (!queued && reading.alert) console.log(reading.alert.title, reading.alert.text)
```

More examples of `values`:

```json title="Oxygen saturation: SpO2 88%"
{ "type": "oxygen_saturation", "measuredAt": "2026-11-24T14:10:00Z",
  "values": { "spo2": 88, "pulse": 104, "perfusionIndex": 2.4 },
  "device": { "model": "td8255" }, "source": "ble" }
```

```json title="Glucose: 250 mg/dL after a meal"
{ "type": "glucose", "measuredAt": "2026-11-24T13:30:00Z",
  "values": { "glucose": 250 }, "unit": "mg/dL", "context": "after_meal",
  "device": { "model": "accuchek" }, "source": "ble" }
```

```json title="Temperature in Fahrenheit"
{ "type": "temperature", "measuredAt": "2026-11-24T08:00:00Z",
  "values": { "temperature": 101.3 }, "unit": "F",
  "device": { "model": "td1242" }, "source": "ble" }
```

```json title="Weight typed by the patient, in pounds"
{ "type": "weight", "measuredAt": "2026-11-24T07:45:00Z",
  "values": { "weight": 165.4 }, "unit": "lb", "source": "manual" }
```

### Input fields

| Field | Required | Description |
|---|---|---|
| `patientId` | With a secret key | With a session token you can leave it out. If you send it, it must be the token's patient. |
| `type` | Yes | One of the five types. |
| `measuredAt` | Yes | When the device took the reading, ISO 8601 UTC. Not more than 10 minutes in the future, not older than 365 days. |
| `values` | Yes | See the table above. |
| `unit` | No | Input unit for temperature, glucose and weight. |
| `context` | No | Glucose only. |
| `device.model` | No | An id from `GET /devices` (`td3140`, `bp7250`, ...), `manual` for a value typed by a person, or `other` for a device not in the catalog. Default: `manual` when `source` is `manual`, else `other`. |
| `device.serial`, `device.mac` | No | Serial number and Bluetooth address, when you have them. |
| `source` | No | `ble`, `manual` or `integration`. Default `integration`. |
| `externalId` | No | Your id for this reading. Makes retries safe. |

## Duplicates and retries

Networks fail, and phones retry. EmmiTec stores each reading once:

- **With `externalId`** (recommended): sending the same `externalId` again returns `200` with the original reading and `"duplicate": true`. `externalId` is unique per integration and mode.
- **Without `externalId`**: a reading with the same patient, type, `measuredAt` and values is also treated as a duplicate (`200`, `"duplicate": true`).

The SDK's offline queue relies on this: it generates an `externalId` on the phone before the first attempt.

## The Reading object

```json title="Reading"
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

Reading `id` is a string of digits. `receivedAt` is when EmmiTec got it. Some fields depend on the type: glucose readings also return `context` (for example `"fasting"`) when it is known, blood pressure `values` include `irregularHeartbeat` when you sent it, and weight `values` include `bmi` when the patient has `heightCm`. The `alert` object is explained on [Alerts and notifications](/developers/alerts).

## Levels

Each evaluated value gets a level in `levels`, and `level` is the most severe of them.

| Level | Meaning |
|---|---|
| `critical_high` / `critical_low` | At or beyond a critical limit. |
| `attention_high` / `attention_low` | At or beyond an attention limit. |
| `normal` | Inside the limits. |
| `unknown` | No limit is configured for this value. |

Severity order: critical, then attention, then normal, then unknown. Between high and low, the overall level keeps the side of the most severe value. An `alert` exists only when `level` is an attention or critical level.

Values checked against limits:

| `type` | Evaluated values |
|---|---|
| `blood_pressure` | `systolic`, `diastolic`, and `pulse` when the client has pulse limits (the sandbox has) |
| `oxygen_saturation` | `spo2`, `pulse` |
| `temperature` | `temperature` |
| `glucose` | `glucose` |
| `weight` | None: weight readings are stored with `level: "unknown"` and `alert: null` |

## Thresholds

`GET /patients/{id}/thresholds`

The limits that apply to the patient. In live mode the care team can set them per patient (`source: "patient"`); otherwise the client defaults apply (`source: "default"`). A missing limit is `null`. The sandbox defaults are listed on [Testing and sandbox](/developers/testing#sandbox-thresholds).

```json title="Response 200"
{
  "data": [
    {
      "type": "blood_pressure",
      "value": "systolic",
      "unit": "mmHg",
      "criticalHigh": 180,
      "attentionHigh": 140,
      "attentionLow": 90,
      "criticalLow": 80,
      "source": "default"
    },
    {
      "type": "blood_pressure",
      "value": "diastolic",
      "unit": "mmHg",
      "criticalHigh": 120,
      "attentionHigh": 90,
      "attentionLow": 60,
      "criticalLow": 50,
      "source": "default"
    }
  ]
}
```

## Send many readings at once

`POST /readings/batch`

Up to 100 readings per call. Use it to upload a device's memory or an offline backlog. Items are independent: one invalid item does not stop the others. `patientId` at the top applies to the items (with a session token it can be left out).

```json title="Request"
{
  "patientId": "3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21",
  "readings": [
    { "type": "blood_pressure", "measuredAt": "2026-11-24T07:58:00Z",
      "values": { "systolic": 128, "diastolic": 82 }, "externalId": "acme-reading-9979" },
    { "type": "blood_pressure", "measuredAt": "2026-11-24T08:01:00Z",
      "values": { "systolic": 182, "diastolic": 110 }, "externalId": "acme-reading-9980" },
    { "type": "blood_pressure", "measuredAt": "2026-11-24T08:05:00Z",
      "values": { "systolic": 30, "diastolic": 20 }, "externalId": "acme-reading-9981" }
  ]
}
```

```json title="Response 200"
{
  "data": [
    { "index": 0, "status": "created", "reading": { "id": "2104453", "level": "normal", "...": "..." }, "error": null },
    { "index": 1, "status": "duplicate", "reading": { "id": "2104454", "duplicate": true, "...": "..." }, "error": null },
    { "index": 2, "status": "error", "reading": null,
      "error": { "type": "invalid_request_error", "code": "validation_failed",
        "message": "values.systolic must be an integer between 40 and 300.",
        "param": "values.systolic", "requestId": "req_01JDJ3K8Q5R4T6V8X0Z2B4D6F8" } }
  ]
}
```

## Read readings

`GET /readings/{id}`

One reading, with `alert` written in the language you ask for: `?locale=pt` or the `Accept-Language` header (`en`, `pt`, `es`).

`GET /patients/{id}/readings`

The history of a patient, newest first, `alert` included.

| Query | Description |
|---|---|
| `type` | Only one type, for example `blood_pressure`. |
| `from`, `to` | Time window, ISO 8601 UTC. |
| `limit`, `cursor` | Pagination: 1 to 100, default 25. Follow `nextCursor`. |

## Errors you may see

| Status | `code` | Why |
|---|---|---|
| 400 | `validation_failed` | A value is out of range or a required field is missing. `param` points to it, for example `values.systolic`. |
| 400 | `unsupported_type` | `type` is not one of the five types. |
| 400 | `unknown_device` | `device.model` is not in the catalog, nor `manual` or `other`. |
| 404 | `not_found` | Unknown patient or reading for your integration in this mode. |
| 422 | `patient_disabled` | The patient is disabled for measurements. |

::: next
- [Alerts and notifications](/developers/alerts) What to do with `alert`.
- [Supported devices](/developers/devices) The `device.model` ids.
:::
