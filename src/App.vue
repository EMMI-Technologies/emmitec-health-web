<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppHeader from './components/AppHeader.vue'
import AppFooter from './components/AppFooter.vue'
import EmLoader from './components/em/EmLoader.vue'
import { addFx, clamp, initSmoothScroll, releaseHero } from './lib/motion'
import { pageTransition } from './lib/pageTransition'

const { locale } = useI18n()
const route = useRoute()
const progress = ref<HTMLElement | null>(null)
const edge = ref<HTMLElement | null>(null)

// <html lang> acompanha o idioma escolhido
const LANG: Record<string, string> = { pt: 'pt-BR', en: 'en', es: 'es' }
watch(
  locale,
  (l) => {
    document.documentElement.lang = LANG[l] ?? l
  },
  { immediate: true },
)

let off: (() => void) | null = null
onMounted(() => {
  initSmoothScroll()
  // barra de progresso da rolagem
  off = addFx((y) => {
    const m = document.documentElement.scrollHeight - window.innerHeight
    if (progress.value) progress.value.style.transform = `scaleX(${(m > 0 ? y / m : 0).toFixed(4)})`
    // desfoque da borda de baixo: some no topo (hero nítido) e no fim da página (rodapé nítido)
    const o = Math.min(clamp(y / 140, 0, 1), clamp((m - y) / 140, 0, 1))
    edge.value?.style.setProperty('--edge-o', o.toFixed(3))
  })
})
onBeforeUnmount(() => off?.())
</script>

<template>
  <div class="em em-app">
    <!-- degradês compartilhados pelos SVGs (sparklines, medidores) -->
    <svg width="0" height="0" style="position: absolute" aria-hidden="true">
      <defs>
        <linearGradient id="em-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0db7ba" stop-opacity=".28" />
          <stop offset="1" stop-color="#0db7ba" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="em-gauge-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#11d3d3" />
          <stop offset="1" stop-color="#0db7ba" />
        </linearGradient>
      </defs>
    </svg>

    <!-- rotas `bare` (ex.: /links) abrem direto, sem a tela de entrada, menu e rodapé -->
    <EmLoader :skip="route.meta.bare === true" @done="releaseHero" />
    <div ref="progress" class="em-progress" aria-hidden="true" />
    <!-- o conteúdo que sobe por baixo nasce desfocado (até 15px) e ganha foco ao subir -->
    <div ref="edge" class="em-edge" aria-hidden="true"><i /><i /><i /><i /><i /></div>
    <AppHeader v-if="!route.meta.bare" />
    <!-- cortina clara que segue a página que sai, antes de a nova entrar -->
    <div class="em-curtain" aria-hidden="true" />
    <main class="em-main">
      <!-- troca de página: a atual sobe e a nova entra por baixo (o rodapé vai junto) -->
      <RouterView v-slot="{ Component, route: view }">
        <Transition :css="false" v-bind="pageTransition">
          <div :key="view.path" class="em-view">
            <component :is="Component" />
            <AppFooter v-if="!view.meta.bare" :newsletter="view.meta.footerNewsletter !== false" />
          </div>
        </Transition>
      </RouterView>
    </main>
  </div>
</template>
