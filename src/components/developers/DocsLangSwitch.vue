<script setup lang="ts">
/** EN | PT das docs. O endereço continua o mesmo; a escolha vale também para o site. */
import type { DocsLang } from '@/lib/developers/types'

defineProps<{ lang: DocsLang; label: string }>()
const emit = defineEmits<{ change: [lang: DocsLang] }>()

const options: { code: DocsLang; label: string; name: string }[] = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'pt', label: 'PT', name: 'Português' },
]
</script>

<template>
  <div class="dx-lang" role="group" :aria-label="label">
    <button
      v-for="o in options"
      :key="o.code"
      type="button"
      class="dx-lang__opt"
      :class="{ 'is-on': lang === o.code }"
      :aria-pressed="lang === o.code"
      :title="o.name"
      :lang="o.code"
      @click="emit('change', o.code)"
    >
      {{ o.label }}
    </button>
  </div>
</template>
