<script setup lang="ts">
/**
 * Paginação: anterior / números / próxima, com reticências quando há muitas páginas
 * (sempre a primeira, a última e as vizinhas da atual). `v-model` é a página (1 em diante).
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, ArrowRight } from 'lucide-vue-next'

const props = defineProps<{ pages: number }>()
const page = defineModel<number>({ required: true })

const { t } = useI18n()

/** números visíveis; 0 é reticência */
const items = computed<number[]>(() => {
  const n = props.pages
  const cur = page.value
  if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1)
  const from = Math.max(2, Math.min(cur - 1, n - 4))
  const to = Math.min(n - 1, Math.max(cur + 1, 5))
  const mid = Array.from({ length: to - from + 1 }, (_, i) => from + i)
  return [1, ...(from > 2 ? [0] : []), ...mid, ...(to < n - 1 ? [0] : []), n]
})

function go(n: number) {
  if (n >= 1 && n <= props.pages && n !== page.value) page.value = n
}
</script>

<template>
  <nav class="em-pager" :aria-label="t('aria.pagination')">
    <button
      type="button"
      class="em-round"
      :disabled="page <= 1"
      :aria-label="t('aria.prevSlide')"
      @click="go(page - 1)"
    >
      <ArrowLeft :stroke-width="1.8" aria-hidden="true" />
    </button>
    <template v-for="(n, i) in items" :key="n || `gap-${i}`">
      <span v-if="!n" class="em-pager__gap" aria-hidden="true">…</span>
      <button
        v-else
        type="button"
        class="em-pager__num"
        :class="{ 'is-active': n === page }"
        :aria-label="t('aria.goToSlide', { index: n })"
        :aria-current="n === page ? 'page' : undefined"
        @click="go(n)"
      >
        {{ n }}
      </button>
    </template>
    <button
      type="button"
      class="em-round"
      :disabled="page >= pages"
      :aria-label="t('aria.nextSlide')"
      @click="go(page + 1)"
    >
      <ArrowRight :stroke-width="1.8" aria-hidden="true" />
    </button>
  </nav>
</template>
