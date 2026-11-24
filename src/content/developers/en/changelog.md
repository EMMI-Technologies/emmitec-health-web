---
title: Versioning and changelog
description: The major version is in the URL and the API version date is in every ping and webhook. What changed, and when.
---

## How versions work

- **Major version in the path.** Everything on this site is `/partner/v1`.
- **API version date.** `GET /ping` returns `apiVersion`, and every webhook envelope carries the same `apiVersion`. Today it is `2026-11-24`.
- **SDK version.** `emmitec-rpm` follows its own version number, starting at `1.0.0`.

Build your integration so it keeps working as the API grows: ignore fields you do not know, accept event types you do not handle (answer `2xx` and skip them), and branch on `code` rather than on error messages.

## Changelog

### 2026-11-24: Partner API v1.1

Additive: existing calls work as before, and `apiVersion` stays `2026-11-24`.

- Plan in `GET /ping`: `plan` with `name` (`trial`, `active` or `suspended`), `trialEndsAt`, `daysLeft` and `module`. A suspended integration gets `403 forbidden`.
- Alert settings per mode: `GET /settings` and `PUT /settings` (`alertsEnabled`). With alerts off, readings keep their `level`, `alert` is `null` and `reading.alert` is not sent.
- Thresholds: `PUT /patients/{id}/thresholds` sets the limits of a patient (the same limits the care team sees), `GET /thresholds` lists the client defaults and `PUT /thresholds` changes the defaults of your live client.
- Per-patient alerts: `PUT /patients/{id}/alerts` turns alerts on or off for one patient and type.
- [Customer portal](/developers/customer-portal) at emmitec.health/portal: plan, keys you can copy at any time, new keys, webhook, alerts on or off, deliveries.
- New page: [Alert settings and thresholds](/developers/alert-settings). The OpenAPI file and the Postman collection have the new endpoints.

### 2026-11-24: Partner API v1 and emmitec-rpm 1.0.0

First public version.

- Patients: create (idempotent by `externalId`), retrieve, list, update, `GET /me`.
- Patient session tokens: mint and revoke, 7 days by default, up to 30 days.
- Readings: blood pressure, oxygen saturation, temperature, glucose and weight. Single and batch (up to 100), idempotent by `externalId`, history and thresholds.
- Levels and alerts: `level`, `levels` and the Alert object (`title`, `text`, `reason`, `triggeredBy`) in English, Portuguese and Spanish.
- Device catalog with 21 Bluetooth devices, plus `manual` and `other`.
- Webhooks: `reading.alert`, `reading.created` and `ping`, signed with HMAC-SHA256, retried for about 22 hours, event log and resend.
- Sandbox: test keys, `POST /sandbox/simulate-alert`, `POST /webhook/test`.
- Expo SDK `emmitec-rpm` 1.0.0: config plugin, `useMeasurement`, manual readings, offline queue, `simulate` mode. Delivered as a `.tgz` with your sandbox key; npm publication coming soon.
- [OpenAPI 3.1 file](/developers/openapi.json) and [Postman collection](/developers/emmitec-partner-api.postman_collection.json).

::: next
- [API reference](/developers/api-reference) Every endpoint, with "Test request".
- [Overview](/developers) Back to the start.
:::
