<script setup lang="ts">
/**
 * Barra do topo do portal, irmã da barra das docs: logo, "Portal do cliente", nome da empresa,
 * links para as docs, PT | EN e o menu da conta (Trocar senha, Sair).
 * No celular, idioma e links das docs entram no menu da conta.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { BookOpen, ChevronDown, Code, KeyRound, LogOut } from 'lucide-vue-next'
import { LOGO_SRC } from '@/lib/site'
import { usePortalLang } from '@/lib/portal/i18n'
import { docsHref, portal } from '@/lib/portal/store'
import PortalLangSwitch from './PortalLangSwitch.vue'

const props = defineProps<{ signedIn: boolean }>()
const emit = defineEmits<{ password: []; logout: [] }>()

const { t } = usePortalLang()
const open = ref(false)
const wrap = ref<HTMLElement | null>(null)
const btn = ref<HTMLButtonElement | null>(null)

const initials = computed(() => {
  const n = portal.user?.name?.trim() || portal.user?.email || ''
  const parts = n.split(/[\s@._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
})
const firstName = computed(
  () => portal.user?.name?.trim().split(/\s+/)[0] || portal.user?.email || '',
)

function onDoc(e: PointerEvent) {
  if (open.value && wrap.value && !wrap.value.contains(e.target as Node)) open.value = false
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) {
    open.value = false
    btn.value?.focus()
  }
}
onMounted(() => {
  document.addEventListener('pointerdown', onDoc)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDoc)
  document.removeEventListener('keydown', onKey)
})

function pick(what: 'password' | 'logout') {
  open.value = false
  if (what === 'password') emit('password')
  else emit('logout')
}
</script>

<template>
  <header class="po-top" :class="{ 'po-top--out': !props.signedIn }">
    <div class="po-top__in">
      <div class="po-brand">
        <RouterLink to="/" class="po-brand__logo" :aria-label="t('home')">
          <img :src="LOGO_SRC" alt="Emmitec Health" width="126" height="16" />
        </RouterLink>
        <span class="po-brand__sep" aria-hidden="true" />
        <span class="po-brand__label">{{ t('portal') }}</span>
        <span v-if="props.signedIn && portal.integration" class="po-brand__org"
          ><span>{{ portal.integration.name }}</span></span
        >
      </div>

      <div class="po-top__end">
        <RouterLink :to="docsHref()" class="po-top__link">{{ t('docs') }}</RouterLink>
        <RouterLink :to="docsHref('api-reference')" class="po-top__link po-top__docs">{{
          t('apiReference')
        }}</RouterLink>
        <PortalLangSwitch />

        <div v-if="props.signedIn && portal.user" ref="wrap" class="po-user">
          <button
            ref="btn"
            type="button"
            class="po-user__btn"
            :aria-expanded="open"
            aria-haspopup="menu"
            :aria-label="t('user.menu')"
            @click="open = !open"
          >
            <span class="po-avatar" aria-hidden="true">{{ initials }}</span>
            <span class="po-user__name">{{ firstName }}</span>
            <ChevronDown class="po-user__chev" :size="16" :stroke-width="1.8" aria-hidden="true" />
          </button>
          <Transition name="po-menu">
            <div v-if="open" class="po-menu" role="menu">
              <div class="po-menu__who">
                <strong>{{ portal.user.name || portal.user.email }}</strong>
                <span>{{ portal.user.email }}</span>
              </div>
              <div class="po-menu__extra">
                <PortalLangSwitch />
                <RouterLink :to="docsHref()" class="po-menu__item" role="menuitem">
                  <BookOpen :size="17" :stroke-width="1.8" aria-hidden="true" />{{ t('docs') }}
                </RouterLink>
                <RouterLink :to="docsHref('api-reference')" class="po-menu__item" role="menuitem">
                  <Code :size="17" :stroke-width="1.8" aria-hidden="true" />{{ t('apiReference') }}
                </RouterLink>
              </div>
              <button type="button" class="po-menu__item" role="menuitem" @click="pick('password')">
                <KeyRound :size="17" :stroke-width="1.8" aria-hidden="true" />{{
                  t('user.changePassword')
                }}
              </button>
              <button type="button" class="po-menu__item" role="menuitem" @click="pick('logout')">
                <LogOut :size="17" :stroke-width="1.8" aria-hidden="true" />{{ t('user.signOut') }}
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </header>
</template>
