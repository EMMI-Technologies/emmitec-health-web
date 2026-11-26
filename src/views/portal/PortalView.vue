<script setup lang="ts">
/**
 * Portal do cliente parceiro (/portal): plano, chaves, alertas e webhook, limites e entregas.
 * Rota `bare` (sem menu, rodapé e tela de entrada do site), carregada só quando aberta.
 *
 * Sessão: token do portal no sessionStorage (some ao fechar a aba, no "Sair" e em qualquer 401).
 * Contrato: docs/integracao/partner-api-v1-contrato.md, seção 8.4.
 */
import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { CircleAlert, CircleCheck, LogOut } from 'lucide-vue-next'
import PortalTopBar from '@/components/portal/PortalTopBar.vue'
import PortalLogin from '@/components/portal/PortalLogin.vue'
import PortalApp from '@/components/portal/PortalApp.vue'
import PortalPasswordForm from '@/components/portal/PortalPasswordForm.vue'
import PortalErrorMsg from '@/components/portal/PortalErrorMsg.vue'
import { usePortalLang } from '@/lib/portal/i18n'
import { boot, errorView, logout, portal, refreshMe, signedIn, toast } from '@/lib/portal/store'
import { usePageMeta } from '@/lib/seo'
import './portal.css'

const { lang, t } = usePortalLang()
const router = useRouter()

usePageMeta(() => ({ title: t('portal') }))

/* rolagem nativa: as teclas de rolagem não passam para a rolagem amortecida do site */
const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'])
function onKey(e: KeyboardEvent) {
  if (SCROLL_KEYS.has(e.key)) e.stopPropagation()
}

let robots: HTMLMetaElement | null = null
onMounted(() => {
  document.documentElement.classList.add('po-on')
  document.addEventListener('keydown', onKey)
  // área logada: fora dos buscadores
  robots = document.createElement('meta')
  robots.name = 'robots'
  robots.content = 'noindex, nofollow'
  document.head.appendChild(robots)
  // quem chega das docs já entrou (mesmo estado): só atualiza os números, sem a tela de carregamento
  if (signedIn()) void refreshMe().catch(() => undefined)
  else void boot()
})
onBeforeUnmount(() => {
  document.documentElement.classList.remove('po-on')
  document.removeEventListener('keydown', onKey)
  robots?.remove()
})

function openPassword() {
  if (portal.phase === 'app') void router.push({ hash: '#password' })
}

/** Sair de propósito: a próxima entrada começa na visão geral. */
async function signOut() {
  await logout()
  if (router.currentRoute.value.hash) void router.replace({ hash: '' })
}

function forcedDone() {
  portal.phase = 'app'
}

function skip(e: MouseEvent) {
  e.preventDefault()
  document.getElementById('po-main')?.focus()
}
</script>

<template>
  <div class="po" data-native-scroll :lang="lang === 'pt' ? 'pt-BR' : 'en'">
    <a class="po-skip" href="#po-main" @click="skip">{{ t('skip') }}</a>

    <PortalTopBar
      :signed-in="portal.phase === 'app' || portal.phase === 'password'"
      @password="openPassword"
      @logout="signOut"
    />

    <PortalLogin v-if="portal.phase === 'login'" />

    <div v-else-if="portal.phase === 'boot'" class="po-boot" role="status">
      <div class="po-boot__in">
        <span class="po-spin" aria-hidden="true" />
        {{ t('boot.loading') }}
      </div>
    </div>

    <div v-else-if="portal.phase === 'bootError'" class="po-boot">
      <div class="po-boot__in" style="max-width: 420px">
        <strong style="color: var(--po-ink)">{{ t('boot.error') }}</strong>
        <PortalErrorMsg :error="errorView(portal.bootError)" />
        <button type="button" class="po-btn" @click="boot">{{ t('retry') }}</button>
      </div>
    </div>

    <div v-else-if="portal.phase === 'password'" class="po-auth po-auth--single">
      <section id="po-main" class="po-auth__form" tabindex="-1" aria-labelledby="po-force-title">
        <div class="po-auth__in">
          <h1 id="po-force-title" class="po-auth__title">{{ t('force.title') }}</h1>
          <p class="po-auth__lead">{{ t('force.lead') }}</p>
          <PortalPasswordForm force @done="forcedDone" />
          <nav class="po-auth__foot">
            <a href="#" @click.prevent="signOut">
              <LogOut :size="16" :stroke-width="1.8" aria-hidden="true" />{{ t('pwd.signOut') }}
            </a>
          </nav>
        </div>
      </section>
    </div>

    <PortalApp v-else />

    <Transition name="po-toast">
      <div
        v-if="toast.text"
        :key="toast.n"
        class="po-toast po-layer"
        :class="{ 'po-toast--error': toast.kind === 'error' }"
        role="status"
        aria-live="polite"
      >
        <CircleAlert
          v-if="toast.kind === 'error'"
          :size="17"
          :stroke-width="1.9"
          aria-hidden="true"
        />
        <CircleCheck v-else :size="17" :stroke-width="1.9" aria-hidden="true" />
        {{ toast.text }}
      </div>
    </Transition>
  </div>
</template>
