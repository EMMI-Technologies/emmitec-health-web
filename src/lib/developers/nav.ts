/*
 * Menu lateral das docs: a ordem daqui define também "Anterior / Próxima".
 * Cada slug com `md: true` tem src/content/developers/<en|pt>/<slug>.md.
 */
import type { DocsLang } from './types'

export interface NavItem {
  slug: string
  path: string
  title: Record<DocsLang, string>
  /** página escrita em Markdown (as outras são views próprias) */
  md: boolean
}

export interface NavSection {
  title: Record<DocsLang, string>
  items: NavItem[]
}

const page = (slug: string, en: string, pt: string, md = true): NavItem => ({
  slug,
  path: slug === 'overview' ? '/developers' : `/developers/${slug}`,
  title: { en, pt },
  md,
})

export const NAV: NavSection[] = [
  {
    title: { en: 'Get started', pt: 'Comece aqui' },
    items: [
      page('overview', 'Overview', 'Visão geral'),
      page('quickstart', 'Quickstart', 'Início rápido'),
      page('authentication', 'Authentication', 'Autenticação'),
      page('testing', 'Testing and sandbox', 'Testes e sandbox'),
    ],
  },
  {
    title: { en: 'Partner API', pt: 'Partner API' },
    items: [
      page('patients', 'Patients', 'Pacientes'),
      page('readings', 'Readings', 'Medições'),
      page('alerts', 'Alerts and notifications', 'Alertas e notificações'),
      page('webhooks', 'Webhooks', 'Webhooks'),
      page('errors', 'Errors and rate limits', 'Erros e limites'),
    ],
  },
  {
    title: { en: 'Mobile SDK', pt: 'SDK mobile' },
    items: [
      page('sdk', 'Expo SDK', 'SDK para Expo'),
      page('devices', 'Supported devices', 'Aparelhos compatíveis'),
    ],
  },
  {
    title: { en: 'Reference', pt: 'Referência' },
    items: [
      page('api-reference', 'API reference', 'Referência da API', false),
      page('changelog', 'Versioning and changelog', 'Versões e changelog'),
    ],
  },
]

export const NAV_ITEMS: NavItem[] = NAV.flatMap((s) => s.items)

export const MD_SLUGS = NAV_ITEMS.filter((i) => i.md).map((i) => i.slug)

export function findItem(slug: string): NavItem | undefined {
  return NAV_ITEMS.find((i) => i.slug === slug)
}

export function sectionOf(slug: string): NavSection | undefined {
  return NAV.find((s) => s.items.some((i) => i.slug === slug))
}

export function neighbours(slug: string): { prev?: NavItem; next?: NavItem } {
  const i = NAV_ITEMS.findIndex((n) => n.slug === slug)
  if (i < 0) return {}
  return { prev: NAV_ITEMS[i - 1], next: NAV_ITEMS[i + 1] }
}

/** slug a partir do caminho (/developers -> overview). */
export function slugFromPath(path: string): string {
  const rest = path.replace(/^\/developers\/?/, '').replace(/\/+$/, '')
  return rest === '' ? 'overview' : rest
}
