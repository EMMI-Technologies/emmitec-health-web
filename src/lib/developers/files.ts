/*
 * Arquivos para baixar nas docs (OpenAPI e coleção do Postman): vêm do backend do portal com a sessão,
 * então o download é um blob montado aqui, não um link para arquivo público (não existe mais).
 */
import { portalApi, type DocsFileName } from '@/lib/portal/api'

export const DOCS_FILES: Record<DocsFileName, { download: string }> = {
  'openapi.json': { download: 'emmitec-partner-api-openapi.json' },
  'postman.json': { download: 'emmitec-partner-api.postman_collection.json' },
}

/** Baixa um arquivo das docs para o computador de quem está logado. Lança em caso de erro. */
export async function downloadDocsFile(name: DocsFileName) {
  const data = await portalApi.docsFile(name)
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = DOCS_FILES[name].download
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}
