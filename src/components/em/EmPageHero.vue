<script setup lang="ts">
/**
 * Hero das páginas internas: raios de luz vindos de cima (o Início tem o gradiente líquido),
 * trilha de navegação (Início / … / página), título que entra palavra a palavra e a faixa
 * de meta (texto · rolar · ações), um pouco mais baixo.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import EmHeroRays from './EmHeroRays.vue'
import EmSplit from './EmSplit.vue'

type Crumb = { label: string; to?: string }

const props = withDefaults(
  defineProps<{
    /** item atual da trilha (nome da página ou categoria) */
    eyebrow: string
    title: string
    em?: string
    subtitle?: string
    /** níveis entre o Início e a página atual (ex.: Blog, Sobre nós) */
    trail?: Crumb[]
  }>(),
  { em: '', subtitle: '', trail: () => [] },
)

const { t } = useI18n()

const crumbs = computed<Crumb[]>(() => [{ label: t('header.nav.home'), to: '/' }, ...props.trail])
</script>

<template>
  <header class="em-hero em-hero--page" :class="{ 'em-hero--visual': !!$slots.visual }">
    <EmHeroRays />
    <!-- arte opcional à direita (ex.: celulares na página de Aplicativos) -->
    <div v-if="$slots.visual" class="em-hero__visual" aria-hidden="true">
      <div v-reveal:scale="500"><slot name="visual" /></div>
    </div>
    <div v-parallax.fade="0.14" class="em-hero__inner">
      <nav v-reveal="100" class="em-crumbs" :aria-label="t('aria.breadcrumb')">
        <template v-for="c in crumbs" :key="c.label">
          <RouterLink v-if="c.to" :to="c.to">{{ c.label }}</RouterLink>
          <span v-else>{{ c.label }}</span>
          <span class="em-crumbs__sep" aria-hidden="true">/</span>
        </template>
        <span aria-current="page">{{ eyebrow }}</span>
      </nav>
      <!-- slot `title`: troca o título (ex.: esqueleto enquanto o conteúdo carrega) -->
      <slot name="title">
        <EmSplit tag="h1" class="em-hero__title" :text="title" :em="em" :delay="200" />
      </slot>
      <div class="em-hero__meta">
        <div v-reveal="900">
          <p v-if="subtitle">{{ subtitle }}</p>
          <slot name="lead" />
        </div>
        <span v-reveal="1100" class="em-hero__scroll">{{ t('hero.scroll') }}<i /></span>
        <div v-reveal="1000" class="em-hero__actions">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </header>
</template>
