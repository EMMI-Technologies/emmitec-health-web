/* Tipos compartilhados das docs para desenvolvedores (/developers). */

export type DocsLang = 'en' | 'pt'

export interface TocItem {
  id: string
  text: string
  level: number
}

/** Módulo gerado de cada .md (plugin em ./build/markdown-plugin.mjs). */
export interface DocModule {
  title: string
  description: string
  html: string
  toc: TocItem[]
}

/** Entrada do índice de busca (virtual:developers-index). */
export interface DocIndexEntry {
  lang: DocsLang
  slug: string
  title: string
  description: string
  headings: { id: string; text: string }[]
  endpoints: { id: string; text: string }[]
}
