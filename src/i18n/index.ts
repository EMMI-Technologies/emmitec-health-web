import { createI18n } from 'vue-i18n'
import pt from './locales/pt.json'
import en from './locales/en.json'
import es from './locales/es.json'

export const SUPPORTED_LOCALES = ['pt', 'en', 'es'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
export const LOCALE_STORAGE_KEY = 'emmitec.locale'

function getInitialLocale(): SupportedLocale {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (saved && (SUPPORTED_LOCALES as readonly string[]).includes(saved)) {
      return saved as SupportedLocale
    }
  } catch {
    // localStorage indisponível (SSR / privacidade) — segue para fallback
  }
  return 'pt'
}

const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: 'pt',
  messages: {
    pt,
    en,
    es,
  },
})

/** Troca o idioma e guarda a escolha (menu e página de links usam o mesmo). */
export function setLocale(code: string) {
  i18n.global.locale.value = code as SupportedLocale
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, code)
  } catch {
    // localStorage pode estar bloqueado — apenas a persistência é perdida
  }
}

export default i18n
