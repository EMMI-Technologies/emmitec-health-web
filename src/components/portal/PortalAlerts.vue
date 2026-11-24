<script setup lang="ts">
/**
 * Alertas e webhook, por ambiente:
 * - "Usar alertas" (PUT /portal/settings/{mode});
 * - webhook: URL https, eventos, idioma dos textos (PUT /portal/webhooks/{mode}), "Enviar teste"
 *   (POST .../test, mostra entregue ou o erro), segredo de assinatura com Mostrar / Copiar;
 * - "O que você recebe": exemplo do reading.alert com os campos que viram a notificação.
 */
import { computed, reactive, ref, watch } from 'vue'
import { ArrowRight, Check, CircleCheck, CircleX, Copy, Eye, EyeOff, Lock } from 'lucide-vue-next'
import { usePortalLang } from '@/lib/portal/i18n'
import { portalApi, type WebhookLocale, type WebhookTestResult } from '@/lib/portal/api'
import {
  docsHref,
  errorView,
  modeData,
  portal,
  secrets,
  showToast,
  SUPPORT_EMAIL,
  type ErrorView,
} from '@/lib/portal/store'
import { useReveal } from '@/lib/portal/reveal'
import { alertSampleLines } from '@/lib/portal/sample'
import PortalModeSwitch from './PortalModeSwitch.vue'
import PortalErrorMsg from './PortalErrorMsg.vue'

const { t, lang } = usePortalLang()
const r = useReveal()

const md = computed(() => modeData(portal.mode))
const hook = computed(() => md.value?.webhook ?? null)
const mail = computed(() => `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('portal'))}`)

/* ---------- usar alertas ---------- */
const alertsBusy = ref(false)
const alertsError = ref<ErrorView | null>(null)

async function toggleAlerts() {
  const m = md.value
  if (!m || alertsBusy.value) return
  const mode = portal.mode
  const want = !m.alertsEnabled
  alertsBusy.value = true
  alertsError.value = null
  try {
    const res = await portalApi.saveSettings(mode, want)
    const target = modeData(mode)
    if (target) target.alertsEnabled = res.alertsEnabled
    showToast(res.alertsEnabled ? t('al.alertsOn') : t('al.alertsOff'))
  } catch (e) {
    alertsError.value = errorView(e)
  } finally {
    alertsBusy.value = false
  }
}

/* ---------- formulário do webhook ---------- */
const EVENTS = ['reading.alert', 'reading.created'] as const
const LOCALES: WebhookLocale[] = ['en', 'pt', 'es']

const form = reactive({
  url: '',
  events: ['reading.alert'] as string[],
  locale: 'en' as WebhookLocale,
})
const saving = ref(false)
const saveError = ref<ErrorView | null>(null)
const urlInvalid = ref(false)

function load() {
  const w = hook.value
  form.url = w?.url ?? ''
  form.events = w ? [...w.events] : ['reading.alert']
  form.locale = w?.locale ?? (lang.value === 'pt' ? 'pt' : 'en')
  saveError.value = null
  urlInvalid.value = false
}

const dirty = computed(() => {
  const w = hook.value
  if (!w) return !!form.url.trim()
  return (
    form.url.trim() !== w.url ||
    form.locale !== w.locale ||
    [...form.events].sort().join() !== [...w.events].sort().join()
  )
})

async function save() {
  saveError.value = null
  const url = form.url.trim()
  urlInvalid.value = !/^https:\/\/[^\s/]+\.[^\s]+$/i.test(url)
  if (urlInvalid.value) {
    saveError.value = { message: t('al.errUrl'), requestId: null }
    return
  }
  if (!form.events.length) {
    saveError.value = { message: t('al.errEvents'), requestId: null }
    return
  }
  const mode = portal.mode
  saving.value = true
  try {
    const res = await portalApi.saveWebhook(mode, {
      url,
      events: EVENTS.filter((e) => form.events.includes(e)),
      locale: form.locale,
    })
    const target = modeData(mode)
    if (target) target.webhook = res.webhook
    if (res.secret) {
      // primeira criação: o segredo já vem na resposta
      secrets.set(`wh:${mode}`, res.secret)
      r.shown.add(`wh:${mode}`)
    }
    showToast(t('al.saved'))
  } catch (e) {
    saveError.value = errorView(e)
    urlInvalid.value = (e as { param?: string }).param === 'url'
  } finally {
    saving.value = false
  }
}

/* ---------- teste ---------- */
const testing = ref(false)
const testResult = ref<WebhookTestResult | null>(null)
const testError = ref<ErrorView | null>(null)

async function sendTest() {
  testing.value = true
  testResult.value = null
  testError.value = null
  try {
    testResult.value = await portalApi.testWebhook(portal.mode)
  } catch (e) {
    testError.value = errorView(e)
  } finally {
    testing.value = false
  }
}

watch(
  () => [portal.mode, hook.value?.updatedAt],
  () => load(),
  { immediate: true },
)
watch(
  () => portal.mode,
  () => {
    testResult.value = null
    testError.value = null
    alertsError.value = null
  },
)

/* ---------- segredo de assinatura ---------- */
const whId = computed(() => `wh:${portal.mode}`)
const fetchWhSecret = () => {
  const mode = portal.mode
  return async () => (await portalApi.webhookSecret(mode)).secret
}
const maskedHint = computed(() => {
  const h = hook.value?.secretHint ?? 'whsec_'
  return h.includes('...') ? h.replace('...', '••••••••••••') : `${h}••••••••••••`
})

/* ---------- exemplo ---------- */
const sample = computed(() => alertSampleLines(form.locale, portal.mode))
const fields = computed(() => [
  { name: 'alert.title', desc: t('al.field.title') },
  { name: 'alert.text', desc: t('al.field.text') },
  { name: 'alert.reason', desc: t('al.field.reason') },
  { name: 'data.reading', desc: t('al.field.reading') },
])
</script>

<template>
  <section class="po-section" aria-labelledby="po-al-title">
    <div class="po-head">
      <div class="po-head__txt">
        <h1 id="po-al-title" class="po-h1">{{ t('nav.alerts') }}</h1>
        <p class="po-lead">{{ t('al.lead') }}</p>
      </div>
      <PortalModeSwitch />
    </div>

    <p v-if="!md" class="po-locked" style="margin-top: 36px">
      <Lock :size="17" :stroke-width="1.8" aria-hidden="true" />
      <span>{{ t('keys.liveLocked') }}</span>
      <a :href="mail">{{ SUPPORT_EMAIL }}</a>
    </p>

    <template v-else>
      <!-- usar alertas -->
      <div class="po-block po-block--first">
        <div class="po-setting">
          <div>
            <h2 id="po-al-switch" class="po-h2">{{ t('al.useAlerts') }}</h2>
            <p class="po-sub">
              {{ md.alertsEnabled ? t('al.useAlertsOn') : t('al.useAlertsOff') }}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            class="po-switch"
            :aria-checked="md.alertsEnabled"
            aria-labelledby="po-al-switch"
            :disabled="alertsBusy"
            @click="toggleAlerts"
          />
        </div>
        <PortalErrorMsg :error="alertsError" />
      </div>

      <!-- webhook -->
      <div class="po-block">
        <div class="po-block__head">
          <div>
            <h2 class="po-h2">{{ t('al.webhook') }}</h2>
            <p class="po-sub">{{ hook ? t('al.webhookLead') : t('al.notSet') }}</p>
          </div>
          <span v-if="hook && !hook.active" class="po-chip po-chip--muted">{{
            t('al.inactive')
          }}</span>
        </div>

        <form class="po-form" novalidate @submit.prevent="save">
          <div class="po-field">
            <label class="po-field__label" for="po-wh-url">{{ t('al.url') }}</label>
            <input
              id="po-wh-url"
              v-model="form.url"
              class="po-input po-input--mono"
              type="url"
              inputmode="url"
              spellcheck="false"
              autocomplete="off"
              placeholder="https://api.suaempresa.com/webhooks/emmitec"
              :aria-invalid="urlInvalid"
              aria-describedby="po-wh-url-hint"
            />
            <p id="po-wh-url-hint" class="po-field__hint">{{ t('al.urlHint') }}</p>
          </div>

          <fieldset class="po-form__row">
            <legend class="po-field__label">{{ t('al.events') }}</legend>
            <label v-for="ev in EVENTS" :key="ev" class="po-check">
              <input v-model="form.events" type="checkbox" :value="ev" />
              <div>
                <code>{{ ev }}</code>
                <span>{{ ev === 'reading.alert' ? t('al.ev.alert') : t('al.ev.created') }}</span>
              </div>
            </label>
          </fieldset>

          <fieldset class="po-form__row">
            <legend class="po-field__label">{{ t('al.locale') }}</legend>
            <div class="po-seg" role="group">
              <button
                v-for="l in LOCALES"
                :key="l"
                type="button"
                class="po-seg__opt"
                :class="{ 'is-on': form.locale === l }"
                :aria-pressed="form.locale === l"
                @click="form.locale = l"
              >
                {{ t(`al.locale.${l}`) }}
              </button>
            </div>
          </fieldset>

          <PortalErrorMsg :error="saveError" />

          <div class="po-form__actions">
            <button type="submit" class="po-btn" :disabled="saving || (!!hook && !dirty)">
              {{ saving ? t('al.saving') : t('al.save') }}
            </button>
            <button
              type="button"
              class="po-btn po-btn--line"
              :disabled="!hook || testing"
              @click="sendTest"
            >
              {{ testing ? t('al.testing') : t('al.test') }}
            </button>
          </div>
          <p v-if="!hook" class="po-field__hint">{{ t('al.testNeedsSave') }}</p>
          <p v-else-if="dirty" class="po-field__hint">{{ t('al.testUnsaved') }}</p>

          <div
            v-if="testResult"
            class="po-result"
            :class="testResult.delivered ? 'po-result--ok' : 'po-result--bad'"
            role="status"
          >
            <CircleCheck
              v-if="testResult.delivered"
              :size="18"
              :stroke-width="1.9"
              aria-hidden="true"
            />
            <CircleX v-else :size="18" :stroke-width="1.9" aria-hidden="true" />
            <div>
              <template v-if="testResult.delivered">
                {{
                  t('al.testOk', {
                    code: testResult.statusCode ?? 200,
                    ms: testResult.durationMs ?? 0,
                  })
                }}
              </template>
              <template v-else>
                <strong>{{ t('al.testFail') }}</strong>
                <span v-if="testResult.statusCode"
                  >. {{ t('al.testFailCode', { code: testResult.statusCode }) }}</span
                >
                <small v-if="testResult.error">{{ testResult.error }}</small>
              </template>
              <small v-if="testResult.eventId"
                ><code>{{ testResult.eventId }}</code></small
              >
            </div>
          </div>
          <PortalErrorMsg :error="testError" />
        </form>
      </div>

      <!-- segredo de assinatura -->
      <div v-if="hook" class="po-block">
        <div class="po-block__head">
          <div>
            <h2 class="po-h2">{{ t('al.secret') }}</h2>
            <p class="po-sub">{{ t('al.secretLead') }}</p>
          </div>
        </div>
        <div class="po-secret" style="max-width: 640px">
          <code class="po-secret__val" :class="{ 'is-masked': !r.shown.has(whId) }">{{
            r.shown.has(whId) ? r.value(whId) : maskedHint
          }}</code>
          <span class="po-actions">
            <button
              type="button"
              class="po-mini"
              :disabled="r.busy.value === `${whId}:show`"
              :aria-expanded="r.shown.has(whId)"
              @click="r.toggle(whId, fetchWhSecret())"
            >
              <EyeOff v-if="r.shown.has(whId)" :size="15" :stroke-width="1.8" aria-hidden="true" />
              <Eye v-else :size="15" :stroke-width="1.8" aria-hidden="true" />
              {{ r.shown.has(whId) ? t('hide') : t('show') }}
            </button>
            <button
              type="button"
              class="po-mini"
              :class="{ 'is-done': r.copied.value === whId }"
              :disabled="r.busy.value === `${whId}:copy`"
              @click="r.copy(whId, fetchWhSecret())"
            >
              <Check
                v-if="r.copied.value === whId"
                :size="15"
                :stroke-width="2"
                aria-hidden="true"
              />
              <Copy v-else :size="15" :stroke-width="1.8" aria-hidden="true" />
              {{ r.copied.value === whId ? t('copied') : t('copy') }}
            </button>
          </span>
        </div>
        <PortalErrorMsg :error="r.errors.get(whId) ?? null" />
      </div>

      <!-- o que você recebe -->
      <div class="po-block">
        <div class="po-block__head">
          <div>
            <h2 class="po-h2">{{ t('al.preview') }}</h2>
            <p class="po-sub">{{ t('al.previewLead') }}</p>
          </div>
        </div>
        <div class="po-preview">
          <pre class="po-code" aria-label="reading.alert"><code><span
            v-for="(ln, i) in sample"
            :key="i"
            class="po-code__ln"
            :class="{ 'is-hl': ln.hl }"
            :style="{ '--in': ln.indent }"
            ><span v-for="(tk, j) in ln.toks" :key="j" :class="tk.c && `tk-${tk.c}`">{{ tk.t }}</span></span></code></pre>
          <div>
            <dl class="po-fields">
              <div v-for="fl in fields" :key="fl.name">
                <dt>{{ fl.name }}</dt>
                <dd>{{ fl.desc }}</dd>
              </div>
            </dl>
            <p class="po-note" style="margin-top: 22px">
              <RouterLink :to="docsHref('webhooks')" class="po-link"
                >{{ t('al.docsLink') }}
                <ArrowRight
                  :size="14"
                  :stroke-width="2"
                  aria-hidden="true"
                  style="display: inline; vertical-align: -2px"
              /></RouterLink>
            </p>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
