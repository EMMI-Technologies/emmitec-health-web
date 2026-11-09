/* ============================================================
   Textos jurídicos longos (Termos de Uso, Declaração de Acessibilidade).
   Ficam em src/content/legal/<doc>.<idioma>.json, fora do vue-i18n: têm muitos
   e-mails, e o "@" é caractere especial nas mensagens do vue-i18n.
   Carregados sob demanda, só o do idioma ativo.
   ============================================================ */
import { ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'

export interface LegalGroup {
  title: string
  items: string[]
}

export interface LegalSection {
  title: string
  paragraphs: string[]
  /** lista logo depois dos parágrafos */
  items?: string[]
  /** subtítulos com lista (ex.: tipos de conteúdo não acessível) */
  groups?: LegalGroup[]
  /** parágrafos depois da lista */
  after?: string[]
}

export interface LegalDoc {
  sections: LegalSection[]
  /** nome do PDF original (cópia do site antigo), quando há */
  pdf?: string
}

export type LegalDocName = 'terms' | 'accessibility'

const loaders = import.meta.glob<LegalDoc>('../content/legal/*.json', { import: 'default' })

export function useLegalDoc(name: LegalDocName): Ref<LegalDoc | null> {
  const { locale } = useI18n()
  const doc = ref<LegalDoc | null>(null)
  watch(
    locale,
    async (lang) => {
      const load =
        loaders[`../content/legal/${name}.${lang}.json`] ?? loaders[`../content/legal/${name}.en.json`]
      doc.value = load ? await load() : null
    },
    { immediate: true },
  )
  return doc
}

export interface TextPart {
  text: string
  href?: string
}

const LINK = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})|(https?:\/\/[^\s)]+[^\s).,;:])/g

/** Separa e-mails e endereços web do texto para virarem links (mailto: e nova aba). */
export function linkify(text: string): TextPart[] {
  const parts: TextPart[] = []
  let last = 0
  for (const m of text.matchAll(LINK)) {
    const at = m.index ?? 0
    if (at > last) parts.push({ text: text.slice(last, at) })
    parts.push({ text: m[0], href: m[1] ? `mailto:${m[1]}` : m[0] })
    last = at + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}

/** PDFs que vieram do site antigo (mesma pasta dos certificados). */
export const legacyFileUrl = (file: string) =>
  'https://assets.emmitec.health/legado/assets/files/' + encodeURIComponent(file)
