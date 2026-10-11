<script setup lang="ts">
/**
 * Baralho de dispositivos do hero de Equipamentos: três cartas empilhadas, cada
 * uma com a "tela" do aparelho (leitura + sinal). De tempos em tempos a carta da
 * frente sai voando para a direita e a próxima entra por trás, percorrendo o
 * catálogo. Segue o cursor e a rolagem em profundidade, como os celulares de
 * Aplicativos. Com movimento reduzido fica parado.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RM, addFx, clamp, damp, kickFx } from '@/lib/motion'
import type { Device } from '@/lib/equipment'
import EmDeviceMedia from './EmDeviceMedia.vue'

/** Catálogo vindo da API (quem usa o baralho carrega com useDevices). */
const props = defineProps<{ devices: Device[] }>()

/** Posições: 0 frente · 1 meio · 2 fundo · 3 escondida atrás · 'out' saindo. */
type Slot = 0 | 1 | 2 | 3 | 'out'
const INTERVAL = 3400
const OUT_MS = 800

/** Quatro cartas no DOM; cada uma sabe qual aparelho mostra e em que posição está. */
const cards = ref<{ id: number; dev: number; slot: Slot; still: boolean }[]>([
  { id: 0, dev: 0, slot: 0, still: false },
  { id: 1, dev: 1, slot: 1, still: false },
  { id: 2, dev: 2, slot: 2, still: false },
  { id: 3, dev: 3, slot: 3, still: false },
])
let nextDev = 4

const view = computed(() =>
  props.devices.length
    ? cards.value.map((c) => ({ ...c, device: props.devices[c.dev % props.devices.length]! }))
    : [],
)

function shuffle() {
  const n = props.devices.length
  if (n < 2) return
  cards.value = cards.value.map((c) => {
    if (c.slot === 0) return { ...c, slot: 'out', still: false }
    if (c.slot === 'out') return c
    return { ...c, slot: (c.slot - 1) as Slot, still: false }
  })
  // a que saiu volta, sem animação, escondida atrás, já com o próximo aparelho
  window.setTimeout(() => {
    cards.value = cards.value.map((c) =>
      c.slot === 'out' ? { ...c, slot: 3, still: true, dev: nextDev++ % n } : c,
    )
  }, OUT_MS)
}

/* cursor e rolagem (mesmo esquema dos celulares) */
const root = ref<HTMLElement | null>(null)
let off: (() => void) | null = null
let timer = 0
let p = 0
let mx = 0
let my = 0
let tmx = 0
let tmy = 0
function onPointer(e: PointerEvent) {
  if (e.pointerType === 'touch') return
  tmx = (e.clientX / window.innerWidth - 0.5) * 2
  tmy = (e.clientY / window.innerHeight - 0.5) * 2
  kickFx()
}

onMounted(() => {
  if (RM) return
  const el = root.value
  if (!el) return
  off = addFx((y, dt, vh) => {
    const goal = clamp(y / (vh * 0.85), 0, 1)
    p = damp(p, goal, 7, dt)
    mx = damp(mx, tmx, 4, dt)
    my = damp(my, tmy, 4, dt)
    el.style.setProperty('--p', p.toFixed(4))
    el.style.setProperty('--mx', mx.toFixed(4))
    el.style.setProperty('--my', my.toFixed(4))
    return Math.abs(p - goal) > 0.0005 || Math.abs(mx - tmx) > 0.001 || Math.abs(my - tmy) > 0.001
  })
  window.addEventListener('pointermove', onPointer, { passive: true })
  // começa depois da entrada
  window.setTimeout(() => {
    timer = window.setInterval(() => {
      if (!document.hidden && p < 0.9) shuffle()
    }, INTERVAL)
  }, 2200)
})
onBeforeUnmount(() => {
  off?.()
  window.clearInterval(timer)
  window.removeEventListener('pointermove', onPointer)
})
</script>

<template>
  <div ref="root" class="em-deck" aria-hidden="true">
    <span class="em-deck__floor" />
    <div
      v-for="c in view"
      :key="c.id"
      class="em-deck__card em-card"
      :class="[`is-s${c.slot}`, { 'is-still': c.still }]"
    >
      <EmDeviceMedia :device="c.device" />
      <div class="em-deck__meta">
        <b>{{ c.device.name }}</b>
        <span>{{ c.device.catLabel }}</span>
      </div>
    </div>
  </div>
</template>
