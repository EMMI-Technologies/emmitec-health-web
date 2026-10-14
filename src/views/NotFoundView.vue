<script setup lang="ts">
/**
 * Página 404 (rota coringa): hero das páginas internas com o aviso e o caminho de volta.
 * Sem ela o endereço inexistente mostrava só o rodapé, colado no topo sob o menu.
 */
import { useI18n } from 'vue-i18n'

import EmPageHero from '@/components/em/EmPageHero.vue'
import EmButton from '@/components/em/EmButton.vue'
import { usePageMeta } from '@/lib/seo'
import { CONTACT_EMAIL } from '@/lib/site'

const { t } = useI18n()

const mailto = `mailto:${CONTACT_EMAIL}`

usePageMeta(() => ({ title: t('notFoundPage.title'), description: t('notFoundPage.subtitle') }))
</script>

<template>
  <div class="em-notfound-page">
    <EmPageHero
      class="em-hero--short"
      :eyebrow="t('notFoundPage.badge')"
      :title="t('notFoundPage.title')"
      :em="t('notFoundPage.titleEm')"
      :subtitle="t('notFoundPage.subtitle')"
    >
      <template #actions>
        <EmButton :href="mailto" variant="ghost" :label="t('footer.links.contact')" />
        <EmButton to="/" variant="dark" :label="t('notFoundPage.home')" />
      </template>
    </EmPageHero>
  </div>
</template>
