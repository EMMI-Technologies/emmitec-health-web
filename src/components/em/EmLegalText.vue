<script setup lang="ts">
/** Trecho de texto jurídico: e-mails viram mailto: e endereços web abrem em nova aba. */
import { computed } from 'vue'
import { linkify } from '@/lib/legal'

const props = defineProps<{ text: string }>()
const parts = computed(() => linkify(props.text))
</script>

<template>
  <template v-for="(part, i) in parts" :key="i"
    ><a
      v-if="part.href"
      :href="part.href"
      v-bind="part.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {}"
      >{{ part.text }}</a
    ><template v-else>{{ part.text }}</template></template
  >
</template>
