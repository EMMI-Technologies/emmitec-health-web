/*
 * Exemplo do evento reading.alert (contrato, seção 4.5) mostrado em "O que você recebe".
 * Os textos são os reais do backend (sr-backend-patients/src/parceiros/niveis.ts), os mesmos
 * da página /integrations, nos três idiomas do webhook.
 */
import type { Mode, WebhookLocale } from './api'

const ALERT: Record<WebhookLocale, { title: string; text: string; reason: string }> = {
  en: {
    title: 'Very high blood pressure',
    text: 'Your blood pressure reading was 182/88 mmHg, above your safe range. If you feel unwell, contact your care team or emergency services.',
    reason: 'Systolic 182 mmHg is at or above the critical limit of 180 mmHg.',
  },
  pt: {
    title: 'Pressão arterial muito alta',
    text: 'Sua pressão arterial ficou em 182/88 mmHg, acima da sua faixa segura. Se você não estiver se sentindo bem, procure sua equipe de cuidado ou o serviço de emergência.',
    reason: 'Sistólica 182 mmHg está igual ou acima do limite crítico de 180 mmHg.',
  },
  es: {
    title: 'Presión arterial muy alta',
    text: 'Su presión arterial fue de 182/88 mmHg, por encima de su rango seguro. Si no se siente bien, contacte a su equipo de atención o a los servicios de emergencia.',
    reason: 'Sistólica 182 mmHg está en o por encima del límite crítico de 180 mmHg.',
  },
}

export type Tok = { c: string; t: string }
export type Line = { indent: number; toks: Tok[]; hl: boolean }

/** Destaque simples de JSON: chave, texto, número, literal e pontuação. */
const JSON_RE = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?)|\b(true|false|null)\b|([{}[\],])/g
function jsonLine(src: string, hl = false): Line {
  const s = src.trimStart()
  const toks: Tok[] = []
  let last = 0
  for (const m of s.matchAll(JSON_RE)) {
    const at = m.index ?? 0
    if (at > last) toks.push({ c: '', t: s.slice(last, at) })
    if (m[1] && m[2]) toks.push({ c: 'k', t: m[1] }, { c: 'p', t: m[2] })
    else if (m[1]) toks.push({ c: 's', t: m[1] })
    else if (m[3]) toks.push({ c: 'n', t: m[3] })
    else if (m[4]) toks.push({ c: 'l', t: m[4] })
    else toks.push({ c: 'p', t: m[0] })
    last = at + m[0].length
  }
  if (last < s.length) toks.push({ c: '', t: s.slice(last) })
  return { indent: src.length - s.length, toks, hl }
}

export function alertSampleLines(locale: WebhookLocale, mode: Mode): Line[] {
  const a = ALERT[locale]
  const q = (v: string) => JSON.stringify(v)
  const rows: [string, boolean?][] = [
    ['{'],
    ['  "id": "evt_9b2c4f0e1a7d4c3b8e6f5a4d3c2b1a09",'],
    ['  "type": "reading.alert",'],
    [`  "mode": "${mode}",`],
    ['  "createdAt": "2026-11-24T14:03:02Z",'],
    ['  "data": {'],
    ['    "patient": { "id": "3f0c2a8e-...", "externalId": "user-123" },'],
    ['    "reading": {', true],
    ['      "id": "2104455",'],
    ['      "type": "blood_pressure",'],
    ['      "measuredAt": "2026-11-24T14:03:00Z",'],
    ['      "values": { "systolic": 182, "diastolic": 88, "pulse": 76 },'],
    ['      "unit": "mmHg",'],
    ['      "level": "critical_high"'],
    ['    },'],
    ['    "alert": {'],
    ['      "level": "critical_high",'],
    [`      "title": ${q(a.title)},`, true],
    [`      "text": ${q(a.text)},`, true],
    [`      "reason": ${q(a.reason)},`, true],
    [`      "locale": "${locale}"`],
    ['    }'],
    ['  }'],
    ['}'],
  ]
  return rows.map(([s, hl]) => jsonLine(s, !!hl))
}
