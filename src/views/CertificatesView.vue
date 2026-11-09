<script setup lang="ts">
/**
 * Certificados dos aparelhos — os documentos regulatórios que ficavam em gadgets-certificates.html
 * (os apps publicados e a App Store abrem esse endereço). Hero curto, um grupo por órgão alternando
 * o fundo, e cada documento como card que abre o PDF em nova aba.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowUpRight, FileCheck2, Mail } from 'lucide-vue-next'

import EmPageHero from '@/components/em/EmPageHero.vue'
import EmButton from '@/components/em/EmButton.vue'
import EmSplit from '@/components/em/EmSplit.vue'
import { CONTACT_EMAIL } from '@/lib/site'
import { usePageMeta } from '@/lib/seo'
import { certificateGroups, pdfUrl } from '@/lib/certificates'

const { t } = useI18n()

usePageMeta(() => ({
  title: t('certificatesPage.title'),
  description: t('certificatesPage.subtitle'),
}))

const mailto = `mailto:${CONTACT_EMAIL}`

const groups = computed(() =>
  certificateGroups.map((g) => ({
    id: g.id,
    logo: g.logo,
    title: t(`certificatesPage.groups.${g.id}.title`),
    titleEm: t(`certificatesPage.groups.${g.id}.titleEm`),
    subtitle: t(`certificatesPage.groups.${g.id}.subtitle`),
    count: t('certificatesPage.docCount', g.docs.length),
    docs: g.docs.map((d) => ({
      id: d.id,
      href: pdfUrl(d.file),
      title: t(`certificatesPage.docs.${d.id}.title`),
      detail: t(`certificatesPage.docs.${d.id}.detail`),
    })),
  })),
)
</script>

<template>
  <div class="em-certs-page">
    <!-- ════════ HERO ════════ -->
    <EmPageHero
      class="em-hero--short"
      :eyebrow="t('certificatesPage.badge')"
      :title="t('certificatesPage.title')"
      :em="t('certificatesPage.titleEm')"
      :subtitle="t('certificatesPage.subtitle')"
    >
      <template #actions>
        <EmButton to="/equipment" variant="ghost" :label="t('certificatesPage.seeEquipment')" />
      </template>
    </EmPageHero>

    <!-- ════════ UM GRUPO POR ÓRGÃO ════════ -->
    <section
      v-for="(g, gi) in groups"
      :id="g.id"
      :key="g.id"
      class="em-section"
      :class="{ 'em-section--tint': gi % 2 === 1 }"
    >
      <div class="em-wrap em-certs">
        <div class="em-certs__head">
          <!-- o nome do órgão já está no título; a logo é só visual -->
          <img
            v-reveal
            class="em-certs__logo"
            :src="g.logo"
            alt=""
            width="480"
            height="480"
            loading="lazy"
            decoding="async"
          />
          <div>
            <span v-reveal class="em-eyebrow">{{ g.count }}</span>
            <EmSplit class="em-h2" :text="g.title" :em="g.titleEm" />
            <p v-reveal="120" class="em-certs__sub">{{ g.subtitle }}</p>
          </div>
        </div>

        <ul class="em-docs">
          <li v-for="(d, i) in g.docs" :key="d.id" v-reveal="(i % 2) * 90">
            <a
              v-spot
              class="em-doc em-card em-card--lift"
              :href="d.href"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`${d.title} (${t('certificatesPage.newTab')})`"
            >
              <span class="em-ico"><FileCheck2 :stroke-width="1.7" aria-hidden="true" /></span>
              <span class="em-doc__txt">
                <b>{{ d.title }}</b>
                <span>{{ d.detail }}</span>
              </span>
              <span class="em-doc__open" aria-hidden="true">
                {{ t('certificatesPage.openPdf') }}
                <span class="em-corner"><ArrowUpRight :stroke-width="1.7" /></span>
              </span>
            </a>
          </li>
        </ul>

        <!-- contato no fim do último grupo (seção própria deixava um vão grande antes do rodapé) -->
        <div
          v-if="gi === groups.length - 1"
          v-reveal
          class="em-legal__contact em-card em-certs__contact"
        >
          <span class="em-ico em-ico--brand"><Mail :stroke-width="1.7" aria-hidden="true" /></span>
          <p>{{ t('certificatesPage.note') }}</p>
          <EmButton :href="mailto" variant="dark" :label="t('footer.links.contact')" />
        </div>
      </div>
    </section>
  </div>
</template>
