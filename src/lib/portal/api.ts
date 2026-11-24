/*
 * Portal do cliente (/portal): cliente HTTP da API do portal.
 * Fonte da verdade: docs/integracao/partner-api-v1-contrato.md, seção 8.4 (rotas e formatos),
 * seção 5 (Key, Webhook, Event) e seção 3 (formato de erro).
 *
 * Sessão: `Authorization: Bearer empt_...` (12 h). O token fica no sessionStorage (some ao
 * fechar a aba), sai no "Sair" e em qualquer 401.
 */

export type Mode = 'test' | 'live'
export type WebhookLocale = 'en' | 'pt' | 'es'
export type PlanName = 'trial' | 'active' | 'suspended'

export interface PortalKey {
  id: string
  mode: Mode
  label: string
  /** ex.: "emk_live_Ab3x" */
  prefix: string
  createdAt: string
  createdBy: string | null
  lastUsedAt: string | null
  revokedAt: string | null
  revealable: boolean
}

export interface PortalWebhook {
  mode: Mode
  url: string
  events: string[]
  locale: WebhookLocale
  active: boolean
  secretHint: string
  createdAt: string
  updatedAt: string
}

export interface PortalStats {
  patients: number
  readings30d: number
  alerts30d: number
  eventsFailed7d: number
}

export interface PortalMode {
  alertsEnabled: boolean
  keys: PortalKey[]
  webhook: PortalWebhook | null
  stats: PortalStats
}

export interface PortalIntegration {
  id: string
  name: string
  active: boolean
  plan: {
    name: PlanName
    trialEndsAt: string | null
    daysLeft: number | null
    module: 'rpm'
  }
  liveClient: { name: string } | null
  modes: { test: PortalMode; live: PortalMode | null }
}

export interface PortalUser {
  email: string
  name: string
  mustChangePassword: boolean
}

export interface PortalEvent {
  id: string
  mode: Mode
  type: string
  status: 'pending' | 'delivered' | 'failed'
  attempts: number
  lastStatusCode: number | null
  lastError: string | null
  createdAt: string
  deliveredAt: string | null
  nextAttemptAt: string | null
}

export interface Threshold {
  type: string
  value: string
  unit: string
  criticalHigh: number | null
  attentionHigh: number | null
  attentionLow: number | null
  criticalLow: number | null
  source: 'default' | 'patient'
}

export interface WebhookTestResult {
  delivered: boolean
  statusCode: number | null
  durationMs: number | null
  eventId: string | null
  error: string | null
}

export interface LoginResult {
  token: string
  expiresAt: string
  user: PortalUser
  integration: PortalIntegration
}

/* ---------- erro no formato da seção 3 ---------- */

export class PortalError extends Error {
  status: number
  type: string
  code: string
  param: string | null
  requestId: string | null
  retryAfter: number | null

  constructor(p: {
    status: number
    type?: string
    code: string
    message?: string
    param?: string | null
    requestId?: string | null
    retryAfter?: number | null
  }) {
    super(p.message || p.code)
    this.name = 'PortalError'
    this.status = p.status
    this.type = p.type ?? ''
    this.code = p.code
    this.param = p.param ?? null
    this.requestId = p.requestId ?? null
    this.retryAfter = p.retryAfter ?? null
  }

  /** Sem resposta do servidor (sem internet, CORS, tempo esgotado). */
  get isNetwork() {
    return this.status === 0
  }
}

/* ---------- endereço ---------- */

const DEFAULT_BASE = 'https://v2-prod-api-patients.emmitec.health/partner/v1/portal'
const ENV_BASE = (import.meta.env as Record<string, string | undefined>).VITE_PORTAL_API

export const PORTAL_API = (ENV_BASE || DEFAULT_BASE).replace(/\/+$/, '')

/* ---------- sessão (sessionStorage) ---------- */

const SESSION_KEY = 'emmitec.portal.session'

export interface Session {
  token: string
  expiresAt: string
}

export function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Partial<Session>
    if (!s.token) return null
    // sessão vencida não vale nem uma chamada
    if (s.expiresAt && Date.parse(s.expiresAt) <= Date.now()) {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    return { token: s.token, expiresAt: s.expiresAt ?? '' }
  } catch {
    return null
  }
}

export function saveSession(s: Session) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s))
  } catch {
    // sessionStorage bloqueado: a sessão vale só enquanto a página estiver aberta
  }
  memoryToken = s.token
}

export function clearSession() {
  memoryToken = null
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // nada a limpar
  }
}

let memoryToken: string | null = null
const token = () => memoryToken ?? readSession()?.token ?? null

/** Chamado em qualquer 401 de rota autenticada (a tela volta para o login). */
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

/* ---------- chamada ---------- */

interface Opts {
  body?: unknown
  /** rotas sem sessão (login) não derrubam a sessão no 401 */
  auth?: boolean
  timeoutMs?: number
  /** 401 que não é de sessão (ex.: senha atual errada na troca de senha) */
  soft401?: (e: PortalError) => boolean
}

async function request<T>(method: string, path: string, opts: Opts = {}): Promise<T> {
  const auth = opts.auth !== false
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  const tk = auth ? token() : null
  if (tk) headers.Authorization = `Bearer ${tk}`

  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 20000)
  let res: Response
  try {
    res = await fetch(PORTAL_API + path, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: ctrl.signal,
    })
  } catch {
    throw new PortalError({ status: 0, code: ctrl.signal.aborted ? 'timeout' : 'network' })
  } finally {
    window.clearTimeout(timer)
  }

  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    json = null
  }

  if (!res.ok) {
    const e = ((json as { error?: Record<string, unknown> } | null)?.error ?? {}) as Record<
      string,
      unknown
    >
    const retry = Number(res.headers.get('Retry-After'))
    const err = new PortalError({
      status: res.status,
      type: typeof e.type === 'string' ? e.type : undefined,
      code: typeof e.code === 'string' ? e.code : `http_${res.status}`,
      message: typeof e.message === 'string' ? e.message : undefined,
      param: typeof e.param === 'string' ? e.param : null,
      requestId:
        (typeof e.requestId === 'string' ? e.requestId : null) ?? res.headers.get('X-Request-Id'),
      retryAfter: Number.isFinite(retry) && retry > 0 ? retry : null,
    })
    if (res.status === 401 && auth && !opts.soft401?.(err)) {
      clearSession()
      onUnauthorized?.()
    }
    throw err
  }
  return json as T
}

/** Erro da troca de senha que aponta a senha atual (e não a sessão). */
export function isWrongCurrentPassword(e: PortalError) {
  return e.param === 'currentPassword' || /current\s*password/i.test(e.message)
}

/* ---------- rotas (seção 8.4) ---------- */

export const portalApi = {
  login: (email: string, password: string) =>
    request<LoginResult>('POST', '/login', { body: { email, password }, auth: false }),
  logout: () => request<{ ok: boolean }>('POST', '/logout', { timeoutMs: 6000 }),
  me: () => request<{ user: PortalUser; integration: PortalIntegration }>('GET', '/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: boolean }>('PUT', '/password', {
      body: { currentPassword, newPassword },
      // senha atual errada pode voltar 401: isso não encerra a sessão
      soft401: isWrongCurrentPassword,
    }),

  createKey: (mode: Mode, label: string) =>
    request<{ key: PortalKey; secret: string }>('POST', '/keys', { body: { mode, label } }),
  keySecret: (keyId: string) =>
    request<{ secret: string }>('GET', `/keys/${encodeURIComponent(keyId)}/secret`),

  saveWebhook: (mode: Mode, body: { url: string; events: string[]; locale: WebhookLocale }) =>
    request<{ webhook: PortalWebhook; secret: string | null }>('PUT', `/webhooks/${mode}`, {
      body,
    }),
  webhookSecret: (mode: Mode) => request<{ secret: string }>('GET', `/webhooks/${mode}/secret`),
  // o servidor espera até 10 s pela URL do parceiro
  testWebhook: (mode: Mode) =>
    request<WebhookTestResult>('POST', `/webhooks/${mode}/test`, { timeoutMs: 30000 }),

  saveSettings: (mode: Mode, alertsEnabled: boolean) =>
    request<{ mode: Mode; alertsEnabled: boolean }>('PUT', `/settings/${mode}`, {
      body: { alertsEnabled },
    }),

  events: (mode: Mode, limit = 50) =>
    request<{ data: PortalEvent[] }>('GET', `/events?mode=${mode}&limit=${limit}`),
  thresholds: (mode: Mode) => request<{ data: Threshold[] }>('GET', `/thresholds?mode=${mode}`),
}
