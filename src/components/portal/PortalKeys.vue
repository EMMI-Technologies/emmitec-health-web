<script setup lang="ts">
/**
 * Chaves de API: Teste (sandbox) e Produção. Cada chave: nome, prefixo, criada, último uso,
 * status; Mostrar e Copiar buscam o segredo (GET /portal/keys/{id}/secret) só quando pedido.
 * O cliente não apaga nem revoga chaves aqui (pedido para a EmmiTec).
 */
import { computed, ref } from 'vue'
import { Check, Copy, Eye, EyeOff, Info, Lock, Plus } from 'lucide-vue-next'
import { usePortalLang } from '@/lib/portal/i18n'
import { portalApi, type Mode, type PortalKey } from '@/lib/portal/api'
import { portal, SUPPORT_EMAIL, useFormat } from '@/lib/portal/store'
import { useReveal } from '@/lib/portal/reveal'
import PortalNewKeyModal from './PortalNewKeyModal.vue'
import PortalErrorMsg from './PortalErrorMsg.vue'

const { t } = usePortalLang()
const f = useFormat()
const r = useReveal()
const newFor = ref<Mode | null>(null)

const mail = computed(
  () =>
    `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${t('portal')}: ${portal.integration?.name ?? ''}`)}`,
)

function sorted(keys: PortalKey[]) {
  return [...keys].sort((a, b) => {
    if (!!a.revokedAt !== !!b.revokedAt) return a.revokedAt ? 1 : -1
    return Date.parse(b.createdAt) - Date.parse(a.createdAt)
  })
}

const blocks = computed(() => {
  const i = portal.integration!
  return [
    {
      mode: 'test' as Mode,
      title: t('keys.testTitle'),
      desc: t('keys.testDesc'),
      keys: sorted(i.modes.test.keys),
      locked: false,
    },
    {
      mode: 'live' as Mode,
      title: t('keys.liveTitle'),
      desc: t('keys.liveDesc'),
      keys: i.modes.live ? sorted(i.modes.live.keys) : [],
      locked: !i.modes.live,
    },
  ]
})

const fetchSecret = (id: string) => async () => (await portalApi.keySecret(id)).secret

function onCreated(key: PortalKey) {
  const m = key.mode === 'live' ? portal.integration?.modes.live : portal.integration?.modes.test
  if (m && !m.keys.some((k) => k.id === key.id))
    m.keys.unshift({ ...key, revealable: key.revealable ?? true })
}
</script>

<template>
  <section class="po-section" aria-labelledby="po-keys-title">
    <div class="po-head">
      <div class="po-head__txt">
        <h1 id="po-keys-title" class="po-h1">{{ t('nav.keys') }}</h1>
        <p class="po-lead">{{ t('keys.lead') }}</p>
      </div>
    </div>

    <div
      v-for="(b, bi) in blocks"
      :key="b.mode"
      class="po-block"
      :class="{ 'po-block--first': bi === 0 }"
    >
      <div class="po-block__head">
        <div>
          <h2 class="po-h2">{{ b.title }}</h2>
          <p class="po-sub">{{ b.desc }}</p>
        </div>
        <button v-if="!b.locked" type="button" class="po-btn po-btn--sm" @click="newFor = b.mode">
          <Plus :size="16" :stroke-width="2" aria-hidden="true" />{{ t('keys.new') }}
        </button>
      </div>

      <p v-if="b.locked" class="po-locked">
        <Lock :size="17" :stroke-width="1.8" aria-hidden="true" />
        <span>{{ t('keys.liveLocked') }}</span>
        <a :href="mail">{{ SUPPORT_EMAIL }}</a>
      </p>
      <p v-else-if="!b.keys.length" class="po-empty">{{ t('keys.empty') }}</p>

      <table v-else class="po-table po-table--keys">
        <thead>
          <tr>
            <th scope="col">{{ t('keys.col.label') }}</th>
            <th scope="col">{{ t('keys.col.key') }}</th>
            <th scope="col">{{ t('keys.col.created') }}</th>
            <th scope="col">{{ t('keys.col.lastUsed') }}</th>
            <th scope="col">{{ t('keys.col.status') }}</th>
            <th scope="col">
              <span class="po-sr">{{ t('show') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="k in b.keys" :key="k.id">
            <tr
              :class="{
                'is-revoked': !!k.revokedAt,
                'has-reveal': r.shown.has(k.id) || r.errors.has(k.id),
              }"
            >
              <td class="is-main">
                <span class="po-cell-strong">{{ k.label }}</span>
              </td>
              <td :data-label="t('keys.col.key')">
                <span class="po-key-prefix">{{ k.prefix }}<i aria-hidden="true">••••••••</i></span>
              </td>
              <td :data-label="t('keys.col.created')" class="is-muted">
                {{ f.shortDate(k.createdAt) }}
              </td>
              <td :data-label="t('keys.col.lastUsed')" class="is-muted">
                <span :title="k.lastUsedAt ? f.dateTime(k.lastUsedAt) : undefined">{{
                  k.lastUsedAt ? f.relative(k.lastUsedAt) : t('keys.neverUsed')
                }}</span>
              </td>
              <td :data-label="t('keys.col.status')">
                <span
                  v-if="k.revokedAt"
                  class="po-chip po-chip--muted"
                  :title="f.dateTime(k.revokedAt)"
                  >{{ t('keys.status.revoked') }}</span
                >
                <span v-else class="po-chip po-chip--ok">{{ t('keys.status.active') }}</span>
              </td>
              <td class="is-actions">
                <span v-if="!k.revokedAt && k.revealable" class="po-actions">
                  <button
                    type="button"
                    class="po-mini"
                    :disabled="r.busy.value === `${k.id}:show`"
                    :aria-expanded="r.shown.has(k.id)"
                    @click="r.toggle(k.id, fetchSecret(k.id))"
                  >
                    <EyeOff
                      v-if="r.shown.has(k.id)"
                      :size="15"
                      :stroke-width="1.8"
                      aria-hidden="true"
                    />
                    <Eye v-else :size="15" :stroke-width="1.8" aria-hidden="true" />
                    {{ r.shown.has(k.id) ? t('hide') : t('show') }}
                  </button>
                  <button
                    type="button"
                    class="po-mini"
                    :class="{ 'is-done': r.copied.value === k.id }"
                    :disabled="r.busy.value === `${k.id}:copy`"
                    @click="r.copy(k.id, fetchSecret(k.id))"
                  >
                    <Check
                      v-if="r.copied.value === k.id"
                      :size="15"
                      :stroke-width="2"
                      aria-hidden="true"
                    />
                    <Copy v-else :size="15" :stroke-width="1.8" aria-hidden="true" />
                    {{ r.copied.value === k.id ? t('copied') : t('copy') }}
                  </button>
                </span>
                <span
                  v-else-if="!k.revokedAt"
                  class="po-unrevealable"
                  :title="t('keys.notRevealable')"
                >
                  <Info :size="14" :stroke-width="1.8" aria-hidden="true" />{{
                    t('keys.notRevealableShort')
                  }}
                </span>
              </td>
            </tr>
            <tr v-if="r.shown.has(k.id) || r.errors.has(k.id)" class="po-reveal-row">
              <td colspan="6" class="is-plain">
                <div v-if="r.shown.has(k.id)" class="po-secret">
                  <code class="po-secret__val" :aria-label="k.label">{{ r.value(k.id) }}</code>
                </div>
                <PortalErrorMsg v-else :error="r.errors.get(k.id) ?? null" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <p class="po-keys-footer">
      <Info :size="16" :stroke-width="1.8" aria-hidden="true" />
      <span
        >{{ t('keys.revokeNote') }} <a :href="mail">{{ SUPPORT_EMAIL }}</a></span
      >
    </p>

    <PortalNewKeyModal :mode="newFor" @close="newFor = null" @created="onCreated" />
  </section>
</template>
