<script setup lang="ts">
/**
 * O que é RPM — Design System Emmitec.health, com o conteúdo de sempre (pt/en/es).
 * Definição com monitor ao vivo (ECG), etapas em scrollytelling com o pulso de dados
 * viajando pelo fluxo, e perfis em keycaps.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Activity,
  Bandage,
  BellRing,
  Brain,
  Droplet,
  HeartHandshake,
  HeartPulse,
  Stethoscope,
  Wifi,
} from 'lucide-vue-next'

import EmPageHero from '@/components/em/EmPageHero.vue'
import EmButton from '@/components/em/EmButton.vue'
import EmSplit from '@/components/em/EmSplit.vue'
import EmEcgMonitor from '@/components/em/EmEcgMonitor.vue'
import EmSteps from '@/components/em/EmSteps.vue'
import EmCta from '@/components/em/EmCta.vue'
import { calendlyUrl } from '@/lib/site'

const { t } = useI18n()

const pad = (n: number) => String(n).padStart(2, '0')

const steps = computed(() =>
  [Activity, Wifi, Brain, BellRing].map((icon, i) => ({
    icon,
    title: t(`whatIsRpm.process.step${i + 1}.title`),
    desc: t(`whatIsRpm.process.step${i + 1}.desc`),
  })),
)

// os perfis são exemplos: o quinto card ("outras condições crônicas") deixa isso claro
const faces = ['', 'em-key--sky', 'em-key--mint', 'em-key--sand', 'em-key--lilac']
const profiles = computed(() =>
  [HeartPulse, Bandage, Droplet, HeartHandshake, Stethoscope].map((icon, i) => ({
    icon,
    face: faces[i] ?? '',
    label: t(`whatIsRpm.who.item${i + 1}`),
    desc: t(`whatIsRpm.who.item${i + 1}desc`),
  })),
)
</script>

<template>
  <div class="em-rpm-page">
    <!-- ════════ HERO ════════ -->
    <EmPageHero
      :eyebrow="t('whatIsRpm.hero.badge')"
      :trail="[{ label: t('header.nav.about') }]"
      :title="t('whatIsRpm.hero.title')"
      :em="t('whatIsRpm.hero.titleEm')"
      :subtitle="t('whatIsRpm.hero.subtitle')"
    >
      <template #actions>
        <EmButton :href="calendlyUrl" :label="t('whatIsRpm.hero.button.primary')" />
        <EmButton
          :href="calendlyUrl"
          variant="ghost"
          :label="t('whatIsRpm.hero.button.secondary')"
        />
      </template>
    </EmPageHero>

    <!-- ════════ (01) DEFINIÇÃO ════════ -->
    <section id="definicao" class="em-section">
      <div class="em-wrap">
        <div class="em-def">
          <div class="em-def__txt">
            <span v-reveal class="em-eyebrow">{{ t('whatIsRpm.definition.badge') }}</span>
            <EmSplit
              class="em-h2"
              :text="t('whatIsRpm.definition.title')"
              :em="t('whatIsRpm.definition.titleEm')"
            />
            <p v-reveal="120" class="em-def__lead">{{ t('whatIsRpm.definition.paragraph1') }}</p>
            <p v-reveal="200" class="em-def__p">{{ t('whatIsRpm.definition.paragraph2') }}</p>
          </div>
          <EmEcgMonitor
            v-reveal:scale="150"
            v-spot
            class="em-card"
            :label="t('whatIsRpm.definition.cardLabel')"
            :rhythm="t('whatIsRpm.definition.rhythm')"
          />
        </div>
      </div>
    </section>

    <!-- ════════ (02) COMO FUNCIONA ════════ -->
    <section id="como-funciona" class="em-section em-section--tint">
      <div class="em-wrap">
        <div class="em-head">
          <div>
            <span v-reveal class="em-eyebrow">{{ t('whatIsRpm.process.badge') }}</span>
            <EmSplit :text="t('whatIsRpm.process.title')" :em="t('whatIsRpm.process.titleEm')" />
          </div>
          <p v-reveal="150">{{ t('whatIsRpm.process.subtitle') }}</p>
        </div>
        <EmSteps :items="steps" />
      </div>
    </section>

    <!-- ════════ (03) PARA QUEM ════════ -->
    <section id="para-quem" class="em-section">
      <div class="em-wrap">
        <div class="em-head">
          <div>
            <span v-reveal class="em-eyebrow">{{ t('whatIsRpm.who.badge') }}</span>
            <EmSplit :text="t('whatIsRpm.who.title')" :em="t('whatIsRpm.who.titleEm')" />
          </div>
          <p v-reveal="150">{{ t('whatIsRpm.who.subtitle') }}</p>
        </div>
        <div class="em-plans em-plans--5">
          <article
            v-for="(p, i) in profiles"
            :key="p.label"
            v-reveal="i * 100"
            v-spot
            class="em-plan em-card em-card--lift"
          >
            <div class="em-key" :class="p.face">
              <div class="em-key__top">
                <span>({{ pad(i + 1) }})</span>
                <span class="em-key__ico"
                  ><component :is="p.icon" :stroke-width="1.8" aria-hidden="true"
                /></span>
              </div>
              <h3 class="em-key__name">{{ p.label }}</h3>
            </div>
            <div class="em-plan__body">
              <p>{{ p.desc }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ════════ CTA ════════ -->
    <EmCta
      :badge="t('whatIsRpm.cta.badge')"
      :title="t('whatIsRpm.cta.title')"
      :em="t('whatIsRpm.cta.titleEm')"
      :subtitle="t('whatIsRpm.cta.subtitle')"
      :primary="{ label: t('whatIsRpm.cta.button.primary'), href: calendlyUrl }"
      :secondary="{ label: t('whatIsRpm.cta.button.secondary'), to: '/benefits' }"
    />
  </div>
</template>
