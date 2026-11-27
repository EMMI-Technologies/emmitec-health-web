/*
 * Estado do portal do cliente: sessão, usuário, integração e o que a tela mostra.
 * Um módulo só (a página é uma só); as seções leem e atualizam daqui.
 *
 * Fases: boot (conferindo a sessão guardada) -> login -> password (senha temporária) -> app.
 */
import { reactive } from 'vue'
import {
  clearSession,
  portalApi,
  PortalError,
  readSession,
  saveSession,
  setUnauthorizedHandler,
  type Mode,
  type PortalIntegration,
  type PortalMode,
  type PortalUser,
} from './api'
import { usePortalLang, type PortalKeyName } from './i18n'

export type Phase = 'boot' | 'bootError' | 'login' | 'password' | 'app'
export type SectionId = 'overview' | 'keys' | 'alerts' | 'thresholds' | 'events' | 'sdk' | 'password'
export const SECTIONS: SectionId[] = [
  'overview',
  'keys',
  'alerts',
  'thresholds',
  'events',
  'sdk',
  'password',
]

export const portal = reactive({
  phase: 'boot' as Phase,
  user: null as PortalUser | null,
  integration: null as PortalIntegration | null,
  /** aviso na tela de login (sessão vencida ou saída) */
  notice: '' as '' | 'sessionEnded' | 'signedOut',
  bootError: null as PortalError | null,
  /** ambiente escolhido nas seções por ambiente (vale para todas) */
  mode: 'test' as Mode,
  /**
   * senha digitada no login, só em memória: a troca obrigatória da senha temporária não pede
   * a senha atual de novo. Some depois da troca, no "Sair" e ao recarregar a página.
   */
  loginPassword: '',
})

/** Segredos já buscados nesta sessão (chave -> segredo), só em memória. */
export const secrets = reactive(new Map<string, string>())

/** Quem guarda algo da sessão fora daqui (as docs) registra como limpar; roda no "Sair" e em qualquer 401. */
const resetHooks = new Set<() => void>()
export function onSessionReset(fn: () => void) {
  resetHooks.add(fn)
}

function reset() {
  portal.user = null
  portal.integration = null
  portal.loginPassword = ''
  portal.mode = 'test'
  secrets.clear()
  for (const fn of resetHooks) fn()
}

setUnauthorizedHandler(() => {
  if (portal.phase === 'login') return
  reset()
  portal.notice = 'sessionEnded'
  portal.phase = 'login'
})

function enter(user: PortalUser, integration: PortalIntegration) {
  portal.user = user
  portal.integration = integration
  portal.phase = user.mustChangePassword ? 'password' : 'app'
}

/** Sessão já aberta nesta aba (pelo portal ou pelas docs, que dividem o estado). */
export const signedIn = () => portal.phase === 'app' || portal.phase === 'password'

/** Ao abrir a página: sessão guardada e válida vai direto para dentro. */
export async function boot() {
  if (!readSession()) {
    portal.phase = 'login'
    return
  }
  portal.phase = 'boot'
  portal.bootError = null
  try {
    const me = await portalApi.me()
    enter(me.user, me.integration)
  } catch (e) {
    if (e instanceof PortalError && e.status === 401) return // o handler já levou ao login
    portal.bootError =
      e instanceof PortalError ? e : new PortalError({ status: 0, code: 'network' })
    portal.phase = 'bootError'
  }
}

export async function login(email: string, password: string) {
  const r = await portalApi.login(email, password)
  saveSession({ token: r.token, expiresAt: r.expiresAt })
  portal.notice = ''
  portal.loginPassword = r.user.mustChangePassword ? password : ''
  enter(r.user, r.integration)
}

export async function logout() {
  try {
    await portalApi.logout()
  } catch {
    // a sessão some do navegador de qualquer jeito
  }
  clearSession()
  reset()
  portal.notice = 'signedOut'
  portal.phase = 'login'
}

/** Busca de novo usuário e integração (números, chaves, webhook). */
export async function refreshMe() {
  const me = await portalApi.me()
  portal.user = me.user
  portal.integration = me.integration
}

export function modeData(mode: Mode): PortalMode | null {
  const i = portal.integration
  if (!i) return null
  return mode === 'live' ? i.modes.live : i.modes.test
}

/* ---------- avisos rápidos (salvo, copiado...) ---------- */

export const toast = reactive({ text: '', kind: 'ok' as 'ok' | 'error', n: 0 })
let toastT = 0
export function showToast(text: string, kind: 'ok' | 'error' = 'ok') {
  toast.text = text
  toast.kind = kind
  toast.n++
  window.clearTimeout(toastT)
  toastT = window.setTimeout(() => (toast.text = ''), 2800)
}

/* ---------- texto de erro ---------- */

export interface ErrorView {
  message: string
  requestId: string | null
}

/** Mensagem curta no idioma do portal; códigos conhecidos ganham texto próprio. */
export function errorView(
  e: unknown,
  overrides: Partial<Record<string, PortalKeyName>> = {},
): ErrorView {
  const { t } = usePortalLang()
  if (!(e instanceof PortalError)) return { message: t('err.server'), requestId: null }
  const byStatus = overrides[String(e.status)]
  const byCode = overrides[e.code]
  if (byCode) return { message: t(byCode), requestId: e.requestId }
  if (byStatus) return { message: t(byStatus), requestId: e.requestId }
  if (e.code === 'timeout') return { message: t('err.timeout'), requestId: null }
  if (e.isNetwork) return { message: t('err.network'), requestId: null }
  if (e.status === 429) return { message: t('err.rate'), requestId: e.requestId }
  if (e.status === 403)
    return {
      message: e.message && e.message !== e.code ? e.message : t('err.forbidden'),
      requestId: e.requestId,
    }
  if (e.status >= 500) return { message: t('err.server'), requestId: e.requestId }
  if (e.status === 404 && (!e.message || e.message === e.code))
    return { message: t('err.notFound'), requestId: e.requestId }
  return {
    message: e.message && e.message !== e.code ? e.message : t('err.server'),
    requestId: e.requestId,
  }
}

/* ---------- datas e números ---------- */

const LOC = { pt: 'pt-BR', en: 'en-US' } as const

export function useFormat() {
  const { lang } = usePortalLang()
  const loc = () => LOC[lang.value]
  return {
    date(iso: string | null | undefined) {
      if (!iso) return ''
      return new Intl.DateTimeFormat(loc(), {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(iso))
    },
    shortDate(iso: string | null | undefined) {
      if (!iso) return ''
      return new Intl.DateTimeFormat(loc(), {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(iso))
    },
    dateTime(iso: string | null | undefined) {
      if (!iso) return ''
      return new Intl.DateTimeFormat(loc(), {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso))
    },
    relative(iso: string | null | undefined) {
      if (!iso) return ''
      const diff = (Date.parse(iso) - Date.now()) / 1000
      const rtf = new Intl.RelativeTimeFormat(loc(), { numeric: 'auto' })
      const abs = Math.abs(diff)
      if (abs < 60) return rtf.format(Math.round(diff), 'second')
      if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
      if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
      if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day')
      return new Intl.DateTimeFormat(loc(), {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(iso))
    },
    num(n: number, minFrac = 0) {
      return new Intl.NumberFormat(loc(), { minimumFractionDigits: minFrac }).format(n)
    },
  }
}

/** Copia texto (com fallback para navegadores sem a API de área de transferência). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

/** Link para as docs no idioma do portal. */
export function docsHref(slug = '') {
  const { lang } = usePortalLang()
  return `/developers${slug ? `/${slug}` : ''}?lang=${lang.value}`
}

export const SUPPORT_EMAIL = 'contato@emmitec.health'
