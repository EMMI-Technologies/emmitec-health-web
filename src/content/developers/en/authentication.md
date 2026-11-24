---
title: Authentication
description: Two credentials with different jobs. Secret keys stay on your server. Patient session tokens go to the app and only work for one patient.
---

Every request carries a bearer token:

```http title="Header"
Authorization: Bearer emk_test_...
```

## Who holds what

<div class="dx-holders">
<div class="dx-holder"><span class="dx-holder__who">Your backend</span><code>emk_live_...</code>Secret key. Creates patients, mints session tokens, configures the webhook, reads any patient of your integration. It never leaves your servers.</div>
<div class="dx-holders__arrow">mints a token per patient</div>
<div class="dx-holder"><span class="dx-holder__who">Patient's app (SDK)</span><code>emst_live_...</code>Session token. Sends readings and reads data of that one patient. Expires and can be revoked.</div>
</div>

| | Secret key | Patient session token |
|---|---|---|
| Prefix | `emk_test_` / `emk_live_` | `emst_test_` / `emst_live_` |
| Lives in | Your backend (secret manager) | The patient's app |
| Issued by | You, in the [customer portal](/developers/customer-portal) (copy it again at any time), or EmmiTec | Your backend, with `POST /patients/{id}/session-tokens` |
| Scope | Everything in your integration, for that mode | One patient |
| Lifetime | Until revoked | 7 days by default, 30 days maximum |

::: warning Never ship a secret key in an app or a website
Anyone can extract strings from a mobile app or read a website's JavaScript. A leaked secret key gives access to every patient of your integration. The app must only ever see session tokens.
:::

## What a session token can call

A session token can call exactly these endpoints, and only for its own patient:

| Endpoint | Use |
|---|---|
| `GET /ping` | Check the token. The response has `"auth": "session_token"` and the `patientId`. |
| `GET /me` | The patient of this token. |
| `GET /devices` | The device catalog. |
| `POST /readings` | Send a reading. `patientId` can be omitted (if sent, it must match). |
| `POST /readings/batch` | Send up to 100 readings at once. |
| `GET /readings/{id}` | One reading of this patient. |
| `GET /patients/{own id}/readings` | History of this patient. |
| `GET /patients/{own id}/thresholds` | Limits that apply to this patient. |

Anything else answers `403 forbidden`.

## Mint session tokens on your backend

The usual flow: the user logs in to your app, the app asks your backend for an EmmiTec token, your backend checks who the user is and mints a token for that user's patient.

```js tab="Node.js"
// Your backend (Express). The app calls this after the user logs in.
app.post('/api/emmitec/session-token', requireUser, async (req, res) => {
  const patientId = req.user.emmitecPatientId // saved when you created the patient
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
# Your backend (FastAPI). The app calls this after the user logs in.
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

`expiresInSeconds` is optional: the default is 604800 (7 days), the minimum is 300 and the maximum is 2592000 (30 days).

In the app, give the token to the SDK and tell it how to get a new one. The SDK calls `onTokenExpired` once when the API answers `401`, then retries the request with the new token:

```ts title="App.tsx"
import { EmmiTec } from 'emmitec-rpm'

EmmiTec.configure({
  sessionToken: token, // from your backend
  locale: 'en',
  onTokenExpired: async () => {
    const r = await fetch('https://api.your-app.com/api/emmitec/session-token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${yourUserJwt}` },
    })
    if (!r.ok) return null // the patient must sign in again
    const { token } = await r.json()
    return token // a token of the same patient
  },
})
```

::: tip
Didn't save the EmmiTec patient id? Find it by your own id: `GET /patients?externalId=acme-user-123`.
:::

## Revoke and rotate

**Session tokens.** Revoke every token of a patient when the user logs out everywhere, loses the phone or leaves your service:

`DELETE /patients/{id}/session-tokens`

```json title="Response 200"
{ "revoked": 3 }
```

Tokens are random and stored hashed: EmmiTec cannot show a token again after it is minted.

**Secret keys.** You generate and copy them in the [customer portal](/developers/customer-portal); only EmmiTec revokes them. To rotate a key, generate a new one in the portal, deploy it, then ask EmmiTec to revoke the old key. If a secret key leaks, ask for revocation right away: from that moment the key answers `401`.

## Errors

| Status | `code` | When |
|---|---|---|
| 401 | `unauthorized` | The token is missing, invalid or revoked, or expired. The message says which. |
| 403 | `forbidden` | A session token called something outside its scope, a live key was used while your integration has no live client yet, or your integration is suspended ("This integration is suspended. Contact EmmiTec."). |

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

The API never echoes your token back. Branch your code on `code`, not on `message`: messages are written for people and can change. All error codes are on [Errors and rate limits](/developers/errors).

::: next
- [Patients](/developers/patients) Create patients, keep them in sync and mint their tokens.
- [Expo SDK](/developers/sdk) Configure the SDK with the session token.
:::
