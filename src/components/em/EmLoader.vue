<script setup lang="ts">
/**
 * Tela de entrada (uma vez por sessão): contador 000→100 enquanto a página e as
 * fontes carregam (mínimo 1,7s, máximo 4,5s), o nome surge letra a letra e o painel
 * sobe numa curva suave. Só então o hero entra.
 */
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RM, damp, setScrollLocked } from '@/lib/motion'
import mark from '@/assets/about/EMMITEC.png'

/** `skip`: a página de entrada dispensa a abertura (lido só na montagem). */
const props = defineProps<{ skip?: boolean }>()
const emit = defineEmits<{ done: [] }>()
const { t } = useI18n()

const KEY = 'em-intro'
function shouldShow() {
  if (RM || props.skip) return false
  try {
    return sessionStorage.getItem(KEY) !== '1'
  } catch {
    return true
  }
}

const show = ref(shouldShow())
const done = ref(false)
const num = ref('000')
const bar = ref(0)

const letters = computed(() => {
  const out: { c: string; brand: boolean; i: number }[] = []
  let i = 0
  'Emmitec'.split('').forEach((c) => out.push({ c, brand: false, i: i++ }))
  out.push({ c: ' ', brand: false, i: i++ })
  'Health'.split('').forEach((c) => out.push({ c, brand: true, i: i++ }))
  return out
})

onMounted(() => {
  if (!show.value) {
    requestAnimationFrame(() => requestAnimationFrame(() => emit('done')))
    return
  }
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    // sem sessionStorage a entrada aparece a cada visita — tudo bem
  }
  setScrollLocked(true)

  const t0 = performance.now()
  const minDur = 1700
  let last = 0
  let shown = 0
  let ready = false

  const loaded = new Promise<void>((res) => {
    if (document.readyState === 'complete') res()
    else window.addEventListener('load', () => res(), { once: true })
  })
  const fonts = document.fonts?.ready ?? Promise.resolve()
  Promise.race([Promise.all([loaded, fonts]), new Promise((r) => setTimeout(r, 4500))]).then(() => {
    ready = true
  })

  function frame(now: number) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000)
    last = now
    const el = now - t0
    let target = Math.min(88, (el / minDur) * 88)
    if (ready && el >= minDur) target = 100
    shown = damp(shown, target, target === 100 ? 7 : 3.2, dt)
    if (target === 100 && shown > 99.5) shown = 100
    num.value = `00${Math.round(shown)}`.slice(-3)
    bar.value = shown / 100
    if (shown < 100) requestAnimationFrame(frame)
    else setTimeout(finish, 180)
  }
  function finish() {
    done.value = true
    setTimeout(() => {
      setScrollLocked(false)
      emit('done')
    }, 420)
    setTimeout(() => {
      show.value = false
    }, 1500)
  }
  requestAnimationFrame(frame)
})
</script>

<template>
  <div v-if="show" class="em-loader" :class="{ 'is-done': done }" aria-hidden="true">
    <div class="em-loader__top">
      <span class="em-eyebrow">{{ t('hero.eyebrow') }}</span>
      <p class="em-loader__meta">{{ t('loader.places') }}</p>
    </div>
    <div class="em-loader__center">
      <div class="em-loader__logo">
        <img class="em-loader__mark" :src="mark" alt="" />
        <span class="em-loader__word">
          <i v-for="l in letters" :key="l.i" :class="{ c: l.brand }" :style="{ '--i': l.i }">{{
            l.c
          }}</i>
        </span>
      </div>
    </div>
    <div class="em-loader__foot">
      <div class="em-loader__num">
        <span>{{ num }}</span
        ><small>%</small>
      </div>
      <p class="em-loader__meta em-loader__meta--wrap">{{ t('loader.preparing') }}</p>
    </div>
    <div class="em-loader__bar"><i :style="{ transform: `scaleX(${bar.toFixed(4)})` }" /></div>
  </div>
</template>
