/* ============================================================
   Blog — artigos e categorias vindos da API pública do BackOffice.
   Lista, artigo e categorias recarregam ao trocar de idioma.
   ============================================================ */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  formatDate,
  publicApi,
  resolveAssetMarkers,
  toneFrom,
  useRemote,
  type PublicBlogCategory,
  type PublicPost,
} from './api'

/** Artigo pronto para as telas. */
export type Article = PublicPost & {
  /** capa (URL absoluta) ou vazio */
  img: string
  /** tom pastel do card quando não há capa */
  tone: string
  /** data no idioma atual */
  dateLabel: string
}

export function toArticle(p: PublicPost, lang: string): Article {
  return {
    ...p,
    tags: p.tags ?? [],
    content: resolveAssetMarkers(p.content ?? ''),
    img: p.coverImage ?? '',
    tone: toneFrom(p.gradient),
    dateLabel: formatDate(p.publishedAt, lang, p.date),
  }
}

/** Mais recentes primeiro (a API já ordena; aqui só garante). */
function byDate(a: PublicPost, b: PublicPost) {
  return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')
}

export function useArticles() {
  const { locale } = useI18n()
  const remote = useRemote((lang, force) => publicApi.blogPosts(lang, force))
  const articles = computed<Article[]>(() =>
    [...(remote.data.value ?? [])].sort(byDate).map((p) => toArticle(p, locale.value)),
  )
  return { ...remote, articles }
}

export function useArticle(slug: () => string) {
  const { locale } = useI18n()
  const remote = useRemote((lang, force) => publicApi.blogPost(slug(), lang, force), slug)
  const article = computed<Article | null>(() =>
    remote.data.value ? toArticle(remote.data.value, locale.value) : null,
  )
  return { ...remote, article }
}

export function useBlogCategories() {
  const remote = useRemote((lang, force) => publicApi.blogCategories(lang, force))
  const categories = computed<PublicBlogCategory[]>(() =>
    [...(remote.data.value ?? [])].sort((a, b) => a.order - b.order),
  )
  return { ...remote, categories }
}

/** ?category=… da URL (string única ou a primeira de uma lista). */
export function categoryFromQuery(raw: unknown): string {
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' && value ? value : 'all'
}
