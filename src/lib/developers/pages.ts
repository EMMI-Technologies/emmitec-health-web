/*
 * Carrega as páginas das docs (um pedaço por página e idioma, gerado no build).
 * O cache deixa a troca de página síncrona: a rota espera o módulo antes de trocar.
 */
import { shallowReactive } from 'vue'
import type { DocModule, DocsLang } from './types'

const modules = import.meta.glob<DocModule>('../../content/developers/*/*.md', { import: 'default' })

const cache = shallowReactive(new Map<string, DocModule | null>())
const key = (lang: DocsLang, slug: string) => `${lang}/${slug}`

function loaderFor(lang: DocsLang, slug: string) {
  return modules[`../../content/developers/${lang}/${slug}.md`]
}

export function hasDoc(lang: DocsLang, slug: string): boolean {
  return !!loaderFor(lang, slug)
}

/** Página já carregada (undefined = ainda não pedida; null = não existe). */
export function cachedDoc(lang: DocsLang, slug: string): DocModule | null | undefined {
  return cache.get(key(lang, slug))
}

export async function loadDoc(lang: DocsLang, slug: string): Promise<DocModule | null> {
  const k = key(lang, slug)
  if (cache.has(k)) return cache.get(k) ?? null
  const load = loaderFor(lang, slug)
  if (!load) {
    cache.set(k, null)
    return null
  }
  try {
    const mod = await load()
    cache.set(k, mod)
    return mod
  } catch {
    // falha de rede ao baixar o pedaço: não guarda, tenta de novo na próxima
    return null
  }
}
