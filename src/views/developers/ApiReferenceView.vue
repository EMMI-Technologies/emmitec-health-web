<script setup lang="ts">
/**
 * Referência interativa da Partner API, desenhada a partir de /developers/openapi.json
 * com o @scalar/api-reference. Só esta rota baixa o Scalar (ver o comentário abaixo).
 *
 * "Test request" chama a API direto do navegador (a API responde CORS * em /partner/v1):
 * sem proxy de terceiros, sem fontes externas, sem telemetria, sem agente/MCP do Scalar e
 * sem guardar a chave digitada.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useDocsLang } from '@/lib/developers/lang'
import { usePageMeta } from '@/lib/seo'
import type { ApiReferenceConfiguration } from '@scalar/api-reference'
import { API_BASE_URL, OPENAPI_URL, POSTMAN_URL } from '@/content/developers/ui'

const { t } = useDocsLang()
const host = ref<HTMLElement | null>(null)
const state = ref<'loading' | 'ready' | 'failed'>('loading')

usePageMeta(() => ({
  title: 'API reference | Developers',
  description:
    'Interactive reference of the EmmiTec Partner API v1: patients, session tokens, readings, alerts, devices, webhooks and sandbox helpers.',
}))

/*
 * O Scalar vem do build de navegador dele (Vue próprio, CSS próprio), publicado em
 * /developers/scalar/<versão>/ pelo plugin src/lib/developers/build/scalar-plugin.mjs. Ele monta um app
 * separado (createApiReference) e tira o próprio CSS ao ser destruído: nada vaza para o site.
 */
type ScalarInstance = { destroy: () => void }
type ScalarModule = { createApiReference: (el: Element, config: Record<string, unknown>) => ScalarInstance }

let instance: ScalarInstance | null = null
let alive = true

onMounted(async () => {
  try {
    const mod = (await import(/* @vite-ignore */ `${__SCALAR_BASE__}standalone.esm.js`)) as ScalarModule
    if (!alive || !host.value) return
    instance = mod.createApiReference(host.value, configuration as Record<string, unknown>)
    state.value = 'ready'
  } catch {
    state.value = 'failed'
  }
})

onBeforeUnmount(() => {
  alive = false
  instance?.destroy()
  instance = null
})

const customCss = `
.scalar-app {
  --scalar-font: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
  --scalar-font-code: ui-monospace, 'SFMono-Regular', 'Cascadia Code', Menlo, Consolas, monospace;
  --scalar-custom-header-height: var(--dx-top-h, 64px);
  --scalar-radius: 8px;
  --scalar-radius-lg: 12px;
  --scalar-radius-xl: 14px;
}
.light-mode {
  --scalar-color-1: #202220;
  --scalar-color-2: #4a5565;
  --scalar-color-3: #5d6876;
  --scalar-color-accent: #08777b;
  --scalar-background-1: #ffffff;
  --scalar-background-2: #f6f8f9;
  --scalar-background-3: #eceff2;
  --scalar-background-accent: #e4f7f7;
  --scalar-border-color: #e3e7eb;
  --scalar-color-green: #127a52;
  --scalar-color-blue: #08777b;
  --scalar-color-orange: #9a5b00;
  --scalar-color-yellow: #8a6a00;
  --scalar-color-red: #b13a2a;
  --scalar-color-purple: #6b4fc4;
  --scalar-button-1: #0e1117;
  --scalar-button-1-color: #ffffff;
  --scalar-button-1-hover: #252a33;
  --scalar-sidebar-background-1: #ffffff;
  --scalar-sidebar-color-1: #202220;
  --scalar-sidebar-color-2: #4a5565;
  --scalar-sidebar-border-color: #e3e7eb;
  --scalar-sidebar-item-hover-background: #f3f5f6;
  --scalar-sidebar-item-hover-color: #202220;
  --scalar-sidebar-item-active-background: #e4f7f7;
  --scalar-sidebar-color-active: #08777b;
  --scalar-sidebar-search-background: #f6f8f9;
  --scalar-sidebar-search-border-color: #e3e7eb;
  --scalar-sidebar-search-color: #5d6876;
}
`

// o "Ask AI" (agent) vale por documento e liga sozinho em localhost: sempre desligado
const configuration: Partial<ApiReferenceConfiguration> & { agent?: { disabled?: boolean } } = {
  agent: { disabled: true },
  url: OPENAPI_URL,
  servers: [{ url: API_BASE_URL, description: 'Test and live (the key decides the mode)' }],
  layout: 'modern',
  theme: 'default',
  customCss,
  withDefaultFonts: false,
  forceDarkModeState: 'light',
  hideDarkModeToggle: true,
  showDeveloperTools: 'never',
  documentDownloadType: 'json',
  urlRouting: false,
  persistAuth: false,
  telemetry: false,
  mcp: { disabled: true },
  hideClientButton: true,
  operationTitleSource: 'summary',
  orderRequiredPropertiesFirst: true,
  defaultHttpClient: { targetKey: 'shell', clientKey: 'curl' },
  featuredClients: ['shell/curl', 'node/fetch', 'python/requests', 'js/fetch'],
  authentication: { preferredSecurityScheme: 'bearerAuth' },
  metaData: { title: 'API reference | EmmiTec Developers' },
}
</script>

<template>
  <div class="dx-ref">
    <p class="dx-ref__note">
      {{ t('referenceIntro') }}
      <a :href="OPENAPI_URL" download="emmitec-partner-api-openapi.json">{{ t('openapi') }}</a>
      <span aria-hidden="true">·</span>
      <a :href="POSTMAN_URL" download="emmitec-partner-api.postman_collection.json">{{ t('postman') }}</a>
    </p>
    <p v-if="state === 'failed'" class="dx-ref__loading">
      {{ t('referenceError') }} <a :href="OPENAPI_URL">{{ OPENAPI_URL }}</a>
    </p>
    <p v-else-if="state === 'loading'" class="dx-ref__loading">{{ t('referenceLoading') }}</p>
    <div ref="host" class="dx-ref__host" />
  </div>
</template>
