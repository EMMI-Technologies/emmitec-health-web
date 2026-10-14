<script setup lang="ts">
/**
 * Botão fixo de voltar das páginas internas (artigo, dispositivo), no canto inferior
 * esquerdo, alinhado à margem do conteúdo. Volta no histórico quando a página anterior é do
 * site (a lista volta com o filtro e a rolagem); quem chegou direto (link, busca) vai para
 * `fallback`. Some quando o rodapé aparece, para não cobrir os links de lá.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

const props = defineProps<{ fallback: string }>()

const router = useRouter()
const { t } = useI18n()

const el = ref<HTMLElement | null>(null)
const hidden = ref(false)
let io: IntersectionObserver | null = null

function back() {
  // o vue-router guarda em history.state.back a rota anterior desta aba (null se é a primeira)
  if (typeof window.history.state?.back === 'string') router.back()
  else router.push(props.fallback)
}

onMounted(() => {
  const footer = el.value?.closest('.em-view')?.querySelector('.em-footer')
  if (!footer || typeof IntersectionObserver !== 'function') return
  io = new IntersectionObserver(([e]) => (hidden.value = !!e?.isIntersecting), {
    rootMargin: '0px 0px -40px 0px',
  })
  io.observe(footer)
})
onBeforeUnmount(() => io?.disconnect())
</script>

<template>
  <button
    ref="el"
    type="button"
    class="em-backfab"
    :class="{ 'is-hidden': hidden }"
    :aria-label="t('header.back')"
    @click="back"
  >
    <span class="em-backfab__ic"><ArrowLeft :stroke-width="1.8" aria-hidden="true" /></span>
    <span class="em-backfab__txt" aria-hidden="true">{{ t('header.back') }}</span>
  </button>
</template>
