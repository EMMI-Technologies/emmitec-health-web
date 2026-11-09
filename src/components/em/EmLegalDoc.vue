<script setup lang="ts">
/**
 * Corpo de texto jurídico longo (Termos de Uso, Acessibilidade): sumário lateral que acompanha a
 * leitura e seções numeradas, no mesmo desenho da Política de Privacidade. E-mails e endereços web
 * do texto viram links. O slot padrão entra depois da última seção (cartão de contato).
 */
import { computed, ref } from 'vue'
import EmLegalText from '@/components/em/EmLegalText.vue'
import { useToc } from '@/lib/useToc'
import type { LegalSection } from '@/lib/legal'

const props = defineProps<{ sections: LegalSection[]; tocLabel: string }>()

const items = computed(() =>
  props.sections.map((s, i) => ({ ...s, id: `secao-${i + 1}`, n: String(i + 1).padStart(2, '0') })),
)

const content = ref<HTMLElement | null>(null)
const tocEl = ref<HTMLElement | null>(null)
const { active, goTo } = useToc(content, tocEl, 'h2[id]')
</script>

<template>
  <section class="em-section em-article">
    <div class="em-wrap em-article__grid">
      <aside class="em-article__aside">
        <div class="em-article__sticky">
          <nav ref="tocEl" class="em-toc" :aria-label="tocLabel">
            <span class="em-eyebrow">{{ tocLabel }}</span>
            <ol>
              <li v-for="(s, i) in items" :key="s.id">
                <a :href="`#${s.id}`" :class="{ 'is-active': active === i }" @click.prevent="goTo(s.id)"
                  ><span>{{ s.n }}</span>{{ s.title }}</a
                >
              </li>
            </ol>
            <i class="em-toc__rail" aria-hidden="true"><i /></i>
          </nav>
        </div>
      </aside>

      <div ref="content" class="em-legal">
        <section v-for="s in items" :key="s.id" class="em-legal__item">
          <span class="em-legal__n" aria-hidden="true">{{ s.n }}</span>
          <div class="em-legal__body">
            <h2 :id="s.id">{{ s.title }}</h2>
            <p v-for="(p, k) in s.paragraphs" :key="`p${k}`"><EmLegalText :text="p" /></p>
            <ul v-if="s.items?.length" class="em-legal__list">
              <li v-for="(it, k) in s.items" :key="`i${k}`"><EmLegalText :text="it" /></li>
            </ul>
            <template v-for="(g, k) in s.groups ?? []" :key="`g${k}`">
              <h3>{{ g.title }}</h3>
              <ul class="em-legal__list">
                <li v-for="(it, j) in g.items" :key="j"><EmLegalText :text="it" /></li>
              </ul>
            </template>
            <p v-for="(p, k) in s.after ?? []" :key="`a${k}`"><EmLegalText :text="p" /></p>
          </div>
        </section>

        <slot />
      </div>
    </div>
  </section>
</template>
