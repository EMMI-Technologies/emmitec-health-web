/* ============================================================
   Marcas (fabricantes) que a Emmitec já integra.
   Fonte: GET /public/manufacturers. Enquanto a rota não existir no
   servidor (404), a lista sai do campo `manufacturer` do catálogo de
   equipamentos, só com os nomes (sem logo).
   ============================================================ */
import { computed } from 'vue'
import {
  ApiError,
  publicApi,
  useRemote,
  type Lang,
  type PublicEquipment,
  type PublicManufacturer,
} from './api'

export type Brand = PublicManufacturer

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** "Veridian Healthcare (TeleRPM)" e "Veridian Healthcare" são a mesma marca. */
export function brandsFromEquipment(list: PublicEquipment[]): Brand[] {
  const byName = new Map<string, Brand>()
  for (const e of list) {
    const name = (e.manufacturer ?? '').replace(/\s*\(.*?\)\s*/g, ' ').trim()
    if (!name) continue
    const slug = slugify(name)
    const hit = byName.get(slug)
    if (hit) hit.deviceCount++
    else byName.set(slug, { slug, name, deviceCount: 1, order: 0 })
  }
  return [...byName.values()]
    .sort((a, b) => b.deviceCount - a.deviceCount || a.name.localeCompare(b.name))
    .map((b, i) => ({ ...b, order: i + 1 }))
}

async function loadBrands(lang: Lang, force: boolean): Promise<Brand[]> {
  try {
    return await publicApi.manufacturers(lang, force)
  } catch (e) {
    if (e instanceof ApiError && e.notFound)
      return brandsFromEquipment(await publicApi.equipment(lang, force))
    throw e
  }
}

/** Marcas na ordem do BackOffice; sem nome válido, a marca não entra. */
export function useBrands() {
  const remote = useRemote(loadBrands)
  const brands = computed<Brand[]>(() =>
    (Array.isArray(remote.data.value) ? remote.data.value : [])
      .filter((b) => b && typeof b.name === 'string' && b.name.trim())
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  )
  return { ...remote, brands }
}
