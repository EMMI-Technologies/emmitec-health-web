<script setup lang="ts">
/**
 * Monitor ao vivo (versão clara do DS): ECG sintetizado (P–QRS–T) varrendo a tela,
 * frequência cardíaca que pulsa a cada batida e leituras de pressão, SpO₂ e
 * temperatura que variam de leve. Pausa fora da tela; com movimento reduzido
 * mostra um traçado parado.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Heart } from 'lucide-vue-next'
import { RM } from '@/lib/motion'

defineProps<{ label: string; rhythm: string }>()

const { t } = useI18n()

const bpm = ref(72)
const spo2 = ref(98)
const temp = ref(36.6)
const sys = ref(120)
const dia = ref(80)
const bp = computed(() => `${sys.value}/${dia.value}`)
const beat = ref(false)

const canvas = ref<HTMLCanvasElement | null>(null)
const root = ref<HTMLElement | null>(null)

let raf = 0
let visible = true
let io: IntersectionObserver | null = null
let ro: ResizeObserver | null = null
let vitalsT = 0
let bpmT = 0
let beatT = 0
let x = 0
let prevY = 0
let phase = 0
let lastTs = 0
let seed = 0
let ready = false
let colors = { line: '#0db7ba', glow: 'rgba(13, 183, 186, 0.18)' }

const gauss = (v: number, mu: number, s: number, a: number) =>
  a * Math.exp(-((v - mu) ** 2) / (2 * s * s))
function sample(t: number) {
  const p = ((t % 1) + 1) % 1
  return (
    gauss(p, 0.11, 0.02, 0.14) +
    gauss(p, 0.235, 0.008, -0.12) +
    gauss(p, 0.26, 0.011, 0.92) +
    gauss(p, 0.288, 0.013, -0.28) +
    gauss(p, 0.47, 0.042, 0.26) +
    Math.sin(seed * 0.5 + p * 28) * 0.005 +
    Math.sin(seed * 1.1 + p * 13) * 0.003
  )
}

function size() {
  const c = canvas.value
  if (!c) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const r = c.getBoundingClientRect()
  const w = Math.max(1, Math.floor(r.width * dpr))
  const h = Math.max(1, Math.floor(r.height * dpr))
  if (c.width !== w || c.height !== h) {
    c.width = w
    c.height = h
    x = 0
    prevY = h * 0.58
    ready = true
    if (RM) drawStatic()
  }
}

function seg(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w: number,
) {
  const lw = Math.max(1.4, w * 0.0022)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.strokeStyle = colors.glow
  ctx.lineWidth = lw * 3
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.stroke()
  ctx.strokeStyle = colors.line
  ctx.lineWidth = lw
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.stroke()
}

function frame(now: number) {
  const c = canvas.value
  const ctx = c?.getContext('2d')
  if (!c || !ctx) return
  size()
  if (!ready) {
    raf = requestAnimationFrame(frame)
    return
  }
  const w = c.width
  const h = c.height
  const base = h * 0.58
  const amp = h * 0.34
  const gap = Math.max(14, w * 0.045)
  if (!lastTs) lastTs = now
  const dt = Math.min(0.05, (now - lastTs) / 1000)
  lastTs = now
  seed += dt
  const dist = Math.max(1.2, w * 0.13 * dt)
  const n = Math.max(2, Math.ceil(dist / 1.2))
  const dx = dist / n
  const dPhase = ((bpm.value / 60) * dt) / n
  for (let i = 0; i < n; i++) {
    const before = ((phase % 1) + 1) % 1
    phase += dPhase
    const after = ((phase % 1) + 1) % 1
    if (before < 0.26 && after >= 0.26) pulse()
    const y = base - sample(phase) * amp
    const x1 = x + dx
    ctx.clearRect(x - 0.5, 0, gap + dx + 1, h)
    if (x1 <= w) {
      seg(ctx, x, prevY, x1, y, w)
      x = x1
    } else {
      seg(ctx, x, prevY, w, y, w)
      x = x1 - w
      ctx.clearRect(0, 0, x + gap, h)
      seg(ctx, 0, y, x, y, w)
    }
    prevY = y
  }
  ctx.fillStyle = colors.line
  ctx.beginPath()
  ctx.arc(x, prevY, Math.max(2, w * 0.003), 0, Math.PI * 2)
  ctx.fill()
  raf = visible ? requestAnimationFrame(frame) : 0
  if (!raf) lastTs = 0
}

function drawStatic() {
  const c = canvas.value
  const ctx = c?.getContext('2d')
  if (!c || !ctx) return
  const w = c.width
  const h = c.height
  ctx.clearRect(0, 0, w, h)
  let py = h * 0.58
  for (let px = 0; px < w; px += 2) {
    const y = h * 0.58 - sample((px / w) * 2.4) * h * 0.34
    seg(ctx, px - 2, py, px, y, w)
    py = y
  }
}

function pulse() {
  beat.value = true
  window.clearTimeout(beatT)
  beatT = window.setTimeout(() => (beat.value = false), 280)
}

function tickBpm() {
  const step = Math.random() > 0.3 ? 1 : 2
  const drift = Math.random() > 0.5 ? step : -step
  const toward = bpm.value > 74 ? -1 : bpm.value < 70 ? 1 : 0
  const d = toward !== 0 && Math.random() > 0.45 ? toward : drift
  bpm.value = Math.min(82, Math.max(64, bpm.value + d))
}
function tickVitals() {
  if (Math.random() > 0.55)
    spo2.value = Math.min(99, Math.max(96, spo2.value + (Math.random() > 0.5 ? 1 : -1)))
  if (Math.random() > 0.6) {
    const next = Math.round((temp.value + (Math.random() > 0.5 ? 0.1 : -0.1)) * 10) / 10
    temp.value = Math.min(37, Math.max(36.3, next))
  }
  if (Math.random() > 0.55) {
    sys.value = Math.min(128, Math.max(112, sys.value + (Math.random() > 0.5 ? 2 : -2)))
    dia.value = Math.min(86, Math.max(74, dia.value + (Math.random() > 0.5 ? 1 : -1)))
  }
}

onMounted(() => {
  if (canvas.value) {
    const cs = getComputedStyle(canvas.value)
    const line = cs.getPropertyValue('--cyan-600').trim()
    if (line) colors = { line, glow: 'rgba(13, 183, 186, 0.18)' }
  }
  size()
  if (RM) {
    drawStatic()
    return
  }
  bpmT = window.setInterval(tickBpm, 1800)
  vitalsT = window.setInterval(tickVitals, 2600)
  if (typeof ResizeObserver === 'function' && canvas.value) {
    ro = new ResizeObserver(() => size())
    ro.observe(canvas.value)
  }
  if (typeof IntersectionObserver === 'function' && root.value) {
    io = new IntersectionObserver((en) => {
      visible = !!en[0]?.isIntersecting
      if (visible && !raf) raf = requestAnimationFrame(frame)
    })
    io.observe(root.value)
  } else raf = requestAnimationFrame(frame)
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  window.clearInterval(bpmT)
  window.clearInterval(vitalsT)
  window.clearTimeout(beatT)
  io?.disconnect()
  ro?.disconnect()
})
</script>

<template>
  <div ref="root" class="em-monitor">
    <div class="em-monitor__top">
      <!-- traçado e leituras são sintetizados: o selo avisa que é um exemplo -->
      <span class="em-pill">{{ t('hero.live.status') }}</span>
      <span class="em-monitor__meta"><b>Lead II</b> · 25 mm/s · 10 mm/mV</span>
    </div>

    <div class="em-monitor__hr">
      <div>
        <small>HR</small>
        <div class="em-monitor__bpm">
          <b>{{ bpm }}</b
          ><span>bpm</span>
        </div>
        <p>{{ label }}</p>
      </div>
      <span class="em-monitor__beat" :class="{ 'is-beat': beat }">
        <Heart :size="18" fill="currentColor" aria-hidden="true" />{{ rhythm }}
      </span>
    </div>

    <div class="em-monitor__ecg">
      <canvas ref="canvas" aria-hidden="true" />
      <span class="em-monitor__tag">ECG</span>
    </div>

    <div class="em-monitor__tiles">
      <div>
        <small>NIBP</small>
        <b>{{ bp }}</b>
        <span>mmHg</span>
      </div>
      <div>
        <small>SpO₂</small>
        <b>{{ spo2 }}<i>%</i></b>
        <span>sat</span>
      </div>
      <div>
        <small>TEMP</small>
        <b>{{ temp.toFixed(1) }}<i>°</i></b>
        <span>°C</span>
      </div>
    </div>
  </div>
</template>
