<script setup lang="ts">
/**
 * Portal com sessão: menu lateral (abas no celular) e uma seção por vez.
 * A seção fica no #hash (/portal#keys): o endereço continua o mesmo (sem a troca de página
 * animada do site), o voltar do navegador funciona e o link pode ser compartilhado.
 */
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BellRing, KeyRound, LayoutDashboard, Lock, Package, Send, SlidersHorizontal } from 'lucide-vue-next'
import { usePortalLang } from '@/lib/portal/i18n'
import { portal, SECTIONS, SUPPORT_EMAIL, type SectionId } from '@/lib/portal/store'
import PortalOverview from './PortalOverview.vue'
import PortalKeys from './PortalKeys.vue'
import PortalAlerts from './PortalAlerts.vue'
import PortalThresholds from './PortalThresholds.vue'
import PortalEvents from './PortalEvents.vue'
import PortalSdk from './PortalSdk.vue'
import PortalPasswordForm from './PortalPasswordForm.vue'

const { t } = usePortalLang()
const route = useRoute()
const router = useRouter()
const main = ref<HTMLElement | null>(null)

const section = computed<SectionId>(() => {
  const h = route.hash.replace(/^#/, '') as SectionId
  return SECTIONS.includes(h) ? h : 'overview'
})

const failed = computed(() => {
  const m = portal.integration?.modes
  return (m?.test.stats.eventsFailed7d ?? 0) + (m?.live?.stats.eventsFailed7d ?? 0)
})

const items = computed(() => [
  { id: 'overview' as SectionId, icon: LayoutDashboard, label: t('nav.overview') },
  { id: 'keys' as SectionId, icon: KeyRound, label: t('nav.keys') },
  { id: 'alerts' as SectionId, icon: BellRing, label: t('nav.alerts') },
  { id: 'thresholds' as SectionId, icon: SlidersHorizontal, label: t('nav.thresholds') },
  { id: 'events' as SectionId, icon: Send, label: t('nav.events'), badge: failed.value },
  { id: 'sdk' as SectionId, icon: Package, label: t('nav.sdk') },
  { id: 'password' as SectionId, icon: Lock, label: t('nav.password') },
])

function go(id: SectionId) {
  if (id === section.value) return
  void router.push({ hash: id === 'overview' ? '' : `#${id}` })
}

// troca de seção: volta ao topo e leva o foco para o conteúdo (leitor de tela anuncia o título)
watch(section, () => {
  window.scrollTo(0, 0)
  void nextTick(() => main.value?.focus({ preventScroll: true }))
})

// celular: a aba ativa sempre à vista na faixa de abas (inclusive ao abrir /portal#events)
const tabs = ref<HTMLElement | null>(null)
watch(
  section,
  () =>
    void nextTick(() => {
      const el = tabs.value?.querySelector<HTMLElement>('.is-active')
      if (tabs.value && el) tabs.value.scrollLeft = Math.max(0, el.offsetLeft - 16)
    }),
  { immediate: true },
)
</script>

<template>
  <div class="po-body">
    <aside class="po-side" data-native-scroll>
      <nav class="po-nav" :aria-label="t('nav.label')">
        <ul>
          <li v-for="it in items" :key="it.id">
            <button
              type="button"
              class="po-nav__link"
              :class="{ 'is-active': section === it.id }"
              :aria-current="section === it.id ? 'page' : undefined"
              @click="go(it.id)"
            >
              <component :is="it.icon" :size="18" :stroke-width="1.7" aria-hidden="true" />
              {{ it.label }}
              <span
                v-if="it.badge"
                class="po-nav__badge"
                :title="`${t('stat.failed')} (${t('stat.7d')})`"
                >{{ it.badge }}</span
              >
            </button>
          </li>
        </ul>
      </nav>
      <div class="po-side__foot">
        <strong>{{ t('nav.support') }}</strong>
        <a :href="`mailto:${SUPPORT_EMAIL}`">{{ SUPPORT_EMAIL }}</a>
      </div>
    </aside>

    <nav ref="tabs" class="po-tabs" :aria-label="t('nav.label')" data-native-scroll>
      <button
        v-for="it in items"
        :key="it.id"
        type="button"
        class="po-nav__link"
        :class="{ 'is-active': section === it.id }"
        :aria-current="section === it.id ? 'page' : undefined"
        @click="go(it.id)"
      >
        {{ it.label }}
        <span v-if="it.badge" class="po-nav__badge">{{ it.badge }}</span>
      </button>
    </nav>

    <main id="po-main" ref="main" class="po-main" tabindex="-1">
      <PortalOverview v-if="section === 'overview'" />
      <PortalKeys v-else-if="section === 'keys'" />
      <PortalAlerts v-else-if="section === 'alerts'" />
      <PortalThresholds v-else-if="section === 'thresholds'" />
      <PortalEvents v-else-if="section === 'events'" />
      <PortalSdk v-else-if="section === 'sdk'" />
      <section v-else class="po-section" aria-labelledby="po-pwd-title">
        <div class="po-head">
          <div class="po-head__txt">
            <h1 id="po-pwd-title" class="po-h1">{{ t('pwd.title') }}</h1>
            <p class="po-lead">{{ t('pwd.lead') }}</p>
          </div>
        </div>
        <div class="po-block po-block--first">
          <PortalPasswordForm />
        </div>
      </section>
    </main>
  </div>
</template>
