<script setup lang="ts">
/**
 * Estado sem conteúdo dos blocos que vêm da API: erro (com "tentar de novo"),
 * vazio ou não encontrado. Mesmo cartão do "nenhum resultado" do DS.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CloudOff, Inbox, SearchX } from 'lucide-vue-next'
import EmButton from './EmButton.vue'
import type { ApiError } from '@/lib/api'

const props = withDefaults(
  defineProps<{
    kind: 'error' | 'empty' | 'notfound'
    title: string
    text?: string
    /** erro da API: mostra o motivo técnico discreto (status ou rede) */
    error?: ApiError | null
    /** link do botão secundário (ex.: voltar para a lista) */
    backTo?: string
    backLabel?: string
  }>(),
  { text: '', error: null, backTo: undefined, backLabel: '' },
)
const emit = defineEmits<{ retry: [] }>()

const { t } = useI18n()

const icon = computed(() =>
  props.kind === 'error' ? CloudOff : props.kind === 'notfound' ? SearchX : Inbox,
)
const detail = computed(() => {
  if (props.kind !== 'error' || !props.error) return ''
  return props.error.status ? `HTTP ${props.error.status}` : t('state.offline')
})
</script>

<template>
  <div
    class="em-empty em-state em-card"
    :class="`em-state--${kind}`"
    :role="kind === 'error' ? 'alert' : 'status'"
  >
    <span class="em-ico" aria-hidden="true"><component :is="icon" :stroke-width="1.7" /></span>
    <div class="em-state__txt">
      <b>{{ title }}</b>
      <p v-if="text">{{ text }}</p>
      <small v-if="detail">{{ detail }}</small>
    </div>
    <div v-if="kind === 'error' || backTo" class="em-state__actions">
      <EmButton
        v-if="kind === 'error'"
        size="sm"
        variant="dark"
        :label="t('state.retry')"
        @click="emit('retry')"
      />
      <EmButton v-if="backTo" size="sm" variant="ghost" :to="backTo" :label="backLabel" />
    </div>
  </div>
</template>
