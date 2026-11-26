/*
 * Páginas das docs: vêm do backend do portal (GET /portal/docs/<lang>/<slug>), só com sessão.
 * O cache deixa a troca de página síncrona: a rota espera a página antes de trocar, e a segunda
 * visita não baixa de novo. Um 401 no meio derruba a sessão (lib/portal/api) e a entrada aparece.
 * Só o 404 é definitivo (null); sem rede, 5xx ou tempo esgotado, loadDoc lança o PortalError e a
 * página mostra "tentar de novo" em vez de "não encontrada".
 */
import { shallowReactive } from 'vue'
import { portalApi, PortalError } from '@/lib/portal/api'
import { MD_SLUGS } from './nav'
import type { DocModule, DocsLang } from './types'

const cache = shallowReactive(new Map<string, DocModule | null>())
const key = (lang: DocsLang, slug: string) => `${lang}/${slug}`

/** Página que existe no menu (as outras são views próprias ou 404). */
export function hasDoc(_lang: DocsLang, slug: string): boolean {
  return MD_SLUGS.includes(slug)
}

/** Página já carregada (undefined = ainda não pedida; null = não existe). */
export function cachedDoc(lang: DocsLang, slug: string): DocModule | null | undefined {
  return cache.get(key(lang, slug))
}

export async function loadDoc(lang: DocsLang, slug: string): Promise<DocModule | null> {
  const k = key(lang, slug)
  if (cache.has(k)) return cache.get(k) ?? null
  if (!hasDoc(lang, slug)) {
    cache.set(k, null)
    return null
  }
  try {
    const page = await portalApi.doc(lang, slug)
    cache.set(k, page)
    return page
  } catch (e) {
    if (e instanceof PortalError && e.status === 404) {
      cache.set(k, null)
      return null
    }
    throw e
  }
}

/** Ao sair: nada da documentação fica na memória da aba. */
export function clearDocs() {
  cache.clear()
}
