---
title: Medições
description: Cinco tipos de medição, um só formato. Cada medição fica gravada com o aparelho, é comparada com os limites do paciente e volta com um nível e, quando precisa, um alerta.
---

Normalmente quem envia as medições é o app, pelo [SDK para Expo](/developers/sdk), com um token de sessão. O seu backend também pode enviar com a chave secreta, por exemplo medições que vêm de outro sistema.

## Tipos e valores

| `type` | `values` | Opcional | Unidade nas respostas |
|---|---|---|---|
| `blood_pressure` | `systolic` inteiro de 40 a 300, `diastolic` inteiro de 20 a 200 (menor que a sistólica) | `pulse` inteiro de 20 a 250, `irregularHeartbeat` booleano | mmHg (pulso em bpm) |
| `oxygen_saturation` | `spo2` número de 50 a 100 | `pulse` inteiro de 20 a 250, `perfusionIndex` número de 0 a 30 | % |
| `temperature` | `temperature` número, de 30 a 45 C | `unit`: `C` (padrão) ou `F` | C |
| `glucose` | `glucose` número, de 10 a 700 mg/dL | `unit`: `mg/dL` (padrão) ou `mmol/L`, `context` | mg/dL |
| `weight` | `weight` número, de 2 a 400 kg | `unit`: `kg` (padrão) ou `lb` | kg, mais `bmi` quando o paciente tem `heightCm` |

A unidade que você manda é convertida e gravada na unidade padrão: mmol/L x 18,0182 para mg/dL, lb x 0,453592 para kg, F para C. O `unit` e o `context` vão ao lado de `values`, não dentro.

O `context` da glicose diz em que momento a medição foi feita: `fasting` (jejum), `before_meal` (antes da refeição), `after_meal` (depois da refeição), `bedtime` (ao deitar), `after_medication` (depois do remédio), `after_exercise` (depois do exercício), `casual` ou `generic` (padrão).

## Envie uma medição

`POST /readings`

```bash tab="cURL"
curl -X POST "$EMMITEC_API/readings" \
  -H "Authorization: Bearer $EMMITEC_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21",
    "type": "blood_pressure",
    "measuredAt": "2026-11-24T14:03:00Z",
    "values": { "systolic": 182, "diastolic": 110, "pulse": 88 },
    "device": { "model": "td3140", "serial": "SN123", "mac": "AA:BB:CC:DD:EE:FF" },
    "source": "ble",
    "externalId": "acme-reading-9981"
  }'
```

```js tab="Node.js"
const res = await fetch(`${process.env.EMMITEC_API}/readings`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.EMMITEC_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    patientId: '3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21',
    type: 'blood_pressure',
    measuredAt: '2026-11-24T14:03:00Z',
    values: { systolic: 182, diastolic: 110, pulse: 88 },
    device: { model: 'td3140', serial: 'SN123', mac: 'AA:BB:CC:DD:EE:FF' },
    source: 'ble',
    externalId: 'acme-reading-9981',
  }),
})
const medicao = await res.json() // 201 criada, 200 se era repetida
if (medicao.alert) console.log(medicao.alert.title, medicao.alert.text)
```

```python tab="Python"
res = requests.post(
    f"{EMMITEC_API}/readings",
    headers={"Authorization": f"Bearer {EMMITEC_KEY}"},
    json={
        "patientId": "3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21",
        "type": "blood_pressure",
        "measuredAt": "2026-11-24T14:03:00Z",
        "values": {"systolic": 182, "diastolic": 110, "pulse": 88},
        "device": {"model": "td3140", "serial": "SN123", "mac": "AA:BB:CC:DD:EE:FF"},
        "source": "ble",
        "externalId": "acme-reading-9981",
    },
)
medicao = res.json()  # 201 criada, 200 se era repetida
if medicao["alert"]:
    print(medicao["alert"]["title"], medicao["alert"]["text"])
```

```ts tab="TypeScript SDK"
import { EmmiTec } from '@emmitec/rpm'

// No app, com o token de sessão já configurado.
// measuredAt vira "agora", source vira 'manual' e o externalId é gerado.
const { queued, reading } = await EmmiTec.readings.create({
  type: 'blood_pressure',
  values: { systolic: 182, diastolic: 110, pulse: 88 },
})
if (!queued && reading.alert) console.log(reading.alert.title, reading.alert.text)
```

Mais exemplos de `values`:

```json title="Saturação de oxigênio: SpO2 88%"
{ "type": "oxygen_saturation", "measuredAt": "2026-11-24T14:10:00Z",
  "values": { "spo2": 88, "pulse": 104, "perfusionIndex": 2.4 },
  "device": { "model": "td8255" }, "source": "ble" }
```

```json title="Glicose: 250 mg/dL depois da refeição"
{ "type": "glucose", "measuredAt": "2026-11-24T13:30:00Z",
  "values": { "glucose": 250 }, "unit": "mg/dL", "context": "after_meal",
  "device": { "model": "accuchek" }, "source": "ble" }
```

```json title="Temperatura em Fahrenheit"
{ "type": "temperature", "measuredAt": "2026-11-24T08:00:00Z",
  "values": { "temperature": 101.3 }, "unit": "F",
  "device": { "model": "td1242" }, "source": "ble" }
```

```json title="Peso digitado pelo paciente, em libras"
{ "type": "weight", "measuredAt": "2026-11-24T07:45:00Z",
  "values": { "weight": 165.4 }, "unit": "lb", "source": "manual" }
```

### Campos de entrada

| Campo | Obrigatório | Descrição |
|---|---|---|
| `patientId` | Com chave secreta | Com token de sessão pode ficar de fora. Se vier, precisa ser o paciente do token. |
| `type` | Sim | Um dos cinco tipos. |
| `measuredAt` | Sim | Quando o aparelho fez a medição, ISO 8601 em UTC. No máximo 10 minutos no futuro e no máximo 365 dias atrás. |
| `values` | Sim | Veja a tabela acima. |
| `unit` | Não | Unidade de entrada para temperatura, glicose e peso. |
| `context` | Não | Só para glicose. |
| `device.model` | Não | Um id de `GET /devices` (`td3140`, `bp7250`, ...), `manual` para valor digitado por uma pessoa ou `other` para aparelho fora do catálogo. Padrão: `manual` quando `source` é `manual`, senão `other`. |
| `device.serial`, `device.mac` | Não | Número de série e endereço Bluetooth, quando você tiver. |
| `source` | Não | `ble`, `manual` ou `integration`. Padrão `integration`. |
| `externalId` | Não | O seu id para esta medição. Deixa as novas tentativas seguras. |

## Repetições e novas tentativas

A rede falha e o celular tenta de novo. A EmmiTec grava cada medição uma vez só:

- **Com `externalId`** (recomendado): mandar o mesmo `externalId` de novo devolve `200` com a medição original e `"duplicate": true`. O `externalId` é único por integração e modo.
- **Sem `externalId`**: uma medição com o mesmo paciente, tipo, `measuredAt` e valores também conta como repetida (`200`, `"duplicate": true`).

A fila offline do SDK se apoia nisso: ela gera o `externalId` no celular antes da primeira tentativa.

## O objeto Reading

```json title="Reading"
{
  "id": "2104455",
  "patientId": "3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21",
  "type": "blood_pressure",
  "measuredAt": "2026-11-24T14:03:00Z",
  "receivedAt": "2026-11-24T14:03:02Z",
  "values": { "systolic": 182, "diastolic": 110, "pulse": 88 },
  "unit": "mmHg",
  "device": { "model": "td3140", "name": "TaiDoc TD-3140", "serial": "SN123", "mac": "AA:BB:CC:DD:EE:FF" },
  "source": "ble",
  "externalId": "acme-reading-9981",
  "level": "critical_high",
  "levels": { "systolic": "critical_high", "diastolic": "attention_high", "pulse": "normal" },
  "alert": {
    "level": "critical_high",
    "title": "Pressão arterial muito alta",
    "text": "Sua pressão arterial ficou em 182/110 mmHg, acima da sua faixa segura. Se você não estiver se sentindo bem, procure sua equipe de cuidado ou o serviço de emergência.",
    "reason": "Sistólica 182 mmHg está igual ou acima do limite crítico de 180 mmHg. Diastólica 110 mmHg está igual ou acima do limite de atenção de 90 mmHg.",
    "locale": "pt",
    "triggeredBy": [
      { "value": "systolic", "measured": 182, "unit": "mmHg", "level": "critical_high", "limit": 180 },
      { "value": "diastolic", "measured": 110, "unit": "mmHg", "level": "attention_high", "limit": 90 }
    ]
  },
  "duplicate": false,
  "mode": "test"
}
```

O `id` da medição é uma string de dígitos. O `receivedAt` é quando a EmmiTec recebeu. Alguns campos dependem do tipo: a glicose também devolve `context` (por exemplo `"fasting"`) quando ele é conhecido, os `values` da pressão trazem `irregularHeartbeat` quando você mandou, e os `values` do peso trazem `bmi` quando o paciente tem `heightCm`. O objeto `alert` está explicado em [Alertas e notificações](/developers/alerts).

## Níveis

Cada valor avaliado ganha um nível em `levels`, e o `level` é o mais grave deles.

| Nível | Significado |
|---|---|
| `critical_high` / `critical_low` | No limite crítico ou além dele. |
| `attention_high` / `attention_low` | No limite de atenção ou além dele. |
| `normal` | Dentro dos limites. |
| `unknown` | Não há limite configurado para esse valor. |

Ordem de gravidade: crítico, depois atenção, depois normal, depois desconhecido. Entre alto e baixo, o nível geral fica com o lado do valor mais grave. Só existe `alert` quando o `level` é de atenção ou crítico.

Valores comparados com limites:

| `type` | Valores avaliados |
|---|---|
| `blood_pressure` | `systolic`, `diastolic`, e `pulse` quando o cliente tem limites de pulso (a sandbox tem) |
| `oxygen_saturation` | `spo2`, `pulse` |
| `temperature` | `temperature` |
| `glucose` | `glucose` |
| `weight` | Nenhum: as medições de peso ficam gravadas com `level: "unknown"` e `alert: null` |

## Limites

`GET /patients/{id}/thresholds`

Os limites que valem para o paciente. A equipe de cuidado, ou você com o `PUT /patients/{id}/thresholds`, pode definir limites por paciente (`source: "patient"`); sem isso, valem os padrões do cliente (`source: "default"`). Limite que não existe vem `null`. Os padrões da sandbox estão em [Testes e sandbox](/developers/testing#limites-da-sandbox), e como mudar os limites está em [Configurar alertas e limites](/developers/alert-settings).

```json title="Resposta 200"
{
  "data": [
    {
      "type": "blood_pressure",
      "value": "systolic",
      "unit": "mmHg",
      "criticalHigh": 180,
      "attentionHigh": 140,
      "attentionLow": 90,
      "criticalLow": 80,
      "source": "default"
    },
    {
      "type": "blood_pressure",
      "value": "diastolic",
      "unit": "mmHg",
      "criticalHigh": 120,
      "attentionHigh": 90,
      "attentionLow": 60,
      "criticalLow": 50,
      "source": "default"
    }
  ]
}
```

## Envie várias medições de uma vez

`POST /readings/batch`

Até 100 medições por chamada. Use para descarregar a memória de um aparelho ou o que ficou acumulado sem internet. Os itens são independentes: um item inválido não trava os outros. O `patientId` no topo vale para os itens (com token de sessão pode ficar de fora).

```json title="Requisição"
{
  "patientId": "3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21",
  "readings": [
    { "type": "blood_pressure", "measuredAt": "2026-11-24T07:58:00Z",
      "values": { "systolic": 128, "diastolic": 82 }, "externalId": "acme-reading-9979" },
    { "type": "blood_pressure", "measuredAt": "2026-11-24T08:01:00Z",
      "values": { "systolic": 182, "diastolic": 110 }, "externalId": "acme-reading-9980" },
    { "type": "blood_pressure", "measuredAt": "2026-11-24T08:05:00Z",
      "values": { "systolic": 30, "diastolic": 20 }, "externalId": "acme-reading-9981" }
  ]
}
```

```json title="Resposta 200"
{
  "data": [
    { "index": 0, "status": "created", "reading": { "id": "2104453", "level": "normal", "...": "..." }, "error": null },
    { "index": 1, "status": "duplicate", "reading": { "id": "2104454", "duplicate": true, "...": "..." }, "error": null },
    { "index": 2, "status": "error", "reading": null,
      "error": { "type": "invalid_request_error", "code": "validation_failed",
        "message": "values.systolic must be an integer between 40 and 300.",
        "param": "values.systolic", "requestId": "req_01JDJ3K8Q5R4T6V8X0Z2B4D6F8" } }
  ]
}
```

## Consulte medições

`GET /readings/{id}`

Uma medição, com o `alert` escrito no idioma que você pedir: `?locale=pt` ou o cabeçalho `Accept-Language` (`en`, `pt`, `es`).

`GET /patients/{id}/readings`

O histórico do paciente, do mais novo para o mais antigo, com o `alert`.

| Parâmetro | Descrição |
|---|---|
| `type` | Só um tipo, por exemplo `blood_pressure`. |
| `from`, `to` | Janela de tempo, ISO 8601 em UTC. |
| `limit`, `cursor` | Paginação: de 1 a 100, padrão 25. Siga o `nextCursor`. |

## Erros que podem aparecer

| Status | `code` | Por quê |
|---|---|---|
| 400 | `validation_failed` | Um valor está fora da faixa ou falta um campo obrigatório. O `param` aponta qual, por exemplo `values.systolic`. |
| 400 | `unsupported_type` | O `type` não é um dos cinco tipos. |
| 400 | `unknown_device` | O `device.model` não está no catálogo e não é `manual` nem `other`. |
| 404 | `not_found` | Paciente ou medição desconhecidos para a sua integração, neste modo. |
| 422 | `patient_disabled` | O paciente está desativado para medições. |

::: next
- [Alertas e notificações](/developers/alerts) O que fazer com o `alert`.
- [Aparelhos compatíveis](/developers/devices) Os ids de `device.model`.
:::
