<script setup lang="ts">
/** Menu das docs (lateral no desktop, gaveta no celular). Os downloads vêm do backend com a sessão. */
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { Download } from 'lucide-vue-next'
import { NAV, slugFromPath } from '@/lib/developers/nav'
import { useDocsLang } from '@/lib/developers/lang'
import { downloadDocsFile } from '@/lib/developers/files'
import type { DocsFileName } from '@/lib/portal/api'

const emit = defineEmits<{ navigate: [] }>()
const route = useRoute()
const { lang, t } = useDocsLang()

const isActive = (slug: string) => slugFromPath(route.path) === slug

const busy = ref<DocsFileName | ''>('')
const failed = ref(false)
async function download(name: DocsFileName) {
  if (busy.value) return
  busy.value = name
  failed.value = false
  try {
    await downloadDocsFile(name)
  } catch {
    failed.value = true
  } finally {
    busy.value = ''
  }
}
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
          <button type="button" class="dx-nav__link dx-nav__file" :disabled="!!busy" @click="download('openapi.json')">
            <Download :size="14" :stroke-width="1.8" aria-hidden="true" />{{ t('openapi') }}
          </button>
        </li>
        <li>
          <button type="button" class="dx-nav__link dx-nav__file" :disabled="!!busy" @click="download('postman.json')">
            <Download :size="14" :stroke-width="1.8" aria-hidden="true" />{{ t('postman') }}
          </button>
        </li>
      </ul>
      <p v-if="busy" class="dx-nav__hint" role="status">{{ t('downloading') }}</p>
      <p v-else-if="failed" class="dx-nav__hint dx-nav__hint--error" role="alert">{{ t('downloadFailed') }}</p>
    </div>
  </nav>
</template>
