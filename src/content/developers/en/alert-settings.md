---
title: Alert settings and thresholds
description: Decide if your integration uses alerts, set the limits of each patient, change the defaults of your live client and turn alerts off for one patient.
---

A reading becomes an alert when one of its values crosses a limit of the patient. You control four things, all from your backend with your secret key:

| Endpoint | What it controls | Applies to |
|---|---|---|
| `PUT /settings` | Whether you use alerts at all | Your integration, in the mode of the key |
| `PUT /patients/{id}/thresholds` | The limits of one patient | One patient, one reading type |
| `PUT /thresholds` | The default limits | Every patient of your live client without limits of their own |
| `PUT /patients/{id}/alerts` | Alerts of one patient | One patient, one reading type |

A session token cannot call these endpoints (`403 forbidden`). The app can still read the limits of its own patient with `GET /patients/{id}/thresholds`.

## Decide if you use alerts

`GET /settings`

Each mode has its own setting, so you can try alerts in test before turning them on in live. Alerts are on by default.

```json title="Response 200"
{ "mode": "test", "alertsEnabled": true }
```

`PUT /settings`

Turn alerts off when you only want to store readings, or when your app decides on its own what to tell the patient from the `level`.

```bash tab="cURL"
curl -X PUT "$EMMITEC_API/settings" \
  -H "Authorization: Bearer $EMMITEC_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "alertsEnabled": false }'
```

```js tab="Node.js"
const res = await fetch(`${process.env.EMMITEC_API}/settings`, {
  method: 'PUT',
  headers: {
    Authorization: `Bearer ${process.env.EMMITEC_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ alertsEnabled: false }),
})
const settings = await res.json() // { mode: 'test', alertsEnabled: false }
```

```python tab="Python"
import os
import requests

res = requests.put(
    f"{os.environ['EMMITEC_API']}/settings",
    headers={"Authorization": f"Bearer {os.environ['EMMITEC_KEY']}"},
    json={"alertsEnabled": False},
)
res.raise_for_status()
print(res.json())  # {'mode': 'test', 'alertsEnabled': False}
```

```json title="Response 200"
{ "mode": "test", "alertsEnabled": false }
```

### What changes when alerts are off

| | Alerts on (default) | Alerts off |
|---|---|---|
| The reading is stored with `level` and `levels` | Yes | Yes |
| `alert` in API responses and in the SDK (`m.alert`) | The Alert object, on attention and critical levels | Always `null` |
| `reading.alert` webhook | Sent | Not sent |
| `reading.created` webhook, if you subscribed | Sent, with the alert | Sent, with `alert: null` |
| In live mode, the reading reaches the care team | Yes | Yes |

The setting only changes what EmmiTec sends to you. Your limits stay as they are. Turning alerts back on does not send webhooks for readings received while they were off. The same switch is in the [customer portal](/developers/customer-portal), under "Alerts and webhook".

## How limits work

Each evaluated value has four limits. A value is compared from the top:

| Limit | The value is | Level |
|---|---|---|
| `criticalHigh` | at or above it | `critical_high` |
| `attentionHigh` | at or above it | `attention_high` |
| `criticalLow` | at or below it | `critical_low` |
| `attentionLow` | at or below it | `attention_low` |
| none of the above | between the attention limits | `normal` |

When you write limits, they must be in order: `criticalLow <= attentionLow <= attentionHigh <= criticalHigh`.

The limits that apply to a patient are the patient's own (`source: "patient"`) or, when the patient has none for that type, the default of the client (`source: "default"`). A patient's own limits are the same ones the care team sees and edits in the EmmiTec portal: if they change them, you see it in `GET /patients/{id}/thresholds`, and if you change them, they see it.

| `type` | Values with limits | Unit of the limits |
|---|---|---|
| `blood_pressure` | `systolic`, `diastolic`, `pulse` | mmHg, pulse in bpm |
| `oxygen_saturation` | `spo2`, `pulse` | %, pulse in bpm |
| `temperature` | `temperature` | C, even when the device sends F |
| `glucose` | `glucose` | mg/dL, even when the device sends mmol/L |
| `weight` | None | Weight is not evaluated (`400 validation_failed`) |

## Set the limits of a patient

`PUT /patients/{id}/thresholds`

- One `type` per call.
- In `limits`, send the values you want to change. Each one needs **all four limits**, as numbers from 0 to 1000 (up to 2 decimals), in order. `null` is not accepted when writing.
- Values you do not send keep the limits that apply today. If one of them has no limits to keep (for example `pulse` on a client without pulse limits), the API answers `400` with `param` `limits.pulse`: send that value too.
- The next reading of this patient uses the new limits right away.
- After the call, every value of that type has `source: "patient"`. Later changes to the client defaults no longer reach this patient for that type.

This call sets systolic and diastolic for a patient with hypertension and leaves pulse as it is:

```bash tab="cURL"
curl -X PUT "$EMMITEC_API/patients/3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21/thresholds" \
  -H "Authorization: Bearer $EMMITEC_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "blood_pressure",
    "limits": {
      "systolic": {
        "criticalHigh": 170, "attentionHigh": 150,
        "attentionLow": 100, "criticalLow": 90
      },
      "diastolic": {
        "criticalHigh": 110, "attentionHigh": 95,
        "attentionLow": 60, "criticalLow": 50
      }
    }
  }'
```

```js tab="Node.js"
async function setPatientLimits(patientId, type, limits) {
  const res = await fetch(`${process.env.EMMITEC_API}/patients/${patientId}/thresholds`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${process.env.EMMITEC_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, limits }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`${body.error.code}: ${body.error.message}`)
  return body.data // every value of the type, with source "patient"
}

await setPatientLimits('3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21', 'blood_pressure', {
  systolic: {
    criticalHigh: 170, attentionHigh: 150,
    attentionLow: 100, criticalLow: 90
  },
  diastolic: {
    criticalHigh: 110, attentionHigh: 95,
    attentionLow: 60, criticalLow: 50
  },
})
```

```python tab="Python"
import os
import requests


def set_patient_limits(patient_id, reading_type, limits):
    res = requests.put(
        f"{os.environ['EMMITEC_API']}/patients/{patient_id}/thresholds",
        headers={"Authorization": f"Bearer {os.environ['EMMITEC_KEY']}"},
        json={"type": reading_type, "limits": limits},
    )
    if not res.ok:
        error = res.json()["error"]
        raise RuntimeError(f"{error['code']}: {error['message']}")
    return res.json()["data"]  # every value of the type, with source "patient"


set_patient_limits("3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21", "blood_pressure", {
    "systolic": {
      "criticalHigh": 170, "attentionHigh": 150,
      "attentionLow": 100, "criticalLow": 90
    },
    "diastolic": {
      "criticalHigh": 110, "attentionHigh": 95,
      "attentionLow": 60, "criticalLow": 50
    },
})
```

The response lists every value of the type with the limits that now apply. Pulse was not sent, so it kept the limits it had (the sandbox defaults, in this example):

```json title="Response 200"
{
  "data": [
    {
      "type": "blood_pressure", "value": "systolic", "unit": "mmHg",
      "criticalHigh": 170, "attentionHigh": 150,
      "attentionLow": 100, "criticalLow": 90,
      "source": "patient"
    },
    {
      "type": "blood_pressure", "value": "diastolic", "unit": "mmHg",
      "criticalHigh": 110, "attentionHigh": 95,
      "attentionLow": 60, "criticalLow": 50,
      "source": "patient"
    },
    {
      "type": "blood_pressure", "value": "pulse", "unit": "bpm",
      "criticalHigh": 130, "attentionHigh": 100,
      "attentionLow": 50, "criticalLow": 40,
      "source": "patient"
    }
  ]
}
```

### A body for each type

```json title="Blood pressure: systolic, diastolic and pulse"
{
  "type": "blood_pressure",
  "limits": {
    "systolic": {
      "criticalHigh": 170, "attentionHigh": 150,
      "attentionLow": 100, "criticalLow": 90
    },
    "diastolic": {
      "criticalHigh": 110, "attentionHigh": 95,
      "attentionLow": 60, "criticalLow": 50
    },
    "pulse": {
      "criticalHigh": 120, "attentionHigh": 100,
      "attentionLow": 50, "criticalLow": 40
    }
  }
}
```

```json title="Oxygen saturation: SpO2 and pulse"
{
  "type": "oxygen_saturation",
  "limits": {
    "spo2": {
      "criticalHigh": 101, "attentionHigh": 101,
      "attentionLow": 89, "criticalLow": 85
    },
    "pulse": {
      "criticalHigh": 120, "attentionHigh": 105,
      "attentionLow": 50, "criticalLow": 40
    }
  }
}
```

SpO2 never goes above 100%, so high limits of 101 mean "no high alert". With these values, 89% or lower is `attention_low` and 85% or lower is `critical_low`.

```json title="Temperature, in C"
{
  "type": "temperature",
  "limits": {
    "temperature": {
      "criticalHigh": 39.5, "attentionHigh": 38.0,
      "attentionLow": 35.5, "criticalLow": 35.0
    }
  }
}
```

```json title="Glucose, in mg/dL"
{
  "type": "glucose",
  "limits": {
    "glucose": {
      "criticalHigh": 300, "attentionHigh": 220,
      "attentionLow": 70, "criticalLow": 54
    }
  }
}
```

Temperature limits are always in C (38.0 C is 100.4 F) and glucose limits in mg/dL (70 mg/dL is 3.9 mmol/L), whatever unit the device sends.

## Default limits of your live client

`GET /thresholds`

The defaults of the client of the key. With a test key you get the sandbox defaults (the table on [Testing and sandbox](/developers/testing#sandbox-thresholds)); with a live key, the defaults of your live client. Values without default limits are left out, and missing limits are `null`.

```json title="Response 200 (test key, first rows)"
{
  "data": [
    {
      "type": "blood_pressure", "value": "systolic", "unit": "mmHg",
      "criticalHigh": 180, "attentionHigh": 140,
      "attentionLow": 90, "criticalLow": 80,
      "source": "default"
    },
    {
      "type": "oxygen_saturation", "value": "spo2", "unit": "%",
      "criticalHigh": null, "attentionHigh": null,
      "attentionLow": 94, "criticalLow": 90,
      "source": "default"
    }
  ]
}
```

`PUT /thresholds`

Live key only. The body and its rules are the same as for one patient: one `type`, and the values to change with their four limits. Values you do not send keep their defaults.

```bash tab="cURL"
curl -X PUT "$EMMITEC_API/thresholds" \
  -H "Authorization: Bearer $EMMITEC_LIVE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "glucose",
    "limits": {
      "glucose": {
        "criticalHigh": 300, "attentionHigh": 200,
        "attentionLow": 70, "criticalLow": 54
      }
    }
  }'
```

```js tab="Node.js"
const res = await fetch(`${process.env.EMMITEC_API}/thresholds`, {
  method: 'PUT',
  headers: {
    Authorization: `Bearer ${process.env.EMMITEC_LIVE_KEY}`, // emk_live_...
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'glucose',
    limits: {
      glucose: { criticalHigh: 300, attentionHigh: 200, attentionLow: 70, criticalLow: 54 },
    },
  }),
})
const { data } = await res.json() // the glucose defaults, with source "default"
```

```python tab="Python"
res = requests.put(
    f"{os.environ['EMMITEC_API']}/thresholds",
    headers={"Authorization": f"Bearer {os.environ['EMMITEC_LIVE_KEY']}"},  # emk_live_...
    json={
        "type": "glucose",
        "limits": {
            "glucose": {"criticalHigh": 300, "attentionHigh": 200, "attentionLow": 70, "criticalLow": 54},
        },
    },
)
res.raise_for_status()
print(res.json()["data"])  # the glucose defaults, with source "default"
```

::: warning Defaults reach every patient of the client
The new defaults apply to every patient of your live client who has no limits of their own for that type, including patients the care team added in the EmmiTec portal. Agree on the values with the care team before you change them.
:::

With a test key, `PUT /thresholds` answers `403`. The sandbox defaults are shared by every partner, so nobody can change them; in test mode, set limits per patient instead.

```json title="403 Forbidden (test key)"
{
  "error": {
    "type": "permission_error",
    "code": "forbidden",
    "message": "The sandbox defaults are shared; set limits per patient with PUT /patients/{id}/thresholds.",
    "param": null,
    "requestId": "req_01JDJ3K8Q5R4T6V8X0Z2B4D6F8"
  }
}
```

If your live client has no default limits for that type yet, the API answers `409 conflict`: ask EmmiTec to set them up.

## Turn alerts off for one patient

`PUT /patients/{id}/alerts`

| Field | Required | Description |
|---|---|---|
| `type` | Yes | `blood_pressure`, `oxygen_saturation`, `temperature` or `glucose`. |
| `enabled` | Yes | `false` stops the alerts of this patient for this type. `true` turns them back on. |

While it is off, the readings of that patient and type are still stored and get a `level`, but `alert` is `null` and no `reading.alert` is sent. Other types and other patients are not affected. It is the same switch the care team has in the EmmiTec portal.

```bash tab="cURL"
curl -X PUT "$EMMITEC_API/patients/3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21/alerts" \
  -H "Authorization: Bearer $EMMITEC_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "type": "blood_pressure", "enabled": false }'
```

```js tab="Node.js"
const res = await fetch(`${process.env.EMMITEC_API}/patients/${patientId}/alerts`, {
  method: 'PUT',
  headers: {
    Authorization: `Bearer ${process.env.EMMITEC_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ type: 'blood_pressure', enabled: false }),
})
const result = await res.json() // { type: 'blood_pressure', enabled: false }
```

```python tab="Python"
res = requests.put(
    f"{os.environ['EMMITEC_API']}/patients/{patient_id}/alerts",
    headers={"Authorization": f"Bearer {os.environ['EMMITEC_KEY']}"},
    json={"type": "blood_pressure", "enabled": False},
)
res.raise_for_status()
print(res.json())  # {'type': 'blood_pressure', 'enabled': False}
```

```json title="Response 200"
{ "type": "blood_pressure", "enabled": false }
```

In test mode, `POST /sandbox/simulate-alert` turns the alerts of the simulated type back on for that patient.

## Errors

| Status | `code` | When |
|---|---|---|
| 400 | `validation_failed` | A limit is missing or is not a number from 0 to 1000, the four limits are out of order, a value does not belong to the type, `type` is `weight`, or `alertsEnabled` / `enabled` is not `true` or `false`. `param` says where, for example `limits.systolic`. |
| 400 | `unsupported_type` | `PUT /patients/{id}/alerts` with an unknown `type`. |
| 403 | `forbidden` | A session token called one of these endpoints, or a test key called `PUT /thresholds`. |
| 404 | `not_found` | The patient is not in your integration, in this mode. |
| 409 | `conflict` | `PUT /thresholds`: your live client has no default limits for this type yet. |

::: next
- [Alerts and notifications](/developers/alerts) Turn the alert into a push notification.
- [Testing and sandbox](/developers/testing) Simulate each level against the new limits.
- [API reference](/developers/api-reference) Every field of these endpoints, with "Test request".
:::
