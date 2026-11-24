---
title: Erros e limites
description: Todo erro tem o mesmo formato, um código estável para o seu código decidir e um id de requisição para o suporte. Além disso, o limite de chamadas e como repetir com segurança.
---

## Formato do erro

Toda resposta que não é `2xx` tem este corpo:

```json title="400 Bad Request"
{
  "error": {
    "type": "invalid_request_error",
    "code": "validation_failed",
    "message": "values.systolic must be an integer between 40 and 300.",
    "param": "values.systolic",
    "requestId": "req_01JDJ3K8Q5R4T6V8X0Z2B4D6F8"
  }
}
```

| Campo | Descrição |
|---|---|
| `type` | Família do erro (veja a tabela abaixo). |
| `code` | O erro específico. É por ele que o seu código decide. |
| `message` | Explicação para quem desenvolve, em inglês. Pode mudar: não faça parse dela. |
| `param` | O campo que causou o erro, quando existe, por exemplo `values.systolic`. |
| `requestId` | O mesmo do cabeçalho `X-Request-Id`. Mande para a EmmiTec quando precisar de ajuda. |

## Códigos de erro

| HTTP | `type` | `code` | Quando |
|---|---|---|---|
| 400 | `invalid_request_error` | `invalid_json` | O corpo não é um JSON válido. |
| 400 | `invalid_request_error` | `validation_failed` | Falta um campo, o tipo está errado ou o valor está fora da faixa. |
| 400 | `invalid_request_error` | `unsupported_type` | O `type` da medição não é aceito. |
| 400 | `invalid_request_error` | `unknown_device` | O `device.model` não está no catálogo. |
| 401 | `authentication_error` | `unauthorized` | Token ausente, inválido ou revogado, ou expirado. |
| 403 | `permission_error` | `forbidden` | Token de sessão fora do alcance dele, rota da sandbox com chave de produção, ou chave de produção sem cliente em produção na integração. |
| 404 | `invalid_request_error` | `not_found` | Paciente, medição ou evento não encontrado na sua integração, neste modo. |
| 409 | `invalid_request_error` | `conflict` | Por exemplo, o e-mail já é usado por outra pessoa no cliente. |
| 422 | `invalid_request_error` | `patient_disabled` | O paciente está desativado para medições. |
| 429 | `rate_limit_error` | `rate_limited` | Chamadas demais. Espere os segundos do `Retry-After`. |
| 500 | `api_error` | `internal_error` | Erro inesperado na EmmiTec. A mensagem é genérica; o `requestId` permite achar o caso. |

## Como tratar

| Situação | O que fazer |
|---|---|
| `400` | Corrija a requisição. Não repita do mesmo jeito. O `param` diz qual campo. |
| `401` | Consiga um token novo: no app, o SDK chama o seu `onTokenExpired`. No servidor, confira a chave. |
| `403` | Confira qual token está usando e em qual rota. |
| `404` | Confira o id e o modo: a chave de teste nunca vê dados de produção. |
| `409`, `422` | Mostre uma mensagem clara para o usuário ou para o seu suporte. |
| `429` | Espere os segundos do `Retry-After` e tente de novo. |
| `500`, erros de rede | Repita com espera crescente (por exemplo 1 s, 2 s, 4 s). Nas medições, mande um `externalId` para a repetição ser segura. |

```js title="Uma função pequena com novas tentativas (Node.js)"
async function emmitec(path, init = {}, tentativa = 0) {
  const res = await fetch(`${process.env.EMMITEC_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.EMMITEC_KEY}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  const repetivel = res.status === 429 || res.status >= 500
  if (repetivel && tentativa < 4) {
    const espera = Number(res.headers.get('Retry-After')) || 2 ** tentativa
    await new Promise((r) => setTimeout(r, espera * 1000))
    return emmitec(path, init, tentativa + 1)
  }
  const corpo = await res.json()
  if (!res.ok) {
    const erro = new Error(`${corpo.error.code}: ${corpo.error.message}`)
    erro.requestId = corpo.error.requestId
    throw erro
  }
  return corpo
}
```

No app, o SDK entrega os erros da API como `EmmiTecApiError`, com os mesmos `status`, `code`, `message`, `param` e `requestId`. Ele já repete o `429` depois do `Retry-After`, pede um token novo ao seu `onTokenExpired` num `401` e guarda as medições na [fila offline](/developers/sdk#fila-offline) em erros de rede, tempo esgotado e `5xx` ou `429` persistentes.

## Limite de chamadas

Cada chave secreta e cada token de sessão podem fazer **30 chamadas por segundo**. Acima disso, a API responde `429 rate_limited` com o cabeçalho `Retry-After` em segundos.

Cada celular tem o próprio token de sessão, então o limite do app de um paciente nunca afeta os outros. Para mandar muitas medições, use o `POST /readings/batch` (até 100 por chamada) em vez de uma chamada por medição.

## Ids de requisição

Toda resposta tem `X-Request-Id` (por exemplo `req_01JDJ3K8Q5R4T6V8X0Z2B4D6F8`), e todo erro repete esse valor em `requestId`. Guarde no log junto do id da sua própria requisição. Quando falar com a EmmiTec sobre um problema, mande esse id: é o jeito mais rápido de achar a chamada.

::: next
- [Versões e changelog](/developers/changelog) Como a API evolui.
- [Testes e sandbox](/developers/testing) O checklist antes da produção.
:::
