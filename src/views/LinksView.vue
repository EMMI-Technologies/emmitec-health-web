<script setup lang="ts">
/**
 * Links — a "árvore de links" da Emmitec para a bio das redes (estilo Linktree),
 * no Design System do site: gradiente vivo no topo, perfil, atalhos em cards,
 * redes sociais e endereços. Abre sem menu, rodapé e tela de entrada (meta `bare`).
 */
import { computed, ref, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import {
  ArrowUpRight,
  CalendarCheck,
  Globe,
  LogIn,
  Mail,
  MapPin,
  Newspaper,
  Share2,
  Smartphone,
} from 'lucide-vue-next'

import logoMark from '@/assets/about/logo-emmitec-circle.png'
import EmHeroGradient from '@/components/em/EmHeroGradient.vue'
import IconWhatsapp from '@/components/icons/IconWhatsapp.vue'
import { setLocale } from '@/i18n'
import {
  CONTACT_EMAIL,
  PLATFORM_URL,
  addresses,
  calendlyUrl,
  languages,
  socialLinks,
  whatsapp,
} from '@/lib/site'

const { t, locale } = useI18n()

type Item = {
  key: string
  icon: Component
  title: string
  note: string
  to?: string
  href?: string
  primary?: boolean
}

const links = computed<Item[]>(() => [
  {
    key: 'demo',
    icon: CalendarCheck,
    title: t('hero.button.demo'),
    note: t('linksPage.links.demo'),
    href: calendlyUrl.value,
    primary: true,
  },
  {
    key: 'platform',
    icon: LogIn,
    title: t('linksPage.links.platform'),
    note: PLATFORM_URL.replace(/^https?:\/\//, ''),
    href: PLATFORM_URL,
  },
  {
    key: 'whatsapp',
    icon: IconWhatsapp,
    title: t('linksPage.links.whatsapp'),
    note: whatsapp.display,
    href: whatsapp.href,
  },
  { key: 'site', icon: Globe, title: t('linksPage.links.site'), note: 'emmitec.health', to: '/' },
  {
    key: 'apps',
    icon: Smartphone,
    title: t('linksPage.links.apps'),
    note: t('linksPage.links.appsNote'),
    to: '/apps',
  },
  {
    key: 'blog',
    icon: Newspaper,
    title: t('linksPage.links.blog'),
    note: t('linksPage.links.blogNote'),
    to: '/blog',
  },
  {
    key: 'email',
    icon: Mail,
    title: t('linksPage.links.email'),
    note: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
  },
])

/** Atributos do link: rota interna, ou externa em nova aba (mailto fica na mesma). */
function linkAttrs(l: Item) {
  if (l.to) return { to: l.to }
  return /^https?:/.test(l.href ?? '')
    ? { href: l.href, target: '_blank', rel: 'noopener noreferrer' }
    : { href: l.href }
}

const socials = computed(() => [
  ...socialLinks,
  { name: 'WhatsApp', href: whatsapp.href, icon: IconWhatsapp },
])

const offices = computed(() =>
  addresses.map((a) => ({
    ...a,
    label: t(`footer.countries.${a.country}`),
    map: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.text)}`,
  })),
)

/* ── compartilhar a página (menu nativo ou cópia do link) ── */
const copied = ref(false)
let copiedT = 0
async function share() {
  const url = window.location.href
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'Emmitec Health', url })
    } catch {
      // cancelado pelo usuário
    }
    return
  }
  try {
    await navigator.clipboard.writeText(url)
    copied.value = true
    window.clearTimeout(copiedT)
    copiedT = window.setTimeout(() => (copied.value = false), 2200)
  } catch {
    // sem permissão de área de transferência
  }
}
</script>

<template>
  <div class="em-linktree">
    <div class="em-linktree__bg" aria-hidden="true"><EmHeroGradient /></div>

    <div class="em-linktree__inner">
      <div v-reveal class="em-linktree__bar">
        <div class="em-lang" role="group" :aria-label="t('header.nav.language')">
          <button
            v-for="lang in languages"
            :key="lang.code"
            type="button"
            class="em-lang__btn"
            :class="{ 'is-active': locale === lang.code }"
            :aria-pressed="locale === lang.code ? 'true' : 'false'"
            @click="setLocale(lang.code)"
          >
            <img class="em-lang__flag" :src="lang.flag" alt="" width="16" height="12" />{{
              lang.label
            }}
          </button>
        </div>
        <button type="button" class="em-linktree__share" @click="share">
          <Share2 :stroke-width="1.8" aria-hidden="true" />
          <span aria-live="polite">{{
            copied ? t('blogPage.detail.copied') : t('equipmentPage.detail.share')
          }}</span>
        </button>
      </div>

      <header class="em-linktree__profile">
        <span v-reveal:scale="80" class="em-linktree__avatar">
          <img :src="logoMark" alt="" width="96" height="96" />
        </span>
        <h1 v-reveal="160" class="em-linktree__name">Emmitec <i class="em-serif">Health</i></h1>
        <p v-reveal="220" class="em-linktree__bio">{{ t('linksPage.bio') }}</p>
        <nav v-reveal="280" class="em-linktree__social" :aria-label="t('linksPage.social')">
          <a
            v-for="s in socials"
            :key="s.name"
            :href="s.href"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="s.name"
            :title="s.name"
          >
            <component :is="s.icon" :stroke-width="1.7" aria-hidden="true" />
          </a>
        </nav>
      </header>

      <nav class="em-linktree__list" aria-label="Emmitec Health">
        <component
          :is="l.to ? RouterLink : 'a'"
          v-for="(l, i) in links"
          :key="l.key"
          v-reveal="320 + i * 60"
          v-bind="linkAttrs(l)"
          class="em-linktree__item"
          :class="{ 'em-linktree__item--primary': l.primary }"
        >
          <span class="em-ico" :class="{ 'em-ico--brand': l.primary }"
            ><component :is="l.icon" :stroke-width="1.7" aria-hidden="true"
          /></span>
          <span class="em-linktree__txt">
            <b>{{ l.title }}</b>
            <small>{{ l.note }}</small>
          </span>
          <span class="em-linktree__go" aria-hidden="true"
            ><ArrowUpRight :stroke-width="2" aria-hidden="true"
          /></span>
        </component>
      </nav>

      <section v-reveal class="em-linktree__offices em-card">
        <span class="em-eyebrow">{{ t('footer.addressTitle') }}</span>
        <ul>
          <li v-for="o in offices" :key="o.country">
            <MapPin :stroke-width="1.7" aria-hidden="true" />
            <span>
              <strong>{{ o.label }}</strong>
              <address>{{ o.text }}</address>
              <a :href="o.map" target="_blank" rel="noopener noreferrer"
                >{{ t('linksPage.map') }}<ArrowUpRight :stroke-width="2" aria-hidden="true"
              /></a>
            </span>
          </li>
        </ul>
      </section>

      <footer class="em-linktree__foot">
        <span>© 2026 Emmitec Health</span>
        <RouterLink to="/privacy">{{ t('footer.links.privacyTerms') }}</RouterLink>
      </footer>
    </div>
  </div>
</template>
