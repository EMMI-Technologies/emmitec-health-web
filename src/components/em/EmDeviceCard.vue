<script setup lang="ts">
/** Card de dispositivo: foto (ou tela com leitura e sinal), nome, resumo e conectividade. */
import type { Device } from '@/lib/equipment'
import { connectivityIcon as connIcon } from '@/lib/icons'
import EmDeviceMedia from './EmDeviceMedia.vue'

defineProps<{ device: Device }>()
</script>

<template>
  <RouterLink :to="`/equipment/${device.slug}`" class="em-device em-card em-card--lift">
    <EmDeviceMedia :device="device" />
    <div class="em-device__body">
      <small class="em-device__cat"
        >{{ device.catLabel }}<template v-if="device.model"> · {{ device.model }}</template></small
      >
      <h3>{{ device.name }}</h3>
      <p>{{ device.shortDesc }}</p>
      <div class="em-device__foot">
        <span class="em-device__conn">
          <span v-for="c in device.connectivity" :key="c" class="em-conn"
            ><component :is="connIcon(c)" :stroke-width="1.8" aria-hidden="true" />{{ c }}</span
          >
        </span>
        <span class="em-corner" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M7 17L17 7M8 7h9v9" />
          </svg>
        </span>
      </div>
    </div>
  </RouterLink>
</template>
