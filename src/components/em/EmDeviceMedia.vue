<script setup lang="ts">
/**
 * Visual do dispositivo: a foto cadastrada (sobre o tom pastel do card) ou,
 * sem foto, a "tela" com ícone, leitura e sinal. `src` escolhe outra foto
 * (ex.: item da galeria). Se a imagem falhar, volta para a tela.
 */
import { computed, ref, watch } from 'vue'
import type { Device } from '@/lib/equipment'
import EmDeviceScreen from './EmDeviceScreen.vue'

const props = withDefaults(
  defineProps<{ device: Device; size?: 'md' | 'lg'; src?: string; alt?: string }>(),
  { size: 'md', src: undefined, alt: '' },
)

const broken = ref(false)
const photo = computed(() => props.src ?? props.device.photos[0] ?? '')
watch(photo, () => (broken.value = false))
</script>

<template>
  <div
    v-if="photo && !broken"
    class="em-photo"
    :class="`em-photo--${size}`"
    :style="{ '--tone': device.tone }"
  >
    <img
      :src="photo"
      :alt="alt"
      :loading="size === 'lg' ? 'eager' : 'lazy'"
      decoding="async"
      @error="broken = true"
    />
  </div>
  <EmDeviceScreen v-else :device="device" :size="size" />
</template>
