---
title: Configurar alertas e limites
description: Decida se a sua integração usa alertas, defina os limites de cada paciente, mude os padrões do seu cliente em produção e desligue os alertas de um paciente.
---

Uma medição vira alerta quando um dos valores passa de um limite do paciente. Você controla quatro coisas, todas pelo seu backend, com a chave secreta:

| Endpoint | O que controla | Vale para |
|---|---|---|
| `PUT /settings` | Se você usa alertas ou não | A sua integração, no modo da chave |
| `PUT /patients/{id}/thresholds` | Os limites de um paciente | Um paciente, um tipo de medição |
| `PUT /thresholds` | Os limites padrão | Todo paciente do seu cliente em produção sem limites próprios |
| `PUT /patients/{id}/alerts` | Os alertas de um paciente | Um paciente, um tipo de medição |

Um token de sessão não chama estes endpoints (`403 forbidden`). O app continua podendo ler os limites do próprio paciente com `GET /patients/{id}/thresholds`.

## Decida se vai usar alertas

`GET /settings`

Cada modo tem a sua configuração, então dá para experimentar os alertas no teste antes de ligar na produção. Os alertas vêm ligados.

```json title="Resposta 200"
{ "mode": "test", "alertsEnabled": true }
```

`PUT /settings`

Desligue os alertas quando você só quer guardar as medições, ou quando o seu app decide sozinho o que dizer ao paciente a partir do `level`.

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

```json title="Resposta 200"
{ "mode": "test", "alertsEnabled": false }
```

### O que muda com os alertas desligados

| | Alertas ligados (padrão) | Alertas desligados |
|---|---|---|
| A medição é guardada com `level` e `levels` | Sim | Sim |
| `alert` nas respostas da API e no SDK (`m.alert`) | O objeto Alert, nos níveis de atenção e críticos | Sempre `null` |
| Webhook `reading.alert` | Enviado | Não é enviado |
| Webhook `reading.created`, se você assinou | Enviado, com o alerta | Enviado, com `alert: null` |
| Em produção, a medição chega à equipe de cuidado | Sim | Sim |

A configuração muda só o que a EmmiTec manda para você. Os seus limites continuam como estão. Religar os alertas não manda webhooks das medições que chegaram enquanto eles estavam desligados. O mesmo controle existe no [portal do cliente](/developers/customer-portal), em "Alertas e webhook".

## Como os limites funcionam

Cada valor avaliado tem quatro limites. O valor é comparado de cima para baixo:

| Limite | O valor está | Nível |
|---|---|---|
| `criticalHigh` | igual ou acima dele | `critical_high` |
| `attentionHigh` | igual ou acima dele | `attention_high` |
| `criticalLow` | igual ou abaixo dele | `critical_low` |
| `attentionLow` | igual ou abaixo dele | `attention_low` |
| nenhum dos anteriores | entre os limites de atenção | `normal` |

Ao gravar limites, eles precisam estar em ordem: `criticalLow <= attentionLow <= attentionHigh <= criticalHigh`.

Os limites que valem para um paciente são os dele (`source: "patient"`) ou, quando ele não tem limites próprios daquele tipo, o padrão do cliente (`source: "default"`). Os limites próprios do paciente são os mesmos que a equipe de cuidado vê e edita no portal da EmmiTec: se ela muda, você vê no `GET /patients/{id}/thresholds`, e se você muda, ela vê.

| `type` | Valores com limite | Unidade dos limites |
|---|---|---|
| `blood_pressure` | `systolic`, `diastolic`, `pulse` | mmHg, pulso em bpm |
| `oxygen_saturation` | `spo2`, `pulse` | %, pulso em bpm |
| `temperature` | `temperature` | C, mesmo quando o aparelho manda F |
| `glucose` | `glucose` | mg/dL, mesmo quando o aparelho manda mmol/L |
| `weight` | Nenhum | O peso não é avaliado (`400 validation_failed`) |

## Defina os limites de um paciente

`PUT /patients/{id}/thresholds`

- Um `type` por chamada.
- Em `limits`, mande os valores que você quer mudar. Cada um precisa dos **quatro limites**, como números de 0 a 1000 (até 2 casas decimais), em ordem. `null` não é aceito na gravação.
- Os valores que você não manda continuam com os limites que valem hoje. Se um deles não tem limite para manter (por exemplo `pulse` num cliente sem limites de pulso), a API responde `400` com `param` `limits.pulse`: mande esse valor também.
- A próxima medição do paciente já usa os limites novos.
- Depois da chamada, todos os valores daquele tipo ficam com `source: "patient"`. Mudanças posteriores nos padrões do cliente não chegam mais a este paciente, naquele tipo.

Esta chamada define a sistólica e a diastólica de um paciente hipertenso e deixa o pulso como está:

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
async function definirLimites(patientId, type, limits) {
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
  return body.data // todos os valores do tipo, com source "patient"
}

await definirLimites('3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21', 'blood_pressure', {
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


def definir_limites(patient_id, tipo, limites):
    res = requests.put(
        f"{os.environ['EMMITEC_API']}/patients/{patient_id}/thresholds",
        headers={"Authorization": f"Bearer {os.environ['EMMITEC_KEY']}"},
        json={"type": tipo, "limits": limites},
    )
    if not res.ok:
        erro = res.json()["error"]
        raise RuntimeError(f"{erro['code']}: {erro['message']}")
    return res.json()["data"]  # todos os valores do tipo, com source "patient"


definir_limites("3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21", "blood_pressure", {
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

A resposta lista todos os valores do tipo com os limites que valem agora. O pulso não foi enviado, então manteve os limites que tinha (os padrões da sandbox, neste exemplo):

```json title="Resposta 200"
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

### Um corpo para cada tipo

```json title="Pressão arterial: sistólica, diastólica e pulso"
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

```json title="Saturação de oxigênio: SpO2 e pulso"
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

A SpO2 nunca passa de 100%, então limites altos de 101 querem dizer "sem alerta de alta". Com estes valores, 89% ou menos dá `attention_low` e 85% ou menos dá `critical_low`.

```json title="Temperatura, em C"
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

```json title="Glicose, em mg/dL"
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

Os limites de temperatura são sempre em C (38,0 C são 100,4 F) e os de glicose em mg/dL (70 mg/dL são 3,9 mmol/L), qualquer que seja a unidade que o aparelho manda.

## Limites padrão do seu cliente em produção

`GET /thresholds`

Os padrões do cliente da chave. Com a chave de teste você recebe os padrões da sandbox (a tabela de [Testes e sandbox](/developers/testing#limites-da-sandbox)); com a chave de produção, os padrões do seu cliente em produção. Valores sem limite padrão ficam de fora, e os limites que faltam vêm `null`.

```json title="Resposta 200 (chave de teste, primeiras linhas)"
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

Só com a chave de produção. O corpo e as regras são os mesmos de um paciente: um `type`, e os valores a mudar com os quatro limites. Os valores que você não manda continuam com o padrão de hoje.

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
const { data } = await res.json() // os padrões de glicose, com source "default"
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
print(res.json()["data"])  # os padrões de glicose, com source "default"
```

::: warning O padrão vale para todos os pacientes do cliente
Os padrões novos valem para todo paciente do seu cliente em produção que não tem limites próprios daquele tipo, inclusive os pacientes que a equipe de cuidado cadastrou no portal da EmmiTec. Combine os valores com a equipe de cuidado antes de mudar.
:::

Com a chave de teste, o `PUT /thresholds` responde `403`. Os padrões da sandbox são compartilhados por todos os parceiros, então ninguém muda; no teste, defina os limites por paciente.

```json title="403 Forbidden (chave de teste)"
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

Se o seu cliente em produção ainda não tem limite padrão daquele tipo, a API responde `409 conflict`: peça à EmmiTec para configurar.

## Desligue os alertas de um paciente

`PUT /patients/{id}/alerts`

| Campo | Obrigatório | Descrição |
|---|---|---|
| `type` | Sim | `blood_pressure`, `oxygen_saturation`, `temperature` ou `glucose`. |
| `enabled` | Sim | `false` desliga os alertas deste paciente neste tipo. `true` religa. |

Enquanto estiver desligado, as medições daquele paciente e tipo continuam guardadas e recebem um `level`, mas o `alert` vem `null` e nenhum `reading.alert` é enviado. Outros tipos e outros pacientes não mudam. É o mesmo controle que a equipe de cuidado tem no portal da EmmiTec.

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
const resultado = await res.json() // { type: 'blood_pressure', enabled: false }
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

```json title="Resposta 200"
{ "type": "blood_pressure", "enabled": false }
```

No modo de teste, o `POST /sandbox/simulate-alert` religa os alertas do tipo simulado para aquele paciente.

## Erros

| Status | `code` | Quando |
|---|---|---|
| 400 | `validation_failed` | Falta um limite ou ele não é um número de 0 a 1000, os quatro limites estão fora de ordem, um valor não pertence ao tipo, o `type` é `weight`, ou `alertsEnabled` / `enabled` não é `true` nem `false`. O `param` diz onde, por exemplo `limits.systolic`. |
| 400 | `unsupported_type` | `PUT /patients/{id}/alerts` com um `type` desconhecido. |
| 403 | `forbidden` | Um token de sessão chamou um destes endpoints, ou uma chave de teste chamou `PUT /thresholds`. |
| 404 | `not_found` | O paciente não está na sua integração, neste modo. |
| 409 | `conflict` | `PUT /thresholds`: o seu cliente em produção ainda não tem limite padrão deste tipo. |

::: next
- [Alertas e notificações](/developers/alerts) Transforme o alerta em notificação push.
- [Testes e sandbox](/developers/testing) Simule cada nível com os limites novos.
- [Referência da API](/developers/api-reference) Todos os campos destes endpoints, com "Test request".
:::
