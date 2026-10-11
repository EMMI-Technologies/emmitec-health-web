<script setup lang="ts">
/**
 * "Tela" do dispositivo: ícone, leitura (cadastrada no BackOffice) e o traçado do sinal
 * (ECG para os cardíacos, onda suave para os demais). O traçado se desenha
 * quando o elemento pai ganha `.is-in`.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Device } from '@/lib/equipment'
import { NUM_LOCALE } from '@/lib/api'

const props = withDefaults(defineProps<{ device: Device; size?: 'md' | 'lg' }>(), {
  size: 'md',
})

const { locale } = useI18n()

const value = computed(() => {
  const r = props.device.reading
  if (!r || typeof r.value !== 'number') return ''
  const d = r.dec ?? 0
  return r.value.toLocaleString(NUM_LOCALE[locale.value] ?? 'pt-BR', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  })
})

const W = 240
const H = 56
const gauss = (v: number, mu: number, s: number, a: number) =>
  a * Math.exp(-((v - mu) ** 2) / (2 * s * s))

/** Traçado estático e determinístico por dispositivo. */
const trace = computed(() => {
  const id = props.device.id
  const ecg = !!props.device.reading?.ecg
  const n = ecg ? 150 : 44
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1)
    let v: number
    if (ecg) {
      const p = (x * 3 + 0.1) % 1
      v =
        gauss(p, 0.18, 0.03, 0.12) +
        gauss(p, 0.3, 0.01, -0.12) +
        gauss(p, 0.33, 0.012, 1) +
        gauss(p, 0.36, 0.013, -0.3) +
        gauss(p, 0.58, 0.05, 0.26)
      v = 0.3 + v * 0.62
    } else {
      v =
        0.5 +
        Math.sin(x * 7 + id) * 0.2 +
        Math.sin(x * 15 + id * 2.1) * 0.09 +
        Math.sin(x * 29 + id * 0.7) * 0.04
    }
    pts.push([x * W, H - 4 - v * (H - 8)])
  }
  if (ecg) return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('')
  let d = `M${pts[0]![0].toFixed(1)} ${pts[0]![1].toFixed(1)}`
  for (let j = 1; j < pts.length; j++) {
    const [x0, y0] = pts[j - 1]!
    const [x1, y1] = pts[j]!
    d += ` Q${x0.toFixed(1)} ${y0.toFixed(1)} ${((x0 + x1) / 2).toFixed(1)} ${((y0 + y1) / 2).toFixed(1)}`
  }
  return d
})
</script>

<template>
  <div
    class="em-screen"
    :class="[`em-screen--${size}`, { 'em-screen--ecg': device.reading?.ecg }]"
    :style="{ '--tone': device.tone }"
  >
    <div class="em-screen__top">
      <span class="em-screen__ico"
        ><component :is="device.icon" :stroke-width="1.6" aria-hidden="true"
      /></span>
    </div>
    <!-- sem leitura cadastrada, a tela fica só com o ícone e o sinal -->
    <div v-if="value && device.reading" class="em-screen__read">
      <b
        >{{ value }}<i v-if="device.reading.suffix">{{ device.reading.suffix }}</i></b
      >
      <span>{{ device.reading.unit }}</span>
    </div>
    <svg
      class="em-screen__trace"
      :viewBox="`0 0 ${W} ${H}`"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path :d="trace" pathLength="1" />
    </svg>
    <span v-if="device.reading?.ecg" class="em-screen__sweep" aria-hidden="true" />
  </div>
</template>
