---
title: Patients
description: A patient is the person who measures. Create one per user of your app, keyed by your own id, and mint session tokens for the app.
---

All patient endpoints use your secret key. Patients belong to your integration and to one mode: a test key only sees test patients, a live key only sees live patients.

## The Patient object

```json title="Patient"
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

| Field | Type | Description |
|---|---|---|
| `id` | string (UUID) | EmmiTec id of the patient, lowercase. Use it in every other call. |
| `externalId` | string | Your id for this person. Unique per integration and mode. |
| `firstName`, `lastName` | string | Name of the patient. |
| `birthDate` | string | `YYYY-MM-DD`. |
| `sex` | string | `female`, `male`, `other` or `unknown`. |
| `email` | string or null | Optional. `null` when you create the patient without one. Patients never log in to EmmiTec apps, so no e-mail is needed. |
| `phone` | string or null | Optional, E.164 format (`+15551234567`). |
| `language` | string | `en`, `pt` or `es`. |
| `heightCm` | number or null | 50 to 250. Used to compute BMI on weight readings. |
| `mode` | string | `test` or `live`, from the key that created it. |
| `createdAt` | string | ISO 8601 in UTC. |

## Create a patient

`POST /patients`

Call this when a user starts using the health features of your app. It is **idempotent by `externalId`**: if a patient with the same `externalId` already exists in this mode, you get that patient back with status `200` instead of `201`. Differences in the body are ignored in that case; use `PATCH` to change data.

| Field | Required | Rules |
|---|---|---|
| `externalId` | Yes | 1 to 100 characters, unique per integration and mode. |
| `firstName` | Yes | |
| `lastName` | Yes | |
| `birthDate` | Yes | `YYYY-MM-DD`. |
| `sex` | No | `female`, `male`, `other`, `unknown`. Default `unknown`. |
| `email` | No | |
| `phone` | No | E.164. |
| `language` | No | `en`, `pt`, `es`. Default `en`. |
| `heightCm` | No | 50 to 250. |

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
    "language": "en",
    "heightCm": 162
  }'
```

```js tab="Node.js"
async function ensurePatient(user) {
  const res = await fetch(`${process.env.EMMITEC_API}/patients`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.EMMITEC_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      externalId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      birthDate: user.birthDate, // "1956-03-14"
      language: 'en',
    }),
  })
  if (res.status !== 201 && res.status !== 200) throw new Error(`EmmiTec ${res.status}`)
  const patient = await res.json()
  await db.users.update(user.id, { emmitecPatientId: patient.id })
  return patient
}
```

```python tab="Python"
def ensure_patient(user):
    res = requests.post(
        f"{EMMITEC_API}/patients",
        headers={"Authorization": f"Bearer {EMMITEC_KEY}"},
        json={
            "externalId": user.id,
            "firstName": user.first_name,
            "lastName": user.last_name,
            "birthDate": user.birth_date,  # "1956-03-14"
            "language": "en",
        },
    )
    if res.status_code not in (200, 201):
        raise RuntimeError(f"EmmiTec {res.status_code}: {res.text}")
    patient = res.json()
    db.users.update(user.id, emmitec_patient_id=patient["id"])
    return patient
```

::: tip Save the EmmiTec id
Store `patient.id` next to your user. Every other call uses it, and the webhook sends both `id` and your `externalId`.
:::

## Retrieve a patient

`GET /patients/{id}`

Returns the Patient object. From the app, with a session token, use `GET /me` to get the patient of the token.

`GET /me`

## List patients

`GET /patients`

| Query | Description |
|---|---|
| `externalId` | Only the patient with this `externalId`. Handy to find the EmmiTec id from your own. |
| `limit` | 1 to 100. Default 25. |
| `cursor` | The `nextCursor` of the previous page. |

Lists return the newest first:

```json title="Response 200"
{
  "data": [ { "id": "3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21", "externalId": "acme-user-123", "...": "..." } ],
  "hasMore": true,
  "nextCursor": "eyJpZCI6..."
}
```

To read every page, follow `nextCursor` while `hasMore` is `true`:

```js title="Read all pages"
let cursor = null
do {
  const url = new URL(`${process.env.EMMITEC_API}/patients`)
  url.searchParams.set('limit', '100')
  if (cursor) url.searchParams.set('cursor', cursor)
  const page = await (await fetch(url, { headers: { Authorization: `Bearer ${process.env.EMMITEC_KEY}` } })).json()
  for (const p of page.data) console.log(p.externalId, p.id)
  cursor = page.hasMore ? page.nextCursor : null
} while (cursor)
```

## Update a patient

`PATCH /patients/{id}`

Send only what changed. Accepted fields: `firstName`, `lastName`, `birthDate`, `sex`, `phone`, `language`, `heightCm`. The response is the updated Patient.

```bash title="Update height and phone"
curl -X PATCH "$EMMITEC_API/patients/$PATIENT_ID" \
  -H "Authorization: Bearer $EMMITEC_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "heightCm": 164, "phone": "+15559876543" }'
```

## Session tokens

`POST /patients/{id}/session-tokens`

Creates a token for the app of this patient. Body (optional): `expiresInSeconds`, from 300 to 2592000 (30 days). Default 604800 (7 days).

```json title="Response 201"
{
  "token": "emst_test_...",
  "patientId": "3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21",
  "expiresAt": "2026-12-01T14:03:00Z"
}
```

`DELETE /patients/{id}/session-tokens`

Revokes every token of the patient and tells you how many:

```json title="Response 200"
{ "revoked": 3 }
```

How the app gets and renews tokens is on [Authentication](/developers/authentication#mint-session-tokens-on-your-backend).

## Errors you may see

| Status | `code` | Why |
|---|---|---|
| 400 | `validation_failed` | A field is missing or out of range. `param` names it, for example `birthDate`. |
| 404 | `not_found` | No patient with this id for your integration in this mode. A live patient is never found with a test key. |
| 409 | `conflict` | For example, the email is already used by another person on the client. |

::: next
- [Readings](/developers/readings) Send and read measurements of your patients.
- [Authentication](/developers/authentication) Session tokens in the app.
:::
