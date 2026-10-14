<script setup lang="ts">
/**
 * Aparelho solto, sem card: o PNG (fundo transparente) levita devagar sobre um anel de luz
 * no "chão", com a sombra no formato do aparelho e uma sombra de contato que encolhe quando
 * ele sobe. Nada de girar a foto: o movimento é só de flutuação e um paralaxe leve.
 * Leve de rodar: só transform/opacity animam, sem filtro refeito a cada quadro, e tudo para
 * fora da tela.
 * - `hero`: o paralaxe segue o cursor na janela e o aparelho desce devagar ao sair do hero;
 *   selos de leitura e de conexão flutuam numa camada mais próxima;
 * - `stage` (galeria, painel no celular): o paralaxe segue o cursor só sobre o palco; trocar
 *   de foto faz a nova pousar no lugar.
 * Foto com fundo (JPG) entra em multiply: o branco dela some no hero ou na página, sem a
 * sombra de contorno. Sem foto (ou se ela falhar), a "tela" do dispositivo. Com movimento
 * reduzido fica parado.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check } from 'lucide-vue-next'
import type { Device } from '@/lib/equipment'
import { NUM_LOCALE } from '@/lib/api'
import { connectivityIcon } from '@/lib/icons'
import { RM, addFx, clamp, damp, kickFx } from '@/lib/motion'
import EmDeviceScreen from './EmDeviceScreen.vue'

const props = withDefaults(
  defineProps<{ device: Device; mode?: 'hero' | 'stage'; src?: string; alt?: string }>(),
  { mode: 'stage', src: undefined, alt: '' },
)

const { locale } = useI18n()

const photo = computed(() => props.src ?? props.device.photos[0] ?? '')
/** foto que falhou ao carregar: cai na "tela" */
const broken = ref('')
const hasPhoto = computed(() => !!photo.value && broken.value !== photo.value)
/** foto com fundo (JPG): sem transparência, vai em multiply */
const flat = computed(() => hasPhoto.value && !/\.(png|webp|avif|svg)([?#]|$)/i.test(photo.value))

/** proporção real da foto: com ela o CSS ocupa sempre a mesma área (amplia as pequenas) */
function fit(e: Event) {
  const img = e.target as HTMLImageElement
  if (img.naturalWidth && img.naturalHeight)
    img.style.setProperty('--ar', String(img.naturalWidth / img.naturalHeight))
}

/* ── selos do hero ── */
const reading = computed(() => {
  const r = props.device.reading
  if (!r || typeof r.value !== 'number') return null
  const d = r.dec ?? 0
  const value = r.value.toLocaleString(NUM_LOCALE[locale.value] ?? 'pt-BR', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  })
  return { value, suffix: r.suffix ?? '', unit: r.unit }
})
const conn = computed(() => props.device.connectivity[0] ?? '')

/* ── movimento: paralaxe do cursor e saída do hero ──
   Escrito direto no `translate` de poucas camadas (promovidas no CSS): variável no elemento
   raiz seria herdada e recalcularia o componente inteiro a cada quadro. Fora da tela o laço
   não roda e as animações em CSS ficam pausadas. */
const root = ref<HTMLElement | null>(null)
const aura = ref<HTMLElement | null>(null)
const shadow = ref<HTMLElement | null>(null)
const obj = ref<HTMLElement | null>(null)
const chipRead = ref<HTMLElement | null>(null)
const chipSync = ref<HTMLElement | null>(null)
const paused = ref(false)
/** [camada, px por unidade do cursor em x, em y, px pela saída do hero] */
const layers = (): [HTMLElement | null, number, number, number][] => [
  [aura.value, 4, 3, 50],
  [shadow.value, -4, 0, 30],
  [obj.value, 8, 6, 70],
  [chipRead.value, 14, 10, -140],
  [chipSync.value, 16, 12, -110],
]

let off: (() => void) | null = null
let io: IntersectionObserver | null = null
let p = 0
let mx = 0
let my = 0
let tmx = 0
let tmy = 0
let placed = ''

function place() {
  const key = `${mx.toFixed(3)} ${my.toFixed(3)} ${p.toFixed(3)}`
  if (key === placed) return
  placed = key
  for (const [el, kx, ky, kp] of layers()) {
    if (el) el.style.translate = `${(mx * kx).toFixed(2)}px ${(my * ky + p * kp).toFixed(2)}px`
  }
}

function onWindowPointer(e: PointerEvent) {
  if (e.pointerType === 'touch' || paused.value) return
  tmx = (e.clientX / window.innerWidth - 0.5) * 2
  tmy = (e.clientY / window.innerHeight - 0.5) * 2
  kickFx()
}
function onStagePointer(e: PointerEvent) {
  if (e.pointerType === 'touch' || !root.value) return
  const r = root.value.getBoundingClientRect()
  tmx = clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1, 1)
  tmy = clamp(((e.clientY - r.top) / r.height - 0.5) * 2, -1, 1)
  kickFx()
}
function onStageLeave() {
  tmx = 0
  tmy = 0
  kickFx()
}

onMounted(() => {
  const el = root.value
  if (RM || !el) return
  const hero = props.mode === 'hero'
  io = new IntersectionObserver(([e]) => {
    paused.value = !e?.isIntersecting
    if (!paused.value) kickFx()
  })
  io.observe(el)
  off = addFx((y, dt, vh) => {
    if (paused.value) return false
    const goal = hero ? clamp(y / (vh * 0.85), 0, 1) : 0
    p = damp(p, goal, 7, dt)
    mx = damp(mx, tmx, 3, dt)
    my = damp(my, tmy, 3, dt)
    place()
    return Math.abs(p - goal) > 0.0005 || Math.abs(mx - tmx) > 0.001 || Math.abs(my - tmy) > 0.001
  })
  if (hero) window.addEventListener('pointermove', onWindowPointer, { passive: true })
  else {
    el.addEventListener('pointermove', onStagePointer, { passive: true })
    el.addEventListener('pointerleave', onStageLeave)
  }
})
onBeforeUnmount(() => {
  off?.()
  io?.disconnect()
  window.removeEventListener('pointermove', onWindowPointer)
})
</script>

<template>
  <div
    ref="root"
    class="em-float"
    :class="[`em-float--${mode}`, { 'is-flat': flat, 'is-paused': paused }]"
    :style="{ '--tone': device.tone }"
  >
    <span ref="aura" class="em-float__aura" aria-hidden="true" />

    <!-- "chão": poça de luz e anel deitados em perspectiva, ondas de sinal saindo -->
    <span class="em-float__floor" aria-hidden="true">
      <i class="em-float__disc" />
      <i class="em-float__ring" />
      <i class="em-float__wave" />
      <i class="em-float__wave em-float__wave--2" />
    </span>
    <span ref="shadow" class="em-float__shadow" aria-hidden="true" />

    <div ref="obj" class="em-float__obj">
      <div class="em-float__bob">
        <Transition name="em-float-swap">
          <div v-if="hasPhoto" :key="photo" class="em-float__item">
            <img
              class="em-float__img"
              :src="photo"
              :alt="alt"
              :loading="mode === 'hero' ? 'eager' : 'lazy'"
              decoding="async"
              @load="fit"
              @error="broken = photo"
            />
          </div>
          <div v-else key="screen" class="em-float__item">
            <EmDeviceScreen :device="device" size="lg" />
          </div>
        </Transition>
      </div>
    </div>

    <!-- selos (só no hero): mesmos vidros do hero de Aplicativos, em camada mais próxima -->
    <template v-if="mode === 'hero'">
      <!-- sem foto a "tela" já mostra a leitura -->
      <span
        v-if="reading && hasPhoto"
        ref="chipRead"
        class="em-phones3__chip em-float__chip em-float__chip--read"
      >
        <span class="em-phones3__ico"
          ><component :is="device.icon" :stroke-width="1.8" aria-hidden="true"
        /></span>
        <b
          >{{ reading.value }}<i v-if="reading.suffix">{{ reading.suffix }}</i></b
        ><small>{{ reading.unit }}</small>
        <svg class="em-phones3__ecg" viewBox="0 0 60 20" aria-hidden="true">
          <path d="M0 12h14l4-8 5 14 4-10 3 4h30" pathLength="1" />
        </svg>
      </span>
      <span v-if="conn" ref="chipSync" class="em-phones3__chip em-float__chip em-float__chip--sync">
        <span class="em-phones3__ico em-phones3__ico--dark"
          ><component :is="connectivityIcon(conn)" :stroke-width="1.8" aria-hidden="true"
        /></span>
        <small class="em-float__conn">{{ conn }}</small>
        <span class="em-phones3__dots"><i /><i /><i /></span>
        <span class="em-phones3__ok"><Check :stroke-width="2.6" aria-hidden="true" /></span>
      </span>
    </template>
  </div>
</template>
