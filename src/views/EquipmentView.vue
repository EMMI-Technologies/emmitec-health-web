<script setup lang="ts">
/**
 * Equipamentos — Design System Emmitec.health, com o conteúdo de sempre (pt/en/es).
 * Catálogo com filtro por categoria, selos de certificação
 * e o painel de compatibilidade.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Activity,
  Bluetooth,
  Droplet,
  HeartPulse,
  Nfc,
  ShieldCheck,
  Watch,
  Webhook,
  Wifi,
  Wind,
} from 'lucide-vue-next'

import EmPageHero from '@/components/em/EmPageHero.vue'
import EmButton from '@/components/em/EmButton.vue'
import EmSplit from '@/components/em/EmSplit.vue'
import EmCta from '@/components/em/EmCta.vue'
import EmOdometer from '@/components/em/EmOdometer.vue'
import EmDeviceCard from '@/components/em/EmDeviceCard.vue'
import { scrollToEl } from '@/lib/motion'
import { calendlyUrl } from '@/lib/site'
import { DEVICE_CATEGORIES, useDevices, type DeviceCategory } from '@/lib/equipment'

const { t } = useI18n()
const { devices } = useDevices()

function toCatalog() {
  const el = document.getElementById('catalogo')
  if (el) scrollToEl(el, 24)
}

/* ── (01) catálogo ── */
const CAT_ICONS: Record<DeviceCategory, typeof Activity> = {
  all: Activity,
  cardio: HeartPulse,
  metabolic: Droplet,
  respiratory: Wind,
  wearables: Watch,
}
const activeCategory = ref<DeviceCategory>('all')
const categories = computed(() =>
  DEVICE_CATEGORIES.map((id) => ({
    id,
    icon: CAT_ICONS[id],
    label: t(`equipmentPage.categories.${id}`),
  })),
)
const filtered = computed(() =>
  activeCategory.value === 'all'
    ? devices.value
    : devices.value.filter((d) => d.cat === activeCategory.value),
)

const tabsEl = ref<HTMLElement | null>(null)
const ind = ref({ x: 0, w: 0, on: false })
function placeIndicator() {
  const btn = tabsEl.value?.querySelector<HTMLElement>('.em-tabs__btn.is-active')
  if (btn) ind.value = { x: btn.offsetLeft, w: btn.offsetWidth, on: true }
}
watch([activeCategory, categories], () => nextTick(placeIndicator))

/* ── (02) certificações ── */
const certifications = computed(() => [
  { code: 'ANVISA', label: t('equipmentPage.cert.c1') },
  { code: 'FDA', label: t('equipmentPage.cert.c2') },
  { code: 'CE', label: t('equipmentPage.cert.c3') },
  { code: 'ISO 13485', label: t('equipmentPage.cert.c4') },
])

/** Texto do anel do selo: repete até dar a volta sem sobrar espaço. */
function sealText(c: { code: string; label: string }) {
  const unit = `${c.code} · ${c.label} · `.toUpperCase()
  return unit.repeat(Math.max(1, Math.ceil(30 / unit.length)))
}

/* ── (03) compatibilidade ── */
const compatibilityItems = computed(() =>
  [1, 2, 3, 4].map((n) => t(`equipmentPage.compatibility.item${n}`)),
)
/** Últimas sincronizações (ilustrativas) no painel. */
const feed = computed(() =>
  [0, 2, 5].map((i) => {
    const d = devices.value[i]!
    const c = d.connectivity.includes('Wi-Fi')
      ? 'Wi-Fi'
      : d.connectivity.includes('NFC')
        ? 'NFC'
        : 'BLE'
    return { id: d.id, icon: d.icon, name: d.name, via: c }
  }),
)

onMounted(() => {
  window.addEventListener('resize', placeIndicator)
  document.fonts?.ready.then(placeIndicator)
  placeIndicator()
})
onBeforeUnmount(() => window.removeEventListener('resize', placeIndicator))
</script>

<template>
  <div class="em-equipment-page">
    <!-- ════════ HERO ════════ -->
    <EmPageHero
      :eyebrow="t('equipmentPage.hero.badge')"
      :title="t('equipmentPage.hero.title')"
      :em="t('equipmentPage.hero.titleEm')"
      :subtitle="t('equipmentPage.hero.subtitle')"
    >
      <template #actions>
        <EmButton :label="t('equipmentPage.hero.button.primary')" @click="toCatalog" />
        <EmButton
          :href="calendlyUrl"
          variant="ghost"
          :label="t('equipmentPage.hero.button.secondary')"
        />
      </template>
    </EmPageHero>

    <!-- ════════ (01) CATÁLOGO ════════ -->
    <section id="catalogo" class="em-section">
      <div class="em-wrap">
        <div class="em-head">
          <div>
            <span v-reveal class="em-eyebrow">{{ t('equipmentPage.categories.badge') }}</span>
            <EmSplit
              :text="t('equipmentPage.categories.title')"
              :em="t('equipmentPage.categories.titleEm')"
            />
          </div>
          <p v-reveal="150">{{ t('equipmentPage.categories.subtitle') }}</p>
        </div>

        <div v-reveal class="em-filterbar">
          <div
            ref="tabsEl"
            class="em-tabs"
            role="group"
            :aria-label="t('equipmentPage.categories.badge')"
          >
            <span
              class="em-tabs__ind"
              :class="{ 'is-on': ind.on }"
              :style="{ '--x': `${ind.x}px`, '--w': `${ind.w}px` }"
              aria-hidden="true"
            />
            <button
              v-for="c in categories"
              :key="c.id"
              type="button"
              class="em-tabs__btn"
              :class="{ 'is-active': activeCategory === c.id }"
              :aria-pressed="activeCategory === c.id ? 'true' : 'false'"
              @click="activeCategory = c.id"
            >
              <component :is="c.icon" :stroke-width="1.8" aria-hidden="true" />{{ c.label }}
            </button>
          </div>
        </div>

        <!-- trocar de categoria refaz a grade, e os cards entram de novo em sequência -->
        <div :key="activeCategory" class="em-devices">
          <EmDeviceCard
            v-for="(d, i) in filtered"
            :key="d.id"
            v-reveal="(i % 4) * 80"
            v-spot
            :device="d"
          />
        </div>
      </div>
    </section>

    <!-- ════════ (02) CERTIFICAÇÕES ════════ -->
    <section id="certificacoes" class="em-section em-section--tint">
      <div class="em-wrap">
        <span v-reveal class="em-eyebrow">{{ t('equipmentPage.cert.badge') }}</span>
        <EmSplit
          class="em-h2"
          :text="t('equipmentPage.cert.title')"
          :em="t('equipmentPage.cert.titleEm')"
        />
        <div class="em-seals">
          <div
            v-for="(c, i) in certifications"
            :key="c.code"
            v-reveal="i * 90"
            v-spot
            class="em-seal em-card"
          >
            <span class="em-seal__stamp" aria-hidden="true">
              <svg viewBox="0 0 120 120">
                <defs>
                  <path
                    :id="`em-seal-arc-${i}`"
                    d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0"
                  />
                </defs>
                <text>
                  <textPath :href="`#em-seal-arc-${i}`" textLength="289" lengthAdjust="spacing">
                    {{ sealText(c) }}
                  </textPath>
                </text>
              </svg>
              <span class="em-seal__ico"><ShieldCheck :stroke-width="1.6" /></span>
            </span>
            <b>{{ c.code }}</b>
            <span>{{ c.label }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ════════ (03) COMPATIBILIDADE ════════ -->
    <section id="compatibilidade" class="em-section">
      <div class="em-wrap em-def">
        <div class="em-def__txt">
          <span v-reveal class="em-eyebrow">{{ t('equipmentPage.compatibility.badge') }}</span>
          <EmSplit
            class="em-h2"
            :text="t('equipmentPage.compatibility.title')"
            :em="t('equipmentPage.compatibility.titleEm')"
          />
          <p v-reveal="120" class="em-def__p">{{ t('equipmentPage.compatibility.description') }}</p>
          <ul v-reveal="200" class="em-feats em-feats--spaced">
            <li v-for="item in compatibilityItems" :key="item">{{ item }}</li>
          </ul>
          <div v-reveal="280" class="em-def__cta">
            <EmButton
              :href="calendlyUrl"
              variant="dark"
              :label="t('equipmentPage.cta.button.primary')"
            />
          </div>
        </div>

        <!-- painel: protocolos + últimas sincronizações -->
        <div v-reveal:scale="150" v-spot class="em-hubpanel em-card">
          <div class="em-win__bar">
            <span
              ><span class="em-win__dots"><i /><i /><i /></span>Emmitec · API</span
            >
            <span class="em-pill">{{ t('hero.live.status') }}</span>
          </div>
          <div class="em-protos">
            <div class="em-proto">
              <span class="em-ico"><Bluetooth :stroke-width="1.7" aria-hidden="true" /></span>
              <b>Bluetooth</b>
              <small>Low Energy</small>
            </div>
            <div class="em-proto">
              <span class="em-ico"><Wifi :stroke-width="1.7" aria-hidden="true" /></span>
              <b>Wi-Fi</b>
              <small>2.4 / 5 GHz</small>
            </div>
            <div class="em-proto">
              <span class="em-ico"><Webhook :stroke-width="1.7" aria-hidden="true" /></span>
              <b>HL7 / FHIR</b>
              <small>Standards</small>
            </div>
            <div class="em-proto em-proto--brand">
              <span class="em-ico em-ico--brand"
                ><Activity :stroke-width="1.7" aria-hidden="true"
              /></span>
              <b>+<EmOdometer value="200" /></b>
              <small>{{ t('equipmentPage.compatibility.devices') }}</small>
            </div>
          </div>
          <ul class="em-feed">
            <li v-for="(f, i) in feed" :key="f.id" :style="{ '--i': i }">
              <span class="em-feed__ico"
                ><component :is="f.icon" :stroke-width="1.7" aria-hidden="true"
              /></span>
              <span class="em-feed__name">{{ f.name }}</span>
              <span class="em-chip"
                ><component
                  :is="f.via === 'Wi-Fi' ? Wifi : f.via === 'NFC' ? Nfc : Bluetooth"
                  :stroke-width="1.8"
                  aria-hidden="true"
                />{{ f.via }}</span
              >
              <span class="em-dot em-dot--live" />
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ════════ CTA ════════ -->
    <EmCta
      :badge="t('equipmentPage.cta.badge')"
      :title="t('equipmentPage.cta.title')"
      :em="t('equipmentPage.cta.titleEm')"
      :subtitle="t('equipmentPage.cta.subtitle')"
      :primary="{ label: t('equipmentPage.cta.button.primary'), href: calendlyUrl }"
      :secondary="{ label: t('equipmentPage.cta.button.secondary'), to: '/about' }"
    />
  </div>
</template>
