<script setup lang="ts">
/**
 * SDK do app (@emmitec/rpm): o passo a passo para o time do parceiro ter acesso ao pacote privado, instalar,
 * configurar o EAS e o que rodar quando algo não funciona. Spec: docs/specs/2026/q4/q4-2/sdk-privado-no-npm.md.
 */
import { computed } from 'vue'
import { ArrowRight, Check, Copy, Mail } from 'lucide-vue-next'
import { usePortalLang } from '@/lib/portal/i18n'
import { copyText, docsHref, portal, showToast, SUPPORT_EMAIL } from '@/lib/portal/store'

/** Versão publicada do @emmitec/rpm (mudar junto com o CHANGELOG do SDK). */
const SDK_VERSION = '1.2.0'

const { t } = usePortalLang()

const accessMail = computed(() => {
  const company = portal.integration?.name ?? ''
  const subject = t('sdk.mailSubject', { company })
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(t('sdk.mailBody'))}`
})

const install = `npm login
npx expo install @emmitec/rpm react-native-ble-manager @react-native-async-storage/async-storage expo-secure-store expo-crypto
npx @emmitec/rpm doctor`
const eas = `eas env:create --name NPM_TOKEN --value <token> --visibility secret --environment production
eas env:create --name NPM_TOKEN --value <token> --visibility secret --environment preview
eas env:create --name NPM_TOKEN --value <token> --visibility secret --environment development`
const migrate = `npx @emmitec/rpm init`

const tools = computed(() =>
  (['doctor', 'ping', 'support', 'devices'] as const).map((c) => ({ cmd: `npx @emmitec/rpm ${c}`, desc: t(`sdk.tool.${c}`) })),
)

async function copy(text: string) {
  showToast((await copyText(text)) ? t('copied') : t('sdk.copyFailed'), 'ok')
}
</script>

<template>
  <section class="po-section" aria-labelledby="po-sdk-title">
    <div class="po-head">
      <div class="po-head__txt">
        <h1 id="po-sdk-title" class="po-h1">{{ t('sdk.title') }}</h1>
        <p class="po-lead">{{ t('sdk.lead', { v: SDK_VERSION }) }}</p>
      </div>
    </div>

    <ol class="po-sdk">
      <li>
        <span class="po-sdk__n" aria-hidden="true">1</span>
        <div class="po-sdk__body">
          <h2 class="po-h2">{{ t('sdk.s1') }}</h2>
          <p class="po-sub">{{ t('sdk.s1Text') }}</p>
          <a :href="accessMail" class="po-btn po-btn--line po-sdk__btn">
            <Mail :size="16" :stroke-width="1.8" aria-hidden="true" />{{ t('sdk.s1Button') }}
          </a>
          <p class="po-note">{{ t('sdk.s1Note') }}</p>
        </div>
      </li>
      <li>
        <span class="po-sdk__n" aria-hidden="true">2</span>
        <div class="po-sdk__body">
          <h2 class="po-h2">{{ t('sdk.s2') }}</h2>
          <p class="po-sub">{{ t('sdk.s2Text') }}</p>
          <div class="po-cmd">
            <div class="po-cmd__bar">
              <span>Terminal</span>
              <button type="button" class="po-cmd__copy" @click="copy(install)">
                <Copy :size="14" :stroke-width="1.8" aria-hidden="true" />{{ t('copy') }}
              </button>
            </div>
            <pre><code>{{ install }}</code></pre>
          </div>
          <p class="po-note">
            {{ t('sdk.s2Migrate') }} <code class="po-inline">{{ migrate }}</code>
          </p>
        </div>
      </li>
      <li>
        <span class="po-sdk__n" aria-hidden="true">3</span>
        <div class="po-sdk__body">
          <h2 class="po-h2">{{ t('sdk.s3') }}</h2>
          <p class="po-sub">{{ t('sdk.s3Text') }}</p>
          <div class="po-cmd">
            <div class="po-cmd__bar">
              <span>Terminal</span>
              <button type="button" class="po-cmd__copy" @click="copy(eas)">
                <Copy :size="14" :stroke-width="1.8" aria-hidden="true" />{{ t('copy') }}
              </button>
            </div>
            <pre><code>{{ eas }}</code></pre>
          </div>
          <p class="po-note">{{ t('sdk.s3Note') }}</p>
        </div>
      </li>
      <li>
        <span class="po-sdk__n" aria-hidden="true">4</span>
        <div class="po-sdk__body">
          <h2 class="po-h2">{{ t('sdk.s4') }}</h2>
          <p class="po-sub">{{ t('sdk.s4Text') }}</p>
          <ul class="po-sdk__tools">
            <li v-for="tool in tools" :key="tool.cmd">
              <button type="button" class="po-sdk__tool" :title="t('copy')" @click="copy(tool.cmd)">
                <code>{{ tool.cmd }}</code>
                <Check :size="14" :stroke-width="2" aria-hidden="true" class="po-sdk__tool-ok" />
              </button>
              <span>{{ tool.desc }}</span>
            </li>
          </ul>
          <p class="po-note">{{ t('sdk.s4App') }} <code class="po-inline">await EmmiTec.support.text()</code></p>
        </div>
      </li>
    </ol>

    <p class="po-note po-sdk__docs">
      <RouterLink :to="docsHref('sdk')" class="po-link"
        >{{ t('sdk.docs') }}
        <ArrowRight :size="14" :stroke-width="2" aria-hidden="true" style="display: inline; vertical-align: -2px"
      /></RouterLink>
    </p>
  </section>
</template>
