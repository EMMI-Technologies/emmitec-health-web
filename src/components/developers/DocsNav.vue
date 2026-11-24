<script setup lang="ts">
/** Menu das docs (lateral no desktop, gaveta no celular). */
import { useRoute } from 'vue-router'
import { Download } from 'lucide-vue-next'
import { NAV, slugFromPath } from '@/lib/developers/nav'
import { useDocsLang } from '@/lib/developers/lang'
import { OPENAPI_URL, POSTMAN_URL } from '@/content/developers/ui'

const emit = defineEmits<{ navigate: [] }>()
const route = useRoute()
const { lang, t } = useDocsLang()

const isActive = (slug: string) => slugFromPath(route.path) === slug
</script>

<template>
  <nav class="dx-nav" :aria-label="t('developers')">
    <div v-for="section in NAV" :key="section.title.en" class="dx-nav__group">
      <p class="dx-nav__title">{{ section.title[lang] }}</p>
      <ul>
        <li v-for="item in section.items" :key="item.slug">
          <RouterLink
            :to="item.path"
            class="dx-nav__link"
            :class="{ 'is-active': isActive(item.slug) }"
            :aria-current="isActive(item.slug) ? 'page' : undefined"
            @click="emit('navigate')"
          >
            {{ item.title[lang] }}
          </RouterLink>
        </li>
      </ul>
    </div>
    <div class="dx-nav__group">
      <p class="dx-nav__title">{{ t('downloads') }}</p>
      <ul>
        <li>
          <a class="dx-nav__link dx-nav__file" :href="OPENAPI_URL" download="emmitec-partner-api-openapi.json">
            <Download :size="14" :stroke-width="1.8" aria-hidden="true" />{{ t('openapi') }}
          </a>
        </li>
        <li>
          <a class="dx-nav__link dx-nav__file" :href="POSTMAN_URL" download="emmitec-partner-api.postman_collection.json">
            <Download :size="14" :stroke-width="1.8" aria-hidden="true" />{{ t('postman') }}
          </a>
        </li>
      </ul>
    </div>
  </nav>
</template>
