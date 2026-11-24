/*
 * Mostrar / Copiar segredos (chaves de API e segredo do webhook). O segredo só é buscado quando
 * a pessoa pede, fica em memória durante a sessão e some no "Sair".
 */
import { reactive, ref } from 'vue'
import { copyText, errorView, secrets, showToast, type ErrorView } from './store'
import { usePortalLang } from './i18n'

export function useReveal() {
  const { t } = usePortalLang()
  const shown = reactive(new Set<string>())
  const busy = ref<string | null>(null)
  const copied = ref<string | null>(null)
  const errors = reactive(new Map<string, ErrorView>())
  let copiedT = 0

  async function get(id: string, fetcher: () => Promise<string>): Promise<string | null> {
    const have = secrets.get(id)
    if (have) return have
    try {
      const s = await fetcher()
      secrets.set(id, s)
      errors.delete(id)
      return s
    } catch (e) {
      errors.set(id, errorView(e, { '404': 'err.secret' }))
      return null
    }
  }

  async function toggle(id: string, fetcher: () => Promise<string>) {
    if (shown.has(id)) {
      shown.delete(id)
      return
    }
    busy.value = `${id}:show`
    const s = await get(id, fetcher)
    busy.value = null
    if (s) shown.add(id)
  }

  async function copy(id: string, fetcher: () => Promise<string>) {
    busy.value = `${id}:copy`
    const s = await get(id, fetcher)
    busy.value = null
    if (!s) return
    if (await copyText(s)) {
      copied.value = id
      window.clearTimeout(copiedT)
      copiedT = window.setTimeout(() => (copied.value = null), 1800)
    } else {
      // sem acesso à área de transferência: mostra para copiar à mão
      shown.add(id)
      showToast(t('err.server'), 'error')
    }
  }

  return { shown, busy, copied, errors, toggle, copy, value: (id: string) => secrets.get(id) ?? '' }
}
