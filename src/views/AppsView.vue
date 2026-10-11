<script setup lang="ts">
/**
 * Aplicativos — Design System Emmitec.health, com o conteúdo de sempre (pt/en/es).
 * Celulares no hero, a suíte em cards com links das lojas, os dois padrões em
 * cards grandes e os diferenciais.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BadgeCheck, Blocks, Cpu, Globe, Headset, Network, ShieldCheck } from 'lucide-vue-next'

import emmitecHealthImg from '@/assets/apps/emmitec-health.png'
import emmitecJudicemedImg from '@/assets/apps/emmitec-judicemed.png'
import emmitecHealthBlueImg from '@/assets/apps/emmitec-health-blue.png'
import emmitecCuidemeCareImg from '@/assets/apps/emmitec-cuideme-care.png'
import emmitecLongTermCareImg from '@/assets/apps/emmitec-long-term-care.png'
import emmitecGuardianHealthImg from '@/assets/apps/emmitec-guardian-health.png'
import appStoreImg from '@/assets/apps/app-store-black.png'
import googlePlayImg from '@/assets/apps/google-play-black.png'

import EmPageHero from '@/components/em/EmPageHero.vue'
import EmButton from '@/components/em/EmButton.vue'
import EmSplit from '@/components/em/EmSplit.vue'
import EmCta from '@/components/em/EmCta.vue'
import EmPhones from '@/components/em/EmPhones.vue'
import { calendlyUrl } from '@/lib/site'

const { t } = useI18n()

const pad = (n: number) => String(n).padStart(2, '0')

const apps = [
  {
    img: emmitecHealthImg,
    name: 'Emmitec Health',
    google: 'https://play.google.com/store/apps/details?id=com.emmitec.wl1&pcampaignid=web_share',
    apple: 'https://apps.apple.com/us/app/emmitec-wl1/id1635668189',
  },
  {
    img: emmitecJudicemedImg,
    name: 'Emmitec Judicemed',
    google: 'https://play.google.com/store/apps/details?id=com.emmitec.jd1&pcampaignid=web_share',
    apple: 'https://apps.apple.com/us/app/emmitec-jd1/id6670299440',
  },
  {
    img: emmitecHealthBlueImg,
    name: 'Emmitec Health Blue',
    google: 'https://play.google.com/store/apps/details?id=com.emmitec.eh1&pcampaignid=web_share',
    apple: 'https://apps.apple.com/us/app/emmitec-eh1/id6740423403',
  },
  {
    img: emmitecCuidemeCareImg,
    name: 'Emmitec Cuideme Care',
    google: null,
    apple: 'https://apps.apple.com/us/app/emmitec-cc1/id6738710484',
  },
  {
    img: emmitecGuardianHealthImg,
    name: 'Emmitec Guardian Health',
    google: 'https://play.google.com/store/apps/details?id=com.emmitec.gd1&pcampaignid=web_share',
    apple: null,
  },
  {
    img: emmitecLongTermCareImg,
    name: 'Emmitec Long Term Care',
    google: 'https://play.google.com/store/apps/details?id=com.emmitec.lt1&pcampaignid=web_share',
    apple: 'https://apps.apple.com/us/app/emmitec-lt1/id6743580958',
  },
]

/** Os dois padrões: internacional (paciente) e plataforma modular (clínica). */
const standards = computed(() => [
  {
    key: 'patient',
    icon: Globe,
    badge: t('appsPage.patient.badge'),
    title: t('appsPage.patient.title'),
    em: t('appsPage.patient.titleEm'),
    description: t('appsPage.patient.description'),
    items: [1, 2, 3, 4].map((n) => t(`appsPage.patient.feature${n}`)),
  },
  {
    key: 'clinical',
    icon: Blocks,
    badge: t('appsPage.clinical.badge'),
    title: t('appsPage.clinical.title'),
    em: t('appsPage.clinical.titleEm'),
    description: t('appsPage.clinical.description'),
    items: [1, 2, 3, 4].map((n) => t(`appsPage.clinical.feature${n}`)),
  },
])
/** Órgãos citados no texto, em destaque como selos. */
const seals = ['FDA', 'ANVISA', 'CE', 'MHRA', 'LGPD', 'HIPAA']

const features = computed(() =>
  [BadgeCheck, ShieldCheck, Network, Blocks, Cpu, Headset].map((icon, i) => ({
    icon,
    title: t(`appsPage.features.card${i + 1}.title`),
    desc: t(`appsPage.features.card${i + 1}.desc`),
  })),
)
</script>

<template>
  <div class="em-apps-page">
    <!-- ════════ HERO ════════ -->
    <EmPageHero
      :eyebrow="t('appsPage.hero.badge')"
      :trail="[{ label: t('header.nav.about') }]"
      :title="t('appsPage.hero.title')"
      :em="t('appsPage.hero.titleEm')"
      :subtitle="t('appsPage.hero.subtitle')"
    >
      <template #actions>
        <EmButton :href="calendlyUrl" :label="t('appsPage.hero.button.primary')" />
        <EmButton to="/what-is-rpm" variant="ghost" :label="t('appsPage.hero.button.secondary')" />
      </template>
      <template #visual>
        <EmPhones />
      </template>
    </EmPageHero>

    <!-- ════════ (01) SUÍTE ════════ -->
    <section id="suite" class="em-section">
      <div class="em-wrap">
        <div class="em-head">
          <div>
            <span v-reveal class="em-eyebrow">{{ t('appsPage.suite.badge') }}</span>
            <EmSplit :text="t('appsPage.suite.title')" :em="t('appsPage.suite.titleEm')" />
          </div>
          <p v-reveal="150">{{ t('appsPage.suite.subtitle') }}</p>
        </div>

        <div class="em-apps">
          <article
            v-for="(app, i) in apps"
            :key="app.name"
            v-reveal="(i % 3) * 90"
            v-spot
            class="em-appcard em-card em-card--lift"
          >
            <div class="em-appcard__media">
              <img :src="app.img" :alt="app.name" loading="lazy" width="1125" height="900" />
            </div>
            <div class="em-appcard__body">
              <div>
                <span class="em-appcard__n">({{ pad(i + 1) }})</span>
                <h3>{{ app.name }}</h3>
              </div>
              <div class="em-appcard__stores">
                <a
                  v-if="app.apple"
                  :href="app.apple"
                  target="_blank"
                  rel="noopener noreferrer"
                  :aria-label="`${app.name}: App Store`"
                >
                  <img :src="appStoreImg" alt="Download on the App Store" width="120" height="40" />
                </a>
                <a
                  v-if="app.google"
                  :href="app.google"
                  target="_blank"
                  rel="noopener noreferrer"
                  :aria-label="`${app.name}: Google Play`"
                >
                  <img :src="googlePlayImg" alt="Get it on Google Play" width="120" height="40" />
                </a>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ════════ (02) PADRÃO INTERNACIONAL · (03) PLATAFORMA MODULAR ════════ -->
    <section id="padroes" class="em-section em-section--tint">
      <div class="em-wrap em-stds">
        <article
          v-for="(b, i) in standards"
          :key="b.key"
          v-reveal="i * 120"
          v-spot
          class="em-std em-card"
        >
          <div class="em-std__top">
            <span class="em-ico em-ico--brand"
              ><component :is="b.icon" :stroke-width="1.7" aria-hidden="true"
            /></span>
            <span class="em-eyebrow">{{ b.badge }}</span>
          </div>
          <EmSplit tag="h2" class="em-std__title" :text="b.title" :em="b.em" />
          <p class="em-std__desc">{{ b.description }}</p>
          <ul class="em-feats">
            <li v-for="item in b.items" :key="item">{{ item }}</li>
          </ul>
          <div class="em-std__foot">
            <div v-if="b.key === 'patient'" class="em-std__seals">
              <span v-for="s in seals" :key="s" class="em-chip">{{ s }}</span>
            </div>
            <EmButton
              v-else
              :href="calendlyUrl"
              variant="dark"
              :label="t('appsPage.clinical.button')"
            />
          </div>
        </article>
      </div>
    </section>

    <!-- ════════ (04) DIFERENCIAIS ════════ -->
    <section id="diferenciais" class="em-section">
      <div class="em-wrap">
        <div class="em-head">
          <div>
            <span v-reveal class="em-eyebrow">{{ t('appsPage.features.badge') }}</span>
            <EmSplit :text="t('appsPage.features.title')" :em="t('appsPage.features.titleEm')" />
          </div>
          <p v-reveal="150">{{ t('appsPage.features.subtitle') }}</p>
        </div>
        <div class="em-benefits em-benefits--3">
          <article
            v-for="(f, i) in features"
            :key="f.title"
            v-reveal="(i % 3) * 90"
            v-spot
            class="em-benefit em-card em-card--lift"
          >
            <div class="em-benefit__top">
              <span class="em-ico"
                ><component :is="f.icon" :stroke-width="1.7" aria-hidden="true"
              /></span>
              <span class="em-benefit__idx">{{ pad(i + 1) }}</span>
            </div>
            <h4>{{ f.title }}</h4>
            <p>{{ f.desc }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- ════════ CTA ════════ -->
    <EmCta
      :badge="t('appsPage.cta.badge')"
      :title="t('appsPage.cta.title')"
      :em="t('appsPage.cta.titleEm')"
      :subtitle="t('appsPage.cta.subtitle')"
      :primary="{ label: t('appsPage.hero.button.primary'), href: calendlyUrl }"
      :secondary="{ label: t('appsPage.hero.button.secondary'), to: '/what-is-rpm' }"
    />
  </div>
</template>
