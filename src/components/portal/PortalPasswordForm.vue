<script setup lang="ts">
/**
 * Trocar senha (PUT /portal/password): mínimo 10 caracteres, letras e números.
 * `force`: primeira entrada com senha temporária. A senha digitada no login fica só em memória
 * e entra como senha atual; sem ela (página recarregada), o campo aparece.
 */
import { computed, nextTick, onMounted, ref } from 'vue'
import { Check, Circle, Eye, EyeOff } from 'lucide-vue-next'
import { usePortalLang } from '@/lib/portal/i18n'
import { isWrongCurrentPassword, portalApi, PortalError } from '@/lib/portal/api'
import { errorView, portal, showToast, type ErrorView } from '@/lib/portal/store'
import PortalErrorMsg from './PortalErrorMsg.vue'

const props = withDefaults(defineProps<{ force?: boolean }>(), { force: false })
const emit = defineEmits<{ done: [] }>()

const { t } = usePortalLang()

const needCurrent = computed(() => !(props.force && portal.loginPassword))
const current = ref('')
const next = ref('')
const confirm = ref('')
const reveal = ref(false)
const busy = ref(false)
const error = ref<ErrorView | null>(null)
const tried = ref(false)

const rules = computed(() => [
  { id: 'len', ok: next.value.length >= 10, label: t('pwd.ruleLen') },
  {
    id: 'mix',
    ok: /[a-zA-ZÀ-ɏ]/.test(next.value) && /\d/.test(next.value),
    label: t('pwd.ruleMix'),
  },
  { id: 'match', ok: !!next.value && next.value === confirm.value, label: t('pwd.ruleMatch') },
])

onMounted(() => {
  if (props.force)
    void nextTick(() =>
      document.getElementById(needCurrent.value ? 'po-pwd-current' : 'po-pwd-new')?.focus(),
    )
})

async function submit() {
  tried.value = true
  error.value = null
  const cur = needCurrent.value ? current.value : portal.loginPassword
  if (needCurrent.value && !cur) {
    error.value = { message: t('pwd.errCurrent'), requestId: null }
    return
  }
  if (!rules.value[0]!.ok || !rules.value[1]!.ok) {
    error.value = { message: t('pwd.errRules'), requestId: null }
    return
  }
  if (!rules.value[2]!.ok) {
    error.value = { message: t('pwd.errMatch'), requestId: null }
    return
  }
  if (next.value === cur) {
    error.value = { message: t('pwd.errSame'), requestId: null }
    return
  }
  busy.value = true
  try {
    await portalApi.changePassword(cur, next.value)
    portal.loginPassword = ''
    if (portal.user) portal.user.mustChangePassword = false
    current.value = next.value = confirm.value = ''
    tried.value = false
    showToast(t('pwd.done'))
    emit('done')
  } catch (e) {
    if (e instanceof PortalError && isWrongCurrentPassword(e)) {
      error.value = { message: t('pwd.errCurrent'), requestId: e.requestId }
    } else {
      error.value = errorView(e)
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="po-form" novalidate @submit.prevent="submit">
    <!-- campo escondido para o gerenciador de senhas saber de qual conta é -->
    <input
      type="text"
      name="username"
      autocomplete="username"
      :value="portal.user?.email ?? ''"
      class="po-sr"
      tabindex="-1"
      aria-hidden="true"
      readonly
    />
    <div v-if="needCurrent" class="po-field">
      <label class="po-field__label" for="po-pwd-current">{{ t('pwd.current') }}</label>
      <input
        id="po-pwd-current"
        v-model="current"
        class="po-input"
        :type="reveal ? 'text' : 'password'"
        autocomplete="current-password"
      />
    </div>
    <div class="po-field">
      <label class="po-field__label" for="po-pwd-new">{{ t('pwd.new') }}</label>
      <div class="po-pass">
        <input
          id="po-pwd-new"
          v-model="next"
          class="po-input"
          :type="reveal ? 'text' : 'password'"
          autocomplete="new-password"
          :aria-invalid="tried && (!rules[0]!.ok || !rules[1]!.ok)"
          aria-describedby="po-pwd-rules"
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
      <ul id="po-pwd-rules" class="po-rules">
        <li v-for="r in rules" :key="r.id" :class="{ 'is-ok': r.ok }">
          <Check v-if="r.ok" :size="15" :stroke-width="2.2" aria-hidden="true" />
          <Circle v-else :size="13" :stroke-width="2" aria-hidden="true" />
          {{ r.label }}
        </li>
      </ul>
    </div>
    <div class="po-field">
      <label class="po-field__label" for="po-pwd-confirm">{{ t('pwd.confirm') }}</label>
      <input
        id="po-pwd-confirm"
        v-model="confirm"
        class="po-input"
        :type="reveal ? 'text' : 'password'"
        autocomplete="new-password"
        :aria-invalid="tried && !rules[2]!.ok"
      />
    </div>

    <PortalErrorMsg :error="error" />

    <div class="po-form__actions">
      <button type="submit" class="po-btn" :class="{ 'po-btn--block': force }" :disabled="busy">
        {{ busy ? t('pwd.saving') : force ? t('pwd.submitForce') : t('pwd.submit') }}
      </button>
    </div>
  </form>
</template>
