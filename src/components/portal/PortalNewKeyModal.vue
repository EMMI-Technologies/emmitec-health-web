<script setup lang="ts">
/**
 * Gerar nova chave (POST /portal/keys): nome da chave -> segredo na tela, com Copiar e o aviso
 * "Guarde no seu servidor. Nunca coloque no app."
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Check, Copy, TriangleAlert, X } from 'lucide-vue-next'
import { usePortalLang } from '@/lib/portal/i18n'
import { portalApi, type Mode, type PortalKey } from '@/lib/portal/api'
import { copyText, errorView, secrets, type ErrorView } from '@/lib/portal/store'
import PortalErrorMsg from './PortalErrorMsg.vue'

const props = defineProps<{ mode: Mode | null }>()
const emit = defineEmits<{ close: []; created: [key: PortalKey] }>()

const { t } = usePortalLang()

const label = ref('')
const busy = ref(false)
const error = ref<ErrorView | null>(null)
const secret = ref('')
const copied = ref(false)
const panel = ref<HTMLElement | null>(null)
let lastFocus: HTMLElement | null = null

const title = computed(() =>
  secret.value ? t('keys.createdTitle') : t(`keys.modalTitle.${props.mode ?? 'test'}`),
)

watch(
  () => props.mode,
  (m) => {
    if (m) {
      lastFocus = document.activeElement as HTMLElement | null
      label.value = ''
      secret.value = ''
      error.value = null
      copied.value = false
      document.addEventListener('keydown', onKey)
      void nextTick(() => panel.value?.querySelector<HTMLElement>('input, button.po-btn')?.focus())
    } else {
      document.removeEventListener('keydown', onKey)
      lastFocus?.focus?.()
    }
  },
)
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))

function close() {
  if (busy.value) return
  emit('close')
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  } else if (e.key === 'Tab' && panel.value) {
    // foco preso dentro da janela
    const els = Array.from(
      panel.value.querySelectorAll<HTMLElement>('button:not([disabled]), input, [href]'),
    )
    if (!els.length) return
    const first = els[0]!
    const last = els[els.length - 1]!
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

async function create() {
  if (!props.mode) return
  error.value = null
  const name = label.value.trim()
  if (!name) {
    error.value = { message: t('keys.errLabel'), requestId: null }
    return
  }
  busy.value = true
  try {
    const r = await portalApi.createKey(props.mode, name)
    secret.value = r.secret
    secrets.set(r.key.id, r.secret)
    emit('created', r.key)
    void nextTick(() => panel.value?.querySelector<HTMLElement>('.po-modal__copy')?.focus())
  } catch (e) {
    error.value = errorView(e, { '409': 'err.liveConflict' })
  } finally {
    busy.value = false
  }
}

async function copy() {
  if (await copyText(secret.value)) {
    copied.value = true
    window.setTimeout(() => (copied.value = false), 1800)
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="po-modal">
      <div v-if="mode" class="po-modal po-layer" data-native-scroll @mousedown.self="close">
        <div
          ref="panel"
          class="po-modal__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="po-newkey-title"
        >
          <div class="po-modal__head">
            <h2 id="po-newkey-title" class="po-modal__title">{{ title }}</h2>
            <button type="button" class="po-modal__x" :aria-label="t('close')" @click="close">
              <X :size="19" :stroke-width="1.8" />
            </button>
          </div>

          <form v-if="!secret" novalidate @submit.prevent="create">
            <div class="po-field">
              <label class="po-field__label" for="po-newkey-label">{{
                t('keys.labelField')
              }}</label>
              <input
                id="po-newkey-label"
                v-model="label"
                class="po-input"
                type="text"
                maxlength="80"
                autocomplete="off"
                :aria-invalid="!!error && !label.trim()"
                aria-describedby="po-newkey-hint"
              />
              <p id="po-newkey-hint" class="po-field__hint">{{ t('keys.labelHint') }}</p>
            </div>
            <PortalErrorMsg :error="error" />
            <div class="po-modal__actions">
              <button type="button" class="po-btn po-btn--line" :disabled="busy" @click="close">
                {{ t('keys.cancel') }}
              </button>
              <button type="submit" class="po-btn" :disabled="busy">
                {{ busy ? t('keys.creating') : t('keys.create') }}
              </button>
            </div>
          </form>

          <div v-else>
            <div class="po-secret">
              <code class="po-secret__val">{{ secret }}</code>
            </div>
            <p class="po-modal__warn">
              <TriangleAlert :size="18" :stroke-width="1.9" aria-hidden="true" />
              {{ t('keys.createdNote') }}
            </p>
            <p class="po-note" style="margin-top: 6px">{{ t('keys.createdMore') }}</p>
            <div class="po-modal__actions">
              <button
                type="button"
                class="po-btn po-btn--line po-modal__copy"
                :class="{ 'is-done': copied }"
                @click="copy"
              >
                <Check v-if="copied" :size="16" :stroke-width="2" aria-hidden="true" />
                <Copy v-else :size="16" :stroke-width="1.8" aria-hidden="true" />
                {{ copied ? t('copied') : t('copy') }}
              </button>
              <button type="button" class="po-btn" @click="emit('close')">
                {{ t('keys.done') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
