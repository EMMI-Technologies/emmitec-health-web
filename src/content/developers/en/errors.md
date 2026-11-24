---
title: Errors and rate limits
description: Every error has the same shape, a stable code to branch on and a request id for support. Plus the rate limit and how to retry safely.
---

## Error format

Every response that is not `2xx` has this body:

```json title="400 Bad Request"
{
  "error": {
    "type": "invalid_request_error",
    "code": "validation_failed",
    "message": "values.systolic must be an integer between 40 and 300.",
    "param": "values.systolic",
    "requestId": "req_01JDJ3K8Q5R4T6V8X0Z2B4D6F8"
  }
}
```

| Field | Description |
|---|---|
| `type` | Family of the error (see the table below). |
| `code` | The specific error. Branch your code on this. |
| `message` | Explanation for a developer. It can change: do not parse it. |
| `param` | The field that caused it, when there is one, for example `values.systolic`. |
| `requestId` | Same as the `X-Request-Id` header. Send it to EmmiTec when you need help. |

## Error codes

| HTTP | `type` | `code` | When |
|---|---|---|---|
| 400 | `invalid_request_error` | `invalid_json` | The body is not valid JSON. |
| 400 | `invalid_request_error` | `validation_failed` | A field is missing, has the wrong type or is out of range. |
| 400 | `invalid_request_error` | `unsupported_type` | The reading `type` is not supported. |
| 400 | `invalid_request_error` | `unknown_device` | `device.model` is not in the catalog. |
| 401 | `authentication_error` | `unauthorized` | Token missing, invalid or revoked, or expired. |
| 403 | `permission_error` | `forbidden` | Session token outside its scope, sandbox route with a live key, or live key while your integration has no live client. |
| 404 | `invalid_request_error` | `not_found` | Patient, reading or event not found for your integration in this mode. |
| 409 | `invalid_request_error` | `conflict` | For example, the email is already used by another person on the client. |
| 422 | `invalid_request_error` | `patient_disabled` | The patient is disabled for measurements. |
| 429 | `rate_limit_error` | `rate_limited` | Too many requests. Wait `Retry-After` seconds. |
| 500 | `api_error` | `internal_error` | Unexpected error on EmmiTec. The message is generic; the `requestId` lets us find it. |

## Handling errors

| Situation | What to do |
|---|---|
| `400` | Fix the request. Do not retry it as is. `param` tells you which field. |
| `401` | Get a new token: in the app, the SDK calls your `onTokenExpired`. On the server, check the key. |
| `403` | Check which token you are using and for which route. |
| `404` | Check the id and the mode: a test key never sees live data. |
| `409`, `422` | Show a clear message to your user or your support team. |
| `429` | Wait the number of seconds in `Retry-After`, then retry. |
| `500`, network errors | Retry with backoff (for example 1 s, 2 s, 4 s). For readings, send an `externalId` so retries are safe. |

```js title="A small retry helper (Node.js)"
async function emmitec(path, init = {}, attempt = 0) {
  const res = await fetch(`${process.env.EMMITEC_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.EMMITEC_KEY}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  const retryable = res.status === 429 || res.status >= 500
  if (retryable && attempt < 4) {
    const wait = Number(res.headers.get('Retry-After')) || 2 ** attempt
    await new Promise((r) => setTimeout(r, wait * 1000))
    return emmitec(path, init, attempt + 1)
  }
  const body = await res.json()
  if (!res.ok) {
    const err = new Error(`${body.error.code}: ${body.error.message}`)
    err.requestId = body.error.requestId
    throw err
  }
  return body
}
```

In the app, the SDK raises API errors as `EmmiTecApiError` with the same `status`, `code`, `message`, `param` and `requestId`. It already retries `429` after `Retry-After`, asks your `onTokenExpired` for a new token on `401`, and keeps readings in the [offline queue](/developers/sdk#offline-queue) on network errors, timeouts and persistent `5xx` or `429`.

## Rate limit

Each secret key and each session token can make **30 requests per second**. Above that the API answers `429 rate_limited` with a `Retry-After` header in seconds.

Each phone has its own session token, so the limit of one patient's app never affects the others. To send many readings, use `POST /readings/batch` (up to 100 per call) instead of one call per reading.

## Request ids

Every response has `X-Request-Id` (for example `req_01JDJ3K8Q5R4T6V8X0Z2B4D6F8`), and every error repeats it in `requestId`. Log it next to your own request id. When you contact EmmiTec about a problem, send it: it is the fastest way for us to find the call.

::: next
- [Versioning and changelog](/developers/changelog) How the API evolves.
- [Testing and sandbox](/developers/testing) The checklist before going live.
:::
