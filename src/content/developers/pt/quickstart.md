---
title: Início rápido
description: Uns 10 minutos, em modo de teste. Crie um paciente, envie uma medição do jeito que o seu app vai enviar, depois receba e confira um webhook de alerta assinado.
---

Você precisa de uma chave secreta de teste (`emk_test_...`), de um terminal com `curl` e de uma URL que receba chamadas HTTPS. Para este guia, o [webhook.site](https://webhook.site) é o caminho mais rápido: ele dá um endereço HTTPS único e mostra cada chamada que chega. Tudo roda na sandbox, então nenhum profissional de saúde é avisado.

::: steps

## Pegue sua chave de teste

Copie a sua chave secreta de teste no [portal do cliente](/developers/customer-portal) (a EmmiTec cria a sua conta). Guarde em variáveis de ambiente, nunca no código.

```bash title="Terminal"
export EMMITEC_API="https://v2-prod-api-patients.emmitec.health/partner/v1"
export EMMITEC_KEY="emk_test_..."
```

Confira se a chave funciona:

```bash title="Ping"
curl "$EMMITEC_API/ping" \
  -H "Authorization: Bearer $EMMITEC_KEY"
```

```json title="Resposta 200"
{
  "ok": true,
  "mode": "test",
  "auth": "secret_key",
  "integration": { "id": "4b1e6d2a-9c3f-4e8b-a1d7-5f2c8e0b3a64", "name": "Acme Health" },
  "patientId": null,
  "serverTime": "2026-11-24T14:03:00Z",
  "apiVersion": "2026-11-24",
  "plan": {
    "name": "trial",
    "trialEndsAt": "2027-02-22T14:00:00Z",
    "daysLeft": 90,
    "module": "rpm"
  }
}
```

`"mode": "test"` confirma que você está na sandbox.

## Crie um paciente

Use o id do usuário no seu sistema como `externalId`. Se você mandar o mesmo `externalId` de novo, recebe o mesmo paciente com status 200 em vez de 201. Ou seja, pode repetir a chamada sem medo.

```bash tab="cURL"
curl -X POST "$EMMITEC_API/patients" \
  -H "Authorization: Bearer $EMMITEC_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "acme-user-123",
    "firstName": "Maria",
    "lastName": "Silva",
    "birthDate": "1956-03-14",
    "sex": "female",
    "phone": "+5541999998888",
    "language": "pt",
    "heightCm": 162
  }'
```

```js tab="Node.js"
const res = await fetch(`${process.env.EMMITEC_API}/patients`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.EMMITEC_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    externalId: 'acme-user-123',
    firstName: 'Maria',
    lastName: 'Silva',
    birthDate: '1956-03-14',
    sex: 'female',
    phone: '+5541999998888',
    language: 'pt',
    heightCm: 162,
  }),
})
const patient = await res.json()
console.log(res.status, patient.id) // 201, ou 200 se ele já existia
```

```python tab="Python"
import os
import requests

res = requests.post(
    f"{os.environ['EMMITEC_API']}/patients",
    headers={"Authorization": f"Bearer {os.environ['EMMITEC_KEY']}"},
    json={
        "externalId": "acme-user-123",
        "firstName": "Maria",
        "lastName": "Silva",
        "birthDate": "1956-03-14",
        "sex": "female",
        "phone": "+5541999998888",
        "language": "pt",
        "heightCm": 162,
    },
)
patient = res.json()
print(res.status_code, patient["id"])  # 201, ou 200 se ele já existia
```

```json title="Resposta 201"
{
  "id": "3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21",
  "externalId": "acme-user-123",
  "firstName": "Maria",
  "lastName": "Silva",
  "birthDate": "1956-03-14",
  "sex": "female",
  "email": null,
  "phone": "+5541999998888",
  "language": "pt",
  "heightCm": 162,
  "mode": "test",
  "createdAt": "2026-11-24T14:03:00Z"
}
```

```bash title="Terminal"
export PATIENT_ID="3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21"
```

## Gere um token de sessão

O seu backend cria um token de sessão só para este paciente e entrega ao app. O app nunca vê a sua chave secreta.

```bash title="Gerar um token de sessão"
curl -X POST "$EMMITEC_API/patients/$PATIENT_ID/session-tokens" \
  -H "Authorization: Bearer $EMMITEC_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "expiresInSeconds": 604800 }'
```

```json title="Resposta 201"
{
  "token": "emst_test_...",
  "patientId": "3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21",
  "expiresAt": "2026-12-01T14:03:00Z"
}
```

```bash title="Terminal"
export EMMITEC_SESSION="emst_test_..."
```

## Envie uma medição

Agora faça o papel do app. Envie uma pressão de 182/110 com o token de sessão. Com token de sessão, o `patientId` pode ficar de fora: o token já diz quem é o paciente. O `?locale=pt` pede os textos do alerta em português.

```bash title="Enviar uma medição (como o app)"
curl -X POST "$EMMITEC_API/readings?locale=pt" \
  -H "Authorization: Bearer $EMMITEC_SESSION" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "blood_pressure",
    "measuredAt": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
    "values": { "systolic": 182, "diastolic": 110, "pulse": 88 },
    "device": { "model": "td3140", "serial": "SN123", "mac": "AA:BB:CC:DD:EE:FF" },
    "source": "ble",
    "externalId": "acme-reading-9981"
  }'
```

A resposta já diz ao app o que aconteceu, com o texto pronto para mostrar:

```json title="Resposta 201"
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

::: note
O nível depende dos limites do paciente. Se um valor não tem limite configurado, o nível dele é `unknown` e o `alert` vem `null`. Veja os limites que valem com `GET /patients/{id}/thresholds`.
:::

## Aponte um webhook para a sua URL

Abra o [webhook.site](https://webhook.site) e copie a sua URL única. Depois, cadastre essa URL no modo de teste da integração:

```bash title="Configurar o webhook"
curl -X PUT "$EMMITEC_API/webhook" \
  -H "Authorization: Bearer $EMMITEC_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://webhook.site/seu-id-unico",
    "events": ["reading.alert"],
    "locale": "pt"
  }'
```

Na primeira configuração, a resposta traz o segredo de assinatura. A API mostra o segredo uma única vez (o portal do cliente consegue mostrar de novo):

```json title="Resposta 200"
{
  "url": "https://webhook.site/seu-id-unico",
  "events": ["reading.alert"],
  "locale": "pt",
  "active": true,
  "secretHint": "whsec_...a1b2",
  "createdAt": "2026-11-24T14:05:00Z",
  "updatedAt": "2026-11-24T14:05:00Z",
  "secret": "whsec_..."
}
```

```bash title="Terminal"
export EMMITEC_WEBHOOK_SECRET="whsec_..."
```

## Dispare um alerta

A sandbox consegue criar uma medição que passa dos limites do paciente e rodar o fluxo inteiro, webhook incluído:

```bash title="Simular um alerta"
curl -X POST "$EMMITEC_API/sandbox/simulate-alert" \
  -H "Authorization: Bearer $EMMITEC_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "patientId": "'"$PATIENT_ID"'", "type": "blood_pressure", "level": "critical_high" }'
```

A resposta é `201` com a medição nova. Alguns segundos depois, o webhook.site mostra um `POST` com estes cabeçalhos:

```http title="Chamada que chega na sua URL"
POST /seu-id-unico HTTP/1.1
Content-Type: application/json
User-Agent: EmmiTec-Webhooks/1.0
EmmiTec-Event-Id: evt_9b2c4f0e1a7d4c3b8e6f5a4d3c2b1a09
EmmiTec-Event-Type: reading.alert
EmmiTec-Signature: t=1795528982,v1=5b1f0c...
```

O corpo é o envelope do evento, com `data.patient`, `data.reading` e `data.alert`. Veja [o envelope completo](/developers/webhooks#o-envelope-do-evento).

## Verifique a assinatura

A assinatura prova que a chamada veio da EmmiTec e não foi alterada. No webhook.site, salve o corpo **cru** em `body.json` exatamente como chegou (não a versão formatada: um espaço a mais quebra a assinatura) e rode:

```js title="verify.mjs"
import crypto from 'node:crypto'
import fs from 'node:fs'

const secret = process.env.EMMITEC_WEBHOOK_SECRET // whsec_...
const header = process.argv[2] // o valor de EmmiTec-Signature: "t=...,v1=..."
const rawBody = fs.readFileSync('body.json') // os bytes exatos que chegaram

const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')))
const expected = crypto
  .createHmac('sha256', secret)
  .update(`${parts.t}.`)
  .update(rawBody)
  .digest('hex')

const ok =
  expected.length === parts.v1.length &&
  crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1))
console.log(ok ? 'Assinatura válida' : 'Assinatura NÃO confere')
```

```bash title="Terminal"
node verify.mjs "t=1795528982,v1=5b1f0c..."
```

:::

## Pronto

Você criou um paciente, enviou uma medição como o app, recebeu um alerta assinado e conferiu a assinatura. No seu produto, as mesmas peças ficam assim:

- **Seu backend** cria o paciente quando o usuário se cadastra e gera um token de sessão quando o app pede.
- **Seu app** usa o [SDK para Expo](/developers/sdk) para ler o aparelho e enviar a medição, e mostra o `alert.text` na hora.
- **Seu webhook** confere a assinatura, descarta eventos repetidos pelo `id` do evento e manda a notificação push.

::: next
- [Alertas e notificações](/developers/alerts) Como transformar o alerta em notificação push e em aviso no app.
- [Webhooks](/developers/webhooks) Assinatura em Express, Flask e FastAPI, novas tentativas e o registro de eventos.
- [SDK para Expo](/developers/sdk) Leia aparelhos Bluetooth no seu app React Native.
- [Testes e sandbox](/developers/testing) O checklist antes de trocar para as chaves de produção.
:::
