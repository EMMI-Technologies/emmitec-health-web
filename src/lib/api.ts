/* ============================================================
   API pública do BackOffice (emmitec-api-backoffice, NestJS).
   Blog e equipamentos vêm daqui; o site não tem mais cópia local.

   Base: VITE_API_BASE_URL, terminando em /v1 e sem barra no fim
   (ex.: https://api-backoffice.emmitec.health/v1). Todas as rotas
   públicas aceitam ?lang=pt|en|es e não pedem token.

   Imagens (coverImage, image, gallery[]) já chegam como URL absoluta.
   ============================================================ */
import { onBeforeUnmount, ref, shallowRef, watch, type Ref, type ShallowRef } from 'vue'
import { useI18n } from 'vue-i18n'

export type Lang = 'pt' | 'en' | 'es'

const DEFAULT_BASE = 'https://api-backoffice.emmitec.health/v1'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '')

/* ---------------------------------------------------------------
   Contrato
   --------------------------------------------------------------- */

export interface PublicPost {
  id: number
  slug: string
  categoryId: number
  /** slug da categoria */
  cat: string
  catLabel: string
  title: string
  excerpt: string
  /** HTML já sanitizado pelo servidor */
  content: string
  /** data formatada pelo servidor (sempre em português) */
  date: string
  /** YYYY-MM-DD */
  publishedAt: string
  readTime: string
  author: string
  authorRole: string
  /** classe de gradiente do BackOffice (ex.: from-blue-500/30 ...) */
  gradient: string
  coverImage?: string
  tags: string[]
  featured: boolean
}

export interface PublicBlogCategory {
  slug: string
  name: string
  description?: string
  color?: string
  order: number
}

/** Leitura mostrada na "tela" do dispositivo. */
export interface Reading {
  value: number
  dec?: number
  suffix?: string
  unit: string
  ecg?: boolean
}

export interface PublicEquipment {
  id: number
  slug: string
  categoryId: number
  cat: string
  catLabel: string
  name: string
  shortDesc: string
  /** HTML já sanitizado pelo servidor */
  fullDesc: string
  /** nome do ícone lucide (ex.: "Gauge") */
  icon: string
  image?: string
  gallery: string[]
  model?: string
  reading?: Reading | null
  connectivity: string[]
  /** classe de gradiente do BackOffice */
  color: string
  features: string[]
  certifications: string[]
  manufacturer?: string
  order: number
}

export interface PublicEquipmentCategory {
  slug: string
  name: string
  icon: string
  description?: string
  order: number
}

/** Fabricante (marca) com dispositivos integrados. */
export interface PublicManufacturer {
  slug: string
  name: string
  /** URL absoluta do logo (https://assets.emmitec.health/manufacturers/...) */
  logo?: string
  website?: string
  deviceCount: number
  order: number
}

/* ---------------------------------------------------------------
   Transporte
   --------------------------------------------------------------- */

/** status 0 = sem resposta (rede, CORS, tempo esgotado). */
export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
  get notFound() {
    return this.status === 404
  }
}

const TIMEOUT_MS = 15000
/** Respostas reaproveitadas entre telas (Início → Blog → artigo) por alguns minutos. */
const CACHE_MS = 5 * 60 * 1000
const cache = new Map<string, { at: number; promise: Promise<unknown> }>()

async function request<T>(url: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (e) {
    const timeout = e instanceof DOMException && e.name === 'TimeoutError'
    throw new ApiError(timeout ? 'timeout' : 'network', 0)
  }
  if (!res.ok) throw new ApiError(`HTTP ${res.status}`, res.status)
  try {
    return (await res.json()) as T
  } catch {
    throw new ApiError('invalid-json', res.status)
  }
}

function get<T>(path: string, lang: Lang, force = false): Promise<T> {
  const sep = path.includes('?') ? '&' : '?'
  const url = `${API_BASE_URL}${path}${sep}lang=${lang}`
  const hit = cache.get(url)
  if (!force && hit && Date.now() - hit.at < CACHE_MS) return hit.promise as Promise<T>
  const promise = request<T>(url)
  cache.set(url, { at: Date.now(), promise })
  // erro não fica guardado: a próxima tentativa vai de novo ao servidor
  promise.catch(() => {
    if (cache.get(url)?.promise === promise) cache.delete(url)
  })
  return promise
}

const seg = (s: string) => encodeURIComponent(s)

export const publicApi = {
  blogPosts: (lang: Lang, force?: boolean) => get<PublicPost[]>('/public/blog/posts', lang, force),
  blogPost: (slug: string, lang: Lang, force?: boolean) =>
    get<PublicPost>(`/public/blog/posts/${seg(slug)}`, lang, force),
  blogCategories: (lang: Lang, force?: boolean) =>
    get<PublicBlogCategory[]>('/public/blog/categories', lang, force),
  equipment: (lang: Lang, force?: boolean) =>
    get<PublicEquipment[]>('/public/equipment', lang, force),
  equipmentItem: (slug: string, lang: Lang, force?: boolean) =>
    get<PublicEquipment>(`/public/equipment/${seg(slug)}`, lang, force),
  equipmentCategories: (lang: Lang, force?: boolean) =>
    get<PublicEquipmentCategory[]>('/public/equipment/categories', lang, force),
  manufacturers: (lang: Lang, force?: boolean) =>
    get<PublicManufacturer[]>('/public/manufacturers', lang, force),
}

/* ---------------------------------------------------------------
   Composable: carrega, recarrega ao trocar idioma, expõe estados
   --------------------------------------------------------------- */

export interface Remote<T> {
  data: ShallowRef<T | null>
  error: ShallowRef<ApiError | null>
  /** true enquanto há requisição em curso (inclusive ao trocar de idioma) */
  loading: Ref<boolean>
  /** tenta de novo indo ao servidor (ignora o cache) */
  reload: () => void
}

/**
 * `load(lang, force)` busca o recurso. Roda ao montar e sempre que o idioma
 * (ou `deps`, se informado) mudar. Ao trocar de idioma o conteúdo anterior
 * continua na tela até o novo chegar; se falhar, o erro substitui o conteúdo.
 */
export function useRemote<T>(
  load: (lang: Lang, force: boolean) => Promise<T>,
  deps?: () => unknown,
): Remote<T> {
  const { locale } = useI18n()
  const data = shallowRef<T | null>(null)
  const error = shallowRef<ApiError | null>(null)
  const loading = ref(true)
  let seq = 0
  let alive = true

  async function run(force = false) {
    const id = ++seq
    loading.value = true
    error.value = null
    try {
      const value = await load(locale.value as Lang, force)
      if (!alive || id !== seq) return
      data.value = value
    } catch (e) {
      if (!alive || id !== seq) return
      data.value = null
      error.value = e instanceof ApiError ? e : new ApiError(String(e), 0)
    } finally {
      if (alive && id === seq) loading.value = false
    }
  }

  watch([locale, () => deps?.()], () => run(), { immediate: true })
  onBeforeUnmount(() => {
    alive = false
  })

  return { data, error, loading, reload: () => run(true) }
}

/* ---------------------------------------------------------------
   Utilitários de apresentação
   --------------------------------------------------------------- */

/**
 * O BackOffice guarda o "tom" do card como classe de gradiente do Tailwind
 * (from-blue-500/30 ...). O site usa os pastéis do Design System: a cor
 * dominante da classe decide o pastel.
 */
export function toneFrom(gradient?: string | null): string {
  const g = (gradient ?? '').toLowerCase()
  if (g.startsWith('#') || g.startsWith('var(') || g.startsWith('rgb')) return gradient!
  if (/rose|pink|red|fuchsia/.test(g)) return 'var(--pastel-rose)'
  if (/emerald|green|teal|lime/.test(g)) return 'var(--pastel-mint)'
  if (/amber|orange|yellow/.test(g)) return 'var(--pastel-peach)'
  if (/purple|violet/.test(g)) return 'var(--pastel-lilac)'
  if (/blue|sky|indigo/.test(g)) return 'var(--pastel-blue)'
  if (/cyan/.test(g)) return 'var(--cyan-50)'
  return 'var(--cyan-100)'
}

export const NUM_LOCALE: Record<string, string> = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' }

/** "2026-10-09" → "09 Out 2026" (pt/es) ou "Oct 9, 2026" (en). Sem data válida, `fallback`. */
export function formatDate(iso: string | undefined, lang: string, fallback = ''): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  if (!m) return fallback
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  const loc = NUM_LOCALE[lang] ?? 'pt-BR'
  const month = new Intl.DateTimeFormat(loc, { month: 'short', timeZone: 'UTC' })
    .format(d)
    .replace(/\.$/, '')
  const cap = month.charAt(0).toUpperCase() + month.slice(1)
  const day = d.getUTCDate()
  return lang === 'en' ? `${cap} ${day}, ${m[1]}` : `${String(day).padStart(2, '0')} ${cap} ${m[1]}`
}

/**
 * O conteúdo importado do site antigo pode trazer imagens com o marcador
 * `{{ASSET}}/public/...`. Se o servidor não tiver trocado, troca aqui pela
 * base pública dos arquivos (o prefixo public/ é a origem do CDN).
 */
const ASSETS_BASE = (
  import.meta.env.VITE_ASSETS_BASE_URL || 'https://assets.emmitec.health'
).replace(/\/+$/, '')
export function resolveAssetMarkers(html: string): string {
  return html.replace(/\{\{ASSET\}\}\/(?:public\/)?/g, `${ASSETS_BASE}/`)
}
