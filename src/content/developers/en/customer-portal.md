---
title: Customer portal
description: The place for your team to see the plan, copy and generate API keys, set up the webhook, turn alerts on or off and follow every delivery. No code needed.
---

The customer portal is at [emmitec.health/portal](https://emmitec.health/portal). It is for the people of your company who set up and run the integration: developers, tech leads and operations. Most of what it does can also be done with the API; generating keys and copying a key or the webhook secret again are only in the portal.

## Sign in

- **EmmiTec creates the accounts**, one per person, with an e-mail and a password. To get one, or to add a colleague, write to [contato@emmitec.health](mailto:contato@emmitec.health?subject=EmmiTec%20customer%20portal%20access).
- The first time, you sign in with a temporary password and the portal asks you to choose your own: at least 10 characters, with letters and numbers.
- Forgot the password? Ask EmmiTec for a new temporary one.
- After 10 wrong attempts in 15 minutes for the same e-mail, wait 15 minutes before trying again.
- A session lasts up to 12 hours.

## What you can do there

| Section | What you do there |
|---|---|
| Overview | See your plan (the pilot and the days left), the module (RPM) and the numbers of each mode: patients, readings and alerts in the last 30 days, failed deliveries in the last 7 days. |
| API keys | Copy your keys at any time, and generate new ones. |
| Alerts and webhook | Turn alerts on or off, set the webhook URL, events and language, copy the signing secret and send a test event. |
| Alert limits | See the default limits of your client, read only. |
| Deliveries | The last 50 events sent to your webhook, with the result of each one. |

A switch at the top chooses the mode. Test and live each have their own keys, webhook and alert setting, as in the API. Live appears once EmmiTec connects your integration to your live client.

## Your plan

New partners start with a **90-day pilot**: plan `trial`. The portal shows when it ends and how many days are left. Your backend sees the same in `GET /ping`:

```json title="GET /ping (part of the response)"
{
  "ok": true,
  "mode": "test",
  "plan": {
    "name": "trial",
    "trialEndsAt": "2027-02-22T14:00:00Z",
    "daysLeft": 90,
    "module": "rpm"
  }
}
```

| `plan.name` | What it means |
|---|---|
| `trial` | The pilot. `trialEndsAt` is the end date and `daysLeft` counts down to it. |
| `active` | A contracted plan, with no end date. `trialEndsAt` and `daysLeft` are `null`. |
| `suspended` | Every call answers `403 forbidden` with the message "This integration is suspended. Contact EmmiTec." |

Calls are not blocked automatically when the pilot ends: EmmiTec talks with you about the next step.

## API keys

- **Copy at any time.** Keys are stored encrypted, so the portal can show them again whenever you need. A key created before the portal existed may not be shown; if you lost it, generate a new one.
- **Generate.** Give each key a name that says where it runs, such as "Production server". Live keys can be generated once your integration has a live client.
- **No delete.** You cannot delete or revoke a key in the portal. To revoke one (a leak, a server you turned off), ask EmmiTec: from that moment the key answers `401`.
- **Rotate** without downtime: generate a new key, deploy it, then ask EmmiTec to revoke the old one.

::: warning Who gets an account
Anyone with a portal account can copy your live key. Give accounts only to people who would also have access to your production secrets, and ask EmmiTec to deactivate the account of anyone who leaves the project.
:::

## Webhook and alerts

The portal and the API change the same settings, so a change made in one shows in the other.

| In the portal | Same as |
|---|---|
| Use alerts (on or off) | `PUT /settings`, see [Alert settings and thresholds](/developers/alert-settings) |
| Webhook URL, events and language | `PUT /webhook` |
| Copy the signing secret | Only in the portal. The API returns it only when the webhook is created and when you rotate it. |
| Send test | `POST /webhook/test`. The test goes to the saved URL. |
| Deliveries | `GET /events`. To send a failed event again, use `POST /events/{id}/resend`. |
| Alert limits | `GET /thresholds`. To change limits, use `PUT /patients/{id}/thresholds` or, in live, `PUT /thresholds`. |

## The portal is not part of the API

::: note
The portal has its own sign-in and its own internal routes. They are not part of the Partner API and can change without notice. Your integration should only call the endpoints in the [API reference](/developers/api-reference), with your secret key.
:::

::: next
- [Authentication](/developers/authentication) Where each key and token lives.
- [Alert settings and thresholds](/developers/alert-settings) Decide on alerts and set the limits.
- [Webhooks](/developers/webhooks) Receive and verify the events.
:::
