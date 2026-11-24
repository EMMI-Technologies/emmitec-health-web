<script setup lang="ts">
/** "Nesta página": acompanha a rolagem e leva até a seção. */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { addFx } from '@/lib/motion'
import { replaceHash, scrollToId, topOffset } from '@/lib/developers/view'
import type { TocItem } from '@/lib/developers/types'

const props = defineProps<{ items: TocItem[]; title: string }>()
const active = ref('')

let off: (() => void) | null = null
let lastY = -1

function update(force = false) {
  const y = window.scrollY
  if (!force && y === lastY) return
  lastY = y
  const line = topOffset() + 16
  let current = props.items[0]?.id ?? ''
  for (const item of props.items) {
    const el = document.getElementById(item.id)
    if (!el) continue
    if (el.getBoundingClientRect().top <= line) current = item.id
    else break
  }
  // no fim da página, a última seção curta também acende
  const atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 4
  if (atEnd && props.items.length) current = props.items[props.items.length - 1]!.id
  if (current !== active.value) active.value = current
}

onMounted(() => {
  off = addFx(() => {
    update()
  })
  requestAnimationFrame(() => update(true))
})
onBeforeUnmount(() => off?.())
watch(
  () => props.items,
  () => requestAnimationFrame(() => update(true)),
)

function go(id: string) {
  if (scrollToId(id)) {
    replaceHash(id)
    active.value = id
  }
}
</script>

<template>
  <nav v-if="items.length" class="dx-toc" :aria-label="title">
    <p class="dx-toc__title">{{ title }}</p>
    <ul>
      <li v-for="item in items" :key="item.id" :class="`is-h${item.level}`">
        <a
          :href="`#${item.id}`"
          :class="{ 'is-active': active === item.id }"
          :aria-current="active === item.id ? 'location' : undefined"
          @click.prevent="go(item.id)"
          >{{ item.text }}</a
        >
      </li>
    </ul>
  </nav>
</template>
