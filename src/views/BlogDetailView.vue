<script setup lang="ts">
/**
 * Artigo do blog — Design System Emmitec.health.
 * Dados da API pública do BackOffice (slug da rota, recarrega ao trocar de idioma).
 * Hero com o gradiente vivo, texto com tipografia editorial, sumário lateral
 * que acompanha a leitura, compartilhar e artigos relacionados.
 */
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { Calendar, Clock, Share2, Tag } from 'lucide-vue-next'

import EmPageHero from '@/components/em/EmPageHero.vue'
import EmButton from '@/components/em/EmButton.vue'
import EmSplit from '@/components/em/EmSplit.vue'
import EmSkeleton from '@/components/em/EmSkeleton.vue'
import EmState from '@/components/em/EmState.vue'
import { useToc } from '@/lib/useToc'
import { calendlyUrl } from '@/lib/site'
import { plainText, usePageMeta } from '@/lib/seo'
import { useArticle, useArticles } from '@/lib/blog'

const { t } = useI18n()
const route = useRoute()
const slug = () => String(route.params.slug ?? '')

const { article, loading, error, reload } = useArticle(slug)
const list = useArticles()

const pad = (n: number) => String(n).padStart(2, '0')
const initial = (name: string) => name.replace(/^(Dra?|Profa?|Psic)\.\s*/i, '').charAt(0)

usePageMeta(() => {
  const a = article.value
  if (!a) return { title: t('header.nav.blog') }
  return {
    title: a.title,
    description: a.excerpt || plainText(a.content),
    image: a.img || undefined,
  }
})

/** Relacionados: primeiro os da mesma categoria, depois os demais. */
const related = computed(() => {
  const a = article.value
  if (!a) return []
  const others = list.articles.value.filter((x) => x.slug !== a.slug)
  return [...others.filter((x) => x.cat === a.cat), ...others.filter((x) => x.cat !== a.cat)].slice(
    0,
    3,
  )
})
const relatedLoading = computed(() => list.loading.value && !list.data.value)
const position = computed(() => new Map(list.articles.value.map((a, i) => [a.slug, i + 1])))

/* ── corpo: âncoras nos intertítulos e citações como <blockquote> ── */
const body = computed(() => {
  const toc: { id: string; text: string }[] = []
  const html = (article.value?.content ?? '')
    .replace(/<h([23])>(.*?)<\/h\1>/g, (_m, level: string, inner: string) => {
      const id = `secao-${toc.length + 1}`
      toc.push({ id, text: inner.replace(/<[^>]+>/g, '').replace(/^\d+\.\s*/, '') })
      return `<h${level} id="${id}">${inner}</h${level}>`
    })
    .replace(/<p>"(.+?)"\s*—\s*(.+?)<\/p>/g, '<blockquote><p>“$1”</p><cite>$2</cite></blockquote>')
  return { html, toc }
})

/* ── sumário acompanha a leitura ── */
const prose = ref<HTMLElement | null>(null)
const tocEl = ref<HTMLElement | null>(null)
const { active: activeH, goTo } = useToc(prose, tocEl, 'h2[id], h3[id]')

/* ── compartilhar ── */
const copied = ref(false)
let copiedT = 0
async function share() {
  const url = window.location.href
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: article.value?.title, url })
    } catch {
      // cancelado pelo usuário
    }
    return
  }
  try {
    await navigator.clipboard.writeText(url)
    copied.value = true
    window.clearTimeout(copiedT)
    copiedT = window.setTimeout(() => (copied.value = false), 2200)
  } catch {
    // sem permissão de área de transferência
  }
}

onBeforeUnmount(() => window.clearTimeout(copiedT))
</script>

<template>
  <div class="em-article-page">
    <!-- ════════ CARREGANDO ════════ -->
    <template v-if="!article && loading">
      <EmPageHero
        key="loading"
        class="em-hero--article"
        :eyebrow="t('state.loading')"
        :trail="[{ label: t('header.nav.blog'), to: '/blog' }]"
        title=""
      >
        <template #title>
          <div class="em-skel-hero" aria-hidden="true">
            <span class="em-skel em-skel--hero" style="width: 88%" />
            <span class="em-skel em-skel--hero" style="width: 62%" />
          </div>
        </template>
        <template #lead>
          <span
            class="em-skel em-skel--line"
            style="width: 280px; max-width: 70vw"
            aria-hidden="true"
          />
        </template>
      </EmPageHero>
      <section class="em-section em-article">
        <div class="em-wrap em-article__grid">
          <EmSkeleton kind="tabs" :count="1" />
          <div class="em-article__main">
            <EmSkeleton kind="media" />
            <EmSkeleton kind="prose" :count="3" class="em-skel-gap" />
          </div>
        </div>
      </section>
    </template>

    <!-- ════════ NÃO ENCONTRADO / ERRO ════════ -->
    <section v-else-if="!article" class="em-section em-section--state">
      <div class="em-wrap">
        <EmState
          v-if="error?.notFound"
          kind="notfound"
          :title="t('state.postNotFound')"
          :text="t('state.notFoundText')"
          back-to="/blog"
          :back-label="t('blogPage.detail.backToBlog')"
        />
        <EmState
          v-else
          kind="error"
          :title="t('state.postError')"
          :text="t('state.errorText')"
          :error="error"
          back-to="/blog"
          :back-label="t('blogPage.detail.backToBlog')"
          @retry="reload"
        />
      </div>
    </section>

    <template v-else>
      <!-- ════════ HERO ════════ -->
      <EmPageHero
        :key="article.slug"
        class="em-hero--article"
        :eyebrow="article.catLabel"
        :trail="[{ label: t('header.nav.blog'), to: '/blog' }]"
        :title="article.title"
        :subtitle="article.excerpt"
      >
        <template #lead>
          <div class="em-byline">
            <span class="em-avatar" aria-hidden="true">{{ initial(article.author) }}</span>
            <span>
              <b>{{ article.author }}</b>
              <small>{{ article.authorRole }}</small>
            </span>
          </div>
        </template>
        <template #actions>
          <EmButton to="/blog" variant="ghost" :label="t('blogPage.detail.backToBlog')" />
          <EmButton
            variant="dark"
            :label="copied ? t('blogPage.detail.copied') : t('blogPage.detail.share')"
            @click="share"
          />
        </template>
      </EmPageHero>

      <!-- ════════ ARTIGO ════════ -->
      <section class="em-section em-article">
        <div class="em-wrap em-article__grid">
          <aside class="em-article__aside">
            <div class="em-article__sticky">
              <dl v-reveal class="em-article__facts em-card">
                <div>
                  <dt><Calendar :stroke-width="1.7" aria-hidden="true" /></dt>
                  <dd>
                    <time :datetime="article.publishedAt">{{ article.dateLabel }}</time>
                  </dd>
                </div>
                <div>
                  <dt><Clock :stroke-width="1.7" aria-hidden="true" /></dt>
                  <dd>{{ article.readTime }} {{ t('blogPage.detail.readTime') }}</dd>
                </div>
                <div>
                  <dt><Tag :stroke-width="1.7" aria-hidden="true" /></dt>
                  <dd>
                    <RouterLink :to="`/blog?category=${article.cat}`">{{
                      article.catLabel
                    }}</RouterLink>
                  </dd>
                </div>
                <div v-if="article.tags.length" class="em-article__tags">
                  <span v-for="tag in article.tags" :key="tag" class="em-chip">#{{ tag }}</span>
                </div>
              </dl>

              <nav
                v-if="body.toc.length"
                ref="tocEl"
                v-reveal="120"
                class="em-toc"
                :aria-label="t('blogPage.detail.toc')"
              >
                <span class="em-eyebrow">{{ t('blogPage.detail.toc') }}</span>
                <ol>
                  <li v-for="(h, i) in body.toc" :key="h.id">
                    <a
                      :href="`#${h.id}`"
                      :class="{ 'is-active': activeH === i }"
                      @click.prevent="goTo(h.id)"
                      ><span>{{ pad(i + 1) }}</span
                      >{{ h.text }}</a
                    >
                  </li>
                </ol>
                <i class="em-toc__rail" aria-hidden="true"><i /></i>
              </nav>

              <div v-reveal="200" class="em-article__actions">
                <EmButton :href="calendlyUrl" :label="t('blogPage.detail.requestDemo')" block />
                <button type="button" class="em-share" @click="share">
                  <Share2 :stroke-width="1.7" aria-hidden="true" />
                  <span aria-live="polite">{{
                    copied ? t('blogPage.detail.copied') : t('blogPage.detail.share')
                  }}</span>
                </button>
              </div>
            </div>
          </aside>

          <div class="em-article__main">
            <figure v-if="article.img" v-reveal:scale class="em-article__cover">
              <img :src="article.img" :alt="article.title" width="1400" height="1089" />
            </figure>
            <!-- eslint-disable-next-line vue/no-v-html -- HTML sanitizado pela API do BackOffice -->
            <article ref="prose" v-reveal class="em-prose" v-html="body.html" />
          </div>
        </div>
      </section>

      <!-- ════════ RELACIONADOS ════════ -->
      <section
        v-if="relatedLoading || list.error.value || related.length"
        id="relacionados"
        class="em-section em-section--tint"
      >
        <div class="em-wrap">
          <div class="em-head">
            <div>
              <span v-reveal class="em-eyebrow">{{ t('blogPage.detail.relatedBadge') }}</span>
              <EmSplit
                :text="t('blogPage.detail.relatedTitle')"
                :em="t('blogPage.detail.relatedTitleEm')"
              />
            </div>
            <div v-reveal="150" class="em-head__side">
              <EmButton to="/blog" variant="ghost" :label="t('blogPage.detail.backToBlog')" />
            </div>
          </div>

          <EmSkeleton v-if="relatedLoading" kind="posts" :count="3" />
          <EmState
            v-else-if="list.error.value"
            kind="error"
            :title="t('state.blogError')"
            :text="t('state.errorText')"
            :error="list.error.value"
            @retry="list.reload"
          />
          <div v-else class="em-posts">
            <RouterLink
              v-for="(a, i) in related"
              :key="a.slug"
              v-reveal="i * 120"
              v-spot
              :to="`/blog/${a.slug}`"
              class="em-post em-card em-card--lift"
            >
              <div class="em-post__cover" :style="{ '--tone': a.tone }">
                <span class="em-post__n" aria-hidden="true">{{
                  pad(position.get(a.slug) ?? i + 1)
                }}</span>
                <span class="em-chip em-chip--glass"
                  ><Tag :stroke-width="1.8" aria-hidden="true" />{{ a.catLabel }}</span
                >
                <span class="em-corner" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M7 17L17 7M8 7h9v9" />
                  </svg>
                </span>
              </div>
              <div class="em-post__body">
                <span class="em-post__date"
                  ><time :datetime="a.publishedAt">{{ a.dateLabel }}</time> · {{ a.readTime }}</span
                >
                <h3>{{ a.title }}</h3>
                <p>{{ a.excerpt }}</p>
                <span class="em-post__more">{{ t('blogPage.preview.readArticle') }}</span>
              </div>
            </RouterLink>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
