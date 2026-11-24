<script setup lang="ts">
/**
 * Entregas: os últimos 50 eventos do webhook no ambiente escolhido (GET /portal/events),
 * com status (entregue / pendente / falhou), tentativas, código HTTP, erro e datas.
 */
import { computed, ref, watch } from 'vue'
import { Lock, RefreshCw } from 'lucide-vue-next'
import { usePortalLang } from '@/lib/portal/i18n'
import { portalApi, type Mode, type PortalEvent } from '@/lib/portal/api'
import {
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

const events = ref<PortalEvent[] | null>(null)
const loading = ref(false)
const error = ref<ErrorView | null>(null)
const locked = computed(() => !modeData(portal.mode))
const mail = computed(() => `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('portal'))}`)
let seq = 0

async function load(mode: Mode) {
  error.value = null
  if (!modeData(mode)) {
    events.value = null
    return
  }
  const my = ++seq
  loading.value = true
  try {
    const r = await portalApi.events(mode, 50)
    if (my === seq) events.value = r.data
  } catch (e) {
    if (my === seq) error.value = errorView(e)
  } finally {
    if (my === seq) loading.value = false
  }
}
watch(
  () => portal.mode,
  (m) => {
    events.value = null
    void load(m)
  },
  { immediate: true },
)

const CHIP = { delivered: 'po-chip--ok', pending: 'po-chip--warn', failed: 'po-chip--bad' } as const
</script>

<template>
  <section class="po-section" aria-labelledby="po-ev-title">
    <div class="po-head">
      <div class="po-head__txt">
        <h1 id="po-ev-title" class="po-h1">{{ t('nav.events') }}</h1>
        <p class="po-lead">{{ t('evs.lead') }}</p>
      </div>
      <div class="po-head__tools">
        <button
          v-if="!locked"
          type="button"
          class="po-btn po-btn--line po-btn--sm"
          :disabled="loading"
          @click="load(portal.mode)"
        >
          <RefreshCw :size="15" :stroke-width="1.9" aria-hidden="true" />{{ t('evs.refresh') }}
        </button>
        <PortalModeSwitch />
      </div>
    </div>

    <div class="po-block po-block--first">
      <p v-if="locked" class="po-locked">
        <Lock :size="17" :stroke-width="1.8" aria-hidden="true" />
        <span>{{ t('keys.liveLocked') }}</span>
        <a :href="mail">{{ SUPPORT_EMAIL }}</a>
      </p>

      <template v-else>
        <PortalErrorMsg :error="error" />

        <div v-if="loading && !events" aria-busy="true" :aria-label="t('loading')">
          <span v-for="n in 6" :key="n" class="po-skel" style="margin: 18px 0" />
        </div>
        <p v-else-if="events && !events.length" class="po-empty">{{ t('evs.empty') }}</p>

        <table v-else-if="events" class="po-table" :aria-busy="loading">
          <thead>
            <tr>
              <th scope="col">{{ t('evs.col.event') }}</th>
              <th scope="col">{{ t('evs.col.status') }}</th>
              <th scope="col" class="is-num">{{ t('evs.col.attempts') }}</th>
              <th scope="col" class="is-num">{{ t('evs.col.code') }}</th>
              <th scope="col">{{ t('evs.col.result') }}</th>
              <th scope="col">{{ t('evs.col.created') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in events" :key="e.id">
              <td class="is-main">
                <span class="po-evt-type">{{ e.type }}</span>
                <span class="po-evt-id" :title="e.id">{{ e.id }}</span>
              </td>
              <td :data-label="t('evs.col.status')">
                <span class="po-chip" :class="CHIP[e.status]">{{
                  t(`evs.status.${e.status}`)
                }}</span>
              </td>
              <td class="is-num" :data-label="t('evs.col.attempts')">{{ e.attempts }}</td>
              <td class="is-num" :data-label="t('evs.col.code')">
                <span v-if="e.lastStatusCode">{{ e.lastStatusCode }}</span>
                <span v-else-if="e.attempts > 0" class="po-th-none">{{ t('evs.noResponse') }}</span>
              </td>
              <td :data-label="t('evs.col.result')">
                <div>
                  <span v-if="e.lastError" class="po-evt-err">{{ e.lastError }}</span>
                  <span v-if="e.status === 'delivered' && e.deliveredAt" class="po-evt-when">{{
                    t('evs.deliveredAt', { date: f.dateTime(e.deliveredAt) })
                  }}</span>
                  <span v-else-if="e.nextAttemptAt" class="po-evt-when" style="display: block">{{
                    t('evs.nextAttempt', { date: f.dateTime(e.nextAttemptAt) })
                  }}</span>
                </div>
              </td>
              <td :data-label="t('evs.col.created')" class="po-evt-when">
                <span :title="e.createdAt">{{ f.dateTime(e.createdAt) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </template>

      <p v-if="!locked" class="po-note" style="margin-top: 22px; max-width: 720px">
        {{ t('evs.retryNote') }}
      </p>
    </div>
  </section>
</template>
