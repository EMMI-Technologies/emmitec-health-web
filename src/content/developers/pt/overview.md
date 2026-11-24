---
title: Leve o RPM da EmmiTec para dentro do seu app
description: Com a Partner API e o SDK para Expo, o seu app lê aparelhos médicos Bluetooth, guarda as medições na plataforma EmmiTec e recebe um alerta pronto para enviar quando um valor sai da faixa.
---

O app continua sendo seu, com a sua marca e as suas notificações. A EmmiTec cuida da parte difícil do monitoramento remoto: conversar com aparelhos Bluetooth certificados, guardar cada medição com o aparelho que a fez, comparar com os limites do paciente e escrever o texto do alerta no idioma dele.

## Como funciona

<figure class="dx-flow">
<ol>
<li data-on="phone"><span class="dx-flow__who">Celular do paciente</span><strong>1. Medir</strong>O paciente usa o medidor de pressão, oxímetro, termômetro, glicosímetro ou balança.</li>
<li data-on="phone"><span class="dx-flow__who">Seu app + SDK da EmmiTec</span><strong>2. Ler e enviar</strong>O SDK lê o aparelho por Bluetooth e envia a medição com o token de sessão do paciente.</li>
<li data-on="emmitec"><span class="dx-flow__who">API da EmmiTec</span><strong>3. Guardar e avaliar</strong>A medição é gravada e comparada com os limites do paciente. A resposta já traz o <code>level</code> e o <code>alert</code>.</li>
<li data-on="emmitec"><span class="dx-flow__who">API da EmmiTec</span><strong>4. Webhook</strong>Se a medição saiu da faixa, a EmmiTec envia um evento <code>reading.alert</code> assinado para o seu servidor.</li>
<li data-on="you"><span class="dx-flow__who">Seu backend</span><strong>5. Decidir</strong>Você confere a assinatura e decide quem avisar: o paciente, um cuidador, o seu suporte.</li>
<li data-on="you"><span class="dx-flow__who">Seu push</span><strong>6. Notificar</strong>Você manda o push com <code>alert.title</code> e <code>alert.text</code>, pelo seu próprio provedor.</li>
</ol>
<figcaption><span data-on="phone">No celular</span><span data-on="emmitec">Na EmmiTec</span><span data-on="you">Do seu lado</span></figcaption>
</figure>

O celular também recebe o alerta na hora, na resposta da medição. Use isso para mostrar um aviso enquanto o app está aberto. Use o webhook para notificações push e tudo o que precisa acontecer no seu servidor.

## O que você integra

| Parte | Onde roda | O que faz |
|---|---|---|
| Partner API | Seu backend | Cria pacientes, gera tokens de sessão, configura o webhook, lê histórico, define limites de alerta. |
| SDK para Expo (`emmitec-rpm`) | Seu app | Permissões de Bluetooth, busca do aparelho, leitura e envio da medição, fila offline. |
| Webhooks | Seu backend | Recebe `reading.alert` (e, se quiser, todo `reading.created`) em chamadas HTTPS assinadas. |
| [Portal do cliente](/developers/customer-portal) | Seu navegador | Mostra o plano, copia e gera chaves, configura o webhook, liga ou desliga os alertas, acompanha as entregas. |

## Teste e produção

A URL base é uma só. Quem decide o modo é a chave.

```text title="URL base"
https://v2-prod-api-patients.emmitec.health/partner/v1
```

| Modo | Chave secreta | Token de sessão | Dados |
|---|---|---|---|
| Teste (`test`) | `emk_test_...` | `emst_test_...` | Uma sandbox isolada. Nenhum profissional de saúde é avisado. Grátis, pode criar e apagar à vontade. |
| Produção (`live`) | `emk_live_...` | `emst_live_...` | O seu cliente real na plataforma EmmiTec. As medições chegam à equipe de cuidado. |

Teste e produção nunca se misturam: a chave de teste não enxerga dados de produção, e cada modo tem os próprios pacientes e o próprio webhook. Dois parceiros nunca veem os pacientes um do outro, nem na sandbox.

Parceiros novos começam com um piloto de 90 dias (plano `trial`). O `GET /ping` devolve o plano e os dias que faltam, e o portal do cliente mostra o mesmo.

::: note Como conseguir as chaves
A EmmiTec cria o seu acesso ao [portal do cliente](/developers/customer-portal), onde você copia as suas chaves quando precisar e gera chaves novas. Peça o acesso em [contato@emmitec.health](mailto:contato@emmitec.health?subject=EmmiTec%20Partner%20API%20keys). Guarde as chaves secretas no seu cofre de segredos, nunca no código.
:::

## Toda resposta diz onde você está

As respostas trazem estes cabeçalhos. Guarde nos seus logs: eles agilizam qualquer pedido de suporte.

| Cabeçalho | Exemplo | Significado |
|---|---|---|
| `X-Request-Id` | `req_01JDJ3K8Q5R4T6V8X0Z2B4D6F8` | Identificador único da chamada, em toda resposta. Mande para a EmmiTec quando relatar um problema. |
| `X-EmmiTec-Mode` | `test` | O modo da chave ou do token usado, em toda resposta autenticada. |

## Próximos passos

::: next
- [Início rápido](/developers/quickstart) Crie um paciente, envie uma medição e receba o primeiro webhook de alerta em uns 10 minutos.
- [Autenticação](/developers/authentication) Chave secreta no servidor, token de sessão no app.
- [Alertas e notificações](/developers/alerts) Transforme o alerta em notificação push ou em aviso dentro do app.
- [SDK para Expo](/developers/sdk) Leia aparelhos Bluetooth no seu app React Native.
:::
