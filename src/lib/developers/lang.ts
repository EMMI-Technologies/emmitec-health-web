/*
 * Idioma das docs: só EN e PT.
 * 1. ?lang=en|pt no endereço (links diretos) vence e vira a escolha salva;
 * 2. idioma escolhido no site (vue-i18n, salvo no navegador): pt -> PT, qualquer outro -> EN;
 * 3. sem escolha salva: idioma do navegador (pt* -> PT, senão EN). O site abre em PT por
 *    padrão, mas um desenvolvedor de fora do Brasil chegando direto nas docs deve ler em inglês.
 */
import { computed, ref } from 'vue'
import i18n, { LOCALE_STORAGE_KEY, setLocale } from '@/i18n'
import { UI, type UiKey } from '@/content/developers/ui'
import type { DocsLang } from './types'

function hasSavedLocale(): boolean {
  try {
    return !!localStorage.getItem(LOCALE_STORAGE_KEY)
  } catch {
    return false
  }
}

function browserLang(): DocsLang {
  if (typeof navigator === 'undefined') return 'en'
  const list = navigator.languages?.length ? navigator.languages : [navigator.language]
  return list.some((l) => /^pt\b/i.test(l ?? '')) ? 'pt' : 'en'
}

const explicit = ref(hasSavedLocale())

export const isDocsLang = (v: unknown): v is DocsLang => v === 'en' || v === 'pt'

/** Idioma em uso agora (sem olhar o endereço). */
export function currentDocsLang(): DocsLang {
  if (!explicit.value) return browserLang()
  return i18n.global.locale.value === 'pt' ? 'pt' : 'en'
}

/** Idioma de uma navegação: ?lang= vence. */
export function initialDocsLang(queryLang: unknown): DocsLang {
  return isDocsLang(queryLang) ? queryLang : currentDocsLang()
}

/** Troca o idioma das docs (e do site, que usa a mesma escolha). */
export function setDocsLang(l: DocsLang) {
  setLocale(l)
  explicit.value = true
}

const lang = computed<DocsLang>(() => currentDocsLang())

export function useDocsLang() {
  const t = (key: UiKey) => UI[lang.value][key]
  return { lang, setLang: setDocsLang, t }
}
