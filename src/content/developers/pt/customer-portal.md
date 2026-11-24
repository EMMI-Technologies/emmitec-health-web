---
title: Portal do cliente
description: O lugar da sua equipe para ver o plano, copiar e gerar chaves de API, configurar o webhook, ligar ou desligar os alertas e acompanhar cada entrega. Sem escrever código.
---

O portal do cliente fica em [emmitec.health/portal](https://emmitec.health/portal). Ele é para as pessoas da sua empresa que montam e operam a integração: desenvolvimento, liderança técnica e operação. Quase tudo o que ele faz também dá para fazer pela API; gerar chaves e copiar de novo uma chave ou o segredo do webhook só existem no portal.

## Entrar

- **Quem cria as contas é a EmmiTec**, uma por pessoa, com e-mail e senha. Para pedir a sua, ou a de um colega, escreva para [contato@emmitec.health](mailto:contato@emmitec.health?subject=EmmiTec%20customer%20portal%20access).
- Na primeira vez, você entra com uma senha temporária e o portal pede para escolher a sua: pelo menos 10 caracteres, com letras e números.
- Esqueceu a senha? Peça à EmmiTec uma nova senha temporária.
- Depois de 10 tentativas erradas em 15 minutos com o mesmo e-mail, espere 15 minutos antes de tentar de novo.
- A sessão dura até 12 horas.

## O que dá para fazer lá

| Seção | O que você faz |
|---|---|
| Visão geral | Vê o plano (o piloto e os dias que faltam), o módulo (RPM) e os números de cada modo: pacientes, medições e alertas nos últimos 30 dias, entregas com falha nos últimos 7 dias. |
| Chaves de API | Copia as suas chaves quando precisar e gera chaves novas. |
| Alertas e webhook | Liga ou desliga os alertas, define a URL, os eventos e o idioma do webhook, copia o segredo de assinatura e manda um evento de teste. |
| Limites de alerta | Vê os limites padrão do seu cliente, só para leitura. |
| Entregas | Os últimos 50 eventos enviados ao seu webhook, com o resultado de cada um. |

Um seletor no topo escolhe o modo. Teste e produção têm, cada um, as próprias chaves, o próprio webhook e a própria configuração de alertas, como na API. A produção aparece quando a EmmiTec liga a sua integração ao seu cliente em produção.

## O seu plano

Parceiros novos começam com um **piloto de 90 dias**: plano `trial`. O portal mostra quando ele termina e quantos dias faltam. O seu backend vê o mesmo no `GET /ping`:

```json title="GET /ping (parte da resposta)"
{
  "ok": true,
  "mode": "test",
  "plan": {
    "name": "trial",
    "trialEndsAt": "2027-02-22T14:00:00Z",
    "daysLeft": 90,
    "module": "rpm"
  }
}
```

| `plan.name` | O que quer dizer |
|---|---|
| `trial` | O piloto. O `trialEndsAt` é a data de término e o `daysLeft` faz a contagem regressiva. |
| `active` | Um plano contratado, sem data de término. O `trialEndsAt` e o `daysLeft` vêm `null`. |
| `suspended` | Toda chamada responde `403 forbidden` com a mensagem "This integration is suspended. Contact EmmiTec." |

As chamadas não são bloqueadas sozinhas quando o piloto termina: a EmmiTec conversa com você sobre o próximo passo.

## Chaves de API

- **Copie quando precisar.** As chaves ficam guardadas cifradas, então o portal consegue mostrar de novo sempre que você precisar. Uma chave criada antes de o portal existir pode não aparecer; se ela se perdeu, gere uma nova.
- **Gere.** Dê a cada chave um nome que diga onde ela roda, como "Servidor de produção". As chaves de produção podem ser geradas quando a sua integração tiver um cliente em produção.
- **Sem apagar.** O portal não apaga nem revoga chaves. Para revogar uma (um vazamento, um servidor que você desligou), peça à EmmiTec: a partir daí a chave responde `401`.
- **Troque** sem parar o serviço: gere uma chave nova, publique no seu backend e só então peça à EmmiTec a revogação da antiga.

::: warning Quem recebe uma conta
Qualquer pessoa com conta no portal consegue copiar a sua chave de produção. Dê contas só a quem também teria acesso aos seus segredos de produção, e peça à EmmiTec para desativar a conta de quem sair do projeto.
:::

## Webhook e alertas

O portal e a API mudam as mesmas configurações, então o que você muda num aparece no outro.

| No portal | Equivale a |
|---|---|
| Usar alertas (ligado ou desligado) | `PUT /settings`, veja [Configurar alertas e limites](/developers/alert-settings) |
| URL, eventos e idioma do webhook | `PUT /webhook` |
| Copiar o segredo de assinatura | Só no portal. A API devolve o segredo só quando o webhook é criado e quando você troca o segredo. |
| Enviar teste | `POST /webhook/test`. O teste vai para a URL salva. |
| Entregas | `GET /events`. Para mandar de novo um evento que falhou, use `POST /events/{id}/resend`. |
| Limites de alerta | `GET /thresholds`. Para mudar limites, use `PUT /patients/{id}/thresholds` ou, em produção, `PUT /thresholds`. |

## O portal não faz parte da API

::: note
O portal tem login próprio e rotas internas próprias. Elas não fazem parte da Partner API e podem mudar sem aviso. A sua integração deve chamar só os endpoints da [referência da API](/developers/api-reference), com a sua chave secreta.
:::

::: next
- [Autenticação](/developers/authentication) Onde fica cada chave e cada token.
- [Configurar alertas e limites](/developers/alert-settings) Decida sobre os alertas e defina os limites.
- [Webhooks](/developers/webhooks) Receba e confira os eventos.
:::
