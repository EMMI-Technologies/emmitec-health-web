---
title: Expo SDK
description: emmitec-rpm reads Bluetooth medical devices from your Expo or React Native app, saves the reading on EmmiTec and hands you the alert. Permissions, discovery, pairing, retries and the offline queue are handled.
---

## Requirements

- Expo SDK 52 or newer (React Native 0.74 or newer), with a **development build**. The SDK uses native Bluetooth, so it does not run in Expo Go.
- `react-native-ble-manager` 12.x.
- Recommended: `@react-native-async-storage/async-storage` (the offline queue survives restarts), `expo-secure-store` (device pairing secrets in secure storage) and `expo-crypto` (cryptographic ids on Hermes). They are optional peers: the SDK works without them, with less durability.
- A patient session token minted by your backend. See [Authentication](/developers/authentication).

## Install

The SDK is on npm as [`emmitec-rpm`](https://www.npmjs.com/package/emmitec-rpm). Install it with its peer dependencies:

```bash title="Terminal"
npx expo install emmitec-rpm react-native-ble-manager @react-native-async-storage/async-storage expo-secure-store
npx expo install expo-crypto
```

## Add the config plugin

The plugin adds the Bluetooth permissions to the native projects: `BLUETOOTH_SCAN` (marked as never used for location) and `BLUETOOTH_CONNECT` on Android 12 and newer, location only up to Android 11 (older Android needs it to scan), and `NSBluetoothAlwaysUsageDescription` on iOS.

```json title="app.json"
{
  "expo": {
    "plugins": [
      ["emmitec-rpm", { "bluetoothPermissionText": "Allow $(PRODUCT_NAME) to read your health devices." }]
    ]
  }
}
```

`bluetoothPermissionText` is optional: without it, the plugin uses a default text (or keeps one your app already has). Then create a development build:

```bash title="Terminal"
# local build on a connected device or emulator
npx expo run:android
npx expo run:ios

# or with EAS
eas build --profile development --platform android
```

::: warning Expo Go will not work
Expo Go does not include native Bluetooth modules. Use a development build. To build your UI without hardware, turn on [simulate mode](#simulate-mode).
:::

## Configure

Call `configure` once the patient is signed in to your app:

```ts title="App.tsx"
import { EmmiTec } from 'emmitec-rpm'

EmmiTec.configure({
  sessionToken, // emst_test_... or emst_live_..., from your backend. Never a secret key.
  locale: 'en', // language of the alert texts: 'en', 'pt' or 'es'
  onTokenExpired: async () => {
    // called once when the API answers 401: ask YOUR backend for a new token of the same patient
    const r = await fetch('https://api.your-app.com/api/emmitec/session-token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${yourUserJwt}` },
    })
    if (!r.ok) return null // null: the patient must sign in again
    const { token } = await r.json()
    return token
  },
})
```

| Option | Description |
|---|---|
| `sessionToken` | Required. The patient's session token. |
| `locale` | Language of `alert.title`, `alert.text` and `alert.reason`. Default: the webhook locale of your integration, else `en`. |
| `simulate` | `true` replaces Bluetooth with simulated devices. |
| `onTokenExpired` | Called once on a `401`. Return a new token of the **same** patient, or `null` when the patient must sign in again. |
| `baseUrl` | Default `https://v2-prod-api-patients.emmitec.health/partner/v1`, the same for test and live. |
| `storage`, `secureStorage` | Custom storage for the offline queue and for pairing secrets. Defaults: AsyncStorage, and expo-secure-store when installed. |
| `timeoutMs` | Per request. Default 20000. |
| `app` | Your app id and version, e.g. `{ id: 'com.acme.health', version: '2.3.1' }`. Goes in the `EmmiTec-Client` header so support can tell app versions apart. |
| `diagnostics` | Default `true`. See [Diagnostics](#diagnostics). `false` turns it off. |

When the patient signs out of your app, call `await EmmiTec.signOut()`. Device pairing secrets are kept (they belong to the phone and the device), and queued readings stay to be sent when the same patient signs in again. Pass `{ clearQueue: true }` to drop them.

## Measure with `useMeasurement`

`useMeasurement(type, options?)` runs the whole flow: permission, Bluetooth check, scan (also using a catalog device already connected to the phone), connection, pairing when needed, waiting for the result and saving. It moves through these phases:

| Phase | What is happening | What to show |
|---|---|---|
| `idle` | Not started. | A "Measure" button and `m.device?.instructions` once known. |
| `permission` | Asking for Bluetooth permission. | Why you need it. |
| `bluetooth_off` | Bluetooth is turned off. | "Turn on Bluetooth to continue." |
| `scanning` | Looking for a supported device (up to 60 s). | "Start a measurement on your device now." |
| `connecting` | Device found, connecting. | `m.device.name` and its `instructions`. |
| `waiting` | Connected, waiting for the device to finish. | `m.device.instructions`. |
| `received` | The device sent the result. | `m.summary`, for example "120/80 mmHg, pulse 72". |
| `saving` | Sending the reading to EmmiTec. | The numbers, with a small progress state. |
| `saved` | Stored, or safe in the offline queue (`m.queued`). | The result and `m.alert`, if any. |
| `error` | Something failed. | `m.error.message` and "Try again". |

A complete screen:

```tsx title="BloodPressureScreen.tsx"
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native'
import { useMeasurement } from 'emmitec-rpm'

const BUSY = ['permission', 'scanning', 'connecting', 'waiting', 'received', 'saving']

export function BloodPressureScreen() {
  const m = useMeasurement('blood_pressure')
  const busy = BUSY.includes(m.phase)

  return (
    <View style={{ flex: 1, padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: '600' }}>Blood pressure</Text>

      {m.device && <Text style={{ fontSize: 16 }}>{m.device.instructions}</Text>}
      {m.phase === 'scanning' && <Text style={{ fontSize: 16 }}>Start a measurement on your monitor now.</Text>}
      {busy && <ActivityIndicator />}

      {m.summary && <Text style={{ fontSize: 32, fontWeight: '700' }}>{m.summary}</Text>}
      {m.queued && <Text>Saved on this phone. It will be sent when you are back online.</Text>}

      {m.alert && (
        <View accessibilityRole="alert" style={{ padding: 16, borderRadius: 14, backgroundColor: '#FDE8E3' }}>
          <Text style={{ fontSize: 17, fontWeight: '600' }}>{m.alert.title}</Text>
          <Text style={{ fontSize: 15, marginTop: 4 }}>{m.alert.text}</Text>
        </View>
      )}

      {m.error && (
        <View>
          <Text style={{ fontSize: 16 }}>{m.error.message}</Text>
          {m.error.code === 'permission_blocked' && (
            <Pressable onPress={() => Linking.openSettings()}>
              <Text style={{ fontSize: 16, color: '#08777B' }}>Open settings</Text>
            </Pressable>
          )}
        </View>
      )}

      {!busy && (
        <Pressable
          onPress={m.start}
          style={{ marginTop: 'auto', padding: 16, borderRadius: 999, backgroundColor: '#0E1117' }}
        >
          <Text style={{ color: '#fff', fontSize: 17, textAlign: 'center' }}>
            {m.phase === 'saved' ? 'Measure again' : 'Measure'}
          </Text>
        </Pressable>
      )}
    </View>
  )
}
```

What the hook returns:

| Field | Description |
|---|---|
| `phase` | One of the phases above. |
| `device` | The catalog device found: `model`, `name`, `type`, `pairing` and `instructions` (how to start a measurement, for the patient). |
| `peripheralId` | The id the phone gives the device. Use it with `EmmiTec.devices.forget`. |
| `measured`, `summary` | The reading as it came from the device, and a short text of it. |
| `reading` | The Reading saved on EmmiTec, with `level` and `alert`. `null` until saved, and when queued. |
| `alert` | The alert of the saved reading, or `null`. |
| `queued` | `true` when the reading is safe in the offline queue. The alert arrives later as an `alert` event. |
| `error` | `{ code, message }`. The message is a default patient-facing text in English. |
| `log` | Technical log of the conversation with the device. Attach it when you contact support. |
| `start()`, `save()`, `cancel()` | Start or restart, save (see `autoSave`), stop scanning and disconnect. |

Options of `useMeasurement`:

| Option | Default | Description |
|---|---|---|
| `autoSave` | `true` | Save as soon as the reading arrives. With `false`, the hook stops at `received`: show the numbers and call `m.save()` when the patient confirms. |
| `autoStart` | `false` | Start when the screen mounts. Recommended for oximeters: they only advertise while the finger is in. |
| `scanSeconds` | `60` | How long to look for a device. |
| `models` | all of the type | Only these models, for example `['bp7250']`. |
| `useConnectedDevices` | `true` | Use a catalog device already connected to the phone by another app. |
| `allowRepeatedReadings` | `false` | See the next paragraph. |

Blood pressure monitors and glucose meters send their **last stored reading again** on every connection. So the same values from the same device within 15 minutes of a saved reading end with the error `repeated_reading` instead of being saved twice. Set `allowRepeatedReadings: true` to turn this off.

You can also pass several types, for example `useMeasurement(['blood_pressure', 'oxygen_saturation'])`: the device found decides.

### Measurement error codes

Switch on `m.error.code` to show your own texts (the default messages are in English):

| Code | Meaning |
|---|---|
| `permission_denied`, `permission_blocked` | Bluetooth permission refused. Blocked means only Settings can change it. |
| `bluetooth_off`, `bluetooth_unavailable` | Bluetooth is off, or the phone has none. |
| `device_not_found` | No supported device advertised during the scan. |
| `connection_failed`, `disconnected` | The connection failed or dropped before a reading. |
| `no_reading` | Connected, but no reading came within 60 seconds. |
| `repeated_reading` | The device sent a reading that was already saved. |
| `device_not_paired`, `device_already_paired` | Pairing state of the monitor needs attention (see troubleshooting). |
| `save_failed`, `patient_disabled` | The API refused to save. `m.save()` retries after `save_failed`. |
| `not_configured` | `EmmiTec.configure` was not called, or the patient signed out. |

Device-specific codes also exist, such as `glucose_meter_no_records` and `oximeter_registration_refused`; each comes with its own default message.

## Manual readings

When the patient types a value, or uses a device that is not supported, send it with `EmmiTec.readings.create`. The input is the same as [`POST /readings`](/developers/readings#send-a-reading) without `patientId`; `measuredAt` defaults to now, `source` to `manual`, and an `externalId` is generated.

```ts title="Manual reading"
import { EmmiTec, EmmiTecApiError } from 'emmitec-rpm'

try {
  const result = await EmmiTec.readings.create({
    type: 'blood_pressure',
    values: { systolic: 182, diastolic: 110, pulse: 88 },
  })
  if (result.queued) {
    // no network: kept in the offline queue, sent later
  } else if (result.reading.alert) {
    showBanner(result.reading.alert.title, result.reading.alert.text)
  }
} catch (e) {
  if (e instanceof EmmiTecApiError) {
    // e.status, e.code ('validation_failed'...), e.message, e.param ('values.systolic'), e.requestId
  }
}
```

`readings.create` resolves `{ queued: false, reading }` when saved, or `{ queued: true, reading: null }` when the reading went to the offline queue. Validation errors reject with `EmmiTecApiError`.

Other calls on the same patient:

```ts title="Patient data"
await EmmiTec.readings.list({ type: 'glucose', limit: 10 }) // history, newest first
await EmmiTec.readings.get('2104455') // one reading, alert in the configured locale
await EmmiTec.thresholds() // the limits that apply to this patient
await EmmiTec.me() // the patient of the token
```

## Devices

```ts title="Supported devices"
import { DEVICES, EmmiTec } from 'emmitec-rpm'

DEVICES // the 21 models this SDK reads, with instructions (no request)
await EmmiTec.devices.list() // GET /devices, including manual and other
await EmmiTec.devices.paired() // devices with a pairing secret on this phone
await EmmiTec.devices.forget(peripheralId) // forget one device (or a model id like 'uam820bt')
```

The full list, with pairing notes, is on [Supported devices](/developers/devices).

## Offline queue

When saving fails because of the network, a timeout, or a `5xx` or `429` that persists after the SDK's own retries, the reading goes to a queue instead of being lost:

- the device time stays as `measuredAt`, so the history is right even if the upload happens hours later;
- each reading carries an `externalId` generated on the phone, so it is never saved twice;
- with AsyncStorage installed, the queue survives an app restart;
- readings are bound to the patient who measured them: on a shared phone they are never sent with another patient's token.

The queue is sent by itself on `configure`, when the app returns to the foreground and after the next saved reading. You can also send it now:

```ts title="Queue"
const { sent, rejected, remaining } = await EmmiTec.queue.flush()
await EmmiTec.queue.size() // readings waiting
```

## Events

`EmmiTec.on` returns a function that removes the listener:

```ts title="Listen to events"
const off = EmmiTec.on('alert', ({ alert, reading }) => {
  showBanner(alert.title, alert.text) // also fires for readings sent later from the queue
})

EmmiTec.on('reading', ({ reading, origin }) => {}) // origin: 'measurement', 'manual' or 'queue'
EmmiTec.on('queued', ({ input, reason, pending }) => {})
EmmiTec.on('error', ({ error, context }) => {}) // 'flush', 'token_refresh', 'queue_rejected', 'measurement'

off() // stop listening to alerts
```

## Simulate mode

With `simulate: true` there is no Bluetooth: simulated devices speak the real device protocols and produce realistic readings (normal by default), which are saved on the API like real ones. Use a test token (`emst_test_...`), so readings go to the sandbox.

```ts title="Simulated devices"
EmmiTec.configure({ sessionToken: 'emst_test_...', simulate: true })

// the next simulated reading has this level, or exactly these values
EmmiTec.simulator.next({ type: 'blood_pressure', level: 'critical_high' })
EmmiTec.simulator.next({ type: 'blood_pressure', values: { systolic: 185, diastolic: 112 } })

// show your error screens
EmmiTec.simulator.set({ bluetoothOff: true })
EmmiTec.simulator.set({ permission: 'blocked' })
EmmiTec.simulator.set({ deviceAbsent: true })
EmmiTec.simulator.set({ failNextConnection: true })
EmmiTec.simulator.reset()
```

## Diagnostics

From version 1.1.0 the SDK tells EmmiTec support what happened on the phone, so when a patient says "it does not connect" we can see where it stopped: permission, Bluetooth off, device not found, connection, reading or upload.

- **What is sent:** the step (`ble.scan_started`, `ble.device_found`, `ble.connect_failed`, `ble.reading_parsed`, `queue.stored_offline`...), the device model, an error code with its fixed message, how long it took, and a random id of the app installation (to count phones). Every request also carries `EmmiTec-Client: emmitec-rpm/1.1.0 (android 34; your app id and version)`.
- **Never sent:** names, measured values, tokens, or the technical log of the device conversation.
- **How:** small batches to `POST /diagnostics`, a few seconds after a failure or once a minute, with the patient session token. A failed send never reaches your app.
- **Turn it off:** `EmmiTec.configure({ ..., diagnostics: false })`.

Support also finds any call by the `requestId` your app received in an error, so include it when you write to us.

## Troubleshooting

**Nothing is found while scanning (`device_not_found`).**

- The device must be measuring or sending. An oximeter only transmits with a finger inside and turns off when the finger comes out: use `autoStart: true` on that screen. A blood pressure monitor sends at the end of the measurement.
- Start the measurement in the app first, then on the device, so the scan is running when the device sends.
- Keep the phone within 1 or 2 meters of the device. On Android 11 and older, Location must be on.

**The device works in another app but not in yours.** A device connected to the phone by another app does not advertise. The SDK uses catalog devices that are already connected (`useConnectedDevices`), but if the other app holds the connection, close it or disconnect the device in the phone's Bluetooth settings.

**Permission denied.** `permission_denied` can be asked again with `m.start()`. `permission_blocked` can only be changed in Settings: send the user there with `Linking.openSettings()`.

**Bluetooth is off.** Phase `bluetooth_off`. Ask the user to turn it on, then start the measurement again.

**`repeated_reading`.** The monitor or meter sent its last stored reading again. Ask for a new measurement, or use `allowRepeatedReadings: true` if your flow needs it.

**Omron monitors and Accu-Chek meters.** They pair once with the phone. On the first measurement the phone may ask to pair: accept it. If you get `device_not_paired`, put the monitor in pairing mode as its manual explains (on most Omron models, hold the Bluetooth button until a blinking `P` shows) and try again. Accu-Chek: do the glucose test first, then turn on Bluetooth on the meter, and the first time enter the PIN printed on the back of the meter. The Zewa UAM-820BT uses a pairing code that the SDK keeps on the phone.

**A device was replaced or reset.** Forget its pairing with `EmmiTec.devices.forget(m.peripheralId)` and pair again.

**It works in simulate mode but not on the phone.** Check that you are on a development build (not Expo Go), that the config plugin is in `app.json`, and that you rebuilt the app after adding it. Then send `m.log` to EmmiTec support.

::: next
- [Supported devices](/developers/devices) Models, types and pairing.
- [Alerts and notifications](/developers/alerts) Banner and push from `m.alert`.
:::
