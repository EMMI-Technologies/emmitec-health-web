<script setup lang="ts">
/**
 * Entrar no portal: e-mail e senha (contas criadas pela EmmiTec no backoffice).
 * Erros: senha errada (401, mensagem única), muitas tentativas (429), sem conexão.
 * Ao lado, o painel da marca com os raios de luz do hero do site (some no celular).
 */
import { computed, nextTick, onMounted, ref } from 'vue'
import { ArrowLeft, BookOpen, Check, Eye, EyeOff, Info } from 'lucide-vue-next'
import { usePortalLang } from '@/lib/portal/i18n'
import { PortalError } from '@/lib/portal/api'
import { errorView, login, portal, SUPPORT_EMAIL, type ErrorView } from '@/lib/portal/store'
import PortalErrorMsg from './PortalErrorMsg.vue'

const { t } = usePortalLang()

const email = ref('')
const password = ref('')
const reveal = ref(false)
const busy = ref(false)
const error = ref<ErrorView | null>(null)
const emailEl = ref<HTMLInputElement | null>(null)
const passEl = ref<HTMLInputElement | null>(null)

const helpMail = computed(
  () => `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('portal'))}`,
)

const panelTitle = computed(() => {
  const full = t('login.panelTitle')
  const em = t('login.panelTitleEm')
  const at = full.toLowerCase().indexOf(em.toLowerCase())
  if (at < 0) return { before: full, em: '', after: '' }
  return {
    before: full.slice(0, at),
    em: full.slice(at, at + em.length),
    after: full.slice(at + em.length),
  }
})

onMounted(() => {
  void nextTick(() => emailEl.value?.focus())
})

async function submit() {
  error.value = null
  if (!email.value.trim() || !password.value) {
    error.value = { message: t('login.errRequired'), requestId: null }
    ;(email.value.trim() ? passEl : emailEl).value?.focus()
    return
  }
  busy.value = true
  try {
    await login(email.value.trim(), password.value)
  } catch (e) {
    if (e instanceof PortalError && e.status === 401) {
      error.value = { message: t('login.errWrong'), requestId: e.requestId }
      password.value = ''
      void nextTick(() => passEl.value?.focus())
    } else if (e instanceof PortalError && e.status === 429) {
      error.value = { message: t('login.errTooMany'), requestId: e.requestId }
    } else if (e instanceof PortalError && e.isNetwork) {
      error.value = { message: t('login.errNetwork'), requestId: null }
    } else {
      error.value = errorView(e)
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="po-auth">
    <section class="po-auth__form" aria-labelledby="po-login-title">
      <div class="po-auth__in">
        <p v-if="portal.notice" class="po-notice" role="status">
          <Info :size="17" :stroke-width="1.8" aria-hidden="true" />
          {{ portal.notice === 'sessionEnded' ? t('login.sessionEnded') : t('login.signedOut') }}
        </p>

        <h1 id="po-login-title" class="po-auth__title">{{ t('login.title') }}</h1>
        <p class="po-auth__lead">{{ t('login.lead') }}</p>

        <form novalidate @submit.prevent="submit">
          <div class="po-field">
            <label class="po-field__label" for="po-email">{{ t('login.email') }}</label>
            <input
              id="po-email"
              ref="emailEl"
              v-model="email"
              class="po-input"
              type="email"
              name="email"
              autocomplete="username"
              inputmode="email"
              spellcheck="false"
              :aria-invalid="!!error && !email.trim()"
            />
          </div>
          <div class="po-field">
            <label class="po-field__label" for="po-password">{{ t('login.password') }}</label>
            <div class="po-pass">
              <input
                id="po-password"
                ref="passEl"
                v-model="password"
                class="po-input"
                :type="reveal ? 'text' : 'password'"
                name="password"
                autocomplete="current-password"
                :aria-invalid="!!error && !password"
              />
              <button
                type="button"
                class="po-pass__eye"
                :aria-label="reveal ? t('login.hidePassword') : t('login.showPassword')"
                :aria-pressed="reveal"
                @click="reveal = !reveal"
              >
                <EyeOff v-if="reveal" :size="18" :stroke-width="1.8" aria-hidden="true" />
                <Eye v-else :size="18" :stroke-width="1.8" aria-hidden="true" />
              </button>
            </div>
          </div>

          <PortalErrorMsg :error="error" />

          <button type="submit" class="po-btn po-btn--block po-auth__submit" :disabled="busy">
            {{ busy ? t('login.submitting') : t('login.submit') }}
          </button>
        </form>

        <p class="po-auth__help">
          {{ t('login.help') }} <a :href="helpMail">{{ t('contact') }}</a>
        </p>

        <nav class="po-auth__foot" :aria-label="t('portal')">
          <RouterLink to="/">
            <ArrowLeft :size="16" :stroke-width="1.8" aria-hidden="true" />{{ t('login.backSite') }}
          </RouterLink>
          <!-- a documentação também pede login; para quem ainda não entrou, a prévia pública é /integrations -->
          <RouterLink to="/integrations">
            <BookOpen :size="16" :stroke-width="1.8" aria-hidden="true" />{{ t('login.devDocs') }}
          </RouterLink>
        </nav>
      </div>
    </section>

    <aside class="po-auth__art" aria-hidden="true">
      <div class="em-rays-css"><i /><i /></div>
      <h2>
        {{ panelTitle.before }}<em>{{ panelTitle.em }}</em
        >{{ panelTitle.after }}
      </h2>
      <ul>
        <li><Check :size="18" :stroke-width="2" />{{ t('login.panel1') }}</li>
        <li><Check :size="18" :stroke-width="2" />{{ t('login.panel2') }}</li>
        <li><Check :size="18" :stroke-width="2" />{{ t('login.panel3') }}</li>
      </ul>
    </aside>
  </div>
</template>
