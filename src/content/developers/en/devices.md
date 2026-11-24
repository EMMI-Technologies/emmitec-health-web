---
title: Supported devices
description: 21 Bluetooth devices in five measurement types. Use the model id in device.model, or manual and other for readings that do not come from the catalog.
---

`GET /devices`

The catalog is available to any token, secret key or session token. The SDK reads every device below with `useMeasurement`, and ships the same list as `DEVICES`, where each device also has `instructions`: a short text that tells the patient how to start a measurement.

```json title="Response 200 (one item)"
{
  "data": [
    {
      "model": "td3140",
      "name": "TaiDoc TD-3140",
      "manufacturer": "TaiDoc Technology Corp.",
      "type": "blood_pressure",
      "connection": "ble",
      "pairing": false,
      "sdk": true
    }
  ]
}
```

`pairing: true` means the device must be paired with the phone once before the first measurement.

## Blood pressure

| Device | `model` | Pairing |
|---|---|---|
| TaiDoc TD-3140 | `td3140` | No |
| TaiDoc TD-3128 | `td3128` | No |
| Omron HEM-7156T | `hem7156t` | Yes, once |
| Omron BP7000 | `bp7000` | Yes, once |
| Omron BP7250 | `bp7250` | Yes, once |
| Omron BP7350 | `bp7350` | Yes, once |
| Omron BP7450 | `bp7450` | Yes, once |
| A&D UA-651BLE | `ua651` | No |
| Health&Life BT-BPM | `btbpm` | No |
| Zewa UAM-820BT | `uam820bt` | Yes, with a pairing code |

The monitor sends the result when the measurement ends. Start the scan, then press start on the monitor.

## Oxygen saturation

| Device | `model` | Pairing |
|---|---|---|
| TaiDoc TD-8255 | `td8255` | No |
| A&D UP-200BLE | `up200ble` | No |
| AOJ-70B | `aoj70b` | No |
| Mio YM402 | `ym402` | No |
| Zewa 21600 | `zw21600` | No |

Oximeters only transmit while a finger is inside and turn off a few seconds after it comes out. Keep the finger in until the app shows the result.

## Temperature

| Device | `model` | Pairing |
|---|---|---|
| TaiDoc TD-1242 | `td1242` | No |
| AOJ-20F | `aoj20f` | No |
| Zewa 11115 | `zw11115` | No |

## Glucose

| Device | `model` | Pairing |
|---|---|---|
| Accu-Chek Guide / Guide Me | `accuchek` | Yes, once |
| G-Tech Lite Smart | `gtech` | No |

Accu-Chek meters pair once with the phone: do the glucose test first, then turn on Bluetooth on the meter, and the first time enter the PIN printed on the back of the meter. Glucose meters send their last stored reading on every connection; the SDK refuses the same values from the same meter within 15 minutes (`repeated_reading`). Send `context` with glucose readings (for example `fasting` or `after_meal`): it helps the care team read the value.

## Weight

| Device | `model` | Pairing |
|---|---|---|
| Multilaser HC059 | `hc059` | No connection |

The HC059 only advertises its result: there is no connection or pairing. Step on the scale while the app is scanning. When the patient has `heightCm`, weight readings also return `bmi`. Weight is not evaluated against limits: `level` is `unknown` and there is no alert.

## Readings without a catalog device

| `model` | When to use | `connection` |
|---|---|---|
| `manual` | The value was typed by a person. Default when `source` is `manual`. | `manual` |
| `other` | A device that is not in the catalog. Default for other sources. | `other` (`sdk: false`) |

Sending a `device.model` that is not in the catalog, nor `manual` or `other`, answers `400 unknown_device`.

::: tip Need another device?
Tell us which model your patients use at [contato@emmitec.health](mailto:contato@emmitec.health). Until it is in the catalog, send its readings with `model: "other"` from your own Bluetooth code.
:::

::: next
- [Expo SDK](/developers/sdk) Measure with `useMeasurement` and troubleshoot connections.
- [Readings](/developers/readings) Types, values and ranges.
:::
