/* ============================================================
   Título e descrição por página (document.title + meta description
   + Open Graph básico). Ao sair da página volta o padrão do index.html.
   ============================================================ */
import { onBeforeUnmount, watchEffect } from 'vue'

export const SITE_NAME = 'Emmitec Health'

const defaults = {
  title: typeof document !== 'undefined' ? document.title : SITE_NAME,
  description:
    typeof document !== 'undefined'
      ? (document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '')
      : '',
}

function setMeta(attr: 'name' | 'property', key: string, value: string | undefined) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!value) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', value)
}

/** Texto curto para descrição: sem HTML, espaços colapsados, até ~160 caracteres. */
export function plainText(html: string, max = 160): string {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ') > 80 ? cut.lastIndexOf(' ') : cut.length)}…`
}

export type PageMeta = { title?: string; description?: string; image?: string }

function apply(meta: PageMeta) {
  const title = meta.title ? `${meta.title} | ${SITE_NAME}` : defaults.title
  const description = meta.description ? plainText(meta.description) : defaults.description
  document.title = title
  setMeta('name', 'description', description)
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:image', meta.image)
}

/** Página dona do título agora (na troca, a nova monta antes de a antiga sair). */
let owner: symbol | null = null

/** Reage aos dados da página (ex.: artigo carregado, troca de idioma). */
export function usePageMeta(source: () => PageMeta) {
  const me = Symbol('page-meta')
  owner = me
  watchEffect(() => {
    const meta = source()
    if (owner === me) apply(meta)
  })
  onBeforeUnmount(() => {
    if (owner !== me) return
    owner = null
    apply({})
  })
}

/** Páginas sem metadados próprios devolvem o padrão (chamado a cada navegação). */
export function resetPageMeta() {
  owner = null
  apply({})
}
