---
title: Bring EmmiTec RPM into your own app
description: The Partner API and the Expo SDK let your app read Bluetooth medical devices, store readings on the EmmiTec platform and get a ready-to-send alert when a reading is out of range.
---

You keep your app, your brand and your push notifications. EmmiTec handles the hard parts of remote patient monitoring: talking to certified Bluetooth devices, storing every reading with its device, checking it against the patient's limits, and writing the alert text in the patient's language.

## How it works

<figure class="dx-flow">
<ol>
<li data-on="phone"><span class="dx-flow__who">Patient's phone</span><strong>1. Measure</strong>The patient uses a blood pressure monitor, oximeter, thermometer, glucose meter or scale.</li>
<li data-on="phone"><span class="dx-flow__who">Your app + EmmiTec SDK</span><strong>2. Read and send</strong>The SDK reads the device over Bluetooth and sends the reading with the patient's session token.</li>
<li data-on="emmitec"><span class="dx-flow__who">EmmiTec API</span><strong>3. Store and evaluate</strong>The reading is saved and checked against the patient's thresholds. The response already has the <code>level</code> and the <code>alert</code>.</li>
<li data-on="emmitec"><span class="dx-flow__who">EmmiTec API</span><strong>4. Webhook</strong>If the reading is out of range, EmmiTec sends a signed <code>reading.alert</code> event to your server.</li>
<li data-on="you"><span class="dx-flow__who">Your backend</span><strong>5. Decide</strong>You verify the signature and decide who to notify: the patient, a caregiver, your support team.</li>
<li data-on="you"><span class="dx-flow__who">Your push</span><strong>6. Notify</strong>You send the push with <code>alert.title</code> and <code>alert.text</code>, using your own provider.</li>
</ol>
<figcaption><span data-on="phone">On the phone</span><span data-on="emmitec">On EmmiTec</span><span data-on="you">On your side</span></figcaption>
</figure>

The phone also gets the alert right away, in the response to the reading. Use it to show a banner while the app is open. Use the webhook for push notifications and anything that must happen on your server.

## What you integrate

| Piece | Where it runs | What it does |
|---|---|---|
| Partner API | Your backend | Create patients, mint session tokens, configure webhooks, read history, set alert limits. |
| Expo SDK (`@emmitec/rpm`) | Your mobile app | Bluetooth permissions, device discovery, reading and saving measurements, offline queue. |
| Webhooks | Your backend | Receive `reading.alert` (and, if you want, every `reading.created`) as signed HTTPS calls. |
| [Customer portal](/developers/customer-portal) | Your browser | See the plan, copy and generate keys, set up the webhook, turn alerts on or off, follow deliveries. |

## Test and live

There is one base URL. The key you use decides the mode.

```text title="Base URL"
https://v2-prod-api-patients.emmitec.health/partner/v1
```

| Mode | Secret key | Session token | Data |
|---|---|---|---|
| Test | `emk_test_...` | `emst_test_...` | An isolated sandbox. No clinician is ever notified. Free, safe to create and delete anything. |
| Live | `emk_live_...` | `emst_live_...` | Your real client on the EmmiTec platform. Readings reach the care team. |

Test and live never mix: a test key never sees live data, and each mode has its own patients and its own webhook. Two partners never see each other's patients, not even in the sandbox.

New partners start with a 90-day pilot (plan `trial`). `GET /ping` returns the plan and the days left, and the customer portal shows the same.

::: note Getting keys
EmmiTec creates your access to the [customer portal](/developers/customer-portal), where you copy your keys at any time and generate new ones. Ask for access at [contato@emmitec.health](mailto:contato@emmitec.health?subject=EmmiTec%20Partner%20API%20keys). Keep secret keys in your secret manager, never in code.
:::

## Every response tells you where you are

Responses carry these headers. Log them: they make support requests fast.

| Header | Example | Meaning |
|---|---|---|
| `X-Request-Id` | `req_01JDJ3K8Q5R4T6V8X0Z2B4D6F8` | Unique id of this request, on every response. Send it to EmmiTec when you report a problem. |
| `X-EmmiTec-Mode` | `test` | The mode of the key or token you used, on every authenticated response. |

## Next steps

::: next
- [Quickstart](/developers/quickstart) Create a patient, send a reading and receive your first alert webhook in about 10 minutes.
- [Authentication](/developers/authentication) Secret keys on your server, session tokens in the app.
- [Alerts and notifications](/developers/alerts) Turn the alert into a push notification or an in-app banner.
- [Expo SDK](/developers/sdk) Read Bluetooth devices from your React Native app.
:::
