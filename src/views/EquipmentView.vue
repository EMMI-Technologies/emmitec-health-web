<script setup lang="ts">
/**
 * Equipamentos — Design System Emmitec.health.
 * Catálogo e categorias vêm da API pública do BackOffice (recarregam ao trocar
 * de idioma), com filtro por categoria, selos de certificação e o painel de
 * compatibilidade.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Activity, Bluetooth, Watch, Webhook } from 'lucide-vue-next'

import EmPageHero from '@/components/em/EmPageHero.vue'
import EmButton from '@/components/em/EmButton.vue'
import EmSplit from '@/components/em/EmSplit.vue'
import EmCta from '@/components/em/EmCta.vue'
import EmOdometer from '@/components/em/EmOdometer.vue'
import EmDeviceCard from '@/components/em/EmDeviceCard.vue'
import EmSkeleton from '@/components/em/EmSkeleton.vue'
import EmState from '@/components/em/EmState.vue'
import { scrollToEl } from '@/lib/motion'
import { calendlyUrl } from '@/lib/site'
import { connectivityIcon } from '@/lib/icons'
import { usePageMeta } from '@/lib/seo'
import { useDeviceCategories, useDevices } from '@/lib/equipment'
import anvisaLogo from '@/assets/certs/anvisa.png'
import fdaLogo from '@/assets/certs/fda.png'
import ceLogo from '@/assets/certs/ce.png'
import isoLogo from '@/assets/certs/iso.png'

const { t } = useI18n()
const list = useDevices()
const cats = useDeviceCategories()
const { devices } = list

usePageMeta(() => ({
  title: t('header.nav.equipment'),
  description: t('equipmentPage.hero.subtitle'),
}))

function toCatalog() {
  const el = document.getElementById('catalogo')
  if (el) scrollToEl(el, 24)
}

/* ── (01) catálogo ── */
/** Carregando só enquanto não há nada para mostrar (a troca de idioma mantém a lista). */
const loading = computed(
  () => (list.loading.value && !list.data.value) || (cats.loading.value && !cats.data.value),
)
const failure = computed(() => list.error.value ?? cats.error.value)
function retry() {
  if (list.error.value) list.reload()
  if (cats.error.value) cats.reload()
}

const activeCategory = ref('all')
/** "Todos" + as categorias da API que têm equipamento (a ativa sempre aparece). */
const categories = computed(() => [
  { id: 'all', icon: Activity, label: t('equipmentPage.categories.all') },
  ...cats.categories.value
    .filter((c) => c.slug === activeCategory.value || devices.value.some((d) => d.cat === c.slug))
    .map((c) => ({ id: c.slug, icon: c.iconCmp, label: c.name })),
])
// categoria que deixou de existir volta para "Todos"
watch(categories, (all) => {
  if (!loading.value && !all.some((c) => c.id === activeCategory.value))
    activeCategory.value = 'all'
})
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
watch([activeCategory, categories, loading], () => nextTick(placeIndicator))

/* ── (02) certificações: logos oficiais em PNG 480×480, todas com a mesma área visual ── */
const certifications = computed(() => [
  { code: 'ANVISA', label: t('equipmentPage.cert.c1'), logo: anvisaLogo },
  { code: 'FDA', label: t('equipmentPage.cert.c2'), logo: fdaLogo },
  { code: 'CE', label: t('equipmentPage.cert.c3'), logo: ceLogo },
  { code: 'ISO 13485', label: t('equipmentPage.cert.c4'), logo: isoLogo },
])

/* ── (03) compatibilidade ── */
const compatibilityItems = computed(() =>
  [1, 2, 3, 4].map((n) => t(`equipmentPage.compatibility.item${n}`)),
)
/** Sincronizações no painel: os três primeiros do catálogo real. */
const feed = computed(() =>
  devices.value.slice(0, 3).map((d) => {
    const via =
      ['Wi-Fi', 'NFC', 'LTE', 'USB'].find((c) => d.connectivity.includes(c)) ??
      d.connectivity[0] ??
      'Bluetooth'
    return { id: d.id, icon: d.icon, name: d.name, via }
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

        <EmSkeleton v-if="loading" kind="tabs" :count="5" class="em-filterbar" />
        <div v-else-if="!failure && devices.length" v-reveal class="em-filterbar">
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

        <EmSkeleton v-if="loading" kind="devices" :count="4" />
        <EmState
          v-else-if="failure"
          kind="error"
          :title="t('state.equipmentError')"
          :text="t('state.errorText')"
          :error="failure"
          @retry="retry"
        />
        <EmState
          v-else-if="!devices.length"
          kind="empty"
          :title="t('state.equipmentEmpty')"
          :text="t('state.equipmentEmptyText')"
        />
        <!-- trocar de categoria refaz a grade, e os cards entram de novo em sequência -->
        <div v-else :key="activeCategory" class="em-devices">
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
            <!-- o nome vem logo abaixo, então a logo é só visual -->
            <span class="em-seal__stamp" aria-hidden="true">
              <img
                class="em-seal__logo"
                :src="c.logo"
                alt=""
                width="480"
                height="480"
                loading="lazy"
                decoding="async"
              />
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
              <span class="em-ico"><Watch :stroke-width="1.7" aria-hidden="true" /></span>
              <b>Health Connect</b>
              <small>HealthKit</small>
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
              <b><EmOdometer :value="devices.length || 0" /></b>
              <small>{{ t('equipmentPage.compatibility.devices') }}</small>
            </div>
          </div>
          <ul v-if="feed.length" class="em-feed">
            <li v-for="(f, i) in feed" :key="f.id" :style="{ '--i': i }">
              <span class="em-feed__ico"
                ><component :is="f.icon" :stroke-width="1.7" aria-hidden="true"
              /></span>
              <span class="em-feed__name">{{ f.name }}</span>
              <span class="em-chip"
                ><component
                  :is="connectivityIcon(f.via)"
                  :stroke-width="1.8"
                  aria-hidden="true"
                />{{ f.via === 'Bluetooth' ? 'BLE' : f.via }}</span
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
