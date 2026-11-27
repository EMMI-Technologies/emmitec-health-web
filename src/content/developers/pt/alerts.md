---
title: Alertas e notificações
description: Quando uma medição passa dos limites do paciente, a EmmiTec entrega um alerta com título, texto para o paciente e motivo. Você decide como avisar.
---

A EmmiTec nunca manda notificação push para os seus usuários. Ela entrega tudo o que você precisa para mandar a sua, com o tom do seu app e pelo seu provedor. O mesmo alerta chega em dois lugares:

| Onde | Quando | Melhor para |
|---|---|---|
| A resposta do `POST /readings` (no SDK: `m.alert`) | Na hora, no celular que enviou a medição | Um aviso dentro do app enquanto ele está aberto |
| O webhook `reading.alert` | Segundos depois, no seu servidor | Notificações push, cuidadores, o seu suporte, os seus registros |

::: tip Você decide se e quando há alerta
Os alertas vêm ligados. Você pode desligar para a sua integração inteira (`alertsEnabled`), definir os limites de cada paciente e desligar os alertas de um paciente. Veja [Configurar alertas e limites](/developers/alert-settings).
:::

## O objeto Alert

```json title="Alert (locale pt)"
{
  "level": "critical_high",
  "title": "Pressão arterial muito alta",
  "text": "Sua pressão arterial ficou em 182/110 mmHg, acima da sua faixa segura. Se você não estiver se sentindo bem, procure sua equipe de cuidado ou o serviço de emergência.",
  "reason": "Sistólica 182 mmHg está igual ou acima do limite crítico de 180 mmHg. Diastólica 110 mmHg está igual ou acima do limite de atenção de 90 mmHg.",
  "locale": "pt",
  "triggeredBy": [
    { "value": "systolic", "measured": 182, "unit": "mmHg", "level": "critical_high", "limit": 180 },
    { "value": "diastolic", "measured": 110, "unit": "mmHg", "level": "attention_high", "limit": 90 }
  ]
}
```

O que é cada coisa, sem rodeio:

- **Título** da notificação = `alert.title`
- **Texto** para o paciente = `alert.text`
- **Motivo** (técnico) = `alert.reason`
- **Medição que gerou o alerta** = `data.reading` no webhook (o paciente vem em `data.patient`), ou a própria medição na resposta do `POST /readings`

| Campo | O que é | Use para |
|---|---|---|
| `title` | Manchete curta. | O título da notificação. |
| `text` | Linguagem simples, falando com o paciente ("sua pressão"). | O corpo da notificação e o aviso no app. |
| `reason` | Técnico: qual valor passou de qual limite. | Logs, telas de profissionais ou cuidadores, suporte. Não é para o paciente. |
| `level` | `attention_high`, `attention_low`, `critical_high` ou `critical_low`. | Cor, som, prioridade, quem mais avisar. |
| `locale` | `en`, `pt` ou `es`. | O idioma em que os textos vieram. |
| `triggeredBy` | Cada valor fora da faixa: `value`, `measured`, `unit`, `level`, `limit`. | Destacar o número na sua tela, análises. |

Só existe alerta quando o `level` da medição é de atenção ou crítico. Para `normal` e `unknown`, o `alert` vem `null` e nenhum webhook `reading.alert` é enviado. Medições de peso não são avaliadas, então nunca trazem alerta. O `alert` também vem `null` quando os alertas estão desligados para a sua integração naquele modo (`alertsEnabled: false`) ou para aquele paciente e tipo; o `level` continua lá.

### Como são os textos

- Palavras de nível no título: **muito alta**, **alta**, **baixa**, **muito baixa** (en: very high, high, low, very low; es: muy alta, alta, baja, muy baja).
- O `text` fala com o paciente sobre a própria medição. Nunca dá orientação médica. Só nos níveis críticos ele termina com: "Se você não estiver se sentindo bem, procure sua equipe de cuidado ou o serviço de emergência."
- O `reason` é para quem precisa dos números, como "Sistólica 182 mmHg está igual ou acima do limite crítico de 180 mmHg. Diastólica 110 mmHg está igual ou acima do limite de atenção de 90 mmHg."

### Idioma dos textos

Os textos vêm no idioma que você pedir:

- **No app**: o `locale` que você passa no `EmmiTec.configure()`.
- **Nas chamadas da API**: `?locale=pt` ou o cabeçalho `Accept-Language` (`en`, `pt`, `es`).
- **Nos webhooks**: o `locale` que você definiu no `PUT /webhook`.

Sem nenhum desses, vale o idioma do webhook da sua integração naquele modo e, depois, `en`. Precisa do mesmo alerta em outro idioma depois? O `GET /readings/{id}?locale=es` recalcula.

## Notificação push pelo seu backend

É o caminho recomendado: o webhook chega mesmo com o app fechado, e o seu backend conhece todos os aparelhos do usuário. Depois de [conferir a assinatura](/developers/webhooks#verifique-a-assinatura), monte o push assim:

| Campo do push | Campo do alerta |
|---|---|
| título | `alert.title` |
| corpo | `alert.text` |
| dados | `{ readingId: reading.id, level: alert.level }` |
| prioridade | alta para `critical_*`, normal para `attention_*` |

Com o Expo Push Service:

```js title="rota do webhook (Node.js)"
if (event.type === 'reading.alert') {
  const { patient, reading, alert } = event.data
  const pushTokens = await db.pushTokensDo(patient.externalId) // ExponentPushToken[...]

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

Com Firebase Cloud Messaging ou APNs direto, o mapeamento é o mesmo: `alert.title` e `alert.text` na notificação, `readingId` e `level` nos dados.

## Aviso no app, logo depois de medir

O SDK devolve o alerta assim que a medição é gravada. Mostre na mesma tela em que o paciente acabou de medir:

```tsx title="TelaDeMedicao.tsx"
import { Text, View } from 'react-native'
import { useMeasurement } from '@emmitec/rpm'

export function TelaDeMedicao() {
  const m = useMeasurement('blood_pressure')

  return (
    <View>
      {/* ...a sua tela de medição... */}
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

O mesmo alerta também chega como evento, em qualquer tela, o que ajuda a montar um aviso global. Ele dispara inclusive para medições enviadas depois pela fila offline:

```ts title="Ouvinte global"
EmmiTec.on('alert', ({ alert, reading }) => mostrarAviso(alert.title, alert.text))
```

## Notificação local no celular

Se ainda não há push pelo backend, dá para transformar o alerta do SDK em notificação local com o `expo-notifications`:

```ts title="avisarAlerta.ts"
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

export async function prepararNotificacoes() {
  const { status } = await Notifications.requestPermissionsAsync()
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Alertas de saúde',
      importance: Notifications.AndroidImportance.HIGH,
    })
  }
  return status === 'granted'
}

type AlertaEmmiTec = { level: string; title: string; text: string }

export async function avisarAlerta(alerta: AlertaEmmiTec, readingId: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: alerta.title,
      body: alerta.text,
      data: { readingId, level: alerta.level },
      sound: 'default',
    },
    trigger: null, // mostra agora
  })
}
```

```tsx title="Use depois de uma medição"
useEffect(() => {
  if (m.phase === 'saved' && m.alert && m.reading) {
    void avisarAlerta(m.alert, m.reading.id)
  }
}, [m.phase])
```

## Um alerta, uma notificação

Se o app mostra o aviso e o seu backend também manda push da mesma medição, o paciente recebe a mesma notícia duas vezes. Escolha uma regra e siga. Uma simples: o app lembra quais `readingId` já mostrou e ignora o push dessa medição.

```ts title="App.tsx"
const mostrados = new Set<string>() // adicione o reading.id quando mostrar o aviso

Notifications.setNotificationHandler({
  handleNotification: async (notificacao) => {
    const readingId = notificacao.request.content.data?.readingId as string | undefined
    const repetido = !!readingId && mostrados.has(readingId)
    return {
      shouldShowBanner: !repetido,
      shouldShowList: !repetido,
      shouldPlaySound: !repetido,
      shouldSetBadge: false,
    }
  },
})
```

::: note
`shouldShowBanner` e `shouldShowList` são os nomes nas versões recentes do `expo-notifications`. As versões antigas usam `shouldShowAlert`.
:::

## Teste

No modo de teste, o `POST /sandbox/simulate-alert` cria uma medição que passa dos limites do paciente e roda o fluxo inteiro, webhook incluído. Escolha o nível para conferir cada estilo da sua notificação:

```bash title="Um alerta de oxigenação baixa"
curl -X POST "$EMMITEC_API/sandbox/simulate-alert" \
  -H "Authorization: Bearer $EMMITEC_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "patientId": "3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21", "type": "oxygen_saturation", "level": "critical_low" }'
```

::: next
- [Webhooks](/developers/webhooks) Receba o `reading.alert` e confira a assinatura.
- [Configurar alertas e limites](/developers/alert-settings) Ligue ou desligue os alertas e defina os limites de cada paciente.
- [Testes e sandbox](/developers/testing) Simule todos os níveis antes de ir para produção.
:::
