---
title: Testes e sandbox
description: As chaves de teste usam uma sandbox isolada, com a mesma API e o mesmo fluxo da produção. Simule alertas, teste o seu webhook e passe pelo checklist antes de trocar as chaves.
---

## Modo de teste

As chaves de teste (`emk_test_...`) e os tokens de sessão que elas geram (`emst_test_...`) funcionam na mesma URL base das chaves de produção. A diferença está nos dados:

- Tudo vai para um cliente isolado, a "EmmiTec Sandbox". Nenhum profissional de saúde é avisado.
- É grátis. Crie e apague o quanto quiser.
- Os seus pacientes, medições, webhook e eventos de teste são só seus. Outros parceiros nunca veem, e a sua chave de produção também não.
- As respostas trazem `X-EmmiTec-Mode: test`, e os objetos têm `"mode": "test"`.

Os pacientes de teste não passam para a produção. Na virada, o seu backend cria os pacientes de novo com a chave de produção (os mesmos `externalId` servem).

## Piloto e plano

Parceiros novos começam com um piloto de 90 dias. O `GET /ping` diz o plano da sua integração, com qualquer chave ou token:

```json title="GET /ping, resposta 200"
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

O `plan.name` é `trial` durante o piloto, `active` num plano contratado (aí o `trialEndsAt` e o `daysLeft` vêm `null`) ou `suspended`. Uma integração suspensa recebe `403 forbidden` em toda chamada. As chamadas não são bloqueadas sozinhas quando o piloto termina: a EmmiTec conversa com você sobre o próximo passo. O [portal do cliente](/developers/customer-portal) mostra o mesmo plano.

## Limites da sandbox

Todo paciente da sandbox começa com estes limites padrão. Eles são compartilhados por todos os parceiros, então não mudam (o `PUT /thresholds` responde `403` com a chave de teste), mas você pode definir os limites de qualquer paciente de teste seu com `PUT /patients/{id}/thresholds`. Em produção, o paciente usa os limites próprios, definidos pela equipe de cuidado ou por você, e, sem eles, os padrões do seu cliente; confira com `GET /patients/{id}/thresholds`. Veja [Configurar alertas e limites](/developers/alert-settings).

| Valor | Crítico baixo | Atenção baixo | Atenção alto | Crítico alto |
|---|---|---|---|---|
| Sistólica (mmHg) | 80 | 90 | 140 | 180 |
| Diastólica (mmHg) | 50 | 60 | 90 | 120 |
| Pulso (bpm), nas medições de pressão e de oxigenação | 40 | 50 | 100 | 130 |
| SpO2 (%) | 90 | 94 | sem limite | sem limite |
| Temperatura (C) | 35,0 | 35,5 | 37,8 | 39,0 |
| Glicose (mg/dL) | 54 | 70 | 180 | 250 |
| Peso | sem limite | sem limite | sem limite | sem limite |

Ou seja, na sandbox 182/110 mmHg dá `critical_high` (sistólica igual ou acima de 180) com a diastólica em `attention_high` (igual ou acima de 90), SpO2 88% dá `critical_low` e glicose 250 mg/dL dá `critical_high`. As medições de peso sempre voltam com `level: "unknown"` e sem alerta.

## Simule um alerta

`POST /sandbox/simulate-alert`

Cria uma medição real na sandbox com valores que produzem o nível pedido, usando os limites daquele paciente, e roda o fluxo inteiro: nível, textos do alerta e webhook. A resposta é `201` com a Reading. A medição vem com `device.model: "other"` e um `externalId` que começa com `sim_`, para você distinguir as simuladas. Simular também liga os alertas daquele tipo para o paciente.

| Campo | Obrigatório | Descrição |
|---|---|---|
| `patientId` | Sim | Um paciente de teste. |
| `type` | Não | `blood_pressure` (padrão), `oxygen_saturation`, `temperature` ou `glucose`. O `weight` não é avaliado e responde `400 unsupported_type`. |
| `level` | Não | `critical_high` (padrão), `attention_high`, `attention_low`, `critical_low` ou `normal`. A `oxygen_saturation` não tem limites altos, então só aceita `attention_low`, `critical_low` e `normal`. |

```bash title="Simular uma glicose alta"
curl -X POST "$EMMITEC_API/sandbox/simulate-alert" \
  -H "Authorization: Bearer $EMMITEC_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "patientId": "3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21", "type": "glucose", "level": "attention_high" }'
```

Use `"level": "normal"` para conferir que uma medição normal **não** avisa ninguém. Com chave de produção, este endpoint responde `403 forbidden`. Se você desligou os alertas com `PUT /settings`, a medição simulada continua com o nível, mas sem alerta e sem `reading.alert`.

## Teste o seu webhook

- O `POST /webhook/test` manda um `ping` agora e devolve o status e o tempo que o seu endpoint levou. Use logo depois de publicar.
- O `GET /events` lista o que a EmmiTec enviou e como foi cada entrega. O `POST /events/{id}/resend` manda de novo depois de uma correção.
- O seu endpoint precisa ser HTTPS público. No desenvolvimento local, exponha com um túnel (ngrok, Cloudflare Tunnel) ou inspecione as chamadas no webhook.site.

## Teste o app sem aparelho

O `EmmiTec.configure({ ..., simulate: true })` troca o Bluetooth por aparelhos simulados que produzem medições realistas. Elas passam pela API como as de verdade, então use um token de sessão de teste. O `EmmiTec.simulator.next({ type: 'blood_pressure', level: 'critical_high' })` escolhe o nível da próxima medição, e o `EmmiTec.simulator.set({ bluetoothOff: true })` (ou `permission`, `deviceAbsent`, `failNextConnection`) mostra as suas telas de erro. Serve para montar telas, para demonstrações e para CI. Antes de ir para produção, teste também cada tipo de aparelho que você atende num aparelho de verdade. Veja o [modo simulado](/developers/sdk#modo-simulado).

## Checklist antes da produção

**Chaves e tokens**

- A chave secreta fica só nos seus servidores, num cofre de segredos. Não está no app nem no repositório.
- O app recebe tokens de sessão do seu backend e implementa o `onTokenExpired`.
- Sair de todos os aparelhos chama `DELETE /patients/{id}/session-tokens`, e sair do app chama `EmmiTec.signOut()`.

**Medições**

- As medições levam um `externalId`, então novas tentativas nunca duplicam.
- O seu código lê o `level` e trata `alert: null`.
- Você trata `400 validation_failed` (valor errado), `422 patient_disabled` e `429 rate_limited` (espere os segundos do `Retry-After`).

**Webhook**

- A assinatura é conferida no corpo cru, e eventos com mais de 300 segundos são recusados.
- Você responde `2xx` em menos de 10 segundos e deixa o trabalho demorado para depois.
- Os eventos repetidos são descartados pelo `id`, e a medição mais recente é escolhida pelo `measuredAt`.
- O segredo do webhook está guardado com segurança, e você sabe [trocá-lo](/developers/webhooks#troque-o-segredo).

**Notificações**

- O `alert.title` e o `alert.text` aparecem certos em todos os idiomas que você atende.
- O paciente não recebe duas notificações da mesma medição.
- Você testou todos os níveis com o `simulate-alert`, inclusive o `normal`.
- Você decidiu se usa alertas (`PUT /settings`) e quais limites os seus pacientes precisam (`PUT /patients/{id}/thresholds`).

**App**

- Permissão negada, Bluetooth desligado e aparelho não encontrado mostram uma mensagem útil.
- Uma medição feita em modo avião chega depois que a conexão volta.
- Cada modelo de aparelho que você atende foi testado num celular de verdade, Android e iOS.

**Virada para a produção**

1. Gere a sua chave de produção (`emk_live_...`) no [portal do cliente](/developers/customer-portal). Antes, a integração precisa de um cliente em produção: peça à EmmiTec para ligar; até lá, as chaves de produção respondem `403`.
2. Configure o webhook de produção com `PUT /webhook` usando a chave de produção. Ele é separado do de teste e tem o próprio segredo.
3. Escolha alertas ligados ou desligados na produção (`PUT /settings` com a chave de produção) e confira os padrões de produção com `GET /thresholds`.
4. Crie os pacientes de produção e gere tokens de sessão de produção.
5. Envie uma medição real e confira em `GET /patients/{id}/readings` e nos logs do seu webhook.

::: next
- [Erros e limites](/developers/errors) Todos os códigos de erro e como tratar cada um.
- [Webhooks](/developers/webhooks) Novas tentativas, registro de eventos e reenvio.
:::
