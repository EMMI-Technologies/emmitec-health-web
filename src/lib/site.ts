/* Dados compartilhados do site (links externos, idiomas, redes). */
import { computed } from 'vue'
import { Facebook, Instagram, Linkedin, Youtube } from 'lucide-vue-next'
// só as três bandeiras usadas (o CSS completo do flag-icons embutia ~400 SVGs no bundle)
import flagBr from 'flag-icons/flags/4x3/br.svg'
import flagGb from 'flag-icons/flags/4x3/gb.svg'
// Espanha simplificada: a oficial (com o brasão) pesa ~80 kB para um ícone de 16px
import flagEs from '@/assets/flags/es.svg'

/** Link do Calendly já aberto no mês atual. */
export const calendlyUrl = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `https://calendly.com/emilio-machado-emmitec-health/vamos-nos-reunir-agende-sua-reuniao-online?month=${year}-${month}`
})

export const languages = [
  { code: 'pt', label: 'PT', flag: flagBr },
  { code: 'en', label: 'EN', flag: flagGb },
  { code: 'es', label: 'ES', flag: flagEs },
] as const

/** Escritórios — os mesmos em todos os idiomas; só o nome do país é traduzido (`footer.countries`). */
export const addresses = [
  { country: 'br', text: 'Rua Primeiro de Maio, 442, Pinhais, PR 83323-020' },
  { country: 'us', text: '105 Boniface Drive, Rochester, NY 14620' },
  { country: 'uk', text: 'Innovation Centre, Gallows Hill, Warwick CV34 6UW' },
] as const

/** Canal público de contato (também recebe as solicitações sobre dados pessoais). */
export const CONTACT_EMAIL = 'contato@emmitec.health'

/** Plataforma (acesso e cadastro) — o mesmo destino do Linktree oficial. */
export const PLATFORM_URL = 'https://app.emmitec.health'

/** WhatsApp comercial (Brasil). */
export const whatsapp = {
  display: '+55 41 9229-9940',
  href: 'https://api.whatsapp.com/send?phone=554192299940',
}

export const socialLinks = [
  { name: 'Facebook', href: 'https://www.facebook.com/emmitechealth', icon: Facebook },
  { name: 'Instagram', href: 'https://www.instagram.com/emmitec.health/', icon: Instagram },
  { name: 'LinkedIn', href: 'https://www.linkedin.com/company/emmitechealth/', icon: Linkedin },
  { name: 'YouTube', href: 'https://www.youtube.com/@emmiTec.Health', icon: Youtube },
]

export const LOGO_SRC = '/Logo Emmitec Horizontal.png'
