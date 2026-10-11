<script setup lang="ts">
/**
 * Benefícios do RPM — Design System Emmitec.health, com o conteúdo de sempre (pt/en/es).
 * Bento para o paciente, painel vivo para a instituição, números em odômetro e o
 * comparativo tradicional × RPM.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, Gauge, Minus } from 'lucide-vue-next'

import imgCasa from '@/assets/home/servicos/01-sinais-vitais.jpg'

import EmPageHero from '@/components/em/EmPageHero.vue'
import EmButton from '@/components/em/EmButton.vue'
import EmSplit from '@/components/em/EmSplit.vue'
import EmOdometer from '@/components/em/EmOdometer.vue'
import EmPerkArt from '@/components/em/EmPerkArt.vue'
import EmRpmPanel from '@/components/em/EmRpmPanel.vue'
import EmVitalRow from '@/components/em/EmVitalRow.vue'
import EmCta from '@/components/em/EmCta.vue'
import { calendlyUrl } from '@/lib/site'

const { t, te } = useI18n()

const pad = (n: number) => String(n).padStart(2, '0')

/* ── (01) Paciente: cada card ganha uma arte viva ── */
const PERKS = ['home', 'clock', 'week', 'bond'] as const
const patient = computed(() =>
  PERKS.map((kind, i) => ({
    kind,
    title: t(`benefitsPage.patient.card${i + 1}.title`),
    desc: t(`benefitsPage.patient.card${i + 1}.desc`),
  })),
)

/* ── (02) Instituição ── */
const clinicItems = computed(() => [1, 2, 3, 4, 5].map((n) => t(`benefitsPage.clinic.item${n}`)))

/* ── (03) Números ── */
const stats = computed(() => [
  { sign: '-', num: '38', suffix: '%', label: t('benefitsPage.stats.readmissions') },
  { sign: '+', num: '62', suffix: '%', label: t('benefitsPage.stats.adherence') },
  { sign: '', num: '4.8', suffix: '/5', label: t('benefitsPage.stats.satisfaction') },
  { sign: '', num: '24', suffix: '/7', label: t('benefitsPage.stats.monitoring') },
])

/* ── (04) Comparativo ──
   Linhas com `rowNboth` têm um texto só, que ocupa as duas colunas (o RPM complementa,
   não substitui, o cuidado tradicional). As demais seguem tradicional × RPM. */
const comparison = computed(() =>
  [1, 2, 3, 4, 5].map((n) => {
    const key = `benefitsPage.comparison.row${n}`
    return {
      label: t(key),
      both: te(`${key}both`) ? t(`${key}both`) : '',
      traditional: te(`${key}trad`) ? t(`${key}trad`) : '',
      rpm: te(`${key}rpm`) ? t(`${key}rpm`) : '',
    }
  }),
)
</script>

<template>
  <div class="em-benefits-page">
    <!-- ════════ HERO ════════ -->
    <EmPageHero
      :eyebrow="t('benefitsPage.hero.badge')"
      :trail="[{ label: t('header.nav.about') }]"
      :title="t('benefitsPage.hero.title')"
      :em="t('benefitsPage.hero.titleEm')"
      :subtitle="t('benefitsPage.hero.subtitle')"
    >
      <template #actions>
        <EmButton :href="calendlyUrl" :label="t('benefitsPage.hero.button.primary')" />
        <EmButton
          to="/blog?category=cases"
          variant="ghost"
          :label="t('benefitsPage.hero.button.secondary')"
        />
      </template>
    </EmPageHero>

    <!-- ════════ (01) PARA O PACIENTE ════════ -->
    <section id="paciente" class="em-section">
      <div class="em-wrap">
        <div class="em-head">
          <div>
            <span v-reveal class="em-eyebrow">{{ t('benefitsPage.patient.badge') }}</span>
            <EmSplit
              :text="t('benefitsPage.patient.title')"
              :em="t('benefitsPage.patient.titleEm')"
            />
          </div>
          <p v-reveal="150">{{ t('benefitsPage.patient.subtitle') }}</p>
        </div>

        <div class="em-bento">
          <figure v-reveal:scale class="em-bento__photo em-story__art">
            <img
              class="em-story__photo"
              :src="imgCasa"
              :alt="t('benefitsPage.patient.card1.title')"
              loading="lazy"
              width="900"
              height="700"
            />
            <span class="em-story__shade" />
            <span class="em-chip em-chip--glass em-bento__live"
              ><span class="em-dot em-dot--live" />{{
                t('benefitsPage.clinic.dashboard.live')
              }}</span
            >
            <figcaption class="em-bento__vital">
              <EmVitalRow
                :icon="Gauge"
                :label="t('hero.live.bp')"
                :status="t('home.status.normal')"
                :base="118"
                :amp="4"
                suffix="/76"
                unit="mmHg"
                :seed="2"
              />
            </figcaption>
          </figure>
          <article
            v-for="(c, i) in patient"
            :key="c.kind"
            v-reveal="i * 90"
            v-spot
            class="em-bento__card em-card em-card--lift"
            :class="`em-bento__card--${c.kind}`"
          >
            <span class="em-bento__n">({{ pad(i + 1) }})</span>
            <EmPerkArt :kind="c.kind" :days="t('home.days')" />
            <h3>{{ c.title }}</h3>
            <p>{{ c.desc }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- ════════ (02) PARA A INSTITUIÇÃO ════════ -->
    <section id="instituicao" class="em-section em-section--tint">
      <div class="em-wrap em-def">
        <div class="em-def__txt">
          <span v-reveal class="em-eyebrow">{{ t('benefitsPage.clinic.badge') }}</span>
          <EmSplit
            class="em-h2"
            :text="t('benefitsPage.clinic.title')"
            :em="t('benefitsPage.clinic.titleEm')"
          />
          <p v-reveal="120" class="em-def__p">{{ t('benefitsPage.clinic.description') }}</p>
          <ul v-reveal="200" class="em-feats em-feats--spaced">
            <li v-for="item in clinicItems" :key="item">{{ item }}</li>
          </ul>
          <div v-reveal="280" class="em-def__cta">
            <EmButton :href="calendlyUrl" variant="dark" :label="t('benefitsPage.clinic.button')" />
          </div>
        </div>

        <!-- painel ao vivo: barras, odômetros e medidor entram quando o card aparece -->
        <EmRpmPanel />
      </div>
    </section>

    <!-- ════════ (03) NÚMEROS ════════ -->
    <section id="impacto" class="em-section">
      <div class="em-wrap">
        <span v-reveal class="em-eyebrow">{{ t('benefitsPage.stats.badge') }}</span>
        <EmSplit
          class="em-h2"
          :text="t('benefitsPage.stats.title')"
          :em="t('benefitsPage.stats.titleEm')"
        />
        <div v-reveal v-spot class="em-figures em-figures--big em-card">
          <div v-for="s in stats" :key="s.label" class="em-figure">
            <b
              ><i v-if="s.sign" class="em-figure__sign">{{ s.sign }}</i
              ><EmOdometer :value="s.num" /><i>{{ s.suffix }}</i></b
            >
            <span>{{ s.label }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ════════ (04) COMPARATIVO ════════ -->
    <section id="comparativo" class="em-section em-section--tint">
      <div class="em-wrap">
        <div class="em-head">
          <div>
            <span v-reveal class="em-eyebrow">{{ t('benefitsPage.comparison.badge') }}</span>
            <EmSplit
              :text="t('benefitsPage.comparison.title')"
              :em="t('benefitsPage.comparison.titleEm')"
            />
          </div>
          <p v-reveal="150">{{ t('benefitsPage.comparison.subtitle') }}</p>
        </div>

        <div v-reveal class="em-compare em-card" role="table">
          <div class="em-compare__row em-compare__row--head" role="row">
            <span role="columnheader">{{ t('benefitsPage.comparison.feature') }}</span>
            <span role="columnheader">{{ t('benefitsPage.comparison.traditional') }}</span>
            <span role="columnheader" class="em-compare__rpm"
              ><span class="em-pill">RPM</span></span
            >
          </div>
          <div
            v-for="(row, i) in comparison"
            :key="row.label"
            v-reveal="i * 70"
            class="em-compare__row"
            role="row"
          >
            <h3 role="rowheader">
              <small>({{ pad(i + 1) }})</small>{{ row.label }}
            </h3>
            <p v-if="row.both" class="em-compare__both" role="cell" aria-colspan="2">
              <small class="em-compare__tag"
                >{{ t('benefitsPage.comparison.traditional') }} + RPM</small
              >
              <span class="em-compare__mark"><Check :size="13" :stroke-width="3" /></span>
              {{ row.both }}
            </p>
            <template v-else>
              <p class="em-compare__trad" role="cell">
                <small class="em-compare__tag">{{
                  t('benefitsPage.comparison.traditional')
                }}</small>
                <span class="em-compare__mark"><Minus :size="13" :stroke-width="3" /></span>
                {{ row.traditional }}
              </p>
              <p class="em-compare__rpm" role="cell">
                <small class="em-compare__tag">RPM</small>
                <span class="em-compare__mark"><Check :size="13" :stroke-width="3" /></span>
                {{ row.rpm }}
              </p>
            </template>
          </div>
        </div>
      </div>
    </section>

    <!-- ════════ CTA ════════ -->
    <EmCta
      :badge="t('benefitsPage.cta.badge')"
      :title="t('benefitsPage.cta.title')"
      :em="t('benefitsPage.cta.titleEm')"
      :subtitle="t('benefitsPage.cta.subtitle')"
      :primary="{ label: t('benefitsPage.cta.button.primary'), href: calendlyUrl }"
      :secondary="{ label: t('benefitsPage.cta.button.secondary'), to: '/about' }"
    />
  </div>
</template>
