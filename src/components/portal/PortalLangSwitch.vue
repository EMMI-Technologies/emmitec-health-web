<script setup lang="ts">
/** PT | EN do portal. A escolha vale também para o site e para as docs. */
import { usePortalLang, type PortalLang } from '@/lib/portal/i18n'

const { lang, setLang, t } = usePortalLang()

const options: { code: PortalLang; label: string; name: string }[] = [
  { code: 'pt', label: 'PT', name: 'Português' },
  { code: 'en', label: 'EN', name: 'English' },
]
</script>

<template>
  <div class="po-lang" role="group" :aria-label="t('language')">
    <button
      v-for="o in options"
      :key="o.code"
      type="button"
      class="po-lang__opt"
      :class="{ 'is-on': lang === o.code }"
      :aria-pressed="lang === o.code"
      :title="o.name"
      :lang="o.code"
      @click="setLang(o.code)"
    >
      {{ o.label }}
    </button>
  </div>
</template>
