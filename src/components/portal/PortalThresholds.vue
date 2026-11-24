<script setup lang="ts">
/**
 * Limites de alerta (somente leitura): os padrões do cliente no ambiente escolhido
 * (GET /portal/thresholds?mode=). Mudanças são pela API (por paciente ou, em produção, o padrão).
 */
import { computed, ref, watch } from 'vue'
import { ArrowRight, Lock } from 'lucide-vue-next'
import { usePortalLang } from '@/lib/portal/i18n'
import { portalApi, type Mode, type Threshold } from '@/lib/portal/api'
import {
  docsHref,
  errorView,
  modeData,
  portal,
  SUPPORT_EMAIL,
  useFormat,
  type ErrorView,
} from '@/lib/portal/store'
import PortalModeSwitch from './PortalModeSwitch.vue'
import PortalErrorMsg from './PortalErrorMsg.vue'

const { t } = usePortalLang()
const f = useFormat()

const TYPE_ORDER = ['blood_pressure', 'oxygen_saturation', 'temperature', 'glucose', 'weight']
const VALUE_ORDER = ['systolic', 'diastolic', 'spo2', 'pulse', 'temperature', 'glucose']

const cache = new Map<Mode, Threshold[]>()
const rows = ref<Threshold[] | null>(null)
const loading = ref(false)
const error = ref<ErrorView | null>(null)
const locked = computed(() => !modeData(portal.mode))
const mail = computed(() => `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('portal'))}`)

async function load(mode: Mode) {
  error.value = null
  if (!modeData(mode)) {
    rows.value = null
    return
  }
  const have = cache.get(mode)
  rows.value = have ?? null
  if (have) return
  loading.value = true
  try {
    const r = await portalApi.thresholds(mode)
    cache.set(mode, r.data)
    if (portal.mode === mode) rows.value = r.data
  } catch (e) {
    if (portal.mode === mode) error.value = errorView(e)
  } finally {
    loading.value = false
  }
}
watch(() => portal.mode, load, { immediate: true })

const sorted = computed(() =>
  [...(rows.value ?? [])].sort(
    (a, b) =>
      idx(TYPE_ORDER, a.type) - idx(TYPE_ORDER, b.type) ||
      idx(VALUE_ORDER, a.value) - idx(VALUE_ORDER, b.value),
  ),
)
function idx(list: string[], v: string) {
  const i = list.indexOf(v)
  return i < 0 ? 99 : i
}

const label = (prefix: 'type' | 'value', v: string) => {
  const s = t(`${prefix}.${v}`)
  return s === `${prefix}.${v}` ? v : s
}
// temperatura sempre com uma casa (35,0 / 37,8); unidade C vira °C
const fmt = (n: number | null, type: string) =>
  n === null || n === undefined ? null : f.num(n, type === 'temperature' ? 1 : 0)
const unit = (u: string) => (u === 'C' ? '°C' : u === 'F' ? '°F' : u)
const COLS = ['criticalLow', 'attentionLow', 'attentionHigh', 'criticalHigh'] as const
const colLabel = {
  criticalLow: 'th.col.critLow',
  attentionLow: 'th.col.attLow',
  attentionHigh: 'th.col.attHigh',
  criticalHigh: 'th.col.critHigh',
} as const
</script>

<template>
  <section class="po-section" aria-labelledby="po-th-title">
    <div class="po-head">
      <div class="po-head__txt">
        <h1 id="po-th-title" class="po-h1">{{ t('nav.thresholds') }}</h1>
        <p class="po-lead">{{ t('th.lead') }}</p>
      </div>
      <PortalModeSwitch />
    </div>

    <div class="po-block po-block--first">
      <p v-if="locked" class="po-locked">
        <Lock :size="17" :stroke-width="1.8" aria-hidden="true" />
        <span>{{ t('keys.liveLocked') }}</span>
        <a :href="mail">{{ SUPPORT_EMAIL }}</a>
      </p>

      <template v-else>
        <PortalErrorMsg :error="error" />

        <div v-if="loading && !rows" aria-busy="true" :aria-label="t('loading')">
          <span v-for="n in 6" :key="n" class="po-skel" style="margin: 18px 0" />
        </div>
        <p v-else-if="rows && !rows.length" class="po-empty">{{ t('th.empty') }}</p>

        <table v-else-if="rows" class="po-table">
          <thead>
            <tr>
              <th scope="col">{{ t('th.col.type') }}</th>
              <th scope="col">{{ t('th.col.value') }}</th>
              <th
                v-for="c in COLS"
                :key="c"
                scope="col"
                class="is-num"
                :class="c.startsWith('critical') ? 'po-th-crit' : 'po-th-att'"
              >
                {{ t(colLabel[c]) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in sorted"
              :key="`${row.type}.${row.value}`"
              :class="{ 'is-group-start': i === 0 || sorted[i - 1]!.type !== row.type }"
            >
              <td class="is-main">
                <span v-if="i === 0 || sorted[i - 1]!.type !== row.type" class="po-th-type">{{
                  label('type', row.type)
                }}</span>
                <span v-else class="po-th-type po-th-repeat" aria-hidden="true">{{
                  label('type', row.type)
                }}</span>
              </td>
              <td :data-label="t('th.col.value')">
                <span class="po-cell-strong">{{ label('value', row.value) }}</span>
                <span class="po-th-unit">{{ unit(row.unit) }}</span>
              </td>
              <td v-for="c in COLS" :key="c" class="is-num" :data-label="t(colLabel[c])">
                <span v-if="fmt(row[c], row.type) !== null">{{ fmt(row[c], row.type) }}</span>
                <span v-else class="po-th-none">{{ t('th.none') }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </template>

      <p class="po-note" style="margin-top: 26px; max-width: 720px">
        {{ t('th.note1') }} <code class="po-inline-code">PUT /patients/{id}/thresholds</code
        >{{ t('th.note2') }} <code class="po-inline-code">PUT /thresholds</code>.
        <template v-if="portal.mode === 'test'"> {{ t('th.sandboxNote') }}</template>
      </p>
      <p class="po-note" style="margin-top: 8px">
        <RouterLink :to="docsHref('alert-settings')" class="po-link"
          >{{ t('th.docsLink') }}
          <ArrowRight
            :size="14"
            :stroke-width="2"
            aria-hidden="true"
            style="display: inline; vertical-align: -2px"
        /></RouterLink>
      </p>
    </div>
  </section>
</template>
