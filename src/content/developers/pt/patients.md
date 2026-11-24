---
title: Pacientes
description: O paciente é a pessoa que mede. Crie um para cada usuário do seu app, identificado pelo seu próprio id, e gere os tokens de sessão do app.
---

Todos os endpoints de pacientes usam a sua chave secreta. Os pacientes pertencem à sua integração e a um modo: a chave de teste só vê pacientes de teste, a de produção só vê pacientes de produção.

## O objeto Patient

```json title="Patient"
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

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string (UUID) | Id do paciente na EmmiTec, em minúsculas. É o que você usa em todas as outras chamadas. |
| `externalId` | string | O id dessa pessoa no seu sistema. Único por integração e modo. |
| `firstName`, `lastName` | string | Nome e sobrenome. |
| `birthDate` | string | `AAAA-MM-DD`. |
| `sex` | string | `female`, `male`, `other` ou `unknown`. |
| `email` | string ou null | Opcional. Vem `null` quando o paciente é criado sem e-mail. O paciente nunca entra nos apps da EmmiTec, então o e-mail não é necessário. |
| `phone` | string ou null | Opcional, no formato E.164 (`+5541999998888`). |
| `language` | string | `en`, `pt` ou `es`. |
| `heightCm` | number ou null | De 50 a 250. Usado para calcular o IMC (`bmi`) nas medições de peso. |
| `mode` | string | `test` ou `live`, conforme a chave que criou. |
| `createdAt` | string | ISO 8601 em UTC. |

## Crie um paciente

`POST /patients`

Chame quando o usuário começar a usar a parte de saúde do seu app. A criação é **idempotente pelo `externalId`**: se já existe um paciente com o mesmo `externalId` neste modo, você recebe esse paciente com status `200` em vez de `201`. Nesse caso, diferenças no corpo são ignoradas; para mudar dados, use o `PATCH`.

| Campo | Obrigatório | Regras |
|---|---|---|
| `externalId` | Sim | De 1 a 100 caracteres, único por integração e modo. |
| `firstName` | Sim | |
| `lastName` | Sim | |
| `birthDate` | Sim | `AAAA-MM-DD`. |
| `sex` | Não | `female`, `male`, `other`, `unknown`. Padrão `unknown`. |
| `email` | Não | |
| `phone` | Não | E.164. |
| `language` | Não | `en`, `pt`, `es`. Padrão `en`. |
| `heightCm` | Não | De 50 a 250. |

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
    "language": "pt",
    "heightCm": 162
  }'
```

```js tab="Node.js"
async function garantirPaciente(usuario) {
  const res = await fetch(`${process.env.EMMITEC_API}/patients`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.EMMITEC_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      externalId: usuario.id,
      firstName: usuario.nome,
      lastName: usuario.sobrenome,
      birthDate: usuario.nascimento, // "1956-03-14"
      language: 'pt',
    }),
  })
  if (res.status !== 201 && res.status !== 200) throw new Error(`EmmiTec ${res.status}`)
  const paciente = await res.json()
  await db.usuarios.update(usuario.id, { emmitecPatientId: paciente.id })
  return paciente
}
```

```python tab="Python"
def garantir_paciente(usuario):
    res = requests.post(
        f"{EMMITEC_API}/patients",
        headers={"Authorization": f"Bearer {EMMITEC_KEY}"},
        json={
            "externalId": usuario.id,
            "firstName": usuario.nome,
            "lastName": usuario.sobrenome,
            "birthDate": usuario.nascimento,  # "1956-03-14"
            "language": "pt",
        },
    )
    if res.status_code not in (200, 201):
        raise RuntimeError(f"EmmiTec {res.status_code}: {res.text}")
    paciente = res.json()
    db.usuarios.update(usuario.id, emmitec_patient_id=paciente["id"])
    return paciente
```

::: tip Guarde o id da EmmiTec
Salve o `paciente.id` junto do seu usuário. Todas as outras chamadas usam esse id, e o webhook manda tanto o `id` quanto o seu `externalId`.
:::

## Consulte um paciente

`GET /patients/{id}`

Devolve o objeto Patient. No app, com token de sessão, use `GET /me` para obter o paciente do token.

`GET /me`

## Liste pacientes

`GET /patients`

| Parâmetro | Descrição |
|---|---|
| `externalId` | Só o paciente com esse `externalId`. Útil para achar o id da EmmiTec a partir do seu. |
| `limit` | De 1 a 100. Padrão 25. |
| `cursor` | O `nextCursor` da página anterior. |

As listas vêm do mais novo para o mais antigo:

```json title="Resposta 200"
{
  "data": [ { "id": "3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21", "externalId": "acme-user-123", "...": "..." } ],
  "hasMore": true,
  "nextCursor": "eyJpZCI6..."
}
```

Para ler todas as páginas, siga o `nextCursor` enquanto `hasMore` for `true`:

```js title="Ler todas as páginas"
let cursor = null
do {
  const url = new URL(`${process.env.EMMITEC_API}/patients`)
  url.searchParams.set('limit', '100')
  if (cursor) url.searchParams.set('cursor', cursor)
  const pagina = await (await fetch(url, { headers: { Authorization: `Bearer ${process.env.EMMITEC_KEY}` } })).json()
  for (const p of pagina.data) console.log(p.externalId, p.id)
  cursor = pagina.hasMore ? pagina.nextCursor : null
} while (cursor)
```

## Atualize um paciente

`PATCH /patients/{id}`

Mande só o que mudou. Campos aceitos: `firstName`, `lastName`, `birthDate`, `sex`, `phone`, `language`, `heightCm`. A resposta é o Patient atualizado.

```bash title="Atualizar altura e telefone"
curl -X PATCH "$EMMITEC_API/patients/$PATIENT_ID" \
  -H "Authorization: Bearer $EMMITEC_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "heightCm": 164, "phone": "+5541988887777" }'
```

## Tokens de sessão

`POST /patients/{id}/session-tokens`

Cria um token para o app deste paciente. Corpo (opcional): `expiresInSeconds`, de 300 a 2592000 (30 dias). Padrão 604800 (7 dias).

```json title="Resposta 201"
{
  "token": "emst_test_...",
  "patientId": "3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21",
  "expiresAt": "2026-12-01T14:03:00Z"
}
```

`DELETE /patients/{id}/session-tokens`

Revoga todos os tokens do paciente e diz quantos eram:

```json title="Resposta 200"
{ "revoked": 3 }
```

Como o app recebe e renova os tokens está em [Autenticação](/developers/authentication#gere-tokens-de-sessao-no-seu-backend).

## Erros que podem aparecer

| Status | `code` | Por quê |
|---|---|---|
| 400 | `validation_failed` | Falta um campo ou ele está fora da faixa. O `param` diz qual, por exemplo `birthDate`. |
| 404 | `not_found` | Não há paciente com esse id na sua integração, neste modo. Um paciente de produção nunca aparece com a chave de teste. |
| 409 | `conflict` | Por exemplo, o e-mail já é usado por outra pessoa no cliente. |

::: next
- [Medições](/developers/readings) Envie e consulte as medições dos seus pacientes.
- [Autenticação](/developers/authentication) Tokens de sessão no app.
:::
