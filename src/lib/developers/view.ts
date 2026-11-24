/*
 * As docs convivem com o movimento do site (src/lib/motion.ts e pageTransition.ts) sem
 * herdar o que atrapalha leitura técnica:
 *
 * - Rolagem nativa: a raiz das docs (e os painéis teleportados) têm `data-native-scroll`,
 *   que a rolagem amortecida respeita na roda do mouse. O teclado é escutado na window;
 *   aqui um ouvinte no document segura as teclas de rolagem antes de chegarem lá.
 * - Troca de página: o App anima toda troca de endereço (cortina, ~1,7 s). Entre páginas
 *   das docs a troca é instantânea: a view que sai e a que entra ficam sem `animate`, e o
 *   pageTransition cai no caminho sem animação. Sair das docs para o site continua animado.
 * - Barra de progresso e desfoque da borda de baixo do site somem enquanto as docs estão na tela.
 */
import { RM, stopSmoothScroll } from '@/lib/motion'

const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'])

let mounted = 0
function onKey(e: KeyboardEvent) {
  if (SCROLL_KEYS.has(e.key)) e.stopPropagation()
}

/** Chamado ao montar o layout das docs (contador: a view nova monta antes de a velha sair). */
export function enterDocs() {
  mounted++
  if (mounted === 1) {
    document.documentElement.classList.add('dx-on')
    document.addEventListener('keydown', onKey)
  }
}

export function leaveDocs() {
  mounted = Math.max(0, mounted - 1)
  if (mounted === 0) {
    document.documentElement.classList.remove('dx-on')
    document.removeEventListener('keydown', onKey)
  }
}

/** Rolagem do menu lateral entre páginas (o layout é recriado a cada troca). */
export const sideMemory = { y: 0 }

/* ---------- troca instantânea entre páginas das docs ---------- */
let instantNext = false

function withoutAnimate(view: HTMLElement) {
  Object.defineProperty(view, 'animate', { value: undefined, configurable: true, writable: true })
}

/** Antes de trocar de página dentro das docs: a view atual sai sem animação. */
export function prepareInstantSwap(root: HTMLElement | null) {
  const view = root?.closest<HTMLElement>('.em-view')
  if (view) withoutAnimate(view)
  instantNext = true
}

/** Ao montar a view nova: entra sem animação (e volta ao normal logo depois). */
export function settleInstantSwap(root: HTMLElement | null) {
  if (!instantNext) return
  instantNext = false
  const view = root?.closest<HTMLElement>('.em-view')
  if (!view) return
  withoutAnimate(view)
  view.style.transform = ''
  // depois do gancho de entrada, a view volta a poder animar (saída para o site)
  window.setTimeout(() => {
    delete (view as { animate?: unknown }).animate
  }, 0)
}

/* ---------- rolagem até um intertítulo ---------- */
function topOffset() {
  const bar = document.querySelector<HTMLElement>('.dx-top')
  return (bar?.getBoundingClientRect().height ?? 64) + 24
}

export function scrollToId(id: string, smooth = true): boolean {
  const el = document.getElementById(id)
  if (!el) return false
  stopSmoothScroll()
  const y = window.scrollY + el.getBoundingClientRect().top - topOffset()
  window.scrollTo({ top: Math.max(0, y), behavior: smooth && !RM ? 'smooth' : 'auto' })
  return true
}

/** Atualiza o #hash sem passar pelo roteador (que rolaria de novo com outro deslocamento). */
export function replaceHash(id: string) {
  const url = `${window.location.pathname}${window.location.search}#${id}`
  window.history.replaceState(window.history.state, '', url)
}

export { topOffset }
