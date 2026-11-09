<script setup lang="ts">
/**
 * Termos de Uso — as 23 seções que ficavam na página antiga privacy.html ("Política de Privacidade,
 * Termos e Condições de Uso e Proteção de Dados"), com o texto de sempre em pt/en/es
 * (src/content/legal/terms.*.json). Mesmo desenho da Política de Privacidade.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Mail } from 'lucide-vue-next'

import EmPageHero from '@/components/em/EmPageHero.vue'
import EmButton from '@/components/em/EmButton.vue'
import EmLegalDoc from '@/components/em/EmLegalDoc.vue'
import { CONTACT_EMAIL } from '@/lib/site'
import { usePageMeta } from '@/lib/seo'
import { useLegalDoc } from '@/lib/legal'

const { t } = useI18n()

usePageMeta(() => ({
  title: t('termsPage.badge'),
  description: t('termsPage.subtitle'),
}))

const doc = useLegalDoc('terms')
const sections = computed(() => doc.value?.sections ?? [])
const mailto = `mailto:${CONTACT_EMAIL}`
</script>

<template>
  <div class="em-terms-page">
    <EmPageHero
      class="em-hero--short"
      :eyebrow="t('termsPage.badge')"
      :title="t('termsPage.title')"
      :em="t('termsPage.titleEm')"
      :subtitle="t('termsPage.subtitle')"
    >
      <template #actions>
        <EmButton to="/privacy" variant="ghost" :label="t('termsPage.privacy')" />
      </template>
    </EmPageHero>

    <EmLegalDoc :sections="sections" :toc-label="t('termsPage.toc')">
      <div v-if="sections.length" v-reveal class="em-legal__contact em-card">
        <span class="em-ico em-ico--brand"><Mail :stroke-width="1.7" aria-hidden="true" /></span>
        <p>{{ t('termsPage.contactNote') }}</p>
        <EmButton :href="mailto" variant="dark" :label="t('footer.links.contact')" />
      </div>
    </EmLegalDoc>
  </div>
</template>
