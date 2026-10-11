<script setup lang="ts">
/**
 * Página do dispositivo — Design System Emmitec.health.
 * Dados da API pública do BackOffice (slug da rota, recarrega ao trocar de idioma).
 * Hero com a foto (ou a "tela" com a leitura), recursos em cards, galeria de fotos,
 * a ficha completa e um painel lateral com modelo, fabricante, conectividade e
 * certificações.
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { Check, Factory, Package, Search, Share2, ShieldCheck, X } from 'lucide-vue-next'

import EmPageHero from '@/components/em/EmPageHero.vue'
import EmButton from '@/components/em/EmButton.vue'
import EmSplit from '@/components/em/EmSplit.vue'
import EmDeviceMedia from '@/components/em/EmDeviceMedia.vue'
import EmDeviceCard from '@/components/em/EmDeviceCard.vue'
import EmSkeleton from '@/components/em/EmSkeleton.vue'
import EmState from '@/components/em/EmState.vue'
import { calendlyUrl } from '@/lib/site'
import { connectivityIcon as connIcon } from '@/lib/icons'
import { plainText, usePageMeta } from '@/lib/seo'
import { useDevice, useDevices } from '@/lib/equipment'

const { t } = useI18n()
const route = useRoute()
const slug = () => String(route.params.slug ?? '')

const { device, loading, error, reload } = useDevice(slug)
const list = useDevices()

const pad = (n: number) => String(n).padStart(2, '0')

usePageMeta(() => {
  const d = device.value
  if (!d) return { title: t('header.nav.equipment') }
  return {
    // modelo no título só se o nome ainda não o traz
    title:
      d.model && !d.name.toLowerCase().includes(d.model.toLowerCase())
        ? `${d.name} (${d.model})`
        : d.name,
    description: d.shortDesc || plainText(d.fullDesc),
    image: d.photos[0],
  }
})

/* ── galeria ── */
const photoIdx = ref(0)
watch(
  () => device.value?.slug,
  () => (photoIdx.value = 0),
)
const currentPhoto = computed(() => device.value?.photos[photoIdx.value] ?? device.value?.photos[0])

/* ── outros equipamentos, com busca ── */
const searchQuery = ref('')
const related = computed(() => {
  const d = device.value
  if (!d) return []
  const q = searchQuery.value.trim().toLowerCase()
  const others = list.devices.value.filter((x) => x.slug !== d.slug)
  const found = q
    ? others.filter(
        (x) =>
          x.name.toLowerCase().includes(q) ||
          x.shortDesc.toLowerCase().includes(q) ||
          x.catLabel.toLowerCase().includes(q) ||
          (x.model ?? '').toLowerCase().includes(q) ||
          (x.manufacturer ?? '').toLowerCase().includes(q),
      )
    : [...others.filter((x) => x.cat === d.cat), ...others.filter((x) => x.cat !== d.cat)]
  return found.slice(0, 4)
})
const relatedLoading = computed(() => list.loading.value && !list.data.value)

/* ── compartilhar ── */
const copied = ref(false)
let copiedT = 0
async function share() {
  const url = window.location.href
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: device.value?.name, url })
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
  <div class="em-device-page">
    <!-- ════════ CARREGANDO ════════ -->
    <template v-if="!device && loading">
      <EmPageHero
        key="loading"
        class="em-hero--article"
        :eyebrow="t('state.loading')"
        :trail="[{ label: t('header.nav.equipment'), to: '/equipment' }]"
        title=""
      >
        <template #title>
          <div class="em-skel-hero" aria-hidden="true">
            <span class="em-skel em-skel--hero" style="width: 82%" />
            <span class="em-skel em-skel--hero" style="width: 54%" />
          </div>
        </template>
        <template #lead>
          <span
            class="em-skel em-skel--line"
            style="width: 280px; max-width: 70vw"
            aria-hidden="true"
          />
        </template>
      </EmPageHero>
      <section class="em-section em-product">
        <div class="em-wrap em-product__grid">
          <EmSkeleton kind="prose" :count="3" />
          <EmSkeleton kind="media" />
        </div>
      </section>
    </template>

    <!-- ════════ NÃO ENCONTRADO / ERRO ════════ -->
    <section v-else-if="!device" class="em-section em-section--state">
      <div class="em-wrap">
        <EmState
          v-if="error?.notFound"
          kind="notfound"
          :title="t('state.equipmentNotFound')"
          :text="t('state.notFoundText')"
          back-to="/equipment"
          :back-label="t('equipmentPage.detail.viewAllEquipment')"
        />
        <EmState
          v-else
          kind="error"
          :title="t('state.equipmentItemError')"
          :text="t('state.errorText')"
          :error="error"
          back-to="/equipment"
          :back-label="t('equipmentPage.detail.viewAllEquipment')"
          @retry="reload"
        />
      </div>
    </section>

    <template v-else>
      <!-- ════════ HERO ════════ -->
      <EmPageHero
        :key="device.slug"
        class="em-hero--article"
        :eyebrow="device.catLabel"
        :trail="[{ label: t('header.nav.equipment'), to: '/equipment' }]"
        :title="device.name"
        :subtitle="device.shortDesc"
      >
        <template #lead>
          <ul class="em-hero__specs">
            <li v-if="device.model">
              <Package :stroke-width="1.8" aria-hidden="true" />{{ device.model }}
            </li>
            <li v-for="c in device.connectivity" :key="c">
              <component :is="connIcon(c)" :stroke-width="1.8" aria-hidden="true" />{{ c }}
            </li>
            <li v-for="c in device.certifications" :key="c">
              <ShieldCheck :stroke-width="1.8" aria-hidden="true" />{{ c }}
            </li>
          </ul>
        </template>
        <template #visual>
          <div class="em-devhero em-card">
            <EmDeviceMedia :device="device" size="lg" />
          </div>
        </template>
        <template #actions>
          <EmButton
            to="/equipment"
            variant="ghost"
            :label="t('equipmentPage.detail.viewAllEquipment')"
          />
          <EmButton :href="calendlyUrl" :label="t('equipmentPage.cta.button.primary')" />
        </template>
      </EmPageHero>

      <!-- ════════ DISPOSITIVO ════════ -->
      <section class="em-section em-product">
        <div class="em-wrap em-product__grid">
          <div class="em-product__main">
            <template v-if="device.features.length">
              <span v-reveal class="em-eyebrow">{{ t('equipmentPage.detail.features') }}</span>
              <ul class="em-product__feats">
                <li
                  v-for="(f, i) in device.features"
                  :key="f"
                  v-reveal="i * 80"
                  v-spot
                  class="em-card"
                >
                  <span class="em-ico em-ico--brand"
                    ><Check :stroke-width="2" aria-hidden="true"
                  /></span>
                  <small>{{ pad(i + 1) }}</small>
                  <b>{{ f }}</b>
                </li>
              </ul>
            </template>

            <!-- galeria: foto principal + miniaturas -->
            <div v-if="device.photos.length > 1" class="em-gallery">
              <span v-reveal class="em-eyebrow">{{ t('equipmentPage.detail.gallery') }}</span>
              <div v-reveal:scale class="em-gallery__main em-card">
                <EmDeviceMedia
                  :device="device"
                  :src="currentPhoto"
                  size="lg"
                  :alt="
                    t('equipmentPage.detail.photoOf', {
                      name: device.name,
                      n: photoIdx + 1,
                      total: device.photos.length,
                    })
                  "
                />
              </div>
              <div
                v-reveal="120"
                class="em-gallery__thumbs"
                role="group"
                :aria-label="t('equipmentPage.detail.gallery')"
              >
                <button
                  v-for="(src, i) in device.photos"
                  :key="src"
                  type="button"
                  class="em-gallery__thumb"
                  :class="{ 'is-active': i === photoIdx }"
                  :aria-pressed="i === photoIdx ? 'true' : 'false'"
                  :aria-label="
                    t('equipmentPage.detail.photoN', { n: i + 1, total: device.photos.length })
                  "
                  @click="photoIdx = i"
                >
                  <img :src="src" alt="" loading="lazy" decoding="async" />
                </button>
              </div>
            </div>

            <div v-if="device.fullDesc" class="em-product__about">
              <span v-reveal class="em-eyebrow">{{ t('equipmentPage.detail.allFeatures') }}</span>
              <EmSplit
                class="em-h2"
                :text="t('equipmentPage.detail.about')"
                :em="t('equipmentPage.detail.aboutEm')"
              />
              <!-- eslint-disable-next-line vue/no-v-html -- HTML sanitizado pela API do BackOffice -->
              <article v-reveal class="em-prose em-prose--plain" v-html="device.fullDesc" />
            </div>
          </div>

          <aside class="em-product__aside">
            <div v-reveal:scale class="em-product__panel em-card">
              <EmDeviceMedia :device="device" size="lg" :alt="device.name" />
              <dl class="em-product__specs">
                <div v-if="device.model">
                  <dt>{{ t('equipmentPage.detail.model') }}</dt>
                  <dd>
                    <span class="em-conn"
                      ><Package :stroke-width="1.8" aria-hidden="true" />{{ device.model }}</span
                    >
                  </dd>
                </div>
                <div v-if="device.manufacturer">
                  <dt>{{ t('equipmentPage.detail.manufacturer') }}</dt>
                  <dd>
                    <span class="em-conn"
                      ><Factory :stroke-width="1.8" aria-hidden="true" />{{
                        device.manufacturer
                      }}</span
                    >
                  </dd>
                </div>
                <div>
                  <dt>{{ t('equipmentPage.categories.badge') }}</dt>
                  <dd>{{ device.catLabel }}</dd>
                </div>
                <div v-if="device.connectivity.length">
                  <dt>{{ t('equipmentPage.compatibility.badge') }}</dt>
                  <dd>
                    <span v-for="c in device.connectivity" :key="c" class="em-conn"
                      ><component :is="connIcon(c)" :stroke-width="1.8" aria-hidden="true" />{{
                        c
                      }}</span
                    >
                  </dd>
                </div>
                <div v-if="device.certifications.length">
                  <dt>{{ t('equipmentPage.cert.badge') }}</dt>
                  <dd>
                    <span v-for="c in device.certifications" :key="c" class="em-chip">{{ c }}</span>
                  </dd>
                </div>
              </dl>
            </div>

            <div v-reveal="120" class="em-product__cta em-card">
              <EmSplit
                tag="h3"
                :text="t('equipmentPage.detail.ctaTitle')"
                :em="t('equipmentPage.detail.ctaTitleEm')"
              />
              <p>{{ t('equipmentPage.detail.ctaDesc') }}</p>
              <EmButton
                :href="calendlyUrl"
                variant="dark"
                block
                :label="t('equipmentPage.detail.contactButton')"
              />
              <button type="button" class="em-share" @click="share">
                <Share2 :stroke-width="1.7" aria-hidden="true" />
                <span aria-live="polite">{{
                  copied ? t('blogPage.detail.copied') : t('equipmentPage.detail.share')
                }}</span>
              </button>
            </div>
          </aside>
        </div>
      </section>

      <!-- ════════ OUTROS EQUIPAMENTOS ════════ -->
      <section
        v-if="relatedLoading || list.error.value || list.devices.value.length > 1"
        id="outros"
        class="em-section em-section--tint"
      >
        <div class="em-wrap">
          <div class="em-head">
            <div>
              <span v-reveal class="em-eyebrow">{{ t('equipmentPage.detail.relatedBadge') }}</span>
              <EmSplit
                :text="t('equipmentPage.detail.relatedTitle')"
                :em="t('equipmentPage.detail.relatedTitleEm')"
              />
            </div>
            <div v-reveal="150" class="em-head__side em-head__side--wide">
              <label class="em-search">
                <Search :stroke-width="1.8" aria-hidden="true" />
                <span class="sr-only">{{ t('equipmentPage.detail.searchPlaceholder') }}</span>
                <input
                  v-model="searchQuery"
                  type="search"
                  autocomplete="off"
                  :placeholder="t('equipmentPage.detail.searchPlaceholder')"
                />
                <button
                  v-if="searchQuery"
                  type="button"
                  class="em-search__clear"
                  :aria-label="t('blogPage.articles.clear')"
                  @click="searchQuery = ''"
                >
                  <X :stroke-width="2" aria-hidden="true" />
                </button>
              </label>
            </div>
          </div>

          <EmSkeleton v-if="relatedLoading" kind="devices" :count="4" />
          <EmState
            v-else-if="list.error.value"
            kind="error"
            :title="t('state.equipmentError')"
            :text="t('state.errorText')"
            :error="list.error.value"
            @retry="list.reload"
          />
          <div v-else-if="related.length" class="em-devices">
            <EmDeviceCard
              v-for="(d, i) in related"
              :key="d.id"
              v-reveal="i * 80"
              v-spot
              :device="d"
            />
          </div>
          <div v-else class="em-empty em-card">
            <span class="em-ico" aria-hidden="true"><Search :stroke-width="1.7" /></span>
            <p>{{ t('equipmentPage.detail.empty') }}</p>
          </div>

          <div v-reveal class="em-center">
            <EmButton
              to="/equipment"
              variant="ghost"
              :label="t('equipmentPage.detail.viewAllEquipment')"
            />
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
