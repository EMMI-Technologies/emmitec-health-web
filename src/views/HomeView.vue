<script setup lang="ts">
/**
 * Início — layout e movimento do Design System Emmitec.health (inspirado em midu.design),
 * com o conteúdo de sempre (i18n pt/en/es).
 */
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Activity,
  BellRing,
  Building2,
  Clock,
  Cloud,
  Cpu,
  Droplets,
  FileText,
  Gauge,
  HandHeart,
  Heart,
  HeartPulse,
  Hospital,
  LayoutGrid,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  TrendingDown,
  Users,
} from 'lucide-vue-next'

import imgRPM from '@/assets/home/RPM.jpg'
import headerIMG from '@/assets/home/header_img.png'
// versões leves (900px) para a lista de serviços
import imgSinais from '@/assets/home/servicos/01-sinais-vitais.jpg'
import imgAntecipar from '@/assets/home/servicos/02-antecipar.jpg'
import imgCustos from '@/assets/home/servicos/03-custos.jpg'
import imgEngajamento from '@/assets/home/servicos/04-engajamento.jpg'

import EmButton from '@/components/em/EmButton.vue'
import EmSplit from '@/components/em/EmSplit.vue'
import EmStatement from '@/components/em/EmStatement.vue'
import EmOdometer from '@/components/em/EmOdometer.vue'
import EmHeroGradient from '@/components/em/EmHeroGradient.vue'
import EmMarquee from '@/components/em/EmMarquee.vue'
import EmVitalRow from '@/components/em/EmVitalRow.vue'
import EmHoverLines from '@/components/em/EmHoverLines.vue'
import EmCta from '@/components/em/EmCta.vue'
import { RM, addFx, clamp, damp } from '@/lib/motion'
import { calendlyUrl } from '@/lib/site'
import EmSkeleton from '@/components/em/EmSkeleton.vue'
import EmState from '@/components/em/EmState.vue'
import { useArticles } from '@/lib/blog'
import { useDevices } from '@/lib/equipment'

const { t, tm } = useI18n()

const pad = (n: number) => String(n).padStart(2, '0')

/* ── HERO ── */
const heroTitle = computed(
  () => `${t('hero.titleLead')} ${t('hero.titleHighlight')} ${t('hero.titleTail')}`,
)
// a palavra final do destaque vai em serifada (esperar · wait · esperar)
const heroEm = computed(() => t('hero.titleHighlight').trim().split(/\s+/).pop() ?? '')

/* ── (03) EQUIPAMENTOS — duas faixas, uma para cada lado ── */
const marqueeItems = computed(() => [
  { label: t('marquee.a'), icon: Activity },
  { label: t('marquee.b'), icon: Sparkles },
  { label: t('marquee.c'), icon: FileText },
  { label: t('marquee.d'), icon: MonitorSmartphone },
  { label: t('marquee.e'), icon: ShieldCheck },
  { label: t('marquee.f'), icon: Clock },
])
/** Segunda faixa: os dispositivos do catálogo (API). Sem catálogo, a faixa não aparece. */
const { devices } = useDevices()
const deviceItems = computed(() => devices.value.map((d) => ({ label: d.name, icon: d.icon })))

/* ── (01) POR QUE EXISTIMOS ── */
const trust = computed(() => [
  t('hero.trust.devices'),
  t('hero.trust.security'),
  t('hero.trust.support'),
])

const days = computed(() => t('home.days').split(''))

const stats = computed(() => [
  {
    key: 'accuracy',
    icon: Target,
    num: '98',
    suffix: '%',
    label: t('hero.stats.accuracy'),
    tag: t('home.stats.accuracy.tag'),
    foot: t('home.stats.accuracy.foot'),
  },
  {
    key: 'clinics',
    icon: Building2,
    num: '500',
    suffix: '+',
    label: t('hero.stats.clinics'),
    tag: t('home.stats.clinics.tag'),
    foot: t('home.stats.clinics.foot'),
  },
  {
    key: 'support',
    icon: Clock,
    num: '24',
    suffix: '/7',
    label: t('hero.stats.support'),
    tag: t('home.stats.support.tag'),
    foot: t('home.stats.support.foot'),
  },
])

/* ── (02) SOLUÇÕES — pilha de cards ── */
const cards = computed(() => [
  {
    icon: Activity,
    label: t('cards.rpm.label'),
    title: t('cards.rpm.title'),
    description: t('cards.rpm.description'),
    to: '/what-is-rpm',
  },
  {
    icon: Cpu,
    label: t('cards.ai.label'),
    title: t('cards.ai.title'),
    description: t('cards.ai.description'),
    to: '/benefits',
  },
  {
    icon: Users,
    label: t('cards.dashboard.label'),
    title: t('cards.dashboard.title'),
    description: t('cards.dashboard.description'),
    to: '/apps',
  },
])

const stackEl = ref<HTMLElement | null>(null)

/* ── (04) CUIDADO INTELIGENTE — foto que se abre com a rolagem + cards de vidro ── */
const monitoringIcons = [MonitorSmartphone, BellRing, FileText]
const monitoringItems = computed(() =>
  (tm('features.monitoring.items') as unknown as string[]).map((text, i) => ({
    text,
    icon: monitoringIcons[i] ?? Activity,
  })),
)

/* ── (05) SERVIÇOS — linhas grandes com foto que segue o cursor ── */
const servicesIcons = [Activity, BellRing, TrendingDown, Users]
const servicesImgs = [imgSinais, imgAntecipar, imgCustos, imgEngajamento]
const servicesItems = computed(() =>
  (tm('features.services.items') as unknown as string[]).map((text, i) => ({
    text,
    icon: servicesIcons[i] ?? Activity,
    img: servicesImgs[i] ?? imgSinais,
  })),
)

/* ── (06) BENEFÍCIOS ── */
const benefits = computed(() => [
  { icon: HandHeart, title: t('benefits.items.home.title'), desc: t('benefits.items.home.desc') },
  {
    icon: HeartPulse,
    title: t('benefits.items.flexible.title'),
    desc: t('benefits.items.flexible.desc'),
  },
  { icon: Cloud, title: t('benefits.items.access.title'), desc: t('benefits.items.access.desc') },
  {
    icon: Heart,
    title: t('benefits.items.partnership.title'),
    desc: t('benefits.items.partnership.desc'),
  },
])

/* ── (07) BLOG ── */
/* ── (07) BLOG: os três artigos mais recentes (API) ── */
const blog = useArticles()
const posts = computed(() => blog.articles.value.slice(0, 3))
const postsLoading = computed(() => blog.loading.value && !blog.data.value)

/* Pilha: cada card encolhe de leve quando o próximo o cobre (amortecido). */
let offStack: (() => void) | null = null
onMounted(() => {
  if (RM || !stackEl.value) return
  const cardsEls = Array.from(stackEl.value.querySelectorAll<HTMLElement>('.em-stack__card'))
  const s = cardsEls.map(() => 1)
  offStack = addFx((_y, dt) => {
    let moving = false
    for (let i = 0; i < cardsEls.length - 1; i++) {
      const a = cardsEls[i]!.getBoundingClientRect()
      const b = cardsEls[i + 1]!.getBoundingClientRect()
      const ov = clamp(1 - (b.top - a.top) / a.height, 0, 1)
      const goal = 1 - ov * 0.035 * Math.min(cardsEls.length - 1 - i, 2)
      s[i] = damp(s[i]!, goal, 9, dt)
      if (Math.abs(s[i]! - goal) > 0.0004) moving = true
      cardsEls[i]!.style.transform = `scale(${s[i]!.toFixed(4)})`
    }
    return moving
  })
})
onBeforeUnmount(() => offStack?.())
</script>

<template>
  <div class="em-home">
    <!-- ════════ HERO ════════ -->
    <header id="inicio" class="em-hero">
      <EmHeroGradient />
      <div v-parallax.fade="0.18" class="em-hero__inner">
        <p v-reveal="100" class="em-kicker">
          <svg class="em-kicker__ecg" viewBox="0 0 44 16" aria-hidden="true">
            <path d="M0 8h12l3-6 4 12 4-10 3 4h18" pathLength="1" />
          </svg>
          {{ t('hero.eyebrow') }}
        </p>
        <EmSplit tag="h1" class="em-hero__title" :text="heroTitle" :em="heroEm" :delay="200" />
        <div class="em-hero__meta">
          <div v-reveal="900">
            <p>{{ t('hero.subtitle') }}</p>
          </div>
          <span v-reveal="1100" class="em-hero__scroll">{{ t('hero.scroll') }}<i /></span>
          <div v-reveal="1000" class="em-hero__actions">
            <EmButton :href="calendlyUrl" :label="t('hero.button.demo')" />
            <EmButton to="/what-is-rpm" variant="ghost" :label="t('hero.button.solutions')" />
          </div>
        </div>
      </div>
    </header>

    <!-- ════════ (01) POR QUE EXISTIMOS ════════ -->
    <section id="sobre" class="em-section">
      <div class="em-wrap">
        <span v-reveal class="em-eyebrow">{{ t('intro.badge') }}</span>
        <div class="em-about em-about--home">
          <div>
            <EmStatement :text="t('intro.title')" :em="t('intro.titleEm')" />
            <div class="em-about__body">
              <p v-reveal>{{ t('intro.description') }}</p>
              <ul v-reveal="80" class="em-feats">
                <li v-for="item in trust" :key="item">{{ item }}</li>
              </ul>
              <div v-reveal="160">
                <RouterLink class="em-link" to="/what-is-rpm"
                  >{{ t('hero.button.solutions') }}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M7 17L17 7M8 7h9v9" />
                  </svg>
                </RouterLink>
              </div>
            </div>
          </div>

          <div class="em-visual">
            <figure v-in class="em-visual__photo em-story__art">
              <img
                class="em-story__photo"
                :src="headerIMG"
                :alt="t('hero.imageAlt')"
                loading="lazy"
                width="841"
                height="526"
              />
              <span class="em-story__shade" />
              <span class="em-chip em-chip--glass em-visual__chip"
                ><span class="em-dot em-dot--live" />{{ t('hero.live.status') }}</span
              >
            </figure>

            <div v-reveal:scale="120" v-spot class="em-vitals em-card">
              <div class="em-vitals__top">
                <div class="em-vitals__who">
                  <span class="em-vitals__avatar"><Activity :size="18" :stroke-width="1.7" /></span>
                  <div>
                    <strong>{{ t('hero.live.patient') }}</strong>
                    <small>{{ t('hero.trust.devices') }}</small>
                  </div>
                </div>
                <span class="em-pill">{{ t('hero.live.status') }}</span>
              </div>
              <EmVitalRow
                :icon="HeartPulse"
                :label="t('hero.live.hr')"
                :status="t('home.status.normal')"
                :base="78"
                :amp="5"
                unit="bpm"
                :seed="0"
              />
              <EmVitalRow
                :icon="Droplets"
                :label="t('hero.live.spo2')"
                :status="t('home.status.normal')"
                :base="98"
                :amp="1"
                unit="%"
                :seed="1"
              />
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
              <div class="em-alert">
                <span class="em-ico em-ico--sm em-ico--brand"
                  ><BellRing :stroke-width="1.7" aria-hidden="true"
                /></span>
                <div>{{ t('hero.live.alert') }}</div>
                <span class="em-dot em-dot--live" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>

        <div class="em-stats">
          <div
            v-for="(s, i) in stats"
            :key="s.key"
            v-reveal="i * 120"
            v-spot
            class="em-stat em-card em-card--lift"
          >
            <div class="em-stat__top">
              <span class="em-ico"
                ><component :is="s.icon" :stroke-width="1.7" aria-hidden="true"
              /></span>
              <span class="em-tag">{{ s.tag }}</span>
            </div>
            <b
              ><EmOdometer :value="s.num" /><i>{{ s.suffix }}</i></b
            >
            <span class="em-stat__label">{{ s.label }}</span>
            <div class="em-stat__foot">
              <span>{{ s.foot }}</span>
              <span v-if="s.key === 'accuracy'" class="em-meter" aria-hidden="true">
                <i v-for="n in 25" :key="n" :class="{ on: n < 25 }" :style="{ '--i': n - 1 }" />
              </span>
              <span v-else-if="s.key === 'clinics'" class="em-avs" aria-hidden="true">
                <span><Building2 :stroke-width="1.7" /></span>
                <span><Stethoscope :stroke-width="1.7" /></span>
                <span><Hospital :stroke-width="1.7" /></span>
                <span><Users :stroke-width="1.7" /></span>
              </span>
              <span v-else class="em-days" aria-hidden="true">
                <i v-for="(d, k) in days" :key="k" :style="{ '--i': k }">{{ d }}</i>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ════════ (02) SOLUÇÕES ════════ -->
    <section id="solucoes" class="em-section em-section--stack">
      <div class="em-wrap">
        <span v-reveal class="em-eyebrow">{{ t('home.solutions') }}</span>
        <div ref="stackEl" class="em-stack">
          <article
            v-for="(c, i) in cards"
            :key="i"
            v-spot
            class="em-stack__card em-card"
            :style="{ '--i': i }"
          >
            <div class="em-stack__txt">
              <div class="em-stack__meta">
                <span>
                  <span class="em-ico"
                    ><component :is="c.icon" :stroke-width="1.7" aria-hidden="true"
                  /></span>
                  <span class="em-stack__num">({{ pad(i + 1) }}) / {{ pad(cards.length) }}</span>
                </span>
                <span class="em-tag">{{ c.label }}</span>
              </div>
              <div>
                <h3>{{ c.title }}</h3>
                <p>{{ c.description }}</p>
              </div>
              <div class="em-stack__cta">
                <EmButton :to="c.to" variant="ghost" :label="t('cards.cta')" />
              </div>
            </div>

            <!-- arte: mini-produto em camadas -->
            <div v-in class="em-art">
              <span
                class="blob"
                style="background: var(--cyan-500); width: 55%; height: 55%; left: -12%; top: -14%"
              />
              <span
                class="blob"
                style="
                  background: var(--pastel-mint);
                  width: 60%;
                  height: 60%;
                  left: 50%;
                  top: 45%;
                  animation-delay: -5s;
                "
              />
              <span
                class="blob"
                style="
                  background: var(--cyan-100);
                  width: 50%;
                  height: 50%;
                  left: 30%;
                  top: 62%;
                  animation-delay: -10s;
                "
              />

              <!-- 01 · dispositivos -->
              <template v-if="i === 0">
                <div class="em-win">
                  <div class="em-win__bar">
                    <span
                      ><span class="em-win__dots"><i /><i /><i /></span>{{ c.label }}</span
                    >
                    <span class="em-pill">{{ t('hero.live.status') }}</span>
                  </div>
                  <div class="em-win__body">
                    <div class="em-li">
                      <span class="em-av em-av--rose"
                        ><HeartPulse :size="15" :stroke-width="1.8"
                      /></span>
                      <div>
                        <strong>{{ t('hero.live.hr') }}</strong
                        ><small>78 bpm</small>
                      </div>
                      <span class="em-pill">{{ t('home.status.normal') }}</span>
                    </div>
                    <div class="em-li">
                      <span class="em-av em-av--cyan"
                        ><Droplets :size="15" :stroke-width="1.8"
                      /></span>
                      <div>
                        <strong>{{ t('hero.live.spo2') }}</strong
                        ><small>98%</small>
                      </div>
                      <span class="em-pill">{{ t('home.status.normal') }}</span>
                    </div>
                    <div class="em-li">
                      <span class="em-av em-av--peach"
                        ><Gauge :size="15" :stroke-width="1.8"
                      /></span>
                      <div>
                        <strong>{{ t('hero.live.bp') }}</strong
                        ><small>118/76 mmHg</small>
                      </div>
                      <span class="em-pill">{{ t('home.status.normal') }}</span>
                    </div>
                  </div>
                  <div class="em-win__foot">
                    <span>{{ t('hero.trust.devices') }}</span>
                  </div>
                </div>
                <div class="em-fl em-fl--bl">
                  <span class="em-ico em-ico--sm"><ShieldCheck :stroke-width="1.7" /></span>
                  <div>
                    <strong>{{ t('marquee.e') }}</strong>
                  </div>
                </div>
              </template>

              <!-- 02 · IA preditiva -->
              <template v-else-if="i === 1">
                <div class="em-win">
                  <div class="em-win__bar">
                    <span
                      ><span class="em-win__dots"><i /><i /><i /></span>{{ c.label }}</span
                    >
                    <span class="em-pill em-pill--warn">{{ t('home.status.attention') }}</span>
                  </div>
                  <div class="em-win__sec em-win__sec--gauge">
                    <div class="em-gauge" style="--v: 98">
                      <svg viewBox="0 0 100 56" aria-hidden="true">
                        <path class="t" d="M10 50 A40 40 0 0 1 90 50" pathLength="100" />
                        <path class="v" d="M10 50 A40 40 0 0 1 90 50" pathLength="100" />
                      </svg>
                      <div class="em-gauge__txt"><b>98%</b></div>
                    </div>
                    <small>{{ t('hero.stats.accuracy') }}</small>
                  </div>
                  <div class="em-win__sec">
                    <div class="em-alert">
                      <span class="em-ico em-ico--sm em-ico--brand"
                        ><BellRing :stroke-width="1.7"
                      /></span>
                      <div>
                        {{ t('hero.live.alert')
                        }}<small>{{ t('hero.live.bp') }} · 138/88 mmHg</small>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="em-fl em-fl--tr">
                  <span class="em-ico em-ico--sm em-ico--brand"
                    ><Sparkles :stroke-width="1.7"
                  /></span>
                  <div>
                    <strong>{{ t('marquee.b') }}</strong>
                  </div>
                </div>
              </template>

              <!-- 03 · painel clínico -->
              <template v-else>
                <div class="em-win">
                  <div class="em-win__bar">
                    <span
                      ><span class="em-win__dots"><i /><i /><i /></span>{{ c.label }}</span
                    >
                    <span class="em-ico em-ico--xs"><LayoutGrid :stroke-width="1.7" /></span>
                  </div>
                  <div class="em-win__sec">
                    <h6>{{ t('hero.stats.clinics') }}</h6>
                    <div class="em-big">500+</div>
                    <div class="em-bars" aria-hidden="true">
                      <i
                        v-for="(h, k) in [38, 52, 46, 64, 58, 76, 70, 92]"
                        :key="k"
                        :style="{ '--h': `${h}%`, '--i': k }"
                      />
                    </div>
                  </div>
                  <div class="em-win__sec">
                    <div class="em-seg" aria-hidden="true">
                      <i style="--f: 7; --i: 0" /><i style="--f: 2; --i: 1" /><i
                        style="--f: 1; --i: 2"
                      />
                    </div>
                    <div class="em-legend">
                      <span style="--c: var(--cyan-500)">{{ t('home.status.normal') }}</span>
                      <span style="--c: var(--warn-dot)">{{ t('home.status.attention') }}</span>
                    </div>
                  </div>
                </div>
                <div class="em-fl em-fl--br">
                  <span class="em-dot em-dot--live" />
                  <div>
                    <strong>{{ t('hero.trust.support') }}</strong>
                  </div>
                </div>
                <div class="em-fl em-fl--tl">
                  <span class="em-ico em-ico--sm"><FileText :stroke-width="1.7" /></span>
                  <div>
                    <strong>{{ t('marquee.c') }}</strong>
                  </div>
                </div>
              </template>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ════════ (03) EQUIPAMENTOS — duas faixas ════════ -->
    <section id="equipamentos" class="em-section em-section--tint em-section--marquee">
      <div class="em-wrap">
        <div class="em-head">
          <div>
            <span v-reveal class="em-eyebrow">{{ t('equipmentPage.hero.badge') }}</span>
            <EmSplit :text="t('equipmentPage.hero.title')" :em="t('equipmentPage.hero.titleEm')" />
          </div>
          <div v-reveal="150" class="em-head__side">
            <p>{{ t('equipmentPage.hero.subtitle') }}</p>
            <EmButton to="/equipment" variant="ghost" :label="t('cta.button.secondary')" />
          </div>
        </div>
      </div>
      <div v-reveal class="em-marquees">
        <EmMarquee :items="marqueeItems" dir="left" :speed="34" />
        <EmMarquee v-if="deviceItems.length" :items="deviceItems" dir="right" :speed="28" />
      </div>
    </section>

    <!-- ════════ (04) CUIDADO INTELIGENTE ════════ -->
    <section id="cuidado" class="em-section">
      <div class="em-wrap">
        <div class="em-head">
          <div>
            <span v-reveal class="em-eyebrow">{{ t('features.monitoring.tag') }}</span>
            <EmSplit
              :text="t('features.monitoring.title')"
              :em="t('features.monitoring.titleEm')"
            />
          </div>
          <div v-reveal="150" class="em-head__side">
            <p>{{ t('features.monitoring.body') }}</p>
            <EmButton to="/what-is-rpm" :label="t('features.monitoring.button')" />
          </div>
        </div>

        <div v-scrub="0.95" class="em-show">
          <figure class="em-show__media">
            <img
              class="em-show__img"
              :src="imgRPM"
              :alt="t('features.monitoring.imageAlt')"
              loading="lazy"
              width="2304"
              height="1792"
            />
            <span class="em-show__shade" />
          </figure>
          <div class="em-show__ui">
            <span class="em-chip em-chip--glass"
              ><span class="em-dot em-dot--live" />{{
                t('features.monitoring.imageBadges.rpm')
              }}</span
            >
            <span class="em-chip em-chip--glass"
              ><Sparkles :stroke-width="1.7" aria-hidden="true" />{{
                t('features.monitoring.imageBadges.ai')
              }}</span
            >
          </div>
          <ol class="em-show__cards">
            <li
              v-for="(it, i) in monitoringItems"
              :key="i"
              v-reveal="200 + i * 110"
              class="em-show__card"
            >
              <span class="em-show__top">
                <span class="em-ico em-ico--sm"
                  ><component :is="it.icon" :stroke-width="1.7" aria-hidden="true"
                /></span>
                <span class="em-show__n">({{ pad(i + 1) }})</span>
              </span>
              <p>{{ it.text }}</p>
            </li>
          </ol>
        </div>
      </div>
    </section>

    <!-- ════════ (05) SERVIÇOS ════════ -->
    <section id="servicos" class="em-section em-section--tint">
      <div class="em-wrap">
        <div class="em-head">
          <div>
            <span v-reveal class="em-eyebrow">{{ t('features.services.tag') }}</span>
            <EmSplit :text="t('features.services.title')" :em="t('features.services.titleEm')" />
          </div>
          <div v-reveal="150" class="em-head__side">
            <p>{{ t('features.services.body') }}</p>
            <EmButton to="/apps" variant="dark" :label="t('features.services.button')" />
          </div>
        </div>
        <EmHoverLines :items="servicesItems" />
      </div>
    </section>

    <!-- ════════ (06) BENEFÍCIOS ════════ -->
    <section id="beneficios" class="em-section">
      <div class="em-wrap">
        <div class="em-head">
          <div>
            <span v-reveal class="em-eyebrow">{{ t('benefits.badge') }}</span>
            <EmSplit :text="t('benefits.title')" :em="t('benefits.titleEm')" />
          </div>
          <p v-reveal="150">{{ t('benefits.subtitle') }}</p>
        </div>
        <div class="em-benefits">
          <RouterLink
            v-for="(b, i) in benefits"
            :key="b.title"
            v-reveal="i * 100"
            v-spot
            to="/benefits"
            class="em-benefit em-card em-card--lift"
          >
            <span class="em-corner" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M7 17L17 7M8 7h9v9" />
              </svg>
            </span>
            <div class="em-benefit__top">
              <span class="em-ico"
                ><component :is="b.icon" :stroke-width="1.7" aria-hidden="true"
              /></span>
              <span class="em-benefit__idx">{{ pad(i + 1) }}</span>
            </div>
            <h4>{{ b.title }}</h4>
            <p>{{ b.desc }}</p>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- ════════ (07) BLOG ════════ -->
    <section id="blog" class="em-section em-section--tint">
      <div class="em-wrap">
        <div class="em-head">
          <div>
            <span v-reveal class="em-eyebrow">{{ t('homeBlogStrip.badge') }}</span>
            <EmSplit :text="t('homeBlogStrip.title')" :em="t('homeBlogStrip.titleEm')" />
          </div>
          <div v-reveal="150" class="em-head__side">
            <p>{{ t('homeBlogStrip.subtitle') }}</p>
            <EmButton to="/blog" variant="ghost" :label="t('homeBlogStrip.cta')" />
          </div>
        </div>
        <EmSkeleton v-if="postsLoading" kind="posts" :count="3" />
        <EmState
          v-else-if="blog.error.value"
          kind="error"
          :title="t('state.blogError')"
          :text="t('state.errorText')"
          :error="blog.error.value"
          @retry="blog.reload"
        />
        <EmState
          v-else-if="!posts.length"
          kind="empty"
          :title="t('state.blogEmpty')"
          :text="t('state.blogEmptyText')"
        />
        <div v-else class="em-posts">
          <RouterLink
            v-for="(p, i) in posts"
            :key="p.slug"
            v-reveal="i * 120"
            v-spot
            :to="`/blog/${p.slug}`"
            class="em-post em-card em-card--lift"
          >
            <div class="em-post__cover" :style="{ '--tone': p.tone }">
              <span class="em-post__n" aria-hidden="true">{{ pad(i + 1) }}</span>
              <span class="em-chip em-chip--glass">{{ p.catLabel }}</span>
              <span class="em-corner" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M7 17L17 7M8 7h9v9" />
                </svg>
              </span>
            </div>
            <div class="em-post__body">
              <time class="em-post__date" :datetime="p.publishedAt">{{ p.dateLabel }}</time>
              <h3>{{ p.title }}</h3>
              <p>{{ p.excerpt }}</p>
              <span class="em-post__more">{{ t('blogPage.preview.readArticle') }}</span>
            </div>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- ════════ CTA ════════ -->
    <EmCta
      :badge="t('cta.badge')"
      :title="t('cta.title')"
      :em="t('cta.titleEm')"
      :subtitle="t('cta.subtitle')"
      :note="t('cta.note')"
      :primary="{ label: t('cta.button.primary'), href: calendlyUrl }"
      :secondary="{ label: t('cta.button.secondary'), to: '/equipment' }"
      :trust="trust"
    />
  </div>
</template>
