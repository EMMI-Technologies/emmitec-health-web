<script setup lang="ts">
/**
 * Página das docs escrita em Markdown (src/content/developers/<en|pt>/<slug>.md).
 * O HTML chega pronto do backend do portal (GET /portal/docs, só com sessão; gerado por
 * lib/developers/build/build-private-docs.mjs). Aqui ficam os comportamentos: copiar código, abas de
 * linguagem (a escolha vale para a página toda e fica salva), links internos pelo roteador,
 * âncoras com rolagem nativa, sumário, anterior/próxima e título da aba.
 */
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-vue-next'
import DocsToc from '@/components/developers/DocsToc.vue'
import { cachedDoc, loadDoc } from '@/lib/developers/pages'
import { findItem, neighbours, sectionOf, slugFromPath } from '@/lib/developers/nav'
import { useDocsLang } from '@/lib/developers/lang'
import { replaceHash, scrollToId } from '@/lib/developers/view'
import { usePageMeta } from '@/lib/seo'
import type { DocModule } from '@/lib/developers/types'
import { CONTACT_EMAIL } from '@/lib/site'

const route = useRoute()
const router = useRouter()
const { lang, t } = useDocsLang()

const slug = computed(() => slugFromPath(route.path))
const doc = shallowRef<DocModule | null | undefined>(cachedDoc(lang.value, slug.value))
/** sem rede ou servidor ao baixar a página (não é 404): mostra "tentar de novo" */
const failed = ref(false)
const prose = ref<HTMLElement | null>(null)

async function fetchDoc() {
  const l = lang.value
  const s = slug.value
  failed.value = false
  const hit = cachedDoc(l, s)
  if (hit !== undefined) {
    doc.value = hit
    return
  }
  doc.value = undefined
  try {
    const loaded = await loadDoc(l, s)
    if (l === lang.value && s === slug.value) doc.value = loaded
  } catch {
    if (l === lang.value && s === slug.value) failed.value = true
  }
}

watch([lang, slug], () => void fetchDoc(), { immediate: true })

const section = computed(() => sectionOf(slug.value)?.title[lang.value] ?? '')
const near = computed(() => neighbours(slug.value))
const item = computed(() => findItem(slug.value))

usePageMeta(() => {
  if (doc.value) return { title: `${doc.value.title} | Developers`, description: doc.value.description }
  if (doc.value === null) return { title: `${t('notFoundTitle')} | Developers` }
  return { title: `${item.value?.title[lang.value] ?? 'Docs'} | Developers` }
})

/* ---------- abas de linguagem (cURL, Node.js, Python...) ---------- */
const TAB_KEY = 'emmitec.docs.codeTab'
function savedTab(): string | null {
  try {
    return localStorage.getItem(TAB_KEY)
  } catch {
    return null
  }
}
function selectTab(key: string, scope: ParentNode) {
  scope.querySelectorAll<HTMLElement>('[data-tabs]').forEach((group) => {
    const btn = group.querySelector<HTMLElement>(`[data-tab="${key}"]`)
    if (!btn) return
    group.querySelectorAll<HTMLElement>('[data-tab]').forEach((b) => {
      b.setAttribute('aria-selected', String(b === btn))
    })
    group.querySelectorAll<HTMLElement>('[data-panel]').forEach((p) => {
      p.hidden = p.dataset.panel !== key
    })
  })
}

/* ---------- copiar ---------- */
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

async function onCopy(btn: HTMLElement) {
  const box = btn.closest('.dx-code')
  const pre = box?.querySelector<HTMLElement>('pre:not([hidden])')
  if (!pre) return
  const ok = await copyText(pre.textContent ?? '')
  const label = btn.querySelector('span')
  if (!ok || !label) return
  const original = t('copy')
  label.textContent = t('copied')
  btn.classList.add('is-done')
  window.setTimeout(() => {
    label.textContent = original
    btn.classList.remove('is-done')
  }, 1600)
}

/* ---------- cliques no conteúdo ---------- */
function onClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  if (!target) return

  const copy = target.closest<HTMLElement>('[data-copy]')
  if (copy) {
    void onCopy(copy)
    return
  }

  const tab = target.closest<HTMLElement>('[data-tab]')
  if (tab?.dataset.tab) {
    const key = tab.dataset.tab
    // a mesma linguagem em todos os exemplos da página, sem a tela pular
    const before = tab.getBoundingClientRect().top
    if (prose.value) selectTab(key, prose.value)
    const after = tab.getBoundingClientRect().top
    if (Math.abs(after - before) > 1) window.scrollBy(0, after - before)
    try {
      localStorage.setItem(TAB_KEY, key)
    } catch {
      // sem localStorage: só não lembra
    }
    return
  }

  const a = target.closest<HTMLAnchorElement>('a[href]')
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  if (a.target === '_blank' || a.hasAttribute('download')) return
  const href = a.getAttribute('href') ?? ''
  if (href.startsWith('#')) {
    e.preventDefault()
    const id = decodeURIComponent(href.slice(1))
    if (scrollToId(id)) replaceHash(id)
    return
  }
  // links internos das docs pelo roteador (arquivos como /developers/openapi.json abrem direto)
  if (href.startsWith('/') && !/\.[a-z0-9]+($|[?#])/i.test(href)) {
    e.preventDefault()
    void router.push(href)
  }
}

/* ---------- depois de cada página montada ---------- */
watch(
  doc,
  async (d) => {
    if (!d) return
    await nextTick()
    const tab = savedTab()
    if (tab && prose.value) selectTab(tab, prose.value)
    // âncora no endereço: o roteador já rolou, mas sem descontar a barra do topo
    const hash = decodeURIComponent(route.hash.slice(1))
    if (hash) requestAnimationFrame(() => requestAnimationFrame(() => scrollToId(hash, false)))
  },
  { immediate: true, flush: 'post' },
)
</script>

<template>
  <div class="dx-page" :class="{ 'dx-page--toc': !!doc?.toc.length }">
    <article v-if="doc" class="dx-article" :lang="lang === 'pt' ? 'pt-BR' : 'en'">
      <header class="dx-head">
        <p v-if="section" class="dx-eyebrow">{{ section }}</p>
        <h1 class="dx-h1">{{ doc.title }}</h1>
        <p v-if="doc.description" class="dx-lead">{{ doc.description }}</p>
      </header>
      <!-- eslint-disable-next-line vue/no-v-html -- HTML gerado no build a partir do nosso Markdown -->
      <div ref="prose" class="dx-prose" @click="onClick" v-html="doc.html" />

      <nav class="dx-pager" :aria-label="`${t('previous')} / ${t('next')}`">
        <RouterLink v-if="near.prev" :to="near.prev.path" class="dx-pager__link">
          <span class="dx-pager__dir"><ArrowLeft :size="15" :stroke-width="1.8" aria-hidden="true" />{{ t('previous') }}</span>
          <span class="dx-pager__title">{{ near.prev.title[lang] }}</span>
        </RouterLink>
        <span v-else />
        <RouterLink v-if="near.next" :to="near.next.path" class="dx-pager__link dx-pager__link--next">
          <span class="dx-pager__dir">{{ t('next') }}<ArrowRight :size="15" :stroke-width="1.8" aria-hidden="true" /></span>
          <span class="dx-pager__title">{{ near.next.title[lang] }}</span>
        </RouterLink>
      </nav>

      <footer class="dx-foot">
        <p>
          {{ t('footerQuestions') }} {{ t('footerContact') }}
          <a :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a>.
        </p>
        <p class="dx-foot__copy">© {{ new Date().getFullYear() }} EmmiTec Health</p>
      </footer>
    </article>

    <article v-else-if="failed" class="dx-article dx-missing">
      <header class="dx-head">
        <p class="dx-eyebrow">{{ item?.title[lang] ?? 'Docs' }}</p>
        <h1 class="dx-h1">{{ t('loadFailedTitle') }}</h1>
        <p class="dx-lead">{{ t('loadFailedText') }}</p>
      </header>
      <button type="button" class="dx-btn dx-btn--line dx-retry" @click="fetchDoc">
        <RefreshCw :size="15" :stroke-width="1.8" aria-hidden="true" />{{ t('retry') }}
      </button>
    </article>

    <article v-else-if="doc === null" class="dx-article dx-missing">
      <header class="dx-head">
        <p class="dx-eyebrow">404</p>
        <h1 class="dx-h1">{{ t('notFoundTitle') }}</h1>
        <p class="dx-lead">{{ t('notFoundText') }}</p>
      </header>
      <RouterLink to="/developers" class="dx-btn dx-btn--line">{{ t('notFoundCta') }}</RouterLink>
    </article>

    <div v-else class="dx-article dx-loading" aria-busy="true">{{ t('loading') }}</div>

    <aside v-if="doc && doc.toc.length" class="dx-aside">
      <DocsToc :key="`${lang}-${slug}`" :items="doc.toc" :title="t('onThisPage')" />
    </aside>
  </div>
</template>
