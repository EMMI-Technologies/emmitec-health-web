/* ============================================================
   Equipamentos — catálogo vindo da API pública do BackOffice.
   Lista, detalhe e categorias recarregam ao trocar de idioma.
   ============================================================ */
import { computed, type Component } from 'vue'
import { iconFor } from './icons'
import {
  publicApi,
  toneFrom,
  useRemote,
  type PublicEquipment,
  type PublicEquipmentCategory,
} from './api'

export type { Reading } from './api'

/** Equipamento pronto para as telas: ícone resolvido e tom pastel do card. */
export type Device = Omit<PublicEquipment, 'icon'> & {
  icon: Component
  iconName: string
  tone: string
  /** foto principal + galeria, sem repetição */
  photos: string[]
}

export type DeviceCategory = PublicEquipmentCategory & { iconCmp: Component }

export function toDevice(e: PublicEquipment): Device {
  const gallery = Array.isArray(e.gallery) ? e.gallery.filter(Boolean) : []
  const photos = [...new Set([e.image, ...gallery].filter((u): u is string => !!u))]
  return {
    ...e,
    gallery,
    connectivity: e.connectivity ?? [],
    certifications: e.certifications ?? [],
    features: e.features ?? [],
    reading: e.reading ?? null,
    icon: iconFor(e.icon),
    iconName: e.icon,
    tone: toneFrom(e.color),
    photos,
  }
}

/** Catálogo completo (ativos, na ordem do BackOffice). */
export function useDevices() {
  const remote = useRemote((lang, force) => publicApi.equipment(lang, force))
  const devices = computed<Device[]>(() =>
    [...(remote.data.value ?? [])].sort((a, b) => a.order - b.order).map(toDevice),
  )
  return { ...remote, devices }
}

/** Um equipamento pelo slug da rota. */
export function useDevice(slug: () => string) {
  const remote = useRemote((lang, force) => publicApi.equipmentItem(slug(), lang, force), slug)
  const device = computed<Device | null>(() =>
    remote.data.value ? toDevice(remote.data.value) : null,
  )
  return { ...remote, device }
}

/** Categorias do filtro (a aba "Todos" é do site, não vem da API). */
export function useDeviceCategories() {
  const remote = useRemote((lang, force) => publicApi.equipmentCategories(lang, force))
  const categories = computed<DeviceCategory[]>(() =>
    [...(remote.data.value ?? [])]
      .sort((a, b) => a.order - b.order)
      .map((c) => ({ ...c, iconCmp: iconFor(c.icon) })),
  )
  return { ...remote, categories }
}
