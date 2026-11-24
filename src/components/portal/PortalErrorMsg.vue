<script setup lang="ts">
/** Erro da API: mensagem curta e, em letra pequena, o requestId para o suporte. */
import { CircleAlert } from 'lucide-vue-next'
import { usePortalLang } from '@/lib/portal/i18n'
import type { ErrorView } from '@/lib/portal/store'

defineProps<{ error: ErrorView | null }>()
const { t } = usePortalLang()
</script>

<template>
  <div v-if="error" class="po-error" role="alert">
    <CircleAlert :size="17" :stroke-width="1.9" aria-hidden="true" />
    <div>
      {{ error.message }}
      <small v-if="error.requestId" class="po-error__rid"
        >{{ t('requestId') }}: <code>{{ error.requestId }}</code></small
      >
    </div>
  </div>
</template>
