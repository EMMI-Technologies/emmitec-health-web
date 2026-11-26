<script setup lang="ts">
/**
 * Layout das docs para desenvolvedores (/developers/...): barra no topo (logo, busca, EN/PT,
 * referência da API, portal, sair), menu lateral, gaveta no celular e a página da rota.
 * Sem sessão do portal do cliente, mostra a entrada (DocsGate) no lugar da documentação
 * (spec docs-de-parceiros-so-com-login): o conteúdo só chega ao navegador depois do login.
 * Rolagem nativa e troca de página instantânea entre páginas das docs (ver lib/developers/view.ts).
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { ArrowUpRight, LogOut, Menu, Search, X } from 'lucide-vue-next'
import DocsNav from '@/components/developers/DocsNav.vue'
import DocsSearch from '@/components/developers/DocsSearch.vue'
import DocsLangSwitch from '@/components/developers/DocsLangSwitch.vue'
import DocsGate from '@/components/developers/DocsGate.vue'
import { LOGO_SRC } from '@/lib/site'
import { initialDocsLang, isDocsLang, useDocsLang } from '@/lib/developers/lang'
import { loadDoc } from '@/lib/developers/pages'
import { slugFromPath } from '@/lib/developers/nav'
import { checkAccess, docsOpen, leaveDocsAccess } from '@/lib/developers/access'
import { loadIndex } from '@/lib/developers/search'
import {
  enterDocs,
  leaveDocs,
  prepareInstantSwap,
  settleInstantSwap,
  sideMemory,
} from '@/lib/developers/view'
import { PORTAL_PATH } from '@/content/developers/ui'
import type { DocsLang } from '@/lib/developers/types'
import './docs.css'

const route = useRoute()
const router = useRouter()
const { lang, setLang, t } = useDocsLang()

const root = ref<HTMLElement | null>(null)
const side = ref<HTMLElement | null>(null)
const searchOpen = ref(false)
const drawerOpen = ref(false)
const isReference = computed(() => route.name === 'developers-api-reference')
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent)
const modKey = isMac ? '⌘' : 'Ctrl'

// ?lang=pt|en em links diretos vira a escolha de idioma
watch(
  () => route.query.lang,
  (q) => {
    if (isDocsLang(q) && q !== lang.value) setLang(q)
  },
  { immediate: true },
)

function switchLang(l: DocsLang) {
  setLang(l)
  if (route.query.lang) {
    const query = { ...route.query }
    delete query.lang
    void router.replace({ query, hash: route.hash })
  }
}

// troca de página dentro das docs: baixa a página nova antes e troca sem animação
onBeforeRouteUpdate(async (to, from) => {
  if (to.path === from.path || !docsOpen.value) return
  await loadDoc(initialDocsLang(to.query.lang), slugFromPath(to.path))
  prepareInstantSwap(root.value)
})

watch(
  () => route.path,
  () => {
    drawerOpen.value = false
    searchOpen.value = false
  },
)

function isTyping(el: EventTarget | null) {
  const node = el as HTMLElement | null
  return !!node && (/INPUT|TEXTAREA|SELECT/.test(node.tagName) || node.isContentEditable)
}

function onKey(e: KeyboardEvent) {
  if (!docsOpen.value) return
  const k = e.key.toLowerCase()
  // na referência da API o Ctrl/Cmd+K fica com a busca de endpoints dela
  if (k === 'k' && (e.metaKey || e.ctrlKey) && !isReference.value) {
    e.preventDefault()
    searchOpen.value = !searchOpen.value
  } else if (e.key === '/' && !isTyping(e.target) && !searchOpen.value && !isReference.value) {
    e.preventDefault()
    searchOpen.value = true
  } else if (e.key === 'Escape' && drawerOpen.value) {
    drawerOpen.value = false
  }
}

// a posição do menu lateral sobrevive à troca de página (o layout é recriado a cada página)
let robots: HTMLMetaElement | null = null
onMounted(() => {
  enterDocs()
  settleInstantSwap(root.value)
  document.addEventListener('keydown', onKey)
  if (side.value && sideMemory.y) side.value.scrollTop = sideMemory.y
  // área com login: fora dos buscadores
  robots = document.createElement('meta')
  robots.name = 'robots'
  robots.content = 'noindex, nofollow'
  document.head.appendChild(robots)
  void checkAccess()
})
onBeforeUnmount(() => {
  if (side.value) sideMemory.y = side.value.scrollTop
  leaveDocs()
  document.removeEventListener('keydown', onKey)
  robots?.remove()
})

// sessão aberta (login na entrada ou sessão guardada): índice da busca e a página da rota
watch(
  docsOpen,
  (open) => {
    if (!open) return
    void loadIndex()
    drawerOpen.value = false
  },
  { immediate: true },
)

async function signOut() {
  drawerOpen.value = false
  searchOpen.value = false
  await leaveDocsAccess()
}

watch(drawerOpen, (o) => {
  document.documentElement.classList.toggle('dx-locked', o)
})
onBeforeUnmount(() => document.documentElement.classList.remove('dx-locked'))
</script>

<template>
  <div
    ref="root"
    class="dx"
    :class="{ 'dx--reference': isReference }"
    data-native-scroll
    :lang="lang === 'pt' ? 'pt-BR' : 'en'"
  >
    <a class="dx-skip" href="#dx-main">{{ lang === 'pt' ? 'Pular para o conteúdo' : 'Skip to content' }}</a>

    <header class="dx-top">
      <div class="dx-top__in">
        <button v-if="docsOpen" type="button" class="dx-icon-btn dx-burger" :aria-label="t('menu')" @click="drawerOpen = true">
          <Menu :size="20" :stroke-width="1.8" />
        </button>
        <div class="dx-brand">
          <RouterLink to="/" class="dx-brand__logo" :aria-label="t('home')">
            <img :src="LOGO_SRC" alt="Emmitec Health" width="126" height="16" />
          </RouterLink>
          <span class="dx-brand__sep" aria-hidden="true" />
          <RouterLink to="/developers" class="dx-brand__label">{{ t('developers') }}</RouterLink>
        </div>

        <button v-if="docsOpen" type="button" class="dx-search-btn" @click="searchOpen = true">
          <Search :size="16" :stroke-width="1.8" aria-hidden="true" />
          <span class="dx-search-btn__text">{{ t('search') }}</span>
          <kbd class="dx-kbd">{{ modKey }} K</kbd>
        </button>

        <div class="dx-top__end">
          <DocsLangSwitch class="dx-top__lang" :lang="lang" :label="t('language')" @change="switchLang" />
          <RouterLink
            v-if="docsOpen"
            to="/developers/api-reference"
            class="dx-top__link"
            :class="{ 'is-active': isReference }"
          >
            {{ t('apiReference') }}
          </RouterLink>
          <RouterLink :to="PORTAL_PATH" class="dx-top__link dx-top__portal">{{ t('customerPortal') }}</RouterLink>
          <button v-if="docsOpen" type="button" class="dx-btn dx-btn--line dx-top__out" @click="signOut">
            <LogOut :size="15" :stroke-width="1.8" aria-hidden="true" />{{ t('signOut') }}
          </button>
          <button
            v-if="docsOpen"
            type="button"
            class="dx-icon-btn dx-search-icon"
            :aria-label="t('search')"
            @click="searchOpen = true"
          >
            <Search :size="19" :stroke-width="1.8" />
          </button>
        </div>
      </div>
    </header>

    <div v-if="docsOpen" class="dx-body">
      <aside v-if="!isReference" ref="side" class="dx-side" data-native-scroll>
        <DocsNav />
      </aside>
      <main id="dx-main" class="dx-main">
        <RouterView />
      </main>
    </div>
    <main v-else id="dx-main" class="dx-main dx-main--gate">
      <DocsGate />
    </main>

    <DocsSearch v-if="docsOpen" v-model:open="searchOpen" />

    <Teleport to="body">
      <Transition name="dx-drawer">
        <div v-if="drawerOpen" class="dx-portal dx-drawer" data-native-scroll @mousedown.self="drawerOpen = false">
          <div class="dx-drawer__panel" role="dialog" aria-modal="true" :aria-label="t('menu')" :lang="lang">
            <div class="dx-drawer__head">
              <span class="dx-brand__label">{{ t('developers') }}</span>
              <button type="button" class="dx-icon-btn" :aria-label="t('close')" @click="drawerOpen = false">
                <X :size="20" :stroke-width="1.8" />
              </button>
            </div>
            <div class="dx-drawer__tools">
              <DocsLangSwitch :lang="lang" :label="t('language')" @change="switchLang" />
              <button type="button" class="dx-btn dx-btn--line dx-top__out" @click="signOut">
                <LogOut :size="15" :stroke-width="1.8" aria-hidden="true" />{{ t('signOut') }}
              </button>
              <RouterLink :to="PORTAL_PATH" class="dx-drawer__portal" @click="drawerOpen = false">
                {{ t('openPortal') }}
                <ArrowUpRight :size="16" :stroke-width="1.8" aria-hidden="true" />
              </RouterLink>
            </div>
            <DocsNav @navigate="drawerOpen = false" />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
