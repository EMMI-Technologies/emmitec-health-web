<script setup lang="ts">
/** Busca das docs (Ctrl/Cmd+K): títulos, seções e endpoints, nos dois idiomas. */
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CornerDownLeft, FileText, Hash, Search } from 'lucide-vue-next'
import { loadIndex, searchDocs, type SearchHit } from '@/lib/developers/search'
import { useDocsLang } from '@/lib/developers/lang'
import { replaceHash, scrollToId } from '@/lib/developers/view'

const open = defineModel<boolean>('open', { required: true })
const route = useRoute()
const router = useRouter()
const { lang, t } = useDocsLang()

const query = ref('')
const active = ref(0)
const input = ref<HTMLInputElement | null>(null)
const list = ref<HTMLElement | null>(null)

const hits = computed(() => (indexVersion.value, searchDocs(query.value, lang.value)))

// o índice vem do backend com a sessão (uma vez por aba); a busca refaz os resultados quando ele chega
const indexVersion = ref(0)
watch(open, async (o) => {
  if (!o) return
  query.value = ''
  active.value = 0
  void loadIndex().then(() => indexVersion.value++)
  await nextTick()
  input.value?.focus()
})
watch(query, () => {
  active.value = 0
})

function go(hit: SearchHit | undefined) {
  if (!hit) return
  open.value = false
  if (hit.path === route.path) {
    if (hit.hash && scrollToId(hit.hash)) replaceHash(hit.hash)
    else window.scrollTo({ top: 0 })
    return
  }
  router.push({ path: hit.path, hash: hit.hash ? `#${hit.hash}` : '' })
}

function move(d: number) {
  const n = hits.value.length
  if (!n) return
  active.value = (active.value + d + n) % n
  nextTick(() => {
    list.value?.querySelector<HTMLElement>(`[data-i="${active.value}"]`)?.scrollIntoView({ block: 'nearest' })
  })
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    move(1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    move(-1)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    go(hits.value[active.value])
  } else if (e.key === 'Escape') {
    e.preventDefault()
    open.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dx-fade">
      <div v-if="open" class="dx-portal dx-search" data-native-scroll @mousedown.self="open = false">
        <div class="dx-search__panel" role="dialog" aria-modal="true" :aria-label="t('search')" :lang="lang">
          <div class="dx-search__field">
            <Search :size="18" :stroke-width="1.8" aria-hidden="true" />
            <input
              ref="input"
              v-model="query"
              type="search"
              :placeholder="t('searchPlaceholder')"
              :aria-label="t('search')"
              autocomplete="off"
              spellcheck="false"
              aria-controls="dx-search-results"
              :aria-activedescendant="hits.length ? `dx-hit-${active}` : undefined"
              @keydown="onKey"
            />
            <kbd class="dx-kbd">Esc</kbd>
          </div>
          <div id="dx-search-results" ref="list" class="dx-search__results" role="listbox">
            <p v-if="query.trim() && !hits.length" class="dx-search__empty">
              {{ t('searchEmpty') }} "{{ query.trim() }}". {{ t('searchHint') }}
            </p>
            <p v-else-if="!query.trim()" class="dx-search__empty">{{ t('searchHint') }}</p>
            <button
              v-for="(hit, i) in hits"
              :id="`dx-hit-${i}`"
              :key="hit.key"
              type="button"
              role="option"
              class="dx-hit"
              :class="{ 'is-active': i === active }"
              :aria-selected="i === active"
              :data-i="i"
              @mousemove="active = i"
              @click="go(hit)"
            >
              <span class="dx-hit__icon" aria-hidden="true">
                <FileText v-if="hit.kind === 'page'" :size="16" :stroke-width="1.7" />
                <Hash v-else :size="16" :stroke-width="1.7" />
              </span>
              <span class="dx-hit__text">
                <span v-if="hit.label" class="dx-hit__label" :class="{ 'is-code': hit.kind === 'endpoint' }">{{ hit.label }}</span>
                <span :class="hit.label ? 'dx-hit__page' : 'dx-hit__label'">{{ hit.pageTitle }}</span>
              </span>
              <CornerDownLeft v-if="i === active" class="dx-hit__enter" :size="15" :stroke-width="1.7" aria-hidden="true" />
            </button>
          </div>
          <div class="dx-search__foot" aria-hidden="true">
            <span><kbd class="dx-kbd">↑</kbd><kbd class="dx-kbd">↓</kbd> {{ t('searchNavigate') }}</span>
            <span><kbd class="dx-kbd">Enter</kbd> {{ t('searchOpen') }}</span>
            <span><kbd class="dx-kbd">Esc</kbd> {{ t('searchClose') }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
