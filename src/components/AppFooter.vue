<script setup lang="ts">
/**
 * Rodapé do DS: card arredondado com gradiente vivo, newsletter em destaque,
 * colunas de links, endereços, redes e o nome da marca em tamanho gigante.
 */
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowUp } from 'lucide-vue-next'
import { scrollToY } from '@/lib/motion'
import { addresses, calendlyUrl, socialLinks, LOGO_SRC } from '@/lib/site'
import { useBlogCategories } from '@/lib/blog'
import EmButton from '@/components/em/EmButton.vue'
import EmSplit from '@/components/em/EmSplit.vue'
import EmShader from '@/components/em/EmShader.vue'

/** `newsletter: false` esconde o bloco da newsletter (o Blog já tem a própria). */
withDefaults(defineProps<{ newsletter?: boolean }>(), { newsletter: true })

const { t } = useI18n()

const email = ref('')

const linksCol = computed(() => [
  { text: t('footer.links.ourHistory'), to: '/about' },
  { text: t('footer.links.whatIsRpm'), to: '/what-is-rpm' },
  { text: t('footer.links.benefits'), to: '/benefits' },
  { text: t('footer.links.blog'), to: '/blog' },
  { text: t('footer.links.contact'), href: calendlyUrl.value },
  { text: t('footer.links.certificates'), to: '/apps' },
  { text: t('footer.links.privacyTerms'), to: '/privacy' },
])

/** Coluna do blog: as categorias cadastradas no BackOffice (enquanto carregam, só "Todos"). */
const { categories: blogCategories } = useBlogCategories()
const blogCol = computed(() => [
  { text: t('blogPage.categories.all'), to: '/blog' },
  ...blogCategories.value
    .slice(0, 4)
    .map((c) => ({ text: c.name, to: `/blog?category=${encodeURIComponent(c.slug)}` })),
])

function subscribe() {
  // TODO: integrar com o serviço de newsletter (o formulário original ainda não enviava).
}

function toTop() {
  scrollToY(0)
}
</script>

<template>
  <footer class="em-footer" :class="{ 'em-footer--bare': !newsletter }">
    <EmShader :veil="0.2" />
    <div class="em-wrap">
      <div v-if="newsletter" class="em-footer__cta">
        <div class="em-footer__intro">
          <EmSplit
            :text="t('footer.newsletter.title')"
            :em="t('footer.newsletter.titleEm')"
            tag="h2"
          />
          <p v-reveal="120" class="em-footer__lead">
            {{ t('footer.newsletter.description') }}
            <strong>{{ t('footer.newsletter.highlight') }}</strong>
          </p>
        </div>
        <form v-reveal="200" class="em-news" @submit.prevent="subscribe">
          <label class="em-news__field">
            <span class="sr-only">{{ t('footer.newsletter.placeholder') }}</span>
            <input
              v-model="email"
              type="email"
              required
              autocomplete="email"
              :placeholder="t('footer.newsletter.placeholder')"
            />
            <EmButton type="submit" variant="dark" :label="t('footer.newsletter.submit')" />
          </label>
          <p class="em-footer__note">
            <span class="em-news__check" aria-hidden="true" />
            {{ t('footer.newsletter.privacy') }}
          </p>
        </form>
      </div>

      <div class="em-footer__grid">
        <div>
          <RouterLink to="/" class="em-footer__logo" aria-label="Emmitec Health">
            <img :src="LOGO_SRC" alt="Emmitec Health" width="1352" height="171" loading="lazy" />
          </RouterLink>
          <p class="em-footer__tagline">{{ t('footer.tagline') }}</p>
          <span class="em-social">
            <a
              v-for="s in socialLinks"
              :key="s.name"
              :href="s.href"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="s.name"
            >
              <component :is="s.icon" :stroke-width="1.7" aria-hidden="true" />
            </a>
          </span>
        </div>

        <div>
          <h5>{{ t('footer.links.title') }}</h5>
          <template v-for="l in linksCol" :key="l.text">
            <a v-if="l.href" :href="l.href" target="_blank" rel="noopener noreferrer"
              >{{ l.text }}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M7 17L17 7M8 7h9v9" />
              </svg>
            </a>
            <RouterLink v-else :to="l.to!"
              >{{ l.text }}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M7 17L17 7M8 7h9v9" />
              </svg>
            </RouterLink>
          </template>
        </div>

        <div>
          <h5>{{ t('footer.blogCol.title') }}</h5>
          <RouterLink v-for="l in blogCol" :key="l.to" :to="l.to"
            >{{ l.text }}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M7 17L17 7M8 7h9v9" />
            </svg>
          </RouterLink>
        </div>

        <div>
          <h5>{{ t('footer.addressTitle') }}</h5>
          <address v-for="a in addresses" :key="a.country" class="em-footer__addr">
            <strong>{{ t(`footer.countries.${a.country}`) }}</strong>
            {{ a.text }}
          </address>
        </div>
      </div>

      <div v-reveal class="em-footer__word" aria-hidden="true">Emmitec<i> Health</i></div>

      <div class="em-footer__legal">
        <span>© 2026 Emmitec Health. {{ t('footer.copyright') }}</span>
        <span class="em-footer__legal-links">
          <RouterLink to="/privacy">{{ t('footer.links.privacyTerms') }}</RouterLink>
          <button type="button" class="em-totop" @click="toTop">
            {{ t('footer.backToTop') }}
            <span class="em-totop__ic"
              ><ArrowUp :size="14" :stroke-width="2" aria-hidden="true"
            /></span>
          </button>
        </span>
      </div>
    </div>
  </footer>
</template>
