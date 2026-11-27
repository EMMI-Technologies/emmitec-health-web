---
title: SDK para Expo
description: "O @emmitec/rpm lê aparelhos médicos Bluetooth no seu app Expo ou React Native, grava a medição na EmmiTec e entrega o alerta. Permissões, busca, pareamento, novas tentativas e fila offline já vêm resolvidos."
---

## Requisitos

- Expo SDK 52 ou mais novo (React Native 0.74 ou mais novo), com um **development build**. O SDK usa Bluetooth nativo, então não roda no Expo Go.
- `react-native-ble-manager` 12.x.
- Recomendados: `@react-native-async-storage/async-storage` (a fila offline sobrevive a reinícios), `expo-secure-store` (segredos de pareamento em armazenamento seguro) e `expo-crypto` (ids criptográficos no Hermes). São dependências opcionais: o SDK funciona sem elas, só que com menos durabilidade.
- Um token de sessão do paciente gerado pelo seu backend. Veja [Autenticação](/developers/authentication).

## Instale

O SDK é o pacote privado `@emmitec/rpm` do npm, só para parceiros da EmmiTec.

**1. Peça o acesso.** Cada desenvolvedor cria uma conta grátis no [npmjs.com](https://www.npmjs.com/signup) e manda o usuário para [contato@emmitec.health](mailto:contato@emmitec.health?subject=Acesso%20ao%20%40emmitec%2Frpm). A EmmiTec coloca a conta no time de leitura da organização `emmitec` e o npm manda um e-mail de convite: aceite. Depois, no seu computador:

```bash title="Terminal"
npm login
```

**2. Instale.**

```bash title="Terminal"
npx expo install @emmitec/rpm react-native-ble-manager @react-native-async-storage/async-storage expo-secure-store expo-crypto
```

Atalho: `npx @emmitec/rpm init` instala o que falta, coloca o config plugin no `app.json` e, se você usava o antigo `emmitec-rpm`, troca os imports. Depois, `npx @emmitec/rpm doctor` confere tudo (veja [Comandos de suporte](#comandos-de-suporte)).

**3. EAS Build e CI.** O EAS precisa de um token para baixar o pacote privado. No npmjs.com: Access Tokens, Generate New Token, Granular Access Token, permissão **Read-only** para o `@emmitec/rpm`. Guarde no EAS como `NPM_TOKEN`:

```bash title="Terminal"
eas env:create --name NPM_TOKEN --value <token> --visibility secret --environment production
```

Repita nos ambientes `preview` e `development` que você usa. Sem `.npmrc` no projeto, o EAS configura o npm sozinho. Com um `.npmrc` seu, coloque `//registry.npmjs.org/:_authToken=${NPM_TOKEN}`. Nunca escreva o token em si no arquivo. Anote a data de validade do token: quando ele vence, o build falha na instalação.

::: note Vindo do emmitec-rpm
Até a 1.1.0 o SDK era o pacote público `emmitec-rpm`. O código é o mesmo: rode `npx @emmitec/rpm init`, ou troque à mão o pacote, os imports (`'emmitec-rpm'` por `'@emmitec/rpm'`) e o nome do plugin no `app.json`.
:::

## Adicione o config plugin

O plugin coloca as permissões de Bluetooth nos projetos nativos: `BLUETOOTH_SCAN` (marcada como nunca usada para localização) e `BLUETOOTH_CONNECT` no Android 12 ou mais novo, localização só até o Android 11 (o Android antigo exige para buscar) e `NSBluetoothAlwaysUsageDescription` no iOS.

```json title="app.json"
{
  "expo": {
    "plugins": [
      ["@emmitec/rpm", { "bluetoothPermissionText": "Permita que o $(PRODUCT_NAME) leia seus aparelhos de saúde." }]
    ]
  }
}
```

O `bluetoothPermissionText` é opcional: sem ele, o plugin usa um texto padrão (ou mantém o que o seu app já tem). Depois, gere um development build:

```bash title="Terminal"
# build local num aparelho conectado ou emulador
npx expo run:android
npx expo run:ios

# ou com o EAS
eas build --profile development --platform android
```

::: warning O Expo Go não funciona
O Expo Go não traz módulos nativos de Bluetooth. Use um development build. Para montar as telas sem aparelho, ligue o [modo simulado](#modo-simulado).
:::

## Configure

Chame o `configure` quando o paciente já tiver entrado no seu app:

```ts title="App.tsx"
import { EmmiTec } from '@emmitec/rpm'

EmmiTec.configure({
  sessionToken, // emst_test_... ou emst_live_..., vindo do seu backend. Nunca uma chave secreta.
  locale: 'pt', // idioma dos textos do alerta: 'en', 'pt' ou 'es'
  onTokenExpired: async () => {
    // chamado uma vez quando a API responde 401: peça ao SEU backend um token novo do mesmo paciente
    const r = await fetch('https://api.seu-app.com.br/api/emmitec/session-token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwtDoSeuUsuario}` },
    })
    if (!r.ok) return null // null: o paciente precisa entrar de novo
    const { token } = await r.json()
    return token
  },
})
```

| Opção | Descrição |
|---|---|
| `sessionToken` | Obrigatório. O token de sessão do paciente. |
| `locale` | Idioma de `alert.title`, `alert.text` e `alert.reason`. Padrão: o idioma do webhook da sua integração, senão `en`. |
| `simulate` | `true` troca o Bluetooth por aparelhos simulados. |
| `onTokenExpired` | Chamado uma vez num `401`. Devolva um token novo do **mesmo** paciente, ou `null` quando ele precisar entrar de novo. |
| `baseUrl` | Padrão `https://v2-prod-api-patients.emmitec.health/partner/v1`, a mesma para teste e produção. |
| `storage`, `secureStorage` | Armazenamento próprio para a fila offline e para os segredos de pareamento. Padrão: AsyncStorage, e expo-secure-store quando instalado. |
| `timeoutMs` | Por chamada. Padrão 20000. |
| `app` | O id e a versão do seu app, por exemplo `{ id: 'com.acme.health', version: '2.3.1' }`. Vai no cabeçalho `EmmiTec-Client` para o suporte saber qual versão do app está em cada celular. |
| `diagnostics` | Padrão `true`. Veja [Diagnóstico](#diagnostico). `false` desliga. |

Quando o paciente sair do seu app, chame `await EmmiTec.signOut()`. Os segredos de pareamento continuam guardados (eles pertencem ao celular e ao aparelho), e as medições na fila esperam o mesmo paciente entrar de novo. Passe `{ clearQueue: true }` para descartá-las.

## Meça com o `useMeasurement`

O `useMeasurement(tipo, opções?)` cuida do fluxo inteiro: permissão, Bluetooth ligado, busca (inclusive de um aparelho do catálogo já conectado ao celular), conexão, pareamento quando precisa, espera do resultado e gravação. Ele passa por estas fases:

| Fase | O que está acontecendo | O que mostrar |
|---|---|---|
| `idle` | Ainda não começou. | Um botão "Medir" e o `m.device?.instructions` quando já se conhece o aparelho. |
| `permission` | Pedindo a permissão de Bluetooth. | Por que você precisa dela. |
| `bluetooth_off` | O Bluetooth está desligado. | "Ligue o Bluetooth para continuar." |
| `scanning` | Procurando um aparelho compatível (até 60 s). | "Comece a medição no aparelho agora." |
| `connecting` | Aparelho encontrado, conectando. | O `m.device.name` e as `instructions` dele. |
| `waiting` | Conectado, esperando o aparelho terminar. | O `m.device.instructions`. |
| `received` | O aparelho mandou o resultado. | O `m.summary`, por exemplo "120/80 mmHg, pulse 72". |
| `saving` | Enviando a medição para a EmmiTec. | Os números, com um indicador discreto de progresso. |
| `saved` | Gravada, ou guardada na fila offline (`m.queued`). | O resultado e o `m.alert`, se houver. |
| `error` | Algo falhou. | O `m.error.message` (ou o seu texto) e "Tentar de novo". |

Uma tela completa:

```tsx title="TelaDePressao.tsx"
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native'
import { useMeasurement } from '@emmitec/rpm'

const OCUPADO = ['permission', 'scanning', 'connecting', 'waiting', 'received', 'saving']

export function TelaDePressao() {
  const m = useMeasurement('blood_pressure')
  const ocupado = OCUPADO.includes(m.phase)

  return (
    <View style={{ flex: 1, padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: '600' }}>Pressão arterial</Text>

      {m.device && <Text style={{ fontSize: 16 }}>{m.device.instructions}</Text>}
      {m.phase === 'scanning' && <Text style={{ fontSize: 16 }}>Comece a medição no aparelho agora.</Text>}
      {ocupado && <ActivityIndicator />}

      {m.summary && <Text style={{ fontSize: 32, fontWeight: '700' }}>{m.summary}</Text>}
      {m.queued && <Text>Guardada neste celular. Será enviada quando a internet voltar.</Text>}

      {m.alert && (
        <View accessibilityRole="alert" style={{ padding: 16, borderRadius: 14, backgroundColor: '#FDE8E3' }}>
          <Text style={{ fontSize: 17, fontWeight: '600' }}>{m.alert.title}</Text>
          <Text style={{ fontSize: 15, marginTop: 4 }}>{m.alert.text}</Text>
        </View>
      )}

      {m.error && (
        <View>
          <Text style={{ fontSize: 16 }}>{TEXTOS_DE_ERRO[m.error.code] ?? m.error.message}</Text>
          {m.error.code === 'permission_blocked' && (
            <Pressable onPress={() => Linking.openSettings()}>
              <Text style={{ fontSize: 16, color: '#08777B' }}>Abrir configurações</Text>
            </Pressable>
          )}
        </View>
      )}

      {!ocupado && (
        <Pressable
          onPress={m.start}
          style={{ marginTop: 'auto', padding: 16, borderRadius: 999, backgroundColor: '#0E1117' }}
        >
          <Text style={{ color: '#fff', fontSize: 17, textAlign: 'center' }}>
            {m.phase === 'saved' ? 'Medir de novo' : 'Medir'}
          </Text>
        </Pressable>
      )}
    </View>
  )
}

// As mensagens padrão do SDK são em inglês: traduza pelo código
const TEXTOS_DE_ERRO: Record<string, string> = {
  bluetooth_off: 'O Bluetooth está desligado. Ligue e tente de novo.',
  device_not_found: 'Não encontramos o aparelho. Confira se ele está ligado e perto do celular.',
  connection_failed: 'Não conseguimos conectar. Desligue e ligue o aparelho e tente de novo.',
  repeated_reading: 'Esta medição já foi gravada. Faça uma nova medição no aparelho.',
  permission_blocked: 'A permissão de Bluetooth está desligada para este app. Ative nas configurações.',
}
```

O que o hook devolve:

| Campo | Descrição |
|---|---|
| `phase` | Uma das fases acima. |
| `device` | O aparelho do catálogo encontrado: `model`, `name`, `type`, `pairing` e `instructions` (como começar a medição, para o paciente). |
| `peripheralId` | O id que o celular dá ao aparelho. Use com `EmmiTec.devices.forget`. |
| `measured`, `summary` | A medição como veio do aparelho e um texto curto com ela. |
| `reading` | A Reading gravada na EmmiTec, com `level` e `alert`. `null` até gravar, e quando foi para a fila. |
| `alert` | O alerta da medição gravada, ou `null`. |
| `queued` | `true` quando a medição está segura na fila offline. O alerta chega depois, no evento `alert`. |
| `error` | `{ code, message }`. A mensagem é um texto padrão para o paciente, em inglês. |
| `log` | Registro técnico da conversa com o aparelho. Mande junto quando falar com o suporte. |
| `start()`, `save()`, `cancel()` | Começar ou recomeçar, gravar (veja `autoSave`), parar a busca e desconectar. |

Opções do `useMeasurement`:

| Opção | Padrão | Descrição |
|---|---|---|
| `autoSave` | `true` | Grava assim que a medição chega. Com `false`, o hook para em `received`: mostre os números e chame `m.save()` quando o paciente confirmar. |
| `autoStart` | `false` | Começa quando a tela abre. Recomendado para oxímetros: eles só anunciam com o dedo dentro. |
| `scanSeconds` | `60` | Quanto tempo procurar um aparelho. |
| `models` | todos do tipo | Só estes modelos, por exemplo `['bp7250']`. |
| `useConnectedDevices` | `true` | Usa um aparelho do catálogo já conectado ao celular por outro app. |
| `allowRepeatedReadings` | `false` | Veja o parágrafo abaixo. |

Medidores de pressão e glicosímetros mandam de novo a **última medição guardada** a cada conexão. Por isso, os mesmos valores do mesmo aparelho dentro de 15 minutos de uma medição gravada terminam com o erro `repeated_reading` em vez de gravar duas vezes. Use `allowRepeatedReadings: true` para desligar essa regra.

Dá para passar vários tipos, por exemplo `useMeasurement(['blood_pressure', 'oxygen_saturation'])`: quem decide é o aparelho encontrado.

### Códigos de erro da medição

Decida pelo `m.error.code` para mostrar os seus textos (as mensagens padrão são em inglês):

| Código | Significado |
|---|---|
| `permission_denied`, `permission_blocked` | Permissão de Bluetooth recusada. Bloqueada quer dizer que só as configurações mudam. |
| `bluetooth_off`, `bluetooth_unavailable` | O Bluetooth está desligado, ou o celular não tem. |
| `device_not_found` | Nenhum aparelho compatível anunciou durante a busca. |
| `connection_failed`, `disconnected` | A conexão falhou ou caiu antes da medição. |
| `no_reading` | Conectou, mas nenhuma medição chegou em 60 segundos. |
| `repeated_reading` | O aparelho mandou uma medição que já estava gravada. |
| `device_not_paired`, `device_already_paired` | O pareamento do medidor precisa de atenção (veja a solução de problemas). |
| `save_failed`, `patient_disabled` | A API recusou a gravação. O `m.save()` tenta de novo depois de `save_failed`. |
| `not_configured` | O `EmmiTec.configure` não foi chamado, ou o paciente saiu. |

Há também códigos de aparelhos específicos, como `glucose_meter_no_records` e `oximeter_registration_refused`, cada um com a sua mensagem padrão.

## Medições digitadas

Quando o paciente digita um valor, ou usa um aparelho fora do catálogo, envie com o `EmmiTec.readings.create`. A entrada é a mesma do [`POST /readings`](/developers/readings#envie-uma-medicao), sem o `patientId`; o `measuredAt` vira "agora", o `source` vira `manual` e um `externalId` é gerado.

```ts title="Medição digitada"
import { EmmiTec, EmmiTecApiError } from '@emmitec/rpm'

try {
  const resultado = await EmmiTec.readings.create({
    type: 'blood_pressure',
    values: { systolic: 182, diastolic: 110, pulse: 88 },
  })
  if (resultado.queued) {
    // sem internet: ficou na fila offline e será enviada depois
  } else if (resultado.reading.alert) {
    mostrarAviso(resultado.reading.alert.title, resultado.reading.alert.text)
  }
} catch (e) {
  if (e instanceof EmmiTecApiError) {
    // e.status, e.code ('validation_failed'...), e.message, e.param ('values.systolic'), e.requestId
  }
}
```

O `readings.create` resolve `{ queued: false, reading }` quando grava, ou `{ queued: true, reading: null }` quando a medição foi para a fila offline. Erros de validação rejeitam com `EmmiTecApiError`.

Outras chamadas sobre o mesmo paciente:

```ts title="Dados do paciente"
await EmmiTec.readings.list({ type: 'glucose', limit: 10 }) // histórico, do mais novo para o mais antigo
await EmmiTec.readings.get('2104455') // uma medição, com o alerta no idioma configurado
await EmmiTec.thresholds() // os limites que valem para este paciente
await EmmiTec.me() // o paciente do token
```

## Aparelhos

```ts title="Aparelhos compatíveis"
import { DEVICES, EmmiTec } from '@emmitec/rpm'

DEVICES // os 21 modelos que o SDK lê, com as instruções (sem chamada à API)
await EmmiTec.devices.list() // GET /devices, incluindo manual e other
await EmmiTec.devices.paired() // aparelhos com segredo de pareamento neste celular
await EmmiTec.devices.forget(peripheralId) // esquece um aparelho (ou um modelo, como 'uam820bt')
```

A lista completa, com as observações de pareamento, está em [Aparelhos compatíveis](/developers/devices).

## Fila offline

Quando a gravação falha por falta de rede, por tempo esgotado ou por um `5xx` ou `429` que continua depois das tentativas do próprio SDK, a medição vai para uma fila em vez de se perder:

- o horário do aparelho fica como `measuredAt`, então o histórico fica certo mesmo que o envio aconteça horas depois;
- cada medição leva um `externalId` gerado no celular, então nunca é gravada duas vezes;
- com o AsyncStorage instalado, a fila sobrevive ao fechamento do app;
- as medições ficam presas ao paciente que mediu: num celular compartilhado, nunca saem com o token de outro paciente.

A fila é enviada sozinha no `configure`, quando o app volta para a frente e depois da próxima medição gravada. Você também pode mandar agora:

```ts title="Fila"
const { sent, rejected, remaining } = await EmmiTec.queue.flush()
await EmmiTec.queue.size() // medições esperando
```

## Eventos

O `EmmiTec.on` devolve uma função que remove o ouvinte:

```ts title="Ouvir eventos"
const parar = EmmiTec.on('alert', ({ alert, reading }) => {
  mostrarAviso(alert.title, alert.text) // dispara também para medições enviadas depois pela fila
})

EmmiTec.on('reading', ({ reading, origin }) => {}) // origin: 'measurement', 'manual' ou 'queue'
EmmiTec.on('queued', ({ input, reason, pending }) => {})
EmmiTec.on('error', ({ error, context }) => {}) // 'flush', 'token_refresh', 'queue_rejected', 'measurement'

parar() // deixa de ouvir os alertas
```

## Modo simulado

Com `simulate: true` não há Bluetooth: aparelhos simulados falam os protocolos reais e produzem medições realistas (normais por padrão), gravadas na API como as de verdade. Use um token de teste (`emst_test_...`), para as medições irem para a sandbox.

```ts title="Aparelhos simulados"
EmmiTec.configure({ sessionToken: 'emst_test_...', simulate: true })

// a próxima medição simulada tem este nível, ou exatamente estes valores
EmmiTec.simulator.next({ type: 'blood_pressure', level: 'critical_high' })
EmmiTec.simulator.next({ type: 'blood_pressure', values: { systolic: 185, diastolic: 112 } })

// mostre as suas telas de erro
EmmiTec.simulator.set({ bluetoothOff: true })
EmmiTec.simulator.set({ permission: 'blocked' })
EmmiTec.simulator.set({ deviceAbsent: true })
EmmiTec.simulator.set({ failNextConnection: true })
EmmiTec.simulator.reset()
```

## Diagnóstico

A partir da versão 1.1.0, o SDK conta ao suporte da EmmiTec o que aconteceu no celular. Assim, quando um paciente diz "não conecta", a gente vê onde parou: permissão, Bluetooth desligado, aparelho não encontrado, conexão, leitura ou envio.

- **O que vai:** a etapa (`ble.scan_started`, `ble.device_found`, `ble.connect_failed`, `ble.reading_parsed`, `queue.stored_offline`...), o modelo do aparelho, um código de erro com a mensagem fixa dele, quanto tempo levou e um id aleatório da instalação do app (para contar celulares). Toda chamada também leva `EmmiTec-Client: emmitec-rpm/1.2.0 (android 34; id e versão do seu app)`.
- **O que nunca vai:** nomes, valores medidos, tokens e o registro técnico da conversa com o aparelho.
- **Como:** em lotes pequenos para o `POST /diagnostics`, alguns segundos depois de uma falha ou uma vez por minuto, com o token de sessão do paciente. Uma falha no envio nunca chega ao seu app.
- **Para desligar:** `EmmiTec.configure({ ..., diagnostics: false })`.

O suporte também acha qualquer chamada pelo `requestId` que o seu app recebeu num erro. Mande esse código quando falar com a gente.

## Comandos de suporte

A partir da 1.2.0 o pacote traz comandos para o seu computador e um relatório para o celular. Nenhum deles mostra chaves, tokens, nomes ou valores medidos.

| Comando | O que faz |
|---|---|
| `npx @emmitec/rpm doctor` | Confere o projeto (pacotes, versão do Expo, config plugin, development build, permissões do Android e do iOS depois do prebuild, `.npmrc`, chaves escritas no código, acesso à API) e diz como resolver cada problema. Sai com código 1 quando algo falha |
| `npx @emmitec/rpm init` | Instala o que falta, coloca o config plugin e troca os imports do `emmitec-rpm`. Pergunta antes de mudar qualquer coisa (`--dry-run` só mostra o plano) |
| `npx @emmitec/rpm ping` | Testa uma chave secreta ou token de sessão: modo, integração, plano e código da chamada. Mostra só os 13 primeiros caracteres da chave |
| `npx @emmitec/rpm devices` | Os aparelhos compatíveis e o que o paciente faz com cada um |
| `npx @emmitec/rpm support` | Um relatório de versões e conferências para mandar a [contato@emmitec.health](mailto:contato@emmitec.health) |

Eles respondem em português ou inglês (`--lang en`, padrão: o do sistema). No app:

```ts title="Depuração e suporte"
if (__DEV__) EmmiTec.setLogLevel('debug') // toda chamada à API com o X-Request-Id e cada etapa da medição

const text = await EmmiTec.support.text() // para a sua tela de ajuda ou um e-mail para a EmmiTec
// versões do SDK e do app, celular, modo da sessão, id da instalação, fila offline,
// erros recentes e as últimas 20 chamadas à API com o X-Request-Id
```

Níveis do log: `silent`, `error`, `warn` (padrão), `info` (também erros de medição e chamadas que falharam), `debug`. O pacote também traz a documentação offline, em `node_modules/@emmitec/rpm/docs`.

## Solução de problemas

**A busca não encontra nada (`device_not_found`).**

- O aparelho precisa estar medindo ou transmitindo. O oxímetro só transmite com o dedo dentro e desliga quando o dedo sai: use `autoStart: true` nessa tela. O medidor de pressão transmite no fim da medição.
- Comece a medição primeiro no app e depois no aparelho, para a busca já estar rodando quando ele transmitir.
- Deixe o celular a 1 ou 2 metros do aparelho. No Android 11 ou mais antigo, a Localização precisa estar ligada.

**O aparelho funciona em outro app, mas não no seu.** Um aparelho conectado ao celular por outro app não anuncia. O SDK usa aparelhos do catálogo que já estão conectados (`useConnectedDevices`), mas se o outro app segura a conexão, feche esse app ou desconecte o aparelho nas configurações de Bluetooth do celular.

**Permissão negada.** O `permission_denied` pode ser pedido de novo com `m.start()`. O `permission_blocked` só muda nas configurações: leve o usuário até lá com `Linking.openSettings()`.

**Bluetooth desligado.** Fase `bluetooth_off`. Peça para o usuário ligar e comece a medição de novo.

**`repeated_reading`.** O medidor mandou de novo a última medição guardada. Peça uma nova medição, ou use `allowRepeatedReadings: true` se o seu fluxo precisar.

**Medidores Omron e glicosímetros Accu-Chek.** Eles pareiam uma vez com o celular. Na primeira medição o celular pode pedir para parear: aceite. Se vier `device_not_paired`, coloque o medidor em modo de pareamento como o manual explica (na maioria dos Omron, segure o botão de Bluetooth até aparecer um `P` piscando) e tente de novo. No Accu-Chek: faça o teste de glicose primeiro, depois ligue o Bluetooth do aparelho e, na primeira vez, digite o PIN impresso no verso do aparelho. O Zewa UAM-820BT usa um código de pareamento que o SDK guarda no celular.

**O aparelho foi trocado ou reiniciado.** Esqueça o pareamento com `EmmiTec.devices.forget(m.peripheralId)` e pareie de novo.

**Funciona no modo simulado, mas não no celular.** Confira se você está num development build (não no Expo Go), se o config plugin está no `app.json` e se o app foi gerado de novo depois disso. Depois, mande o `m.log` para o suporte da EmmiTec.

::: next
- [Aparelhos compatíveis](/developers/devices) Modelos, tipos e pareamento.
- [Alertas e notificações](/developers/alerts) Aviso e push a partir do `m.alert`.
:::
