import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { scrollToEl, stopSmoothScroll } from '../lib/motion'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
    },
    {
      path: '/what-is-rpm',
      name: 'what-is-rpm',
      component: () => import('../views/WhatIsRpmView.vue'),
    },
    {
      path: '/benefits',
      name: 'benefits',
      component: () => import('../views/BenefitsView.vue'),
    },
    {
      path: '/apps',
      name: 'apps',
      component: () => import('../views/AppsView.vue'),
    },
    {
      path: '/blog',
      name: 'blog',
      component: () => import('../views/BlogView.vue'),
      // a página tem a própria newsletter no fim; o rodapé não repete
      meta: { footerNewsletter: false },
    },
    {
      path: '/blog/:id',
      name: 'blog-detail',
      component: () => import('../views/BlogDetailView.vue'),
    },
    {
      path: '/equipment',
      name: 'equipment',
      component: () => import('../views/EquipmentView.vue'),
    },
    {
      path: '/equipment/:id',
      name: 'equipment-detail',
      component: () => import('../views/EquipmentDetailView.vue'),
    },
    {
      path: '/privacy',
      name: 'privacy',
      component: () => import('../views/PrivacyView.vue'),
    },
    {
      // página de links (bio do Instagram e afins): sem menu, rodapé nem tela de entrada
      path: '/links',
      alias: '/linktree',
      name: 'links',
      component: () => import('../views/LinksView.vue'),
      meta: { bare: true },
    },
  ],
  // Toda navegação começa no topo (exceto voltar/avançar, que restaura a posição).
  // Âncoras (#id) usam a rolagem suave do Design System.
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) {
      if (to.path !== from.path) return { el: to.hash, top: 12 }
      const el = document.querySelector(to.hash)
      if (el) scrollToEl(el)
      return false
    }
    return { top: 0 }
  },
})

// Interrompe a rolagem amortecida em curso para não brigar com a troca de página
router.beforeEach(() => {
  stopSmoothScroll()
})

export default router
