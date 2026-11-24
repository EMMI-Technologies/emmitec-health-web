/*
 * Busca das docs (Ctrl/Cmd+K): títulos, intertítulos e endpoints das páginas, nos dois idiomas.
 * O texto em inglês e em português da mesma seção é procurado junto (as páginas têm a mesma
 * estrutura nos dois idiomas), e o resultado abre sempre no idioma em uso.
 */
import index from 'virtual:developers-index'
import { findItem, NAV_ITEMS } from './nav'
import type { DocIndexEntry, DocsLang } from './types'

export interface SearchHit {
  key: string
  path: string
  hash: string
  pageTitle: string
  /** intertítulo ou endpoint; vazio quando é a página */
  label: string
  kind: 'page' | 'heading' | 'endpoint'
}

interface Candidate {
  key: string
  slug: string
  kind: SearchHit['kind']
  weight: number
  text: Record<DocsLang, string>
  extra: string
  id: Record<DocsLang, string>
}

export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

function entry(lang: DocsLang, slug: string): DocIndexEntry | undefined {
  return index.find((p) => p.lang === lang && p.slug === slug)
}

/** Palavras extras para páginas sem Markdown. */
const EXTRA: Record<string, string> = {
  'api-reference': 'openapi try it test request endpoints reference referencia endpoints',
}

let candidates: Candidate[] | null = null

function build(): Candidate[] {
  const list: Candidate[] = []
  for (const item of NAV_ITEMS) {
    const en = entry('en', item.slug)
    const pt = entry('pt', item.slug)
    list.push({
      key: `${item.slug}`,
      slug: item.slug,
      kind: 'page',
      weight: 40,
      text: { en: en?.title || item.title.en, pt: pt?.title || item.title.pt },
      extra: `${item.title.en} ${item.title.pt} ${en?.description ?? ''} ${pt?.description ?? ''} ${EXTRA[item.slug] ?? ''}`,
      id: { en: '', pt: '' },
    })
    const n = Math.max(en?.headings.length ?? 0, pt?.headings.length ?? 0)
    for (let i = 0; i < n; i++) {
      const he = en?.headings[i]
      const hp = pt?.headings[i]
      list.push({
        key: `${item.slug}#h${i}`,
        slug: item.slug,
        kind: 'heading',
        weight: 24,
        text: { en: he?.text ?? hp?.text ?? '', pt: hp?.text ?? he?.text ?? '' },
        extra: '',
        id: { en: he?.id ?? '', pt: hp?.id ?? '' },
      })
    }
    const seen = new Set<string>()
    for (const ep of [...(en?.endpoints ?? []), ...(pt?.endpoints ?? [])]) {
      if (seen.has(ep.id)) continue
      seen.add(ep.id)
      list.push({
        key: `${item.slug}#${ep.id}`,
        slug: item.slug,
        kind: 'endpoint',
        weight: 18,
        text: { en: ep.text, pt: ep.text },
        extra: '',
        id: { en: ep.id, pt: ep.id },
      })
    }
  }
  return list
}

export function searchDocs(query: string, lang: DocsLang, limit = 12): SearchHit[] {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (!words.length) return []
  candidates ??= build()
  const q = normalize(query.trim())
  const scored: { c: Candidate; score: number }[] = []
  for (const c of candidates) {
    const mine = normalize(c.text[lang])
    const other = normalize(c.text[lang === 'en' ? 'pt' : 'en'])
    const hay = `${mine} ${other} ${normalize(c.extra)}`
    if (!words.every((w) => hay.includes(w))) continue
    // o texto do próprio resultado vale mais que a descrição da página ou o outro idioma
    let score: number
    if (words.every((w) => mine.includes(w))) {
      score = c.weight + 20
      if (mine.startsWith(q)) score += 15
      else if (mine.includes(q)) score += 8
    } else if (words.every((w) => other.includes(w))) {
      score = c.weight * 0.6
    } else {
      score = 6
    }
    scored.push({ c, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map(({ c }) => {
    const item = findItem(c.slug)
    const page = entry(lang, c.slug)
    return {
      key: c.key,
      path: item?.path ?? '/developers',
      hash: c.id[lang] || c.id.en,
      pageTitle: page?.title || item?.title[lang] || '',
      label: c.kind === 'page' ? '' : c.text[lang],
      kind: c.kind,
    }
  })
}
