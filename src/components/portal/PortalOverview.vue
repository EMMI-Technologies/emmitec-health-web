<script setup lang="ts">
/**
 * Visão geral: empresa, plano (TRIAL / ATIVO / SUSPENSO) com a barra do piloto de 90 dias,
 * o módulo RPM e o que ele inclui, os números de cada ambiente e atalhos para as docs.
 */
import { computed } from 'vue'
import {
  ArrowRight,
  Bluetooth,
  Braces,
  CircleAlert,
  FlaskConical,
  Smartphone,
  Webhook,
} from 'lucide-vue-next'
import { usePortalLang } from '@/lib/portal/i18n'
import { docsHref, portal, useFormat } from '@/lib/portal/store'
import type { Mode, PortalMode } from '@/lib/portal/api'

const { t } = usePortalLang()
const f = useFormat()

const PILOT_DAYS = 90
const DAY = 86400000

const integ = computed(() => portal.integration!)
const plan = computed(() => integ.value.plan)
const suspended = computed(() => plan.value.name === 'suspended' || !integ.value.active)

const trial = computed(() => {
  const p = plan.value
  if (p.name !== 'trial' || !p.trialEndsAt) return null
  const end = Date.parse(p.trialEndsAt)
  const left =
    typeof p.daysLeft === 'number' ? p.daysLeft : Math.max(0, Math.ceil((end - Date.now()) / DAY))
  const ended = end <= Date.now()
  const used = Math.min(PILOT_DAYS, Math.max(0, PILOT_DAYS - left))
  return {
    ended,
    line: ended
      ? t('ov.trialEnded', { date: f.date(p.trialEndsAt) })
      : t('ov.trialLine', {
          date: f.date(p.trialEndsAt),
          left:
            left > 1 ? t('ov.daysLeft', { n: left }) : left === 1 ? t('ov.dayLeft') : t('ov.today'),
        }),
    day: Math.min(PILOT_DAYS, used + 1),
    pct: Math.max(1.5, (used / PILOT_DAYS) * 100),
  }
})

const includes = computed(() => [
  { id: 'api', icon: Braces },
  { id: 'sdk', icon: Smartphone },
  { id: 'webhooks', icon: Webhook },
  { id: 'sandbox', icon: FlaskConical },
  { id: 'devices', icon: Bluetooth },
])

const rows = computed<{ mode: Mode; data: PortalMode | null }[]>(() => [
  { mode: 'test', data: integ.value.modes.test },
  { mode: 'live', data: integ.value.modes.live },
])

const links = computed(() => [
  { slug: 'quickstart', title: t('link.quickstart'), desc: t('link.quickstartDesc') },
  { slug: 'sdk', title: t('link.sdk'), desc: t('link.sdkDesc') },
  { slug: 'webhooks', title: t('link.webhooks'), desc: t('link.webhooksDesc') },
])
</script>

<template>
  <section class="po-section" aria-labelledby="po-ov-title">
    <div class="po-head">
      <div class="po-head__txt">
        <h1 id="po-ov-title" class="po-h1">{{ integ.name }}</h1>
        <div class="po-ov-plan">
          <span class="po-plan" :class="`po-plan--${plan.name}`">{{ t(`plan.${plan.name}`) }}</span>
          <span v-if="trial">{{ trial.line }}</span>
          <span v-else-if="plan.name === 'active' && !suspended">{{ t('ov.activeLine') }}</span>
        </div>
      </div>
    </div>

    <p v-if="suspended" class="po-error" role="status" style="max-width: 620px">
      <CircleAlert :size="17" :stroke-width="1.9" aria-hidden="true" />
      <span>{{ t('ov.suspendedLine') }}</span>
    </p>

    <div v-if="trial" class="po-trial">
      <div
        class="po-trial__bar"
        role="progressbar"
        :aria-valuenow="trial.day"
        aria-valuemin="1"
        :aria-valuemax="PILOT_DAYS"
        :aria-label="t('ov.trialDay', { d: trial.day, total: PILOT_DAYS })"
      >
        <i :style="{ width: `${trial.pct}%` }" />
      </div>
      <div class="po-trial__meta">
        <span>{{ t('ov.trialDay', { d: trial.day, total: PILOT_DAYS }) }}</span>
        <span>{{ f.shortDate(plan.trialEndsAt) }}</span>
      </div>
      <p v-if="trial.ended" class="po-note">{{ t('ov.trialEndedNote') }}</p>
    </div>

    <!-- módulo -->
    <div class="po-block">
      <p class="po-label">{{ t('ov.module') }}</p>
      <h2 class="po-h2" style="margin-top: 6px">{{ t('ov.moduleTitle') }}</h2>
      <ul class="po-inc">
        <li v-for="i in includes" :key="i.id">
          <component :is="i.icon" :size="19" :stroke-width="1.7" aria-hidden="true" />
          <div>
            <strong>{{ t(`ov.inc.${i.id}`) }}</strong>
            <span>{{ t(`ov.inc.${i.id}Desc`) }}</span>
          </div>
        </li>
      </ul>
    </div>

    <!-- números por ambiente -->
    <div class="po-block">
      <h2 class="po-h2" style="margin-bottom: 18px">{{ t('ov.numbers') }}</h2>
      <table class="po-stats">
        <thead>
          <tr>
            <th scope="col">
              <span class="po-sr">{{ t('modeSwitch') }}</span>
            </th>
            <th scope="col">
              {{ t('stat.patients') }}<small>{{ t('stat.total') }}</small>
            </th>
            <th scope="col">
              {{ t('stat.readings') }}<small>{{ t('stat.30d') }}</small>
            </th>
            <th scope="col">
              {{ t('stat.alerts') }}<small>{{ t('stat.30d') }}</small>
            </th>
            <th scope="col">
              {{ t('stat.failed') }}<small>{{ t('stat.7d') }}</small>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.mode">
            <th scope="row" class="po-stats__mode">{{ t(`mode.${r.mode}`) }}</th>
            <template v-if="r.data">
              <td :data-label="t('stat.patients')">{{ f.num(r.data.stats.patients) }}</td>
              <td :data-label="`${t('stat.readings')} (${t('stat.30d')})`">
                {{ f.num(r.data.stats.readings30d) }}
              </td>
              <td :data-label="`${t('stat.alerts')} (${t('stat.30d')})`">
                {{ f.num(r.data.stats.alerts30d) }}
              </td>
              <td
                :data-label="`${t('stat.failed')} (${t('stat.7d')})`"
                :class="{ 'is-bad': r.data.stats.eventsFailed7d > 0 }"
              >
                {{ f.num(r.data.stats.eventsFailed7d) }}
              </td>
            </template>
            <td v-else colspan="4" class="po-stats__locked">{{ t('ov.liveLocked') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- docs -->
    <div class="po-block">
      <h2 class="po-h2" style="margin-bottom: 18px">{{ t('ov.links') }}</h2>
      <div class="po-links">
        <RouterLink v-for="l in links" :key="l.slug" :to="docsHref(l.slug)">
          <strong
            >{{ l.title }}<ArrowRight :size="16" :stroke-width="1.8" aria-hidden="true"
          /></strong>
          <span>{{ l.desc }}</span>
        </RouterLink>
      </div>
    </div>
  </section>
</template>
