---
title: Versões e changelog
description: A versão principal está na URL e a data da versão da API vem em todo ping e todo webhook. O que mudou, e quando.
---

## Como as versões funcionam

- **Versão principal no caminho.** Tudo neste site é `/partner/v1`.
- **Data da versão da API.** O `GET /ping` devolve o `apiVersion`, e todo envelope de webhook traz o mesmo `apiVersion`. Hoje ele é `2026-11-24`.
- **Versão do SDK.** O `emmitec-rpm` tem a própria numeração, começando em `1.0.0`.

Monte a sua integração para continuar funcionando quando a API crescer: ignore campos que você não conhece, aceite tipos de evento que você não trata (responda `2xx` e siga em frente) e decida pelo `code`, não pelas mensagens de erro.

## Changelog

### 2026-11-24: Partner API v1.1

Só acréscimos: as chamadas que já existiam funcionam como antes, e o `apiVersion` continua `2026-11-24`.

- Plano no `GET /ping`: `plan` com `name` (`trial`, `active` ou `suspended`), `trialEndsAt`, `daysLeft` e `module`. Uma integração suspensa recebe `403 forbidden`.
- Configuração de alertas por modo: `GET /settings` e `PUT /settings` (`alertsEnabled`). Com os alertas desligados, as medições mantêm o `level`, o `alert` vem `null` e o `reading.alert` não é enviado.
- Limites: o `PUT /patients/{id}/thresholds` define os limites de um paciente (os mesmos que a equipe de cuidado vê), o `GET /thresholds` lista os padrões do cliente e o `PUT /thresholds` muda os padrões do seu cliente em produção.
- Alertas por paciente: o `PUT /patients/{id}/alerts` liga ou desliga os alertas de um paciente num tipo.
- [Portal do cliente](/developers/customer-portal) em emmitec.health/portal: plano, chaves que você copia quando precisar, chaves novas, webhook, alertas ligados ou desligados, entregas.
- Página nova: [Configurar alertas e limites](/developers/alert-settings). O arquivo OpenAPI e a coleção do Postman têm os endpoints novos.

### 2026-11-24: Partner API v1 e emmitec-rpm 1.0.0

Primeira versão pública.

- Pacientes: criar (idempotente pelo `externalId`), consultar, listar, atualizar, `GET /me`.
- Tokens de sessão do paciente: gerar e revogar, 7 dias por padrão, até 30 dias.
- Medições: pressão arterial, saturação de oxigênio, temperatura, glicose e peso. Uma a uma ou em lote (até 100), idempotentes pelo `externalId`, com histórico e limites.
- Níveis e alertas: `level`, `levels` e o objeto Alert (`title`, `text`, `reason`, `triggeredBy`) em inglês, português e espanhol.
- Catálogo com 21 aparelhos Bluetooth, mais `manual` e `other`.
- Webhooks: `reading.alert`, `reading.created` e `ping`, assinados com HMAC-SHA256, repetidos por cerca de 22 horas, com registro de eventos e reenvio.
- Sandbox: chaves de teste, `POST /sandbox/simulate-alert`, `POST /webhook/test`.
- SDK para Expo `emmitec-rpm` 1.0.0: config plugin, `useMeasurement`, medições digitadas, fila offline, modo simulado. Publicado no npm como `emmitec-rpm` (`npx expo install emmitec-rpm`).
- [Arquivo OpenAPI 3.1](/developers/openapi.json) e [coleção do Postman](/developers/emmitec-partner-api.postman_collection.json).

::: next
- [Referência da API](/developers/api-reference) Todos os endpoints, com "Test request".
- [Visão geral](/developers) Voltar ao começo.
:::
