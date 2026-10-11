<script setup lang="ts">
/**
 * Marcas que a Emmitec já integra, numa faixa horizontal infinita (GSAP).
 *
 * - O conjunto de marcas se repete quantas vezes for preciso para cobrir a
 *   largura da tela; a faixa anda exatamente a largura de um conjunto e
 *   recomeça, então a emenda não aparece.
 * - No hover a faixa desacelera (não para) e o logo sob o cursor ganha cor.
 * - Pausa fora da tela. Sem animação com prefers-reduced-motion: vira uma
 *   faixa estática com rolagem horizontal.
 * - Logo ausente ou quebrado: o nome da marca em tipografia.
 * - Carregando: placeholder discreto. Erro ou lista vazia: a seção some.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { gsap } from 'gsap'
import { RM } from '@/lib/motion'
import { useBrands } from '@/lib/manufacturers'

const props = withDefaults(
  defineProps<{
    /** px por segundo */
    speed?: number
    /** fundo da faixa: o da página (plain) ou o ciano claro das seções alternadas (tint) */
    tone?: 'plain' | 'tint'
  }>(),
  { speed: 42, tone: 'plain' },
)

const { t } = useI18n()
const { brands, loading, error, data } = useBrands()

const titleId = `em-brands-${Math.random().toString(36).slice(2, 8)}`
const showSkeleton = computed(() => loading.value && !data.value)
const visible = computed(() => !error.value && brands.value.length > 0)

/** logos que falharam: mostram o nome */
const broken = reactive(new Set<string>())
const hasLogo = (b: { slug: string; logo?: string }) => !!b.logo && !broken.has(b.slug)

const root = ref<HTMLElement | null>(null)
const viewport = ref<HTMLElement | null>(null)
const track = ref<HTMLElement | null>(null)
/** cópias do conjunto na faixa (a 1ª é a lista acessível; as outras, aria-hidden) */
const copies = ref(RM ? 1 : 2)

let ctx: gsap.Context | null = null
let loop: gsap.core.Tween | null = null
let speedTw: gsap.core.Tween | null = null
let ro: ResizeObserver | null = null
let io: IntersectionObserver | null = null
let onScreen = true
let hovering = false
let setW = 0
let rebuildRaf = 0

function firstSet() {
  return track.value?.querySelector<HTMLElement>('.em-brands__set') ?? null
}

/** Mede um conjunto e (re)cria o laço, preservando a posição atual. */
async function build() {
  if (RM || !visible.value) return
  await nextTick()
  const set = firstSet()
  const vp = viewport.value
  if (!set || !vp || !track.value) return
  const w = set.offsetWidth
  if (!w) return
  const need = Math.max(2, Math.ceil(vp.offsetWidth / w) + 1)
  if (need !== copies.value) {
    copies.value = need
    await nextTick()
  }
  if (loop && Math.abs(w - setW) < 0.5) return
  const progress = loop ? loop.progress() : 0
  setW = w
  ctx?.revert()
  ctx = gsap.context(() => {
    // anda um conjunto inteiro para a esquerda e o wrap devolve ao começo:
    // como os conjuntos são idênticos, o recomeço cai no mesmo desenho
    const wrap = gsap.utils.wrap(-w, 0)
    loop = gsap.to(track.value, {
      x: `-=${w}`,
      duration: w / props.speed,
      ease: 'none',
      repeat: -1,
      force3D: true,
      modifiers: { x: gsap.utils.unitize((x: number) => wrap(x)) },
    })
    loop.progress(progress)
    loop.timeScale(hovering ? 0.18 : 1)
    if (!onScreen) loop.pause()
  }, root.value ?? undefined)
}

function scheduleBuild() {
  if (rebuildRaf) cancelAnimationFrame(rebuildRaf)
  rebuildRaf = requestAnimationFrame(() => {
    rebuildRaf = 0
    build()
  })
}

/* desacelera até ~18% no hover, sem parar; volta suave ao sair */
function ease(to: number) {
  if (!loop) return
  speedTw?.kill()
  speedTw = gsap.to(loop, { timeScale: to, duration: 0.9, ease: 'power3.out' })
}
function slow() {
  hovering = true
  ease(0.18)
}
function normal() {
  hovering = false
  ease(1)
}

function observe() {
  ro?.disconnect()
  io?.disconnect()
  if (RM || !viewport.value) return
  if (typeof ResizeObserver === 'function') {
    ro = new ResizeObserver(scheduleBuild)
    ro.observe(viewport.value)
    const set = firstSet()
    if (set) ro.observe(set)
  }
  if (typeof IntersectionObserver === 'function') {
    io = new IntersectionObserver((entries) => {
      onScreen = !!entries[0]?.isIntersecting
      if (!loop) return
      if (onScreen) loop.resume()
      else loop.pause()
    })
    io.observe(viewport.value)
  }
}

function kill() {
  if (rebuildRaf) cancelAnimationFrame(rebuildRaf)
  rebuildRaf = 0
  speedTw?.kill()
  speedTw = null
  ctx?.revert()
  ctx = null
  loop = null
  setW = 0
}

// a lista chega (ou muda de idioma): refaz a faixa quando o DOM existir
watch(
  () => [visible.value, brands.value] as const,
  async ([on]) => {
    kill()
    if (!on) return
    await nextTick()
    observe()
    document.fonts?.ready.then(scheduleBuild)
    build()
  },
)

onMounted(() => {
  if (visible.value) {
    observe()
    build()
  }
})
onBeforeUnmount(() => {
  kill()
  ro?.disconnect()
  io?.disconnect()
})
</script>

<template>
  <section
    v-if="showSkeleton || visible"
    ref="root"
    class="em-brands"
    :class="[`em-brands--${tone}`, { 'is-static': RM }]"
    :aria-labelledby="titleId"
    :aria-busy="showSkeleton ? 'true' : undefined"
  >
    <div class="em-wrap">
      <h2 :id="titleId" class="em-brands__title">{{ t('brands.title') }}</h2>
    </div>

    <!-- carregando: barras com a largura de nomes de marca -->
    <div v-if="showSkeleton" class="em-brands__viewport" aria-hidden="true">
      <div class="em-brands__skel">
        <span
          v-for="(w, i) in [96, 132, 84, 118, 104, 140, 90, 120]"
          :key="i"
          class="em-skel"
          :style="{ width: `${w}px` }"
        />
      </div>
    </div>

    <div
      v-else
      ref="viewport"
      class="em-brands__viewport"
      :tabindex="RM ? 0 : undefined"
      :role="RM ? 'region' : undefined"
      :aria-label="RM ? t('brands.title') : undefined"
      @pointerenter="slow"
      @pointerleave="normal"
    >
      <div ref="track" class="em-brands__track">
        <ul
          v-for="c in copies"
          :key="c"
          class="em-brands__set"
          :aria-hidden="c > 1 ? 'true' : undefined"
        >
          <li v-for="b in brands" :key="b.slug" class="em-brands__item">
            <img
              v-if="hasLogo(b)"
              class="em-brands__logo"
              :src="b.logo"
              :alt="c > 1 ? '' : b.name"
              decoding="async"
              draggable="false"
              @error="broken.add(b.slug)"
              @load="scheduleBuild"
            />
            <span v-else class="em-brands__word">{{ b.name }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
