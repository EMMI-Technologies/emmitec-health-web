<script setup lang="ts">
/**
 * Declaração de Acessibilidade — o texto dos PDFs que o site antigo publicava (EN, PT, ES), sem os
 * restos do modelo do documento ("[insert link]" virou o endereço do EASS; saíram a nota da Irlanda do
 * Norte e os marcadores "(b)"). Conteúdo em src/content/legal/accessibility.*.json; o PDF original
 * segue disponível para baixar.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarClock } from 'lucide-vue-next'

import EmPageHero from '@/components/em/EmPageHero.vue'
import EmButton from '@/components/em/EmButton.vue'
import EmLegalDoc from '@/components/em/EmLegalDoc.vue'
import { usePageMeta } from '@/lib/seo'
import { legacyFileUrl, useLegalDoc } from '@/lib/legal'

const { t } = useI18n()

usePageMeta(() => ({
  title: t('accessibilityPage.title'),
  description: t('accessibilityPage.subtitle'),
}))

const doc = useLegalDoc('accessibility')
const sections = computed(() => doc.value?.sections ?? [])
const pdfHref = computed(() => (doc.value?.pdf ? legacyFileUrl(doc.value.pdf) : undefined))
</script>

<template>
  <div class="em-accessibility-page">
    <EmPageHero
      class="em-hero--short"
      :eyebrow="t('accessibilityPage.badge')"
      :title="t('accessibilityPage.title')"
      :em="t('accessibilityPage.titleEm')"
      :subtitle="t('accessibilityPage.subtitle')"
    >
      <template #lead>
        <p class="em-hero__updated">
          <CalendarClock :stroke-width="1.7" aria-hidden="true" />{{ t('accessibilityPage.updated') }}
        </p>
      </template>
      <template v-if="pdfHref" #actions>
        <EmButton :href="pdfHref" variant="ghost" :label="t('accessibilityPage.pdf')" />
      </template>
    </EmPageHero>

    <EmLegalDoc :sections="sections" :toc-label="t('accessibilityPage.toc')" />
  </div>
</template>
