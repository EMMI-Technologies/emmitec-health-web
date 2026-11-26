<script setup lang="ts">
/**
 * Entrada das docs (sem sessão do portal): login com a conta do portal do cliente, o que a documentação cobre
 * (os títulos do menu, a prévia pública) e os caminhos para quem ainda não é parceiro.
 * Spec: docs/specs/2026/q4/q4-2/docs-de-parceiros-so-com-login.md.
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { ArrowRight, Eye, EyeOff, Info, Lock } from 'lucide-vue-next'
import { NAV } from '@/lib/developers/nav'
import { useDocsLang } from '@/lib/developers/lang'
import { docsChecking } from '@/lib/developers/access'
import { boot, login, portal } from '@/lib/portal/store'
import { PortalError } from '@/lib/portal/api'
import { ACCESS_MAILTO, INTEGRATIONS_PATH } from '@/content/developers/ui'
import { CONTACT_EMAIL } from '@/lib/site'

const { lang, t } = useDocsLang()

const email = ref('')
const password = ref('')
const reveal = ref(false)
const busy = ref(false)
const error = ref('')
const requestId = ref<string | null>(null)
const emailEl = ref<HTMLInputElement | null>(null)
const passEl = ref<HTMLInputElement | null>(null)

const showForm = computed(() => !docsChecking.value && portal.phase !== 'bootError')
const notice = computed(() => (portal.notice === 'sessionEnded' ? t('gateSessionEnded') : ''))

function focusEmail() {
  void nextTick(() => emailEl.value?.focus())
}
onMounted(() => {
  if (showForm.value) focusEmail()
})
watch(showForm, (v) => {
  if (v) focusEmail()
})

async function submit() {
  error.value = ''
  requestId.value = null
  if (!email.value.trim() || !password.value) {
    error.value = t('gateErrRequired')
    ;(email.value.trim() ? passEl : emailEl).value?.focus()
    return
  }
  busy.value = true
  try {
    await login(email.value.trim(), password.value)
    // a sessão abriu: o layout troca a entrada pela documentação
  } catch (e) {
    if (e instanceof PortalError && e.status === 401) {
      error.value = t('gateErrWrong')
      requestId.value = e.requestId
      password.value = ''
      void nextTick(() => passEl.value?.focus())
    } else if (e instanceof PortalError && e.status === 429) {
      error.value = t('gateErrTooMany')
      requestId.value = e.requestId
    } else if (e instanceof PortalError && e.isNetwork) {
      error.value = t('gateErrNetwork')
    } else {
      error.value = t('gateErrServer')
      requestId.value = e instanceof PortalError ? e.requestId : null
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="dx-gate">
    <section class="dx-gate__form" aria-labelledby="dx-gate-title">
      <p class="dx-eyebrow">{{ t('gateEyebrow') }}</p>
      <h1 id="dx-gate-title" class="dx-h1 dx-gate__title">{{ t('gateTitle') }}</h1>
      <p class="dx-lead dx-gate__lead">{{ t('gateLead') }}</p>

      <div v-if="docsChecking" class="dx-gate__checking" role="status">
        <span class="dx-gate__spin" aria-hidden="true" />{{ t('gateChecking') }}
      </div>

      <div v-else-if="portal.phase === 'bootError'" class="dx-gate__checking">
        <p class="dx-gate__error" role="alert">{{ t('gateErrNetwork') }}</p>
        <button type="button" class="dx-btn dx-btn--line dx-gate__retry" @click="boot">{{ t('retry') }}</button>
      </div>

      <form v-else novalidate @submit.prevent="submit">
        <p v-if="notice" class="dx-gate__notice" role="status">
          <Info :size="17" :stroke-width="1.8" aria-hidden="true" />{{ notice }}
        </p>
        <div>
          <label class="dx-gate__label" for="dx-gate-email">{{ t('gateEmail') }}</label>
          <input
            id="dx-gate-email"
            ref="emailEl"
            v-model="email"
            class="dx-gate__input"
            type="email"
            name="email"
            autocomplete="username"
            inputmode="email"
            spellcheck="false"
            :aria-invalid="!!error && !email.trim()"
          />
        </div>
        <div>
          <label class="dx-gate__label" for="dx-gate-password">{{ t('gatePassword') }}</label>
          <div class="dx-gate__pass">
            <input
              id="dx-gate-password"
              ref="passEl"
              v-model="password"
              class="dx-gate__input"
              :type="reveal ? 'text' : 'password'"
              name="password"
              autocomplete="current-password"
              :aria-invalid="!!error && !password"
            />
            <button
              type="button"
              class="dx-gate__eye"
              :aria-label="reveal ? t('gateHidePassword') : t('gateShowPassword')"
              :aria-pressed="reveal"
              @click="reveal = !reveal"
            >
              <EyeOff v-if="reveal" :size="18" :stroke-width="1.8" aria-hidden="true" />
              <Eye v-else :size="18" :stroke-width="1.8" aria-hidden="true" />
            </button>
          </div>
        </div>
        <p v-if="error" class="dx-gate__error" role="alert">
          {{ error }}
          <span v-if="requestId" class="dx-gate__req">{{ requestId }}</span>
        </p>
        <button type="submit" class="dx-btn dx-gate__submit" :disabled="busy">
          {{ busy ? t('gateSubmitting') : t('gateSubmit') }}
        </button>
      </form>

      <p class="dx-gate__help">
        {{ t('gateHelp') }} {{ t('gateHelpLink') }} <a :href="ACCESS_MAILTO">{{ CONTACT_EMAIL }}</a>
      </p>

      <div class="dx-gate__not">
        <strong>{{ t('gateNotPartner') }}</strong>
        <RouterLink :to="INTEGRATIONS_PATH">
          {{ t('gateHow') }}<ArrowRight :size="16" :stroke-width="1.8" aria-hidden="true" />
        </RouterLink>
        <a :href="ACCESS_MAILTO">
          {{ t('gateAsk') }}<ArrowRight :size="16" :stroke-width="1.8" aria-hidden="true" />
        </a>
      </div>
    </section>

    <aside class="dx-gate__inside" aria-labelledby="dx-gate-inside">
      <h2 id="dx-gate-inside">
        <Lock :size="17" :stroke-width="1.9" aria-hidden="true" />{{ t('gateInside') }}
      </h2>
      <p>{{ t('gateInsideLead') }}</p>
      <div v-for="section in NAV" :key="section.title.en" class="dx-gate__group">
        <p class="dx-gate__group-title">{{ section.title[lang] }}</p>
        <ul>
          <li v-for="item in section.items" :key="item.slug">{{ item.title[lang] }}</li>
        </ul>
      </div>
    </aside>
  </div>
</template>
