<script setup lang="ts">
/**
 * Esqueletos com a mesma forma dos blocos reais (cards de dispositivo, cards de
 * artigo, destaque do blog, abas, corpo de texto), para a página não pular quando
 * o conteúdo da API chega. Brilho suave; parado com movimento reduzido.
 */
import { useI18n } from 'vue-i18n'

withDefaults(
  defineProps<{
    kind: 'devices' | 'posts' | 'feature' | 'tabs' | 'prose' | 'media'
    count?: number
  }>(),
  { count: 4 },
)

const { t } = useI18n()
</script>

<template>
  <div class="em-skel-wrap" role="status" aria-live="polite">
    <span class="sr-only">{{ t('state.loading') }}</span>

    <div v-if="kind === 'devices'" class="em-devices" aria-hidden="true">
      <div v-for="i in count" :key="i" class="em-device em-card">
        <span class="em-skel em-skel--screen" />
        <div class="em-device__body">
          <span class="em-skel em-skel--line" style="width: 38%" />
          <span class="em-skel em-skel--title" style="width: 78%" />
          <span class="em-skel em-skel--line" />
          <span class="em-skel em-skel--line" style="width: 64%" />
          <div class="em-device__foot">
            <span class="em-skel em-skel--pill" />
            <span class="em-skel em-skel--dot" />
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="kind === 'posts'" class="em-posts em-posts--grid" aria-hidden="true">
      <div v-for="i in count" :key="i" class="em-post em-card">
        <span class="em-skel em-skel--cover" />
        <div class="em-post__body">
          <span class="em-skel em-skel--line" style="width: 40%" />
          <span class="em-skel em-skel--title" style="width: 88%" />
          <span class="em-skel em-skel--title" style="width: 60%" />
          <span class="em-skel em-skel--line" />
          <span class="em-skel em-skel--line" style="width: 72%" />
        </div>
      </div>
    </div>

    <div v-else-if="kind === 'feature'" class="em-skel-feat em-card" aria-hidden="true">
      <span class="em-skel em-skel-feat__art" />
      <div class="em-skel-feat__body">
        <span class="em-skel em-skel--h" style="width: 92%" />
        <span class="em-skel em-skel--h" style="width: 70%" />
        <span class="em-skel em-skel--line" />
        <span class="em-skel em-skel--line" style="width: 84%" />
        <span class="em-skel em-skel--line" style="width: 56%" />
        <span class="em-skel-feat__author">
          <span class="em-skel em-skel--dot" />
          <span class="em-skel em-skel--line" style="width: 40%" />
        </span>
      </div>
    </div>

    <div v-else-if="kind === 'tabs'" class="em-skel-tabs" aria-hidden="true">
      <span v-for="i in count" :key="i" class="em-skel em-skel--tab" />
    </div>

    <div v-else-if="kind === 'media'" aria-hidden="true">
      <span class="em-skel em-skel--media" />
    </div>

    <div v-else class="em-skel-prose" aria-hidden="true">
      <template v-for="i in count" :key="i">
        <span class="em-skel em-skel--line" />
        <span class="em-skel em-skel--line" />
        <span class="em-skel em-skel--line" style="width: 76%" />
        <span class="em-skel-prose__gap" />
      </template>
    </div>
  </div>
</template>
