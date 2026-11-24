---
title: Aparelhos compatíveis
description: 21 aparelhos Bluetooth em cinco tipos de medição. Use o id do modelo em device.model, ou manual e other para medições que não vêm do catálogo.
---

`GET /devices`

O catálogo responde a qualquer token, chave secreta ou token de sessão. O SDK lê todos os aparelhos abaixo com o `useMeasurement` e traz a mesma lista em `DEVICES`, onde cada aparelho também tem `instructions`: um texto curto que explica ao paciente como começar a medição.

```json title="Resposta 200 (um item)"
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

`pairing: true` quer dizer que o aparelho precisa ser pareado com o celular uma vez, antes da primeira medição.

## Pressão arterial

| Aparelho | `model` | Pareamento |
|---|---|---|
| TaiDoc TD-3140 | `td3140` | Não |
| TaiDoc TD-3128 | `td3128` | Não |
| Omron HEM-7156T | `hem7156t` | Sim, uma vez |
| Omron BP7000 | `bp7000` | Sim, uma vez |
| Omron BP7250 | `bp7250` | Sim, uma vez |
| Omron BP7350 | `bp7350` | Sim, uma vez |
| Omron BP7450 | `bp7450` | Sim, uma vez |
| A&D UA-651BLE | `ua651` | Não |
| Health&Life BT-BPM | `btbpm` | Não |
| Zewa UAM-820BT | `uam820bt` | Sim, com código de pareamento |

O medidor transmite o resultado quando a medição termina. Comece a busca e depois aperte o início no medidor.

## Saturação de oxigênio

| Aparelho | `model` | Pareamento |
|---|---|---|
| TaiDoc TD-8255 | `td8255` | Não |
| A&D UP-200BLE | `up200ble` | Não |
| AOJ-70B | `aoj70b` | Não |
| Mio YM402 | `ym402` | Não |
| Zewa 21600 | `zw21600` | Não |

O oxímetro só transmite enquanto o dedo está dentro e desliga alguns segundos depois que o dedo sai. Mantenha o dedo até o app mostrar o resultado.

## Temperatura

| Aparelho | `model` | Pareamento |
|---|---|---|
| TaiDoc TD-1242 | `td1242` | Não |
| AOJ-20F | `aoj20f` | Não |
| Zewa 11115 | `zw11115` | Não |

## Glicose

| Aparelho | `model` | Pareamento |
|---|---|---|
| Accu-Chek Guide / Guide Me | `accuchek` | Sim, uma vez |
| G-Tech Lite Smart | `gtech` | Não |

O Accu-Chek pareia uma vez com o celular: faça o teste de glicose primeiro, depois ligue o Bluetooth do aparelho e, na primeira vez, digite o PIN impresso no verso dele. Os glicosímetros mandam a última medição guardada a cada conexão; o SDK recusa os mesmos valores do mesmo aparelho dentro de 15 minutos (`repeated_reading`). Mande o `context` nas medições de glicose (por exemplo `fasting` ou `after_meal`): ele ajuda a equipe de cuidado a interpretar o valor.

## Peso

| Aparelho | `model` | Pareamento |
|---|---|---|
| Multilaser HC059 | `hc059` | Sem conexão |

A HC059 só anuncia o resultado: não há conexão nem pareamento. O paciente sobe na balança com o app procurando. Quando o paciente tem `heightCm`, a medição de peso também traz o `bmi`. O peso não é comparado com limites: o `level` vem `unknown` e não há alerta.

## Medições sem aparelho do catálogo

| `model` | Quando usar | `connection` |
|---|---|---|
| `manual` | O valor foi digitado por uma pessoa. Padrão quando o `source` é `manual`. | `manual` |
| `other` | Um aparelho que não está no catálogo. Padrão para as outras origens. | `other` (`sdk: false`) |

Mandar um `device.model` que não está no catálogo e não é `manual` nem `other` responde `400 unknown_device`.

::: tip Precisa de outro aparelho?
Conte qual modelo os seus pacientes usam em [contato@emmitec.health](mailto:contato@emmitec.health). Enquanto ele não entra no catálogo, mande as medições com `model: "other"` a partir do seu próprio código de Bluetooth.
:::

::: next
- [SDK para Expo](/developers/sdk) Meça com o `useMeasurement` e resolva problemas de conexão.
- [Medições](/developers/readings) Tipos, valores e faixas.
:::
