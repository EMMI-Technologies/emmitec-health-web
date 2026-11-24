/*
 * Rotas da documentação para desenvolvedores (/developers/...). Arquivo do site de docs:
 * só este arquivo muda quando entra uma página nova (o menu fica em src/lib/developers/nav.ts).
 *
 * - `bare`: as docs têm a própria barra no topo; o App não mostra o menu, o rodapé nem a
 *   tela de entrada do site.
 * - A página em Markdown é baixada ANTES de a rota trocar (beforeEnter aqui e
 *   onBeforeRouteUpdate no layout), então a troca acontece sem tela vazia.
 */
import type { RouteLocationNormalized, RouteRecordRaw } from 'vue-router'

// um import só (e não um por módulo): menos pontos de corte para o bundler no pedaço de abertura
const preloadDoc = async (to: RouteLocationNormalized) =>
  (await import('../lib/developers/preload')).preloadDoc(to)

export const developerRoutes: RouteRecordRaw[] = [
  {
    path: '/developers',
    component: () => import('../views/developers/DevelopersLayout.vue'),
    meta: { bare: true, docs: true },
    beforeEnter: preloadDoc,
    children: [
      {
        path: '',
        name: 'developers',
        component: () => import('../views/developers/DocPageView.vue'),
      },
      { path: 'overview', redirect: '/developers' },
      { path: 'expo-sdk', redirect: '/developers/sdk' },
      { path: 'reference', redirect: '/developers/api-reference' },
      {
        path: 'api-reference',
        name: 'developers-api-reference',
        component: () => import('../views/developers/ApiReferenceView.vue'),
      },
      {
        path: ':slug',
        name: 'developers-page',
        component: () => import('../views/developers/DocPageView.vue'),
      },
      {
        path: ':pathMatch(.*)*',
        name: 'developers-not-found',
        component: () => import('../views/developers/DocPageView.vue'),
      },
    ],
  },
]
