<script setup lang="ts">
/** Teste | Produção: o ambiente das seções que mudam por ambiente (vale para todas). */
import { FlaskConical, Radio } from 'lucide-vue-next'
import { portal } from '@/lib/portal/store'
import { usePortalLang } from '@/lib/portal/i18n'
import type { Mode } from '@/lib/portal/api'

const { t } = usePortalLang()
const options: { code: Mode; icon: typeof FlaskConical }[] = [
  { code: 'test', icon: FlaskConical },
  { code: 'live', icon: Radio },
]
</script>

<template>
  <div class="po-seg" role="group" :aria-label="t('modeSwitch')">
    <button
      v-for="o in options"
      :key="o.code"
      type="button"
      class="po-seg__opt"
      :class="{ 'is-on': portal.mode === o.code }"
      :aria-pressed="portal.mode === o.code"
      @click="portal.mode = o.code"
    >
      <component :is="o.icon" :size="15" :stroke-width="1.8" aria-hidden="true" />
      {{ t(`mode.${o.code}`) }}
    </button>
  </div>
</template>
