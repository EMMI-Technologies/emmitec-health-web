<script setup lang="ts">
/**
 * Integrações: página comercial para empresas que já têm o próprio app (Expo / React Native)
 * e querem só o RPM da EmmiTec: o SDK lê os aparelhos Bluetooth dentro do app delas, as leituras
 * ficam na EmmiTec e o alerta volta pronto para virar notificação. Tudo o que a página promete
 * está em docs/integracao/partner-api-v1-contrato.md (fonte da verdade).
 *
 * Hero → (01) três passos → (02) o alerta: notificação + JSON do webhook → (03) o que vem
 * incluído → (04) trecho de código do SDK → (05) segurança → CTA da chave de sandbox.
 * O CSS vive no fim deste arquivo (prefixo em-int-), dentro de @layer components como o
 * emmitec.css.
 */
import { computed, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Ban,
  Bluetooth,
  Braces,
  FlaskConical,
  HeartPulse,
  KeyRound,
  Languages,
  Layers,
  Lock,
  Smartphone,
  Webhook,
} from 'lucide-vue-next'

import EmPageHero from '@/components/em/EmPageHero.vue'
import EmButton from '@/components/em/EmButton.vue'
import EmSplit from '@/components/em/EmSplit.vue'
import EmCta from '@/components/em/EmCta.vue'
import { CONTACT_EMAIL, calendlyUrl } from '@/lib/site'
import { usePageMeta } from '@/lib/seo'

const { t, locale } = useI18n()

usePageMeta(() => ({
  title: t('integrationsPage.meta.title'),
  description: t('integrationsPage.meta.description'),
}))

const P = 'integrationsPage'
const pad = (n: number) => String(n).padStart(2, '0')

/* ── (01) três passos ── */
const steps = computed(() =>
  [1, 2, 3].map((n) => ({
    title: t(`${P}.how.step${n}.title`),
    desc: t(`${P}.how.step${n}.desc`),
  })),
)

/* ── (02) o alerta: o mesmo texto no celular e no JSON, no idioma da página ── */
const alert = computed(() => ({
  title: t(`${P}.payload.alert.title`),
  text: t(`${P}.payload.alert.text`),
  reason: t(`${P}.payload.alert.reason`),
}))

type Tok = { c: string; t: string }
type Line = { indent: number; toks: Tok[]; hl: boolean }

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

/**
 * Trecho do evento reading.alert (envelope do webhook, seção 4.5 do contrato). Só title e text
 * ficam destacados: são as duas linhas que aparecem na notificação ao lado.
 */
const webhookLines = computed<Line[]>(() => {
  const q = (v: string) => JSON.stringify(v)
  const a = alert.value
  const rows: [string, boolean?][] = [
    ['{'],
    ['  "id": "evt_9b2c4f0e1a7d4c3b8e6f5a4d3c2b1a09",'],
    ['  "type": "reading.alert",'],
    ['  "mode": "live",'],
    ['  "data": {'],
    ['    "patient": { "externalId": "acme-user-123" },'],
    ['    "reading": {'],
    ['      "type": "blood_pressure",'],
    ['      "measuredAt": "2026-11-24T14:03:00Z",'],
    ['      "values": { "systolic": 182, "diastolic": 88, "pulse": 76 },'],
    ['      "unit": "mmHg",'],
    ['      "device": { "model": "td3140", "name": "TaiDoc TD-3140" },'],
    ['      "level": "critical_high"'],
    ['    },'],
    ['    "alert": {'],
    ['      "level": "critical_high",'],
    [`      "title": ${q(a.title)},`, true],
    [`      "text": ${q(a.text)},`, true],
    [`      "reason": ${q(a.reason)},`],
    [`      "locale": "${locale.value}"`],
    ['    }'],
    ['  }'],
    ['}'],
  ]
  return rows.map(([s, hl]) => jsonLine(s, !!hl))
})

/** Os quatro campos que viram a notificação (nomes exatos do contrato). */
const fields = computed(() =>
  (['title', 'text', 'reason', 'reading'] as const).map((k) => ({
    name: k === 'reading' ? 'data.reading' : `alert.${k}`,
    desc: t(`${P}.payload.fields.${k}`),
  })),
)

/* ── (03) o que vem incluído ── */
const features = computed<{ id: string; icon: Component; to?: string }[]>(() => [
  { id: 'api', icon: Braces },
  { id: 'sdk', icon: Smartphone },
  { id: 'webhooks', icon: Webhook },
  { id: 'sandbox', icon: FlaskConical },
  { id: 'devices', icon: Bluetooth, to: '/equipment' },
  { id: 'locales', icon: Languages },
])

/* ── (04) trecho do SDK: 10 linhas, com o idioma da página no locale e no botão ── */
const TS_RE =
  /(\/\/.*$)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|\b(import|from|export|function|const|if|return)\b|(<\/?[A-Z]\w*|\/>)|\b([a-zA-Z_]\w*)(?=\()/g
function tsLine(src: string): Line {
  const s = src.trimStart()
  const toks: Tok[] = []
  let last = 0
  for (const m of s.matchAll(TS_RE)) {
    const at = m.index ?? 0
    if (at > last) toks.push({ c: '', t: s.slice(last, at) })
    const c = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'kw' : m[4] ? 'tag' : 'fn'
    toks.push({ c, t: m[0] })
    last = at + m[0].length
  }
  if (last < s.length) toks.push({ c: '', t: s.slice(last) })
  return { indent: src.length - s.length, toks, hl: false }
}
const codeLines = computed<Line[]>(() =>
  [
    `import { EmmiTec, useMeasurement } from '@emmitec/rpm'`,
    ``,
    `EmmiTec.configure({ sessionToken, locale: '${locale.value}' })`,
    `EmmiTec.on('alert', (a) => sendPush(a.title, a.text))`,
    ``,
    `export function BloodPressure() {`,
    `  const m = useMeasurement('blood_pressure')`,
    `  if (m.reading) return <Reading value={m.reading} />`,
    `  return <Button title="${t(`${P}.code.button`)}" onPress={() => m.start()} />`,
    `}`,
  ].map(tsLine),
)

/* ── (05) segurança ── */
const security = computed(() =>
  [
    { id: 'secret', icon: KeyRound },
    { id: 'session', icon: Smartphone },
    { id: 'revoke', icon: Ban },
    { id: 'separate', icon: Layers },
    { id: 'https', icon: Lock },
  ].map((s) => ({ ...s, text: t(`${P}.security.items.${s.id}`) })),
)

/* ── CTA: e-mail com assunto e um roteiro curto para o pedido da chave ── */
const sandboxMail = computed(
  () =>
    `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t(`${P}.cta.mailSubject`))}` +
    `&body=${encodeURIComponent(t(`${P}.cta.mailBody`))}`,
)
</script>

<template>
  <div class="em-int-page">
    <!-- acesso direto para quem já é parceiro: docs (/developers) e portal do cliente (/portal) -->
    <nav class="em-int-access" :aria-label="t(`${P}.access.label`)">
      <RouterLink to="/developers" class="em-int-access__link">
        <Braces :stroke-width="1.8" aria-hidden="true" />{{ t(`${P}.access.developers`) }}
      </RouterLink>
      <RouterLink to="/portal" class="em-int-access__link">
        <KeyRound :stroke-width="1.8" aria-hidden="true" />{{ t(`${P}.access.portal`) }}
      </RouterLink>
    </nav>

    <!-- ════════ HERO ════════ -->
    <EmPageHero
      :eyebrow="t(`${P}.hero.badge`)"
      :title="t(`${P}.hero.title`)"
      :em="t(`${P}.hero.titleEm`)"
      :subtitle="t(`${P}.hero.subtitle`)"
    >
      <template #actions>
        <EmButton to="/developers" :label="t(`${P}.hero.docs`)" />
        <EmButton :href="calendlyUrl" variant="ghost" :label="t(`${P}.hero.talk`)" />
      </template>
    </EmPageHero>

    <!-- ════════ (01) COMO FUNCIONA ════════ -->
    <section id="como-funciona" class="em-section">
      <div class="em-wrap">
        <div class="em-head">
          <div>
            <span v-reveal class="em-eyebrow">{{ t(`${P}.how.badge`) }}</span>
            <EmSplit :text="t(`${P}.how.title`)" :em="t(`${P}.how.titleEm`)" />
          </div>
          <p v-reveal="150">{{ t(`${P}.how.subtitle`) }}</p>
        </div>
        <ol class="em-int-steps">
          <li v-for="(s, i) in steps" :key="i" v-reveal="i * 110" class="em-int-step">
            <span class="em-int-step__n" aria-hidden="true">{{ pad(i + 1) }}</span>
            <h3>{{ s.title }}</h3>
            <p>{{ s.desc }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- ════════ (02) O ALERTA PRONTO PARA VIRAR NOTIFICAÇÃO ════════ -->
    <section id="alerta" class="em-section em-section--tint">
      <div class="em-wrap">
        <div class="em-head">
          <div>
            <span v-reveal class="em-eyebrow">{{ t(`${P}.payload.badge`) }}</span>
            <EmSplit :text="t(`${P}.payload.title`)" :em="t(`${P}.payload.titleEm`)" />
          </div>
          <p v-reveal="150">{{ t(`${P}.payload.subtitle`) }}</p>
        </div>

        <div class="em-int-payload">
          <!-- tela de bloqueio do app do parceiro com a notificação montada a partir do alerta -->
          <figure
            v-reveal:scale="100"
            class="em-int-phone"
            :aria-label="t(`${P}.payload.phoneAria`)"
          >
            <div class="em-int-phone__screen">
              <span class="em-int-phone__island" aria-hidden="true" />
              <p class="em-int-phone__date">{{ t(`${P}.payload.date`) }}</p>
              <p class="em-int-phone__clock" aria-hidden="true">9:41</p>
              <div class="em-int-notif">
                <span class="em-int-notif__icon" aria-hidden="true"
                  ><HeartPulse :stroke-width="1.9"
                /></span>
                <div>
                  <div class="em-int-notif__top">
                    <span>{{ t(`${P}.payload.appName`) }}</span>
                    <small>{{ t(`${P}.payload.now`) }}</small>
                  </div>
                  <strong>{{ alert.title }}</strong>
                  <p>{{ alert.text }}</p>
                </div>
              </div>
              <span class="em-int-phone__bar" aria-hidden="true" />
            </div>
          </figure>

          <!-- a requisição que chega no servidor do parceiro -->
          <figure v-reveal="200" class="em-int-code" :aria-label="t(`${P}.payload.codeAria`)">
            <div class="em-int-code__req">
              <span class="em-int-code__ln" style="--in: 0"
                ><b class="tk-m">POST</b> /webhooks/emmitec</span
              >
              <span class="em-int-code__ln em-int-code__hd" style="--in: 0"
                ><span>EmmiTec-Event-Type:</span> reading.alert</span
              >
              <span class="em-int-code__ln em-int-code__hd" style="--in: 0"
                ><span>EmmiTec-Signature:</span> t=1795528982,v1=5d1fa09c…</span
              >
            </div>
            <code class="em-int-code__body">
              <span
                v-for="(ln, i) in webhookLines"
                :key="i"
                class="em-int-code__ln"
                :class="{ 'is-hl': ln.hl }"
                :style="{ '--in': ln.indent }"
                ><span v-for="(tk, j) in ln.toks" :key="j" :class="tk.c && `tk-${tk.c}`">{{
                  tk.t
                }}</span></span
              >
            </code>
          </figure>
        </div>

        <dl class="em-int-fields">
          <div v-for="(f, i) in fields" :key="f.name" v-reveal="i * 90">
            <dt>{{ f.name }}</dt>
            <dd>{{ f.desc }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- ════════ (03) O QUE VEM INCLUÍDO ════════ -->
    <section id="incluido" class="em-section">
      <div class="em-wrap">
        <div class="em-head">
          <div>
            <span v-reveal class="em-eyebrow">{{ t(`${P}.features.badge`) }}</span>
            <EmSplit :text="t(`${P}.features.title`)" :em="t(`${P}.features.titleEm`)" />
          </div>
          <p v-reveal="150">{{ t(`${P}.features.subtitle`) }}</p>
        </div>
        <ul class="em-int-feats">
          <li v-for="(f, i) in features" :key="f.id" v-reveal="(i % 3) * 90" class="em-int-feat">
            <component :is="f.icon" :stroke-width="1.7" aria-hidden="true" />
            <h3>{{ t(`${P}.features.items.${f.id}.title`) }}</h3>
            <p>{{ t(`${P}.features.items.${f.id}.desc`) }}</p>
            <RouterLink v-if="f.to" :to="f.to" class="em-int-link"
              >{{ t(`${P}.features.items.${f.id}.link`) }}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </RouterLink>
          </li>
        </ul>
      </div>
    </section>

    <!-- ════════ (04) O SDK EM DEZ LINHAS ════════ -->
    <section id="sdk" class="em-section em-section--tint">
      <div class="em-wrap em-def em-int-sdk">
        <div class="em-def__txt">
          <span v-reveal class="em-eyebrow">{{ t(`${P}.code.badge`) }}</span>
          <EmSplit class="em-h2" :text="t(`${P}.code.title`)" :em="t(`${P}.code.titleEm`)" />
          <p v-reveal="120" class="em-def__lead">{{ t(`${P}.code.text`) }}</p>
          <p v-reveal="180" class="em-int-note">{{ t(`${P}.code.note`) }}</p>
          <div v-reveal="240" class="em-def__cta">
            <EmButton to="/developers/sdk" variant="dark" :label="t(`${P}.code.link`)" />
          </div>
        </div>
        <figure
          v-reveal:scale="150"
          class="em-int-code em-int-code--ts"
          :aria-label="t(`${P}.code.codeAria`)"
        >
          <div class="em-int-code__req">
            <span class="em-int-code__ln em-int-code__file" style="--in: 0">BloodPressure.tsx</span>
          </div>
          <code class="em-int-code__body">
            <span
              v-for="(ln, i) in codeLines"
              :key="i"
              class="em-int-code__ln"
              :style="{ '--in': ln.indent }"
              ><i class="em-int-code__no" aria-hidden="true">{{ i + 1 }}</i
              ><span v-for="(tk, j) in ln.toks" :key="j" :class="tk.c && `tk-${tk.c}`">{{
                tk.t
              }}</span
              ><template v-if="!ln.toks.length">{{ ' ' }}</template></span
            >
          </code>
        </figure>
      </div>
    </section>

    <!-- ════════ (05) SEGURANÇA E DADOS ════════ -->
    <section id="seguranca" class="em-section">
      <div class="em-wrap em-int-sec">
        <div class="em-int-sec__head">
          <span v-reveal class="em-eyebrow">{{ t(`${P}.security.badge`) }}</span>
          <EmSplit
            class="em-h2"
            :text="t(`${P}.security.title`)"
            :em="t(`${P}.security.titleEm`)"
          />
          <p v-reveal="120" class="em-def__p">{{ t(`${P}.security.text`) }}</p>
        </div>
        <ul class="em-int-sec__list">
          <li v-for="(s, i) in security" :key="s.id" v-reveal="i * 80">
            <component :is="s.icon" :stroke-width="1.7" aria-hidden="true" />
            <span>{{ s.text }}</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- ════════ CTA ════════ -->
    <EmCta
      :badge="t(`${P}.cta.badge`)"
      :title="t(`${P}.cta.title`)"
      :em="t(`${P}.cta.titleEm`)"
      :subtitle="t(`${P}.cta.subtitle`)"
      :primary="{ label: t(`${P}.cta.primary`), href: sandboxMail }"
      :secondary="{ label: t(`${P}.cta.secondary`), to: '/developers' }"
    />
  </div>
</template>

<style>
@layer components {
  /* ---------- Integrações (/integrations) ---------- */
  .em-int-page {
    --int-rule: rgba(14, 17, 23, 0.14);
    --int-mono:
      ui-monospace, 'SFMono-Regular', 'Cascadia Mono', 'Segoe UI Mono', Menlo, Consolas, monospace;
  }
  /* atalhos Developers e Portal do cliente: no alto do hero, entre o logo e o menu */
  .em-int-page {
    position: relative;
  }
  .em-int-access {
    position: absolute;
    z-index: 5;
    top: 16px;
    left: 50%;
    display: flex;
    gap: 2px;
    padding: 5px;
    border-radius: var(--radius-pill);
    background: rgba(255, 255, 255, 0.58);
    -webkit-backdrop-filter: blur(16px) saturate(1.4);
    backdrop-filter: blur(16px) saturate(1.4);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.75),
      0 8px 24px rgba(14, 17, 23, 0.05);
    transform: translateX(-50%);
  }
  .em-int-access__link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 42px;
    padding: 0 18px;
    border-radius: var(--radius-pill);
    color: var(--ink);
    font-size: 15px;
    font-weight: 500;
    white-space: nowrap;
    transition: background var(--dur-fast) var(--em-ease-out);
  }
  .em-int-access__link:hover {
    background: rgba(255, 255, 255, 0.9);
  }
  .em-int-access__link svg {
    width: 17px;
    height: 17px;
    color: var(--cyan-700);
  }
  @media (max-width: 900px) {
    .em-int-access {
      top: 84px;
    }
    .em-int-access__link {
      height: 38px;
      padding: 0 14px;
      font-size: 14.5px;
    }
  }

  /* títulos sem palavra sozinha na última linha (ex.: "app" no hero) */
  .em-int-page .em-split,
  .em-int-page h3 {
    text-wrap: balance;
  }

  /* (01) três passos: colunas abertas, número grande em serif */
  .em-int-steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 40px;
  }
  .em-int-step {
    border-top: 1px solid var(--int-rule);
    padding-top: 26px;
  }
  .em-int-step__n {
    display: block;
    font-family: var(--font-serif);
    font-style: italic;
    font-size: 64px;
    line-height: 1;
    letter-spacing: -0.02em;
    color: var(--cyan-700);
  }
  .em-int-step h3 {
    margin: 30px 0 0;
    font-size: clamp(24px, 2.2vw, 30px);
    line-height: 1.12;
    letter-spacing: -0.03em;
    font-weight: 500;
  }
  .em-int-step p {
    margin: 14px 0 0;
    font-size: 17px;
    line-height: 1.6;
    color: var(--ink-muted);
    max-width: 36ch;
  }

  /* (02) celular + requisição */
  .em-int-payload {
    display: grid;
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    gap: 56px;
    align-items: center;
  }
  .em-int-phone {
    margin: 0;
    justify-self: center;
    width: min(100%, 320px);
    aspect-ratio: 320 / 640;
    padding: 10px;
    border-radius: 54px;
    background: var(--night-900);
    box-shadow:
      0 40px 70px -30px rgba(14, 17, 23, 0.45),
      inset 0 0 0 2px #2a303b;
  }
  .em-int-phone__screen {
    position: relative;
    height: 100%;
    border-radius: 44px;
    overflow: hidden;
    padding: 70px 12px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: linear-gradient(168deg, #d8f8f8 0%, #dbe9ff 55%, #eee1fe 100%);
  }
  .em-int-phone__island {
    position: absolute;
    top: 12px;
    left: 50%;
    width: 96px;
    height: 28px;
    margin-left: -48px;
    border-radius: 20px;
    background: var(--night-900);
  }
  .em-int-phone__date {
    margin: 0;
    font-size: 15px;
    font-weight: 500;
    color: #3b4350;
  }
  .em-int-phone__clock {
    margin: 0;
    font-size: 86px;
    font-weight: 500;
    line-height: 1;
    letter-spacing: -0.05em;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  .em-int-notif {
    margin-top: 44px;
    width: 100%;
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr);
    gap: 11px;
    padding: 13px 14px 15px 12px;
    border-radius: 24px;
    text-align: left;
    background: rgba(255, 255, 255, 0.86);
    -webkit-backdrop-filter: blur(18px);
    backdrop-filter: blur(18px);
    box-shadow: 0 16px 34px -14px rgba(14, 17, 23, 0.28);
  }
  .em-int-notif__icon {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: var(--night-900);
    color: var(--cyan-300);
  }
  .em-int-notif__icon svg {
    width: 20px;
    height: 20px;
  }
  .em-int-notif__top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    font-size: 12.5px;
    font-weight: 500;
    color: #4a5565;
  }
  .em-int-notif__top small {
    font-size: 12.5px;
  }
  .em-int-notif strong {
    display: block;
    margin-top: 3px;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.3;
    color: var(--ink);
  }
  .em-int-notif p {
    margin: 3px 0 0;
    font-size: 14px;
    line-height: 1.4;
    color: var(--ink);
  }
  .em-int-phone__bar {
    position: absolute;
    bottom: 10px;
    left: 50%;
    width: 120px;
    height: 5px;
    margin-left: -60px;
    border-radius: 4px;
    background: rgba(14, 17, 23, 0.55);
  }

  /* bloco de código escuro (requisição do webhook e trecho do SDK) */
  .em-int-code {
    margin: 0;
    min-width: 0;
    padding: 22px 0 24px;
    border-radius: 26px;
    background: var(--night-900);
    color: #e6edf3;
    font-family: var(--int-mono);
    font-size: 13.5px;
    line-height: 1.75;
    box-shadow: 0 40px 70px -34px rgba(14, 17, 23, 0.55);
  }
  .em-int-code__req {
    padding-bottom: 14px;
    margin-bottom: 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  }
  .em-int-code__body {
    display: block;
    font: inherit;
  }
  .em-int-code__ln {
    --pad: 26px;
    position: relative;
    display: block;
    padding: 0 var(--pad) 0 calc(var(--pad) + (var(--in, 0) + 2) * 1ch);
    text-indent: -2ch;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .em-int-code__ln.is-hl {
    background: rgba(17, 211, 211, 0.13);
  }
  .em-int-code__hd {
    color: #c3ccd8;
  }
  .em-int-code__hd > span:first-child,
  .em-int-code__file {
    color: #9aa5b4;
  }
  .em-int-code .tk-m {
    font-weight: 700;
    color: var(--cyan-300);
  }
  .em-int-code .tk-k {
    color: var(--cyan-300);
  }
  .em-int-code .tk-s {
    color: #c9f2e3;
  }
  .em-int-code .tk-n,
  .em-int-code .tk-l {
    color: #ffd6a3;
  }
  .em-int-code .tk-p {
    color: #8a94a3;
  }
  .em-int-code .tk-kw {
    color: #d2bcff;
  }
  .em-int-code .tk-fn {
    color: #a9d4ff;
  }
  .em-int-code .tk-tag {
    color: var(--cyan-300);
  }
  .em-int-code .tk-c {
    color: #8a94a3;
    font-style: italic;
  }
  /* trecho do SDK: números de linha (confirmam as "dez linhas") */
  .em-int-code--ts .em-int-code__ln {
    padding-left: calc(var(--pad) + 4ch + (var(--in, 0) + 2) * 1ch);
  }
  .em-int-code--ts .em-int-code__file {
    padding-left: calc(var(--pad) + 2ch);
  }
  .em-int-code__no {
    position: absolute;
    left: var(--pad);
    width: 2ch;
    text-align: right;
    text-indent: 0;
    font-style: normal;
    color: #6f7a8a;
    user-select: none;
  }

  /* os quatro campos, em colunas abertas */
  .em-int-fields {
    margin: 80px 0 0;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 32px;
  }
  .em-int-fields > div {
    border-top: 1px solid var(--int-rule);
    padding-top: 20px;
  }
  .em-int-fields dt {
    font-family: var(--int-mono);
    font-size: 14.5px;
    font-weight: 600;
    color: var(--cyan-700);
  }
  .em-int-fields dd {
    margin: 10px 0 0;
    font-size: 16px;
    line-height: 1.55;
    color: var(--ink-muted);
  }

  /* (03) o que vem incluído */
  .em-int-feats {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 64px 48px;
  }
  .em-int-feat {
    border-top: 1px solid var(--int-rule);
    padding-top: 28px;
  }
  .em-int-feat > svg {
    width: 26px;
    height: 26px;
    color: var(--cyan-700);
  }
  .em-int-feat h3 {
    margin: 22px 0 0;
    font-size: 24px;
    line-height: 1.15;
    letter-spacing: -0.025em;
    font-weight: 500;
  }
  .em-int-feat p {
    margin: 10px 0 0;
    font-size: 16.5px;
    line-height: 1.6;
    color: var(--ink-muted);
    max-width: 38ch;
  }
  .em-int-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 14px;
    font-size: 15px;
    font-weight: 600;
    color: var(--cyan-700);
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 4px;
  }
  .em-int-link svg {
    width: 16px;
    height: 16px;
    transition: translate var(--dur-fast) var(--em-ease-out);
  }
  .em-int-link:hover svg {
    translate: 3px 0;
  }

  /* (04) texto + código: o código ganha mais largura para as linhas não quebrarem */
  .em-int-sdk {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    gap: 64px;
  }
  .em-int-note {
    margin: 18px 0 0;
    font-size: 15px;
    line-height: 1.6;
    color: var(--ink-muted);
    max-width: 46ch;
  }

  /* (05) segurança: título à esquerda, lista aberta à direita */
  .em-int-sec {
    display: grid;
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    gap: 72px;
    align-items: start;
  }
  .em-int-sec__list {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--int-rule);
  }
  .em-int-sec__list li {
    display: grid;
    grid-template-columns: 26px minmax(0, 1fr);
    gap: 18px;
    padding: 24px 0;
    border-bottom: 1px solid var(--int-rule);
    font-size: 19px;
    line-height: 1.5;
    letter-spacing: -0.01em;
    color: var(--ink);
  }
  .em-int-sec__list svg {
    width: 24px;
    height: 24px;
    margin-top: 2px;
    color: var(--cyan-700);
  }

  @media (max-width: 1100px) {
    .em-int-payload {
      gap: 40px;
    }
    .em-int-feats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .em-int-fields {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 900px) {
    .em-int-steps,
    .em-int-payload,
    .em-int-sdk,
    .em-int-sec {
      grid-template-columns: minmax(0, 1fr);
    }
    .em-int-sdk {
      gap: 36px;
    }
    .em-int-steps {
      gap: 36px;
    }
    .em-int-step h3 {
      margin-top: 20px;
    }
    .em-int-sec {
      gap: 36px;
    }
    .em-int-fields {
      margin-top: 56px;
    }
  }
  @media (max-width: 640px) {
    .em-int-feats,
    .em-int-fields {
      grid-template-columns: minmax(0, 1fr);
      gap: 36px;
    }
    .em-int-step__n {
      font-size: 52px;
    }
    .em-int-phone {
      width: min(100%, 290px);
      aspect-ratio: 290 / 560;
    }
    .em-int-phone__screen {
      padding-top: 60px;
    }
    .em-int-phone__clock {
      font-size: 74px;
    }
    .em-int-code {
      font-size: 12.5px;
      border-radius: 22px;
    }
    .em-int-code__ln {
      --pad: 18px;
    }
    .em-int-sec__list li {
      font-size: 17px;
      gap: 14px;
      padding: 20px 0;
    }
  }
}
</style>
