/*
 * Quem lê as docs (/developers): quem tem sessão do portal do cliente. Mesma conta, mesmo token, mesmo estado
 * (lib/portal/store): a sessão guardada é conferida no servidor, o login da entrada abre, qualquer 401 fecha.
 * Spec: docs/specs/2026/q4/q4-2/docs-de-parceiros-so-com-login.md.
 */
import { computed } from 'vue'
import { readSession } from '@/lib/portal/api'
import { boot, logout, portal } from '@/lib/portal/store'
import { clearDocs } from './pages'
import { clearIndex } from './search'

/** Documentação liberada (a troca obrigatória de senha do portal não impede a leitura). */
export const docsOpen = computed(() => portal.phase === 'app' || portal.phase === 'password')

/** Conferindo a sessão guardada no servidor. */
export const docsChecking = computed(() => portal.phase === 'boot')

export const hasSession = () => !!readSession()

/** Ao entrar nas docs: sessão guardada vale (confere no servidor); sem sessão, a entrada. */
export async function checkAccess() {
  if (docsOpen.value) return
  if (!hasSession()) {
    portal.phase = 'login'
    return
  }
  await boot()
}

/** Sair pelas docs: encerra a sessão do portal e esquece as páginas baixadas. */
export async function leaveDocsAccess() {
  await logout()
  clearDocs()
  clearIndex()
}
