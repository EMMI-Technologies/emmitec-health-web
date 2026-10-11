<script setup lang="ts">
/**
 * Navbar do DS: logo à esquerda + botão "Menu" que abre no hover (mouse),
 * no toque (clique) e no foco do teclado. O painel abre com clip-path numa
 * curva suave e os itens entram escalonados. Some ao rolar para baixo e
 * volta ao rolar para cima.
 */
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { setLocale } from '@/i18n'
import { addFx } from '@/lib/motion'
import { calendlyUrl, languages, socialLinks, LOGO_SRC } from '@/lib/site'
import EmButton from '@/components/em/EmButton.vue'

const { locale, t } = useI18n()
const route = useRoute()

const wrap = ref<HTMLElement | null>(null)
const burger = ref<HTMLButtonElement | null>(null)

const open = ref(false)
const solid = ref(false)
const hidden = ref(false)

const canHover =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches

let closeT = 0
let openedAt = 0

function setOpen(o: boolean) {
  window.clearTimeout(closeT)
  if (o === open.value) return
  open.value = o
  if (o) openedAt = performance.now()
}
function closeSoon() {
  window.clearTimeout(closeT)
  closeT = window.setTimeout(() => setOpen(false), 280)
}
function onEnter(e: PointerEvent) {
  if (e.pointerType !== 'touch') setOpen(true)
}
function onLeave(e: PointerEvent) {
  if (e.pointerType !== 'touch') closeSoon()
}
function onBurger() {
  // acabou de abrir pelo hover: o clique não deve fechar
  if (open.value && canHover && performance.now() - openedAt < 800) return
  setOpen(!open.value)
}
function onFocusIn(e: FocusEvent) {
  const el = e.target as HTMLElement | null
  if (el?.matches?.(':focus-visible')) setOpen(true)
}
function onFocusOut(e: FocusEvent) {
  if (!wrap.value?.contains(e.relatedTarget as Node | null)) closeSoon()
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) {
    setOpen(false)
    burger.value?.focus()
  }
}
function onDocDown(e: PointerEvent) {
  if (open.value && wrap.value && !wrap.value.contains(e.target as Node)) setOpen(false)
}

/** Idioma ativo — a bandeira aparece no botão do menu para sinalizar onde trocar. */
const currentLang = computed(() => languages.find((l) => l.code === locale.value) ?? languages[0])

/** Um item está ativo quando a rota atual é ele ou uma de suas filhas. */
function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(path + '/')
}

const aboutChildren = computed(() => [
  { label: t('header.nav.ourHistory'), to: '/about' },
  { label: t('header.nav.whatIsRpm'), to: '/what-is-rpm' },
  { label: t('header.nav.benefits'), to: '/benefits' },
  { label: t('header.nav.apps'), to: '/apps' },
])

const links = computed(() => [
  { n: '03', label: t('header.nav.blog'), to: '/blog', si: 3 },
  { n: '04', label: t('header.nav.equipment'), to: '/equipment', si: 4 },
])

// Fecha ao trocar de página
watch(
  () => route.fullPath,
  () => {
    setOpen(false)
    hidden.value = false
  },
)

let offFx: (() => void) | null = null
let lastY = 0
onMounted(() => {
  lastY = window.scrollY
  offFx = addFx((y) => {
    solid.value = y > 30
    if (!open.value) {
      if (y > 260 && y > lastY + 1.5) hidden.value = true
      else if (y < lastY - 1.5 || y < 260) hidden.value = false
    }
    lastY = y
  })
  document.addEventListener('keydown', onKey)
  document.addEventListener('pointerdown', onDocDown)
})
onBeforeUnmount(() => {
  offFx?.()
  window.clearTimeout(closeT)
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('pointerdown', onDocDown)
})
</script>

<template>
  <nav
    class="em-nav"
    :class="{ 'is-open': open, 'is-solid': solid, 'is-hidden': hidden && !open }"
    :aria-label="t('header.menuTitle')"
  >
    <RouterLink
      class="em-logo em-logo--img"
      to="/"
      :aria-label="`Emmitec Health — ${t('header.nav.home')}`"
    >
      <img :src="LOGO_SRC" alt="Emmitec Health" width="1352" height="171" />
    </RouterLink>

    <div
      ref="wrap"
      class="em-nav__menu"
      @pointerenter="onEnter"
      @pointerleave="onLeave"
      @focusin="onFocusIn"
      @focusout="onFocusOut"
    >
      <button
        ref="burger"
        class="em-burger"
        type="button"
        :aria-label="t('header.menu')"
        :aria-expanded="open ? 'true' : 'false'"
        aria-controls="em-menu"
        @click="onBurger"
      >
        <img class="em-burger__flag" :src="currentLang.flag" alt="" width="20" height="15" />
        <span class="em-burger__label">
          <span>{{ t('header.menuLabel') }}</span>
          <span aria-hidden="true">{{ t('header.close') }}</span>
        </span>
        <span class="em-burger__lines"><i /><i /></span>
      </button>

      <div id="em-menu" class="em-menu">
        <div class="em-menu__panel" data-native-scroll>
          <div class="em-menu__head" style="--si: 0">
            <span class="em-eyebrow">{{ t('header.menuTitle') }}</span>
            <div class="em-lang" role="group" :aria-label="t('header.nav.language')">
              <button
                v-for="lang in languages"
                :key="lang.code"
                type="button"
                class="em-lang__btn"
                :class="{ 'is-active': locale === lang.code }"
                :aria-pressed="locale === lang.code ? 'true' : 'false'"
                @click="setLocale(lang.code)"
              >
                <img class="em-lang__flag" :src="lang.flag" alt="" width="16" height="12" />{{
                  lang.label
                }}
              </button>
            </div>
          </div>

          <RouterLink
            class="em-menu__link"
            :class="{ 'is-active': isActive('/') }"
            to="/"
            style="--si: 1"
          >
            <span class="em-menu__n">01</span>
            <span
              ><strong>{{ t('header.nav.home') }}</strong></span
            >
            <span class="em-menu__go" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M7 17L17 7M8 7h9v9" />
              </svg>
            </span>
          </RouterLink>

          <div class="em-menu__group" style="--si: 2">
            <div class="em-menu__glabel">
              <span class="em-menu__n">02</span>
              <strong>{{ t('header.nav.about') }}</strong>
            </div>
            <div class="em-menu__sub">
              <RouterLink
                v-for="c in aboutChildren"
                :key="c.to"
                :to="c.to"
                class="em-menu__sublink"
                :class="{ 'is-active': isActive(c.to) }"
              >
                <span>{{ c.label }}</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M7 17L17 7M8 7h9v9" />
                </svg>
              </RouterLink>
            </div>
          </div>

          <RouterLink
            v-for="l in links"
            :key="l.to"
            class="em-menu__link"
            :class="{ 'is-active': isActive(l.to) }"
            :to="l.to"
            :style="{ '--si': l.si }"
          >
            <span class="em-menu__n">{{ l.n }}</span>
            <span
              ><strong>{{ l.label }}</strong></span
            >
            <span class="em-menu__go" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M7 17L17 7M8 7h9v9" />
              </svg>
            </span>
          </RouterLink>

          <div class="em-menu__cta" style="--si: 5">
            <EmButton :href="calendlyUrl" :label="t('header.cta')" variant="dark" block />
          </div>

          <div class="em-menu__foot" style="--si: 6">
            <span class="em-status"
              ><span class="em-dot em-dot--live" />{{ t('hero.trust.support') }}</span
            >
            <span class="em-social">
              <a
                v-for="s in socialLinks"
                :key="s.name"
                :href="s.href"
                target="_blank"
                rel="noopener noreferrer"
                :aria-label="s.name"
              >
                <component :is="s.icon" :stroke-width="1.7" aria-hidden="true" />
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>
