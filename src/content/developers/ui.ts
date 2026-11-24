/*
 * Textos da interface das docs (/developers), em inglês e português.
 * Fica fora de src/i18n/locales de propósito: as docs têm só EN e PT e carregam
 * junto com o pedaço (chunk) das docs, sem pesar no site.
 */
import type { DocsLang } from '@/lib/developers/types'

export const UI = {
  en: {
    developers: 'Developers',
    home: 'EmmiTec home',
    search: 'Search docs',
    searchPlaceholder: 'Search pages, sections and endpoints',
    searchEmpty: 'No results for',
    searchHint: 'Try "webhook", "session token" or "simulate".',
    searchNavigate: 'to navigate',
    searchOpen: 'to open',
    searchClose: 'to close',
    apiReference: 'API reference',
    getKeys: 'Get API keys',
    onThisPage: 'On this page',
    previous: 'Previous',
    next: 'Next',
    menu: 'Menu',
    close: 'Close',
    language: 'Language',
    copied: 'Copied',
    copy: 'Copy',
    downloads: 'Downloads',
    openapi: 'OpenAPI (JSON)',
    postman: 'Postman collection',
    notFoundTitle: 'Page not found',
    notFoundText: 'This page does not exist or was moved. Pick a page in the menu or start with the overview.',
    notFoundCta: 'Go to the overview',
    loading: 'Loading',
    footerQuestions: 'Questions about the integration?',
    footerContact: 'Write to',
    otherLanguage: 'Português',
    referenceIntro: 'Every endpoint of the Partner API v1. Use "Test request" with a test key (emk_test_...) to call the API from your browser.',
    referenceLoading: 'Loading the API reference',
    referenceError: 'The API reference could not be loaded. Download the OpenAPI file instead:',
  },
  pt: {
    developers: 'Developers',
    home: 'Início da EmmiTec',
    search: 'Buscar na documentação',
    searchPlaceholder: 'Busque páginas, seções e endpoints',
    searchEmpty: 'Nada encontrado para',
    searchHint: 'Tente "webhook", "token de sessão" ou "simular".',
    searchNavigate: 'para navegar',
    searchOpen: 'para abrir',
    searchClose: 'para fechar',
    apiReference: 'Referência da API',
    getKeys: 'Pedir chaves de API',
    onThisPage: 'Nesta página',
    previous: 'Anterior',
    next: 'Próxima',
    menu: 'Menu',
    close: 'Fechar',
    language: 'Idioma',
    copied: 'Copiado',
    copy: 'Copiar',
    downloads: 'Downloads',
    openapi: 'OpenAPI (JSON)',
    postman: 'Coleção do Postman',
    notFoundTitle: 'Página não encontrada',
    notFoundText: 'Esta página não existe ou mudou de lugar. Escolha uma página no menu ou comece pela visão geral.',
    notFoundCta: 'Ir para a visão geral',
    loading: 'Carregando',
    footerQuestions: 'Dúvidas sobre a integração?',
    footerContact: 'Escreva para',
    otherLanguage: 'English',
    referenceIntro: 'Todos os endpoints da Partner API v1. Use "Test request" com uma chave de teste (emk_test_...) para chamar a API direto do navegador.',
    referenceLoading: 'Carregando a referência da API',
    referenceError: 'Não foi possível carregar a referência. Baixe o arquivo OpenAPI:',
  },
} satisfies Record<DocsLang, Record<string, string>>

export type UiKey = keyof (typeof UI)['en']

export const KEYS_MAILTO = 'mailto:contato@emmitec.health?subject=EmmiTec%20Partner%20API%20keys'
export const OPENAPI_URL = '/developers/openapi.json'
export const POSTMAN_URL = '/developers/emmitec-partner-api.postman_collection.json'
export const API_BASE_URL = 'https://v2-prod-api-patients.emmitec.health/partner/v1'
