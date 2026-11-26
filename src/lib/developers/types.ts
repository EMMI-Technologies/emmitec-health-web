/* Tipos compartilhados das docs para desenvolvedores (/developers). */

export type DocsLang = 'en' | 'pt'

export interface TocItem {
  id: string
  text: string
  level: number
}

/** Página gerada de cada .md (./build/markdown.mjs), servida por GET /portal/docs/<lang>/<slug>. */
export interface DocModule {
  title: string
  description: string
  html: string
  toc: TocItem[]
}

/** Entrada do índice de busca (GET /portal/docs). */
export interface DocIndexEntry {
  lang: DocsLang
  slug: string
  title: string
  description: string
  headings: { id: string; text: string }[]
  endpoints: { id: string; text: string }[]
}
