/* ============================================================
   Ícones que a API manda pelo nome lucide ("Gauge", "HeartPulse"...).
   Lista explícita (a mesma do BackOffice, mais alguns usados no site)
   para o bundle não carregar a biblioteca inteira. Nome desconhecido
   cai no Activity.
   ============================================================ */
import type { Component } from 'vue'
import {
  Activity,
  Baby,
  Bed,
  Bluetooth,
  Bone,
  Brain,
  Cpu,
  Droplet,
  Dumbbell,
  Ear,
  Eye,
  Footprints,
  Gauge,
  Heart,
  HeartPulse,
  Microscope,
  MonitorSmartphone,
  Nfc,
  Pill,
  Radio,
  Scale,
  ScanLine,
  Signal,
  Smartphone,
  Stethoscope,
  Syringe,
  TestTube,
  Thermometer,
  Timer,
  Usb,
  Watch,
  Waves,
  Wifi,
  Wind,
  Zap,
} from 'lucide-vue-next'

const ICONS: Record<string, Component> = {
  Activity,
  Baby,
  Bed,
  Bone,
  Brain,
  Cpu,
  Droplet,
  Dumbbell,
  Ear,
  Eye,
  Footprints,
  Gauge,
  Heart,
  HeartPulse,
  Microscope,
  MonitorSmartphone,
  Nfc,
  Pill,
  Radio,
  Scale,
  ScanLine,
  Signal,
  Stethoscope,
  Syringe,
  TestTube,
  Thermometer,
  Timer,
  Watch,
  Waves,
  Wind,
  Zap,
}

export function iconFor(name?: string | null): Component {
  return (name && ICONS[name]) || Activity
}

/** Ícone de cada opção de conectividade do BackOffice. */
const CONNECTIVITY: Record<string, Component> = {
  Bluetooth,
  'Wi-Fi': Wifi,
  NFC: Nfc,
  Zigbee: Radio,
  LTE: Signal,
  USB: Usb,
  'Health Connect': Smartphone,
  HealthKit: Smartphone,
}

export function connectivityIcon(name: string): Component {
  return CONNECTIVITY[name] ?? Bluetooth
}
