---
title: Testing and sandbox
description: Test keys run against an isolated sandbox with the same API and the same pipeline as live. Simulate alerts, test your webhook and go through the checklist before switching keys.
---

## Test mode

Test keys (`emk_test_...`) and the session tokens they mint (`emst_test_...`) work on the same base URL as live keys. The difference is the data:

- Everything goes to an isolated sandbox client, "EmmiTec Sandbox". No clinician is ever notified.
- It is free. Create and delete as much as you want.
- Your test patients, readings, webhook and events are only yours. Other partners never see them, and your live key never sees them either.
- Responses carry `X-EmmiTec-Mode: test`, and objects have `"mode": "test"`.

Test patients do not move to live. When you go live, your backend creates the live patients again with the live key (the same `externalId` values work).

## Sandbox thresholds

Every sandbox patient uses these default limits. In live mode, the limits are the ones the care team sets for each patient, falling back to your client's defaults; check them with `GET /patients/{id}/thresholds`.

| Value | Critical low | Attention low | Attention high | Critical high |
|---|---|---|---|---|
| Systolic (mmHg) | 80 | 90 | 140 | 180 |
| Diastolic (mmHg) | 50 | 60 | 90 | 120 |
| Pulse (bpm), in blood pressure and oxygen readings | 40 | 50 | 100 | 130 |
| SpO2 (%) | 90 | 94 | none | none |
| Temperature (C) | 35.0 | 35.5 | 37.8 | 39.0 |
| Glucose (mg/dL) | 54 | 70 | 180 | 250 |
| Weight | none | none | none | none |

So in the sandbox, 182/110 mmHg is `critical_high` (systolic at or above 180) with diastolic `attention_high` (at or above 90), SpO2 88% is `critical_low`, and glucose 250 mg/dL is `critical_high`. Weight readings always come back with `level: "unknown"` and no alert.

## Simulate an alert

`POST /sandbox/simulate-alert`

Creates a real sandbox reading whose values produce the level you ask for, using that patient's thresholds, and runs the full pipeline: level, alert texts and webhook. It answers `201` with the Reading. The reading has `device.model: "other"` and an `externalId` that starts with `sim_`, so you can tell simulated readings apart. Simulating also turns on alerts for that type, for that patient.

| Field | Required | Description |
|---|---|---|
| `patientId` | Yes | A test patient. |
| `type` | No | `blood_pressure` (default), `oxygen_saturation`, `temperature` or `glucose`. `weight` is not evaluated and answers `400 unsupported_type`. |
| `level` | No | `critical_high` (default), `attention_high`, `attention_low`, `critical_low` or `normal`. `oxygen_saturation` has no high limits, so it accepts only `attention_low`, `critical_low` and `normal`. |

```bash title="Simulate a high glucose"
curl -X POST "$EMMITEC_API/sandbox/simulate-alert" \
  -H "Authorization: Bearer $EMMITEC_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "patientId": "3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21", "type": "glucose", "level": "attention_high" }'
```

Use `"level": "normal"` to check that a normal reading does **not** notify anyone. With a live key, this endpoint answers `403 forbidden`.

## Test your webhook

- `POST /webhook/test` sends a `ping` now and tells you the status code and the time your endpoint took. Use it right after deploying.
- `GET /events` lists what EmmiTec sent and how each delivery went. `POST /events/{id}/resend` sends one again after a fix.
- Your endpoint must be public HTTPS. For local development, expose it with a tunnel (ngrok, Cloudflare Tunnel) or inspect requests with webhook.site.

## Test the app without hardware

`EmmiTec.configure({ ..., simulate: true })` replaces Bluetooth with simulated devices that produce realistic readings. They go through the API like real ones, so use a test session token. `EmmiTec.simulator.next({ type: 'blood_pressure', level: 'critical_high' })` picks the level of the next reading, and `EmmiTec.simulator.set({ bluetoothOff: true })` (or `permission`, `deviceAbsent`, `failNextConnection`) shows your error screens. Good for screens, demos and CI. Before going live, test every device type you support on real hardware too. See [Simulate mode](/developers/sdk#simulate-mode).

## Checklist before going live

**Keys and tokens**

- The secret key lives only on your servers, in a secret manager. It is not in the app, not in the repository.
- The app gets session tokens from your backend and implements `onTokenExpired`.
- Logging out everywhere calls `DELETE /patients/{id}/session-tokens`, and signing out of the app calls `EmmiTec.signOut()`.

**Readings**

- Readings carry an `externalId`, so retries never duplicate.
- Your code reads `level` and handles `alert: null`.
- You handle `400 validation_failed` (wrong value), `422 patient_disabled` and `429 rate_limited` (wait `Retry-After` seconds).

**Webhook**

- The signature is verified on the raw body, and events older than 300 seconds are rejected.
- You answer `2xx` in less than 10 seconds and do the slow work after.
- Events are deduplicated by `id`, and the latest reading is chosen by `measuredAt`.
- The webhook secret is stored safely, and you know how to [rotate it](/developers/webhooks#rotate-the-secret).

**Notifications**

- `alert.title` and `alert.text` appear correctly in every language you support.
- The patient does not get two notifications for the same reading.
- You tried every level with `simulate-alert`, including `normal`.

**App**

- Permission denied, Bluetooth off and device not found show a helpful message.
- A reading taken in airplane mode arrives after the connection comes back.
- Every device model you support was tested on a real phone, Android and iOS.

**Switching to live**

1. Ask EmmiTec for your live key (`emk_live_...`). Your integration needs a live client; until then, live keys answer `403`.
2. Configure the live webhook with `PUT /webhook` using the live key. It is separate from the test one and has its own secret.
3. Create the live patients and mint live session tokens.
4. Send one real reading and check it in `GET /patients/{id}/readings` and in your webhook logs.

::: next
- [Errors and rate limits](/developers/errors) Every error code and how to handle it.
- [Webhooks](/developers/webhooks) Retries, event log and resend.
:::
