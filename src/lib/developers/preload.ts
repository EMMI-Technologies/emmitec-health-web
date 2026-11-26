/* Baixa a página das docs antes de a rota trocar (usado pelo beforeEnter em src/router/developers.ts). */
import type { RouteLocationNormalized } from 'vue-router'
import { hasSession } from './access'
import { loadDoc } from './pages'
import { slugFromPath } from './nav'
import { initialDocsLang } from './lang'

export async function preloadDoc(to: RouteLocationNormalized) {
  // sem sessão a rota mostra a entrada; a página vem depois do login
  if (!hasSession()) return
  try {
    await loadDoc(initialDocsLang(to.query.lang), slugFromPath(to.path))
  } catch {
    // sem rede ou servidor: a rota troca e a página mostra "tentar de novo"
  }
}
