/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base da API do BackOffice, terminando em /v1 e sem barra no fim. */
  readonly VITE_API_BASE_URL?: string
  /** Base pública das imagens (CDN do prefixo public/ do bucket). */
  readonly VITE_ASSETS_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.json' {
  const value: Record<string, unknown>
  export default value
}
