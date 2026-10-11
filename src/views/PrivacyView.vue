<script setup lang="ts">
/**
 * Política de Privacidade — Design System Emmitec.health, com o texto de sempre (pt/en/es).
 * Hero mais baixo, sumário lateral que acompanha a leitura e seções numeradas.
 */
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarClock, Mail } from 'lucide-vue-next'

import EmPageHero from '@/components/em/EmPageHero.vue'
import EmButton from '@/components/em/EmButton.vue'
import { useToc } from '@/lib/useToc'
import { CONTACT_EMAIL } from '@/lib/site'

const { t, tm } = useI18n()

const mailto = `mailto:${CONTACT_EMAIL}`

/** Seções do i18n; o número sai do título e vira o índice da seção.
 *  O corpo passa pelo `t` para resolver o `{'@'}` do e-mail. */
const sections = computed(() =>
  (tm('privacyPage.sections') as unknown as unknown[]).map((_, i) => ({
    id: `secao-${i + 1}`,
    n: String(i + 1).padStart(2, '0'),
    title: t(`privacyPage.sections.${i}.title`).replace(/^\d+\.\s*/, ''),
    body: t(`privacyPage.sections.${i}.body`),
  })),
)

/** Separa o e-mail do texto para virar link (`mailto:`). */
const withEmail = (text: string) => text.split(CONTACT_EMAIL)

const content = ref<HTMLElement | null>(null)
const tocEl = ref<HTMLElement | null>(null)
const { active, goTo } = useToc(content, tocEl, 'h2[id]')
</script>

<template>
  <div class="em-privacy-page">
    <!-- ════════ HERO ════════ -->
    <EmPageHero
      class="em-hero--short"
      :eyebrow="t('privacyPage.badge')"
      :title="t('privacyPage.title')"
      :em="t('privacyPage.titleEm')"
      :subtitle="t('privacyPage.subtitle')"
    >
      <template #lead>
        <p class="em-hero__updated">
          <CalendarClock :stroke-width="1.7" aria-hidden="true" />{{ t('privacyPage.updated') }}
        </p>
      </template>
      <template #actions>
        <EmButton :href="mailto" variant="ghost" :label="t('footer.links.contact')" />
      </template>
    </EmPageHero>

    <!-- ════════ TEXTO ════════ -->
    <section class="em-section em-article">
      <div class="em-wrap em-article__grid">
        <aside class="em-article__aside">
          <div class="em-article__sticky">
            <nav ref="tocEl" v-reveal class="em-toc" :aria-label="t('privacyPage.toc')">
              <span class="em-eyebrow">{{ t('privacyPage.toc') }}</span>
              <ol>
                <li v-for="(s, i) in sections" :key="s.id">
                  <a
                    :href="`#${s.id}`"
                    :class="{ 'is-active': active === i }"
                    @click.prevent="goTo(s.id)"
                    ><span>{{ s.n }}</span
                    >{{ s.title }}</a
                  >
                </li>
              </ol>
              <i class="em-toc__rail" aria-hidden="true"><i /></i>
            </nav>
          </div>
        </aside>

        <div ref="content" class="em-legal">
          <section
            v-for="(s, i) in sections"
            :key="s.id"
            v-reveal="i < 2 ? i * 90 : 0"
            class="em-legal__item"
          >
            <span class="em-legal__n" aria-hidden="true">{{ s.n }}</span>
            <div>
              <h2 :id="s.id">{{ s.title }}</h2>
              <p>
                <template v-for="(part, k) in withEmail(s.body)" :key="k"
                  ><a v-if="k > 0" :href="mailto">{{ CONTACT_EMAIL }}</a
                  >{{ part }}</template
                >
              </p>
            </div>
          </section>

          <div v-reveal class="em-legal__contact em-card">
            <span class="em-ico em-ico--brand"
              ><Mail :stroke-width="1.7" aria-hidden="true"
            /></span>
            <p>
              <template v-for="(part, k) in withEmail(t('privacyPage.contactNote'))" :key="k"
                ><a v-if="k > 0" :href="mailto">{{ CONTACT_EMAIL }}</a
                >{{ part }}</template
              >
            </p>
            <EmButton :href="mailto" variant="dark" :label="t('footer.links.contact')" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
