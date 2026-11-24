---
title: Alerts and notifications
description: When a reading crosses the patient's limits, EmmiTec gives you an alert with the title, the patient-facing text and the reason. You decide how to notify.
---

EmmiTec never sends push notifications to your users. It gives you everything you need to send your own, in your app's voice and with your provider. The same alert reaches you in two places:

| Where | When | Best for |
|---|---|---|
| The response to `POST /readings` (in the SDK: `m.alert`) | Instantly, on the phone that sent the reading | An in-app banner while the app is open |
| The `reading.alert` webhook | Seconds later, on your server | Push notifications, caregivers, your support team, your records |

::: tip You decide if and when there is an alert
Alerts are on by default. You can turn them off for your integration (`alertsEnabled`), set the limits of each patient and turn alerts off for one patient. See [Alert settings and thresholds](/developers/alert-settings).
:::

## The Alert object

```json title="Alert"
{
  "level": "critical_high",
  "title": "Very high blood pressure",
  "text": "Your blood pressure reading was 182/110 mmHg, above your safe range. If you feel unwell, contact your care team or emergency services.",
  "reason": "Systolic 182 mmHg is at or above the critical limit of 180 mmHg. Diastolic 110 mmHg is at or above the attention limit of 90 mmHg.",
  "locale": "en",
  "triggeredBy": [
    { "value": "systolic", "measured": 182, "unit": "mmHg", "level": "critical_high", "limit": 180 },
    { "value": "diastolic", "measured": 110, "unit": "mmHg", "level": "attention_high", "limit": 90 }
  ]
}
```

| Field | What it is | Use it for |
|---|---|---|
| `title` | Short headline. | The notification title. |
| `text` | Plain language, written to the patient ("your"). | The notification body and the in-app banner. |
| `reason` | Technical: which value crossed which limit. | Logs, clinician or caregiver views, support. Not for the patient. |
| `level` | `attention_high`, `attention_low`, `critical_high` or `critical_low`. | Color, sound, priority, who else to notify. |
| `locale` | `en`, `pt` or `es`. | The language the texts are in. |
| `triggeredBy` | Each value outside its range: `value`, `measured`, `unit`, `level`, `limit`. | Highlighting the number in your UI, analytics. |

The reading that triggered the alert is the reading itself: the full Reading object in the `POST /readings` response, or `data.reading` in the webhook (with the patient in `data.patient`).

An alert exists only when the reading's `level` is an attention or a critical level. For `normal` and `unknown`, `alert` is `null` and no `reading.alert` webhook is sent. Weight readings are not evaluated, so they never carry an alert. `alert` is also `null` when alerts are off for your integration in that mode (`alertsEnabled: false`) or for that patient and type; the `level` is still there.

### What the texts look like

- Level words in the title: **very high**, **high**, **low**, **very low** (pt: muito alta, alta, baixa, muito baixa; es: muy alta, alta, baja, muy baja).
- `text` talks to the patient about their own reading. It never gives medical advice. On critical levels only, it ends with: "If you feel unwell, contact your care team or emergency services."
- `reason` is for people who need the numbers, such as "Systolic 182 mmHg is at or above the critical limit of 180 mmHg. Diastolic 110 mmHg is at or above the attention limit of 90 mmHg."

### Language of the texts

The texts are written in the locale you ask for:

- **In the app**: the `locale` you pass to `EmmiTec.configure()`.
- **In API calls**: `?locale=pt` or the `Accept-Language` header (`en`, `pt`, `es`).
- **In webhooks**: the `locale` you set with `PUT /webhook`.

Without any of these, the webhook locale of your integration for that mode is used, and then `en`. Need the same alert in another language later? `GET /readings/{id}?locale=es` recomputes it.

## Push notification from your backend

This is the recommended way: the webhook reaches you even when the app is closed, and your backend knows every device of the user. After [verifying the signature](/developers/webhooks#verify-the-signature), map the alert to the push:

| Push field | Alert field |
|---|---|
| title | `alert.title` |
| body | `alert.text` |
| data | `{ readingId: reading.id, level: alert.level }` |
| priority | high for `critical_*`, normal for `attention_*` |

With the Expo Push Service:

```js title="webhook handler (Node.js)"
if (event.type === 'reading.alert') {
  const { patient, reading, alert } = event.data
  const pushTokens = await db.pushTokensFor(patient.externalId) // ExponentPushToken[...]

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      pushTokens.map((to) => ({
        to,
        title: alert.title,
        body: alert.text,
        data: { readingId: reading.id, level: alert.level },
        sound: 'default',
        priority: alert.level.startsWith('critical') ? 'high' : 'normal',
      })),
    ),
  })
}
```

Using Firebase Cloud Messaging or APNs directly is the same mapping: `alert.title` and `alert.text` in the notification, `readingId` and `level` in the data.

## Banner in the app, right after measuring

The SDK returns the alert as soon as the reading is saved. Show it on the screen where the patient just measured:

```tsx title="MeasureScreen.tsx"
import { Text, View } from 'react-native'
import { useMeasurement } from 'emmitec-rpm'

export function MeasureScreen() {
  const m = useMeasurement('blood_pressure')

  return (
    <View>
      {/* ...your measuring UI... */}
      {m.alert && (
        <View
          accessibilityRole="alert"
          style={{
            padding: 16,
            borderRadius: 14,
            backgroundColor: m.alert.level.startsWith('critical') ? '#FDE8E3' : '#FFF4DE',
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '600' }}>{m.alert.title}</Text>
          <Text style={{ fontSize: 15, marginTop: 4 }}>{m.alert.text}</Text>
        </View>
      )}
    </View>
  )
}
```

The same alert also arrives as an event, on any screen, which is handy for a global banner. It fires too for readings sent later from the offline queue:

```ts title="Global listener"
EmmiTec.on('alert', ({ alert, reading }) => showBanner(alert.title, alert.text))
```

## Local notification on the phone

If you have no backend push yet, you can turn the SDK alert into a local notification with `expo-notifications`:

```ts title="notifyAlert.ts"
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

export async function setupNotifications() {
  const { status } = await Notifications.requestPermissionsAsync()
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Health alerts',
      importance: Notifications.AndroidImportance.HIGH,
    })
  }
  return status === 'granted'
}

type EmmiTecAlert = { level: string; title: string; text: string }

export async function notifyAlert(alert: EmmiTecAlert, readingId: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: alert.title,
      body: alert.text,
      data: { readingId, level: alert.level },
      sound: 'default',
    },
    trigger: null, // show it now
  })
}
```

```tsx title="Use it after a measurement"
useEffect(() => {
  if (m.phase === 'saved' && m.alert && m.reading) {
    void notifyAlert(m.alert, m.reading.id)
  }
}, [m.phase])
```

## One alert, one notification

If the app shows a banner and your backend also sends a push for the same reading, the patient gets the same news twice. Pick one rule and stick to it. A simple one: the app remembers which `readingId` it already showed, and ignores a push for that reading.

```ts title="App.tsx"
const shown = new Set<string>() // add reading.id when you show the banner

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const readingId = notification.request.content.data?.readingId as string | undefined
    const duplicate = !!readingId && shown.has(readingId)
    return {
      shouldShowBanner: !duplicate,
      shouldShowList: !duplicate,
      shouldPlaySound: !duplicate,
      shouldSetBadge: false,
    }
  },
})
```

::: note
`shouldShowBanner` and `shouldShowList` are the names in recent versions of `expo-notifications`. Older versions use `shouldShowAlert`.
:::

## Test it

In test mode, `POST /sandbox/simulate-alert` creates a reading that crosses the patient's limits and runs the whole pipeline, webhook included. Choose the level to check each style of your notification:

```bash title="A low oxygen alert"
curl -X POST "$EMMITEC_API/sandbox/simulate-alert" \
  -H "Authorization: Bearer $EMMITEC_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "patientId": "3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21", "type": "oxygen_saturation", "level": "critical_low" }'
```

::: next
- [Webhooks](/developers/webhooks) Receive `reading.alert` and verify its signature.
- [Alert settings and thresholds](/developers/alert-settings) Turn alerts on or off and set the limits of each patient.
- [Testing and sandbox](/developers/testing) Simulate every level before going live.
:::
