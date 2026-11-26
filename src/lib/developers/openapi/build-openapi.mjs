/*
 * EmmiTec Partner API v1: machine-readable description.
 *
 * Source of truth: docs/integracao/partner-api-v1-contrato.md (sections 1 to 4.6, plus v1.1 sections 8.1 to 8.3; the
 * backoffice routes of sections 5 and 8.5, the SDK of section 6 and the customer portal routes of section 8.4
 * (/portal/*, they serve only https://emmitec.health/portal) are not part of this file). If the contract changes,
 * change it there first, then here.
 *
 * v1.1 note: PUT /thresholds and PUT /patients/{id}/thresholds follow the implementation
 * (sr-backend-patients/src/parceiros/limites.ts): every value sent needs its four limits as numbers.
 *
 * Writes, from the same operation list (NOT public: since 26/11/2026 the docs are served by the portal backend only
 * to signed-in partners; `npm run docs:privadas` runs this and copies both files to the backend):
 *   src/content/developers/files/openapi.json                                 (OpenAPI 3.1)
 *   src/content/developers/files/emmitec-partner-api.postman_collection.json  (Postman collection v2.1)
 *
 * Zero dependencies. Run: node src/lib/developers/openapi/build-openapi.mjs
 * The run fails when any output has a non-ASCII character (no long dashes, no typographic quotes).
 */
import { createHmac } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(HERE, '../../../content/developers/files')

// -------------------------------------------------------------------------------------------------------------------
// Constants and example values (taken from the contract)

const API_VERSION = '2026-11-24'
const BASE_URL = 'https://v2-prod-api-patients.emmitec.health/partner/v1'

const REQUEST_ID = 'req_01JDJ3K8Q5R4T6V8X0Z2B4D6F8'
const PATIENT_ID = '3f0c2a8e-7c1d-4a51-9d2e-0c9b1f6a7e21'
const INTEGRATION_ID = '4b1e6d2a-9c3f-4e8b-a1d7-5f2c8e0b3a64'
const EVENT_ID_ALERT = 'evt_9b2c4f0e1a7d4c3b8e6f5a4d3c2b1a09'
const EVENT_ID_CREATED = 'evt_3a7f1c9e2b4d4e8fa1c6b0d9e5f2a7c3'
const EVENT_ID_PING = 'evt_c4d2e8f1a9b34c7e8d1f0a2b6e9c5d70'
const SESSION_TOKEN = 'emst_test_Q7mZ2xK9pL4rT8vB1nW6yC3sD5fG0hJ2kM4aE7uR'
const WEBHOOK_SECRET = 'whsec_N4vX8qL2mR7tY1pK9sD3fG6hJ0wZ5cB8eQ2ua1b2'
const WEBHOOK_URL = 'https://api.acme.example/webhooks/emmitec'

const REQUEST_ID_PATTERN = '^req_[0-9A-Z]{26}$'
const EVENT_ID_PATTERN = '^evt_[0-9a-f]{32}$'
const READING_ID_PATTERN = '^[0-9]+$'
const E164_PATTERN = '^\\+[1-9][0-9]{1,14}$'

const MODES = ['test', 'live']
const LOCALES = ['en', 'pt', 'es']
const SEXES = ['female', 'male', 'other', 'unknown']
const READING_TYPES = ['blood_pressure', 'oxygen_saturation', 'temperature', 'glucose', 'weight']
const LEVELS = ['normal', 'attention_high', 'attention_low', 'critical_high', 'critical_low', 'unknown']
const ALERT_LEVELS = ['attention_high', 'attention_low', 'critical_high', 'critical_low']
const EVALUATED_VALUES = ['systolic', 'diastolic', 'spo2', 'pulse', 'temperature', 'glucose', 'weight']
const SOURCES = ['ble', 'manual', 'integration']
const UNITS = ['mmHg', '%', 'C', 'mg/dL', 'kg']
const GLUCOSE_CONTEXTS = [
  'fasting',
  'before_meal',
  'after_meal',
  'bedtime',
  'after_medication',
  'after_exercise',
  'casual',
  'generic',
]
const PLANS = ['trial', 'active', 'suspended']
/** Types with alert limits (weight is not evaluated). */
const LIMIT_TYPES = ['blood_pressure', 'oxygen_saturation', 'temperature', 'glucose']
/** Values that take limits, per type (contract 8.3). */
const LIMIT_VALUES = ['systolic', 'diastolic', 'pulse', 'spo2', 'temperature', 'glucose']
const SUBSCRIBABLE_EVENTS = ['reading.alert', 'reading.created']
const EVENT_TYPES = ['reading.alert', 'reading.created', 'ping']
const EVENT_STATUSES = ['pending', 'delivered', 'failed']
const ERROR_TYPES = [
  'invalid_request_error',
  'authentication_error',
  'permission_error',
  'rate_limit_error',
  'api_error',
]
const ERROR_CODES = {
  invalid_json: '400: the body is not valid JSON.',
  validation_failed: '400: a field or parameter is invalid (see `param`).',
  unsupported_type: '400: `type` is not one of the supported reading types.',
  unknown_device: '400: `device.model` is not an id from `GET /devices`, `manual` or `other`.',
  unauthorized: '401: token missing, invalid or revoked, or expired.',
  forbidden:
    '403: session token outside its scope, live key when the integration has no live client, live key on a sandbox helper, test key on `PUT /thresholds`, or the integration is suspended.',
  not_found: '404: not found for this integration and mode.',
  conflict:
    '409: conflict, for example an email already used by another person on the client, or no default limits to change for this type.',
  patient_disabled: '422: the patient is disabled for measurements.',
  rate_limited: '429: more than 30 requests per second for this key or session token.',
  internal_error: '500: unexpected error. The message is generic; the requestId is in our logs.',
}

const DELIVERY_TEXT = [
  '**Delivery.** EmmiTec POSTs the event to your URL with `Content-Type: application/json`.',
  'A 2xx answered within 10 seconds means delivered. Anything else is retried with backoff:',
  '1 min, 5 min, 15 min, 1 h, 3 h, 6 h, 12 h (8 attempts total, about 22 h), then the event is marked `failed`',
  '(see `GET /events` and `POST /events/{id}/resend`).',
  'Delivery is at-least-once: dedupe by the event `id`. Order is not guaranteed: use `data.reading.measuredAt`.',
].join(' ')

const VERIFY_TEXT = [
  '**Verify every request.** Read `t` and `v1` from `EmmiTec-Signature`, compute HMAC-SHA256 with your webhook',
  'secret (`whsec_...`) over the string `<t>.<raw body>` (the RAW request body, before any JSON parsing), compare',
  'the hex result with `v1` in constant time, and reject the request when |now - t| is more than 300 seconds.',
].join(' ')

// -------------------------------------------------------------------------------------------------------------------
// Small schema helpers

const ref = (name) => ({ $ref: `#/components/schemas/${name}` })
const withDescription = (name, description) => ({ $ref: `#/components/schemas/${name}`, description })

/** Same schema, also accepting null. */
function nul(schema) {
  if (schema.$ref || schema.oneOf || schema.allOf || schema.anyOf) {
    const { description, ...rest } = schema
    const inner = rest.$ref ? { $ref: rest.$ref } : rest
    return { ...(description ? { description } : {}), oneOf: [inner, { type: 'null' }] }
  }
  const out = { ...schema, type: [schema.type, 'null'] }
  if (schema.enum) out.enum = [...schema.enum, null]
  return out
}

const str = (description, extra = {}) => ({ type: 'string', description, ...extra })
const int = (description, extra = {}) => ({ type: 'integer', description, ...extra })
const num = (description, extra = {}) => ({ type: 'number', description, ...extra })
const bool = (description, extra = {}) => ({ type: 'boolean', description, ...extra })
const uuid = (description, example) => ({ type: 'string', format: 'uuid', description, examples: [example] })
const dateTime = (description, example) => ({ type: 'string', format: 'date-time', description, examples: [example] })
const modeProp = () => ({
  type: 'string',
  enum: MODES,
  description: 'Mode of the key used: `test` (sandbox client) or `live` (your real client).',
  examples: ['test'],
})

function object(description, properties, { required = Object.keys(properties), example, title } = {}) {
  return {
    type: 'object',
    ...(title ? { title } : {}),
    description,
    ...(required.length ? { required } : {}),
    properties,
    ...(example !== undefined ? { examples: [example] } : {}),
  }
}

function listOf(itemSchema, description, example) {
  return object(
    description,
    {
      data: { type: 'array', items: ref(itemSchema), description: 'Items of this page, newest first.' },
      hasMore: bool('true when there are more items after this page.'),
      nextCursor: nul(str('Pass it as `cursor` to get the next page. null when `hasMore` is false.')),
    },
    { example },
  )
}

// -------------------------------------------------------------------------------------------------------------------
// Examples

const CONTRACT_ERROR = {
  type: 'invalid_request_error',
  code: 'validation_failed',
  message: 'values.systolic must be an integer between 40 and 300.',
  param: 'values.systolic',
  requestId: REQUEST_ID,
}

/** 90-day pilot started 2026-11-24T14:00:00Z, seen 3 minutes later. */
const PLAN = { name: 'trial', trialEndsAt: '2027-02-22T14:00:00Z', daysLeft: 90, module: 'rpm' }
const PLAN_ACTIVE = { name: 'active', trialEndsAt: null, daysLeft: null, module: 'rpm' }

const PING_SECRET = {
  ok: true,
  mode: 'test',
  auth: 'secret_key',
  integration: { id: INTEGRATION_ID, name: 'Acme Health' },
  patientId: null,
  serverTime: '2026-11-24T14:03:00Z',
  apiVersion: API_VERSION,
  plan: PLAN,
}
const PING_SESSION = { ...PING_SECRET, auth: 'session_token', patientId: PATIENT_ID }

const PATIENT = {
  id: PATIENT_ID,
  externalId: 'acme-user-123',
  firstName: 'Maria',
  lastName: 'Silva',
  birthDate: '1956-03-14',
  sex: 'female',
  email: null,
  phone: '+15551234567',
  language: 'en',
  heightCm: 162,
  mode: 'test',
  createdAt: '2026-11-24T14:03:00Z',
}
const PATIENT_CREATE = {
  externalId: 'acme-user-123',
  firstName: 'Maria',
  lastName: 'Silva',
  birthDate: '1956-03-14',
  sex: 'female',
  phone: '+15551234567',
  language: 'en',
  heightCm: 162,
}
const PATIENT_UPDATE = { phone: '+15559876543', heightCm: 163 }
const PATIENT_UPDATED = { ...PATIENT, phone: '+15559876543', heightCm: 163 }

const ALERT = {
  level: 'critical_high',
  title: 'Very high blood pressure',
  text: 'Your blood pressure reading was 182/110 mmHg, above your safe range. If you feel unwell, contact your care team or emergency services.',
  reason:
    'Systolic 182 mmHg is at or above the critical limit of 180 mmHg. Diastolic 110 mmHg is at or above the attention limit of 90 mmHg.',
  locale: 'en',
  triggeredBy: [
    { value: 'systolic', measured: 182, unit: 'mmHg', level: 'critical_high', limit: 180 },
    { value: 'diastolic', measured: 110, unit: 'mmHg', level: 'attention_high', limit: 90 },
  ],
}

const READING_INPUT = {
  patientId: PATIENT_ID,
  type: 'blood_pressure',
  measuredAt: '2026-11-24T14:03:00Z',
  values: { systolic: 182, diastolic: 110, pulse: 88 },
  device: { model: 'td3140', serial: 'SN123', mac: 'AA:BB:CC:DD:EE:FF' },
  source: 'ble',
  externalId: 'acme-reading-9981',
}
const READING_INPUT_SESSION = {
  type: 'blood_pressure',
  measuredAt: '2026-11-24T14:20:00Z',
  values: { systolic: 135, diastolic: 85, pulse: 76 },
  device: { model: 'td3140', serial: 'SN123', mac: 'AA:BB:CC:DD:EE:FF' },
  source: 'ble',
  externalId: 'acme-reading-9983',
}
const READING_INPUT_SPO2 = {
  patientId: PATIENT_ID,
  type: 'oxygen_saturation',
  measuredAt: '2026-11-24T15:10:00Z',
  values: { spo2: 97, pulse: 72, perfusionIndex: 3.1 },
  device: { model: 'td8255' },
  source: 'ble',
}
const READING_INPUT_TEMPERATURE = {
  patientId: PATIENT_ID,
  type: 'temperature',
  measuredAt: '2026-11-24T15:20:00Z',
  values: { temperature: 99.1 },
  unit: 'F',
  device: { model: 'td1242' },
  source: 'ble',
}
const READING_INPUT_GLUCOSE = {
  patientId: PATIENT_ID,
  type: 'glucose',
  measuredAt: '2026-11-24T07:30:00Z',
  values: { glucose: 7.2 },
  unit: 'mmol/L',
  context: 'fasting',
  device: { model: 'accuchek' },
  source: 'ble',
}
const READING_INPUT_WEIGHT = {
  patientId: PATIENT_ID,
  type: 'weight',
  measuredAt: '2026-11-24T07:45:00Z',
  values: { weight: 68.4 },
  source: 'manual',
}

/** Reading object without `alert` (what the webhook carries in data.reading). */
const READING_BP_NO_ALERT = {
  id: '2104455',
  patientId: PATIENT_ID,
  type: 'blood_pressure',
  measuredAt: '2026-11-24T14:03:00Z',
  receivedAt: '2026-11-24T14:03:02Z',
  values: { systolic: 182, diastolic: 110, pulse: 88 },
  unit: 'mmHg',
  device: { model: 'td3140', name: 'TaiDoc TD-3140', serial: 'SN123', mac: 'AA:BB:CC:DD:EE:FF' },
  source: 'ble',
  externalId: 'acme-reading-9981',
  level: 'critical_high',
  levels: { systolic: 'critical_high', diastolic: 'attention_high', pulse: 'normal' },
  duplicate: false,
  mode: 'test',
}

/** Puts `alert` back in the contract position (after `levels`). */
function withAlert(reading, alert) {
  const out = {}
  for (const [key, value] of Object.entries(reading)) {
    out[key] = value
    if (key === 'levels') out.alert = alert
  }
  return out
}

const READING_BP = withAlert(READING_BP_NO_ALERT, ALERT)
const READING_BP_DUPLICATE = { ...READING_BP, duplicate: true }
const READING_SPO2_NO_ALERT = {
  id: '2104456',
  patientId: PATIENT_ID,
  type: 'oxygen_saturation',
  measuredAt: '2026-11-24T15:10:00Z',
  receivedAt: '2026-11-24T15:10:01Z',
  values: { spo2: 97, pulse: 72, perfusionIndex: 3.1 },
  unit: '%',
  device: { model: 'td8255', name: 'TaiDoc TD-8255', serial: null, mac: null },
  source: 'ble',
  externalId: null,
  level: 'normal',
  levels: { spo2: 'normal', pulse: 'normal' },
  duplicate: false,
  mode: 'test',
}
const READING_SPO2 = withAlert(READING_SPO2_NO_ALERT, null)
const READING_WEIGHT = withAlert(
  {
    id: '2104457',
    patientId: PATIENT_ID,
    type: 'weight',
    measuredAt: '2026-11-24T07:45:00Z',
    receivedAt: '2026-11-24T07:45:03Z',
    values: { weight: 68.4, bmi: 26.06 },
    unit: 'kg',
    device: { model: 'manual', name: 'Typed by a person', serial: null, mac: null },
    source: 'manual',
    externalId: null,
    level: 'unknown',
    levels: { weight: 'unknown' },
    duplicate: false,
    mode: 'test',
  },
  null,
)
const READING_BP_NORMAL = withAlert(
  {
    id: '2104453',
    patientId: PATIENT_ID,
    type: 'blood_pressure',
    measuredAt: '2026-11-24T08:00:00Z',
    receivedAt: '2026-11-24T14:05:10Z',
    values: { systolic: 128, diastolic: 82, pulse: 70 },
    unit: 'mmHg',
    device: { model: 'td3140', name: 'TaiDoc TD-3140', serial: null, mac: null },
    source: 'ble',
    externalId: 'acme-reading-9979',
    level: 'normal',
    levels: { systolic: 'normal', diastolic: 'normal', pulse: 'normal' },
    duplicate: false,
    mode: 'test',
  },
  null,
)
const READING_SIMULATED = withAlert(
  {
    ...READING_BP_NO_ALERT,
    id: '2104460',
    measuredAt: '2026-11-24T16:00:00Z',
    receivedAt: '2026-11-24T16:00:00Z',
    device: { model: 'other', name: 'Device not in the catalog', serial: null, mac: null },
    source: 'integration',
    externalId: 'sim_7c1d4a519d2e',
  },
  ALERT,
)

const BATCH_REQUEST = {
  patientId: PATIENT_ID,
  readings: [
    {
      type: 'blood_pressure',
      measuredAt: '2026-11-24T08:00:00Z',
      values: { systolic: 128, diastolic: 82, pulse: 70 },
      device: { model: 'td3140' },
      source: 'ble',
      externalId: 'acme-reading-9979',
    },
    {
      type: 'blood_pressure',
      measuredAt: '2026-11-24T14:03:00Z',
      values: { systolic: 182, diastolic: 110, pulse: 88 },
      device: { model: 'td3140', serial: 'SN123', mac: 'AA:BB:CC:DD:EE:FF' },
      source: 'ble',
      externalId: 'acme-reading-9981',
    },
    {
      type: 'blood_pressure',
      measuredAt: '2026-11-24T14:05:00Z',
      values: { systolic: 82, diastolic: 128 },
      device: { model: 'td3140' },
      source: 'ble',
      externalId: 'acme-reading-9982',
    },
  ],
}
const BATCH_RESULT = {
  data: [
    { index: 0, status: 'created', reading: READING_BP_NORMAL, error: null },
    { index: 1, status: 'duplicate', reading: READING_BP_DUPLICATE, error: null },
    {
      index: 2,
      status: 'error',
      reading: null,
      error: {
        type: 'invalid_request_error',
        code: 'validation_failed',
        message: 'values.diastolic must be lower than values.systolic.',
        param: 'values.diastolic',
        requestId: REQUEST_ID,
      },
    },
  ],
}

const THRESHOLDS = {
  data: [
    {
      type: 'blood_pressure',
      value: 'systolic',
      unit: 'mmHg',
      criticalHigh: 180,
      attentionHigh: 140,
      attentionLow: 90,
      criticalLow: 80,
      source: 'patient',
    },
    {
      type: 'blood_pressure',
      value: 'diastolic',
      unit: 'mmHg',
      criticalHigh: 120,
      attentionHigh: 100,
      attentionLow: 60,
      criticalLow: 50,
      source: 'patient',
    },
    {
      type: 'oxygen_saturation',
      value: 'spo2',
      unit: '%',
      criticalHigh: null,
      attentionHigh: null,
      attentionLow: 92,
      criticalLow: 88,
      source: 'default',
    },
  ],
}

// v1.1 (contract 8.2 and 8.3): alert settings and limits

const SETTINGS_ON = { mode: 'test', alertsEnabled: true }
const SETTINGS_OFF = { mode: 'test', alertsEnabled: false }

const limitRow = (type, value, unit, [criticalHigh, attentionHigh, attentionLow, criticalLow], source) => ({
  type,
  value,
  unit,
  criticalHigh,
  attentionHigh,
  attentionLow,
  criticalLow,
  source,
})
const fourLimits = ([criticalHigh, attentionHigh, attentionLow, criticalLow]) => ({
  criticalHigh,
  attentionHigh,
  attentionLow,
  criticalLow,
})

/** GET /thresholds with a test key: the shared sandbox defaults (contract 4.3). */
const SANDBOX_DEFAULTS = {
  data: [
    limitRow('blood_pressure', 'systolic', 'mmHg', [180, 140, 90, 80], 'default'),
    limitRow('blood_pressure', 'diastolic', 'mmHg', [120, 90, 60, 50], 'default'),
    limitRow('blood_pressure', 'pulse', 'bpm', [130, 100, 50, 40], 'default'),
    limitRow('oxygen_saturation', 'spo2', '%', [null, null, 94, 90], 'default'),
    limitRow('oxygen_saturation', 'pulse', 'bpm', [130, 100, 50, 40], 'default'),
    limitRow('temperature', 'temperature', 'C', [39, 37.8, 35.5, 35], 'default'),
    limitRow('glucose', 'glucose', 'mg/dL', [250, 180, 70, 54], 'default'),
  ],
}

/** PUT /patients/{id}/thresholds, one example per type. */
const PATIENT_LIMITS_BP = {
  type: 'blood_pressure',
  limits: {
    systolic: fourLimits([170, 150, 100, 90]),
    diastolic: fourLimits([110, 95, 60, 50]),
  },
}
const PATIENT_LIMITS_SPO2 = {
  type: 'oxygen_saturation',
  limits: {
    spo2: fourLimits([101, 101, 89, 85]),
    pulse: fourLimits([120, 105, 50, 40]),
  },
}
const PATIENT_LIMITS_TEMPERATURE = {
  type: 'temperature',
  limits: { temperature: fourLimits([39.5, 38, 35.5, 35]) },
}
const PATIENT_LIMITS_GLUCOSE = {
  type: 'glucose',
  limits: { glucose: fourLimits([300, 220, 70, 54]) },
}
/** Response to PATIENT_LIMITS_BP on a sandbox patient: pulse was not sent and keeps the limits it had. */
const PATIENT_LIMITS_BP_RESULT = {
  data: [
    limitRow('blood_pressure', 'systolic', 'mmHg', [170, 150, 100, 90], 'patient'),
    limitRow('blood_pressure', 'diastolic', 'mmHg', [110, 95, 60, 50], 'patient'),
    limitRow('blood_pressure', 'pulse', 'bpm', [130, 100, 50, 40], 'patient'),
  ],
}

/** PUT /thresholds (live key): new glucose default of the live client. */
const CLIENT_LIMITS_GLUCOSE = { type: 'glucose', limits: { glucose: fourLimits([300, 200, 70, 54]) } }
const CLIENT_LIMITS_GLUCOSE_RESULT = {
  data: [limitRow('glucose', 'glucose', 'mg/dL', [300, 200, 70, 54], 'default')],
}

const PATIENT_ALERTS_OFF = { type: 'blood_pressure', enabled: false }

/** Catalog v1 (contract 4.4): model, name, manufacturer, type, pairing. */
const CATALOG = [
  ['td3140', 'TaiDoc TD-3140', 'TaiDoc Technology Corp.', 'blood_pressure', false],
  ['td3128', 'TaiDoc TD-3128', 'TaiDoc Technology Corp.', 'blood_pressure', false],
  ['hem7156t', 'Omron HEM-7156T', 'OMRON Healthcare', 'blood_pressure', true],
  ['bp7000', 'Omron BP7000', 'OMRON Healthcare', 'blood_pressure', true],
  ['bp7250', 'Omron BP7250', 'OMRON Healthcare', 'blood_pressure', true],
  ['bp7350', 'Omron BP7350', 'OMRON Healthcare', 'blood_pressure', true],
  ['bp7450', 'Omron BP7450', 'OMRON Healthcare', 'blood_pressure', true],
  ['ua651', 'A&D UA-651BLE', 'A&D Company', 'blood_pressure', false],
  ['btbpm', 'Health&Life BT-BPM', 'Health&Life', 'blood_pressure', false],
  ['uam820bt', 'Zewa UAM-820BT', 'Zewa', 'blood_pressure', true],
  ['td8255', 'TaiDoc TD-8255', 'TaiDoc Technology Corp.', 'oxygen_saturation', false],
  ['up200ble', 'A&D UP-200BLE', 'A&D Company', 'oxygen_saturation', false],
  ['aoj70b', 'AOJ-70B', 'AOJ Medical Technology', 'oxygen_saturation', false],
  ['ym402', 'Mio YM402', 'Mio Labs', 'oxygen_saturation', false],
  ['zw21600', 'Zewa 21600', 'Veridian Healthcare', 'oxygen_saturation', false],
  ['td1242', 'TaiDoc TD-1242', 'TaiDoc Technology Corp.', 'temperature', false],
  ['aoj20f', 'AOJ-20F', 'AOJ Medical Technology', 'temperature', false],
  ['zw11115', 'Zewa 11115', 'Zewa', 'temperature', false],
  ['accuchek', 'Accu-Chek Guide / Guide Me', 'Roche', 'glucose', true],
  ['gtech', 'G-Tech Lite Smart', 'Accumed', 'glucose', false],
  ['hc059', 'Multilaser HC059', 'Multilaser', 'weight', false],
]
const DEVICES = {
  data: [
    ...CATALOG.map(([model, name, manufacturer, type, pairing]) => ({
      model,
      name,
      manufacturer,
      type,
      connection: 'ble',
      pairing,
      sdk: true,
    })),
    {
      model: 'manual',
      name: 'Typed by a person',
      manufacturer: '',
      type: null,
      connection: 'manual',
      pairing: false,
      sdk: true,
    },
    {
      model: 'other',
      name: 'Device not in the catalog',
      manufacturer: '',
      type: null,
      connection: 'other',
      pairing: false,
      sdk: false,
    },
  ],
}

const WEBHOOK = {
  url: WEBHOOK_URL,
  events: ['reading.alert'],
  locale: 'en',
  active: true,
  secretHint: 'whsec_...a1b2',
  createdAt: '2026-11-24T14:00:00Z',
  updatedAt: '2026-11-24T14:00:00Z',
}
const WEBHOOK_UPSERT = { url: WEBHOOK_URL, events: ['reading.alert', 'reading.created'], locale: 'en' }
const WEBHOOK_CREATED = { ...WEBHOOK, events: ['reading.alert', 'reading.created'], secret: WEBHOOK_SECRET }
const WEBHOOK_UPDATED = {
  ...WEBHOOK,
  events: ['reading.alert', 'reading.created'],
  updatedAt: '2026-11-24T14:30:00Z',
}
const WEBHOOK_ROTATED = {
  ...WEBHOOK,
  secretHint: 'whsec_...9f3c',
  updatedAt: '2026-11-24T15:00:00Z',
  secret: 'whsec_T2wB7nM4qK9xR1vL6pZ3sD8fG0hJ5cY2eA7u9f3c',
}

const EVENT_PATIENT = { id: PATIENT_ID, externalId: 'acme-user-123' }
const ALERT_EVENT_DATA = { patient: EVENT_PATIENT, reading: READING_BP_NO_ALERT, alert: ALERT }
const CREATED_EVENT_DATA = { patient: EVENT_PATIENT, reading: READING_SPO2_NO_ALERT, alert: null }
const PING_EVENT_DATA = { message: 'Webhook test from EmmiTec' }

const envelope = (id, type, createdAt, data) => ({
  id,
  type,
  mode: 'test',
  createdAt,
  apiVersion: API_VERSION,
  integrationId: INTEGRATION_ID,
  data,
})
const ALERT_EVENT = envelope(EVENT_ID_ALERT, 'reading.alert', '2026-11-24T14:03:02Z', ALERT_EVENT_DATA)
const CREATED_EVENT = envelope(EVENT_ID_CREATED, 'reading.created', '2026-11-24T15:10:01Z', CREATED_EVENT_DATA)
const PING_EVENT = envelope(EVENT_ID_PING, 'ping', '2026-11-24T14:10:00Z', PING_EVENT_DATA)

const EVENT_DELIVERED = {
  id: EVENT_ID_ALERT,
  type: 'reading.alert',
  createdAt: '2026-11-24T14:03:02Z',
  status: 'delivered',
  attempts: 1,
  lastStatusCode: 200,
  lastError: null,
  deliveredAt: '2026-11-24T14:03:03Z',
  nextAttemptAt: null,
  data: ALERT_EVENT_DATA,
}
const EVENT_PENDING = {
  id: EVENT_ID_CREATED,
  type: 'reading.created',
  createdAt: '2026-11-24T15:10:01Z',
  status: 'pending',
  attempts: 2,
  lastStatusCode: 503,
  lastError: 'HTTP 503',
  deliveredAt: null,
  nextAttemptAt: '2026-11-24T15:16:01Z',
  data: CREATED_EVENT_DATA,
}
const EVENT_RESENT = { ...EVENT_PENDING, nextAttemptAt: '2026-11-24T15:12:00Z' }

const WEBHOOK_TEST_OK = { delivered: true, statusCode: 200, durationMs: 182, eventId: EVENT_ID_PING, error: null }
const WEBHOOK_TEST_TIMEOUT = {
  delivered: false,
  statusCode: null,
  durationMs: 10000,
  eventId: EVENT_ID_PING,
  error: 'Timed out after 10 seconds.',
}

const SIMULATE_REQUEST = { patientId: PATIENT_ID, type: 'blood_pressure', level: 'critical_high' }

/** Real signature of an example event with the example secret, over its compact JSON (what we would send). */
function signatureOf(event) {
  const t = Math.floor(Date.parse(event.createdAt) / 1000)
  const v1 = createHmac('sha256', WEBHOOK_SECRET).update(`${t}.${JSON.stringify(event)}`).digest('hex')
  return `t=${t},v1=${v1}`
}

// -------------------------------------------------------------------------------------------------------------------
const DIAGNOSTICS_FAILURE = {
  installationId: 'inst_4hT9qL2mXa7RkP0w',
  events: [
    { at: '2026-11-24T14:03:00Z', type: 'ble.scan_started' },
    {
      at: '2026-11-24T14:03:09Z',
      type: 'ble.connect_failed',
      deviceModel: 'omron-hem-7156t',
      code: 'connection_failed',
      message: 'We could not connect to your device. Turn it off and on, then try again.',
      durationMs: 9120,
    },
  ],
}

// components.schemas

const SCHEMAS = {}

SCHEMAS.ErrorObject = object(
  'Details of an error. Also used in the failed items of `POST /readings/batch`.',
  {
    type: { type: 'string', enum: ERROR_TYPES, description: 'Error family.' },
    code: {
      type: 'string',
      enum: Object.keys(ERROR_CODES),
      description: ['Exact cause:', ...Object.entries(ERROR_CODES).map(([c, t]) => `- \`${c}\`: ${t}`)].join('\n'),
    },
    message: str('Human-readable explanation. Never contains the token.'),
    param: nul(
      str('Field or parameter that caused the error, as a dot path (for example `values.systolic`). null when none.'),
    ),
    requestId: str('Same value as the `X-Request-Id` response header. Send it to EmmiTec when you need help.', {
      pattern: REQUEST_ID_PATTERN,
    }),
  },
  { example: CONTRACT_ERROR },
)

SCHEMAS.Error = object(
  'Body of every non-2xx response.',
  { error: ref('ErrorObject') },
  { example: { error: CONTRACT_ERROR } },
)

SCHEMAS.Plan = object(
  [
    'Plan of your integration. New partners start with a 90-day pilot (`trial`).',
    'Requests are not blocked automatically when the trial ends: EmmiTec decides the next step with you.',
    'A `suspended` integration gets 403 `forbidden` on every call.',
  ].join(' '),
  {
    name: str('`trial` (pilot), `active` or `suspended`.', { enum: PLANS, examples: ['trial'] }),
    trialEndsAt: nul(dateTime('When the trial ends. null when the plan is not `trial`.', '2027-02-22T14:00:00Z')),
    daysLeft: nul(
      int('Whole days until `trialEndsAt` (rounded up, never negative). null when the plan is not `trial`.', {
        minimum: 0,
        examples: [90],
      }),
    ),
    module: str('Module of the integration. `rpm` (remote patient monitoring) is the only one in v1.', {
      enum: ['rpm'],
    }),
  },
  { example: PLAN },
)

SCHEMAS.Ping = object(
  'Result of `GET /ping`: who is calling, in which mode, and the plan of the integration.',
  {
    ok: bool('Always true when the token works.'),
    mode: modeProp(),
    auth: str('Kind of token used.', { enum: ['secret_key', 'session_token'] }),
    integration: object('The integration that owns the token.', {
      id: uuid('Integration id.', INTEGRATION_ID),
      name: str('Integration name.', { examples: ['Acme Health'] }),
    }),
    patientId: nul(uuid('Patient of the session token. null with a secret key.', PATIENT_ID)),
    serverTime: dateTime('Current server time (UTC).', '2026-11-24T14:03:00Z'),
    apiVersion: str('Version of the API contract.', { examples: [API_VERSION] }),
    plan: ref('Plan'),
  },
  { example: PING_SECRET },
)

const PATIENT_FIELDS = {
  externalId: str('Your id for this person (1 to 100 characters). Unique per integration and mode.', {
    minLength: 1,
    maxLength: 100,
    examples: ['acme-user-123'],
  }),
  firstName: str('First name.', { examples: ['Maria'] }),
  lastName: str('Last name.', { examples: ['Silva'] }),
  birthDate: str('Date of birth, `YYYY-MM-DD`.', { format: 'date', examples: ['1956-03-14'] }),
  sex: str('Sex.', { enum: SEXES, examples: ['female'] }),
  email: str('Email of the patient. Optional: without it the patient is created with `email` null (patients never log in to EmmiTec apps). Must not be used by another person on the client (else 409 `conflict`).', {
    format: 'email',
    examples: ['maria.silva@example.com'],
  }),
  phone: str('Phone number in E.164 format.', { pattern: E164_PATTERN, examples: ['+15551234567'] }),
  language: str('Preferred language of the patient.', { enum: LOCALES, examples: ['en'] }),
  heightCm: num('Height in centimeters (50 to 250). Used to compute `bmi` on weight readings.', {
    minimum: 50,
    maximum: 250,
    examples: [162],
  }),
}

SCHEMAS.Patient = object(
  'A patient of your integration, in the mode of the key.',
  {
    id: uuid('EmmiTec patient id (lowercase UUID).', PATIENT_ID),
    externalId: PATIENT_FIELDS.externalId,
    firstName: PATIENT_FIELDS.firstName,
    lastName: PATIENT_FIELDS.lastName,
    birthDate: PATIENT_FIELDS.birthDate,
    sex: PATIENT_FIELDS.sex,
    email: nul(PATIENT_FIELDS.email),
    phone: nul(PATIENT_FIELDS.phone),
    language: PATIENT_FIELDS.language,
    heightCm: nul(PATIENT_FIELDS.heightCm),
    mode: modeProp(),
    createdAt: dateTime('When the patient was created.', '2026-11-24T14:03:00Z'),
  },
  { example: PATIENT },
)

SCHEMAS.PatientCreate = object(
  'Body of `POST /patients`. Idempotent by `externalId`.',
  {
    externalId: PATIENT_FIELDS.externalId,
    firstName: PATIENT_FIELDS.firstName,
    lastName: PATIENT_FIELDS.lastName,
    birthDate: PATIENT_FIELDS.birthDate,
    sex: { ...PATIENT_FIELDS.sex, default: 'unknown' },
    email: PATIENT_FIELDS.email,
    phone: PATIENT_FIELDS.phone,
    language: { ...PATIENT_FIELDS.language, default: 'en' },
    heightCm: PATIENT_FIELDS.heightCm,
  },
  { required: ['externalId', 'firstName', 'lastName', 'birthDate'], example: PATIENT_CREATE },
)

SCHEMAS.PatientUpdate = object(
  'Body of `PATCH /patients/{id}`. Send only the fields you want to change. `externalId` and `email` are not accepted here.',
  {
    firstName: PATIENT_FIELDS.firstName,
    lastName: PATIENT_FIELDS.lastName,
    birthDate: PATIENT_FIELDS.birthDate,
    sex: PATIENT_FIELDS.sex,
    phone: PATIENT_FIELDS.phone,
    language: PATIENT_FIELDS.language,
    heightCm: PATIENT_FIELDS.heightCm,
  },
  { required: [], example: PATIENT_UPDATE },
)

SCHEMAS.PatientList = listOf('Patient', 'A page of patients.', { data: [PATIENT], hasMore: false, nextCursor: null })

SCHEMAS.SessionTokenCreate = object(
  'Body of `POST /patients/{id}/session-tokens`. Optional.',
  {
    expiresInSeconds: int('Lifetime of the token in seconds: min 300, max 2592000 (30 days), default 604800 (7 days).', {
      minimum: 300,
      maximum: 2592000,
      default: 604800,
      examples: [604800],
    }),
  },
  { required: [], example: { expiresInSeconds: 604800 } },
)

SCHEMAS.SessionToken = object(
  'A new patient session token. The token is shown only in this response.',
  {
    token: str('Opaque token for ONE patient: `emst_test_...` with a test key, `emst_live_...` with a live key.', {
      pattern: '^emst_(test|live)_',
      examples: [SESSION_TOKEN],
    }),
    patientId: uuid('Patient of the token.', PATIENT_ID),
    expiresAt: dateTime('When the token expires.', '2026-12-01T14:03:00Z'),
  },
  { example: { token: SESSION_TOKEN, patientId: PATIENT_ID, expiresAt: '2026-12-01T14:03:00Z' } },
)

SCHEMAS.SessionTokensRevoked = object(
  'Result of `DELETE /patients/{id}/session-tokens`.',
  { revoked: int('How many session tokens were revoked.', { minimum: 0, examples: [3] }) },
  { example: { revoked: 3 } },
)

SCHEMAS.Level = {
  type: 'string',
  enum: LEVELS,
  description:
    'Level of a value against the thresholds of the patient. `unknown` = no thresholds configured for that value.',
  examples: ['critical_high'],
}

SCHEMAS.ReadingType = {
  type: 'string',
  enum: READING_TYPES,
  description: 'Reading types supported in v1.',
  examples: ['blood_pressure'],
}

SCHEMAS.BloodPressureValues = object(
  '`values` for `blood_pressure`. Unit: mmHg (pulse in bpm).',
  {
    systolic: int('Systolic pressure in mmHg, 40 to 300.', { minimum: 40, maximum: 300 }),
    diastolic: int('Diastolic pressure in mmHg, 20 to 200. Must be lower than `systolic`.', {
      minimum: 20,
      maximum: 200,
    }),
    pulse: int('Pulse in bpm, 20 to 250. Optional.', { minimum: 20, maximum: 250 }),
    irregularHeartbeat: bool('true when the device flagged an irregular heartbeat. Optional.'),
  },
  { title: 'Blood pressure', required: ['systolic', 'diastolic'], example: { systolic: 182, diastolic: 110, pulse: 88 } },
)

SCHEMAS.OxygenSaturationValues = object(
  '`values` for `oxygen_saturation`. Unit: % (pulse in bpm).',
  {
    spo2: num('Oxygen saturation in %, 50 to 100.', { minimum: 50, maximum: 100 }),
    pulse: int('Pulse in bpm, 20 to 250. Optional.', { minimum: 20, maximum: 250 }),
    perfusionIndex: num('Perfusion index, 0 to 30. Optional.', { minimum: 0, maximum: 30 }),
  },
  { title: 'Oxygen saturation', required: ['spo2'], example: { spo2: 97, pulse: 72, perfusionIndex: 3.1 } },
)

SCHEMAS.TemperatureValues = object(
  '`values` for `temperature`. Stored and returned in C.',
  {
    temperature: num('Body temperature in the unit of the top-level `unit` (C by default). Valid range 30 to 45 C (86 to 113 F). Returned in C.'),
  },
  { title: 'Temperature', required: ['temperature'], example: { temperature: 37.2 } },
)

SCHEMAS.GlucoseValues = object(
  '`values` for `glucose`. Stored and returned in mg/dL.',
  {
    glucose: num('Blood glucose in the unit of the top-level `unit` (mg/dL by default). Valid range 10 to 700 mg/dL (mmol/L is converted x 18.0182). Returned in mg/dL.'),
  },
  { title: 'Glucose', required: ['glucose'], example: { glucose: 130 } },
)

SCHEMAS.WeightValues = object(
  '`values` for `weight`. Stored and returned in kg.',
  {
    weight: num('Body weight in the unit of the top-level `unit` (kg by default). Valid range 2 to 400 kg (lb is converted x 0.453592). Returned in kg.'),
    bmi: num('Body mass index. Only in responses, and only when the patient has `heightCm`.', { readOnly: true }),
  },
  { title: 'Weight', required: ['weight'], example: { weight: 68.4, bmi: 26.06 } },
)

const VALUES_ONE_OF = [
  ref('BloodPressureValues'),
  ref('OxygenSaturationValues'),
  ref('TemperatureValues'),
  ref('GlucoseValues'),
  ref('WeightValues'),
]

SCHEMAS.ReadingInput = object(
  'One reading to store. Body of `POST /readings` and item of `POST /readings/batch`.',
  {
    patientId: uuid(
      'EmmiTec patient id. Required with a secret key. With a session token it may be omitted; if sent, it must be the patient of the token.',
      PATIENT_ID,
    ),
    type: ref('ReadingType'),
    measuredAt: dateTime(
      'When the device took the reading (ISO 8601 UTC). Required. Not more than 10 minutes in the future and not older than 365 days.',
      '2026-11-24T14:03:00Z',
    ),
    values: {
      description: 'Measured values. The shape depends on `type`; see the five values schemas.',
      oneOf: VALUES_ONE_OF,
    },
    unit: str(
      'Input unit, only for temperature (`C` default or `F`), glucose (`mg/dL` default or `mmol/L`, x 18.0182) and weight (`kg` default or `lb`, x 0.453592). Values are converted and stored in the canonical unit.',
      { enum: ['C', 'F', 'mg/dL', 'mmol/L', 'kg', 'lb'] },
    ),
    context: str('Glucose only: when the measurement was taken. Default `generic`.', {
      enum: GLUCOSE_CONTEXTS,
      default: 'generic',
    }),
    device: object(
      'The device that took the reading. Optional.',
      {
        model: str(
          'An id from `GET /devices` (`td3140`, `bp7250`, ...), `manual` (typed by a person) or `other` (a device not in the catalog). Default: `manual` when `source` is `manual`, else `other`.',
          { examples: ['td3140'] },
        ),
        serial: str('Serial number of the device. Optional.', { examples: ['SN123'] }),
        mac: str('Bluetooth address of the device. Optional.', { examples: ['AA:BB:CC:DD:EE:FF'] }),
      },
      { required: [] },
    ),
    source: str('How the reading reached you: `ble`, `manual` or `integration`.', {
      enum: SOURCES,
      default: 'integration',
    }),
    externalId: str(
      'Your id for this reading, for idempotency (unique per integration and mode). The same `externalId` again returns 200 with the original reading and `duplicate: true`. Without `externalId`, the same patient + type + measuredAt + values is also treated as a duplicate.',
      { examples: ['acme-reading-9981'] },
    ),
  },
  { required: ['type', 'measuredAt', 'values'], example: READING_INPUT },
)

const READING_PROPERTIES = {
  id: str('EmmiTec reading id (string of digits).', { pattern: READING_ID_PATTERN, examples: ['2104455'] }),
  patientId: uuid('Patient of the reading.', PATIENT_ID),
  type: ref('ReadingType'),
  measuredAt: dateTime('When the device took the reading.', '2026-11-24T14:03:00Z'),
  receivedAt: dateTime('When EmmiTec received the reading.', '2026-11-24T14:03:02Z'),
  values: {
    description:
      'Values in the canonical unit of `unit`. Weight readings also have `bmi` when the patient has `heightCm`.',
    oneOf: VALUES_ONE_OF,
  },
  unit: str('Canonical unit: mmHg (blood_pressure, pulse in bpm), % (oxygen_saturation), C, mg/dL or kg.', {
    enum: UNITS,
  }),
  context: str('Glucose readings only: the context sent with the reading.', { enum: GLUCOSE_CONTEXTS }),
  device: object('The device of the reading.', {
    model: str('Model id from `GET /devices`, `manual` or `other`.', { examples: ['td3140'] }),
    name: str('Name of the model.', { examples: ['TaiDoc TD-3140'] }),
    serial: nul(str('Serial number, when sent.', { examples: ['SN123'] })),
    mac: nul(str('Bluetooth address, when sent.', { examples: ['AA:BB:CC:DD:EE:FF'] })),
  }),
  source: str('How the reading was sent.', { enum: SOURCES }),
  externalId: nul(str('Your id for this reading, when sent.', { examples: ['acme-reading-9981'] })),
  level: withDescription(
    'Level',
    'Overall level: the most severe of `levels` (critical > attention > normal > unknown; between high and low, the one of the most severe value).',
  ),
  levels: {
    type: 'object',
    description:
      'Level of each evaluated value. blood_pressure: `systolic`, `diastolic`, and `pulse` when the client has pulse limits (the sandbox has). oxygen_saturation: `spo2`, `pulse`. temperature: `temperature`. glucose: `glucose`. weight is not evaluated: `level` is `unknown` and `alert` is null.',
    propertyNames: { enum: EVALUATED_VALUES },
    additionalProperties: ref('Level'),
    examples: [{ systolic: 'critical_high', diastolic: 'attention_high', pulse: 'normal' }],
  },
  alert: nul(withDescription('Alert', 'Alert to turn into a notification. null when `level` is normal or unknown.')),
  duplicate: bool(
    'true when this reading was already stored (same `externalId`, or same patient + type + measuredAt + values). The original reading is returned.',
  ),
  mode: modeProp(),
}

// `context` only exists on glucose readings: everything else is always present
const READING_REQUIRED = Object.keys(READING_PROPERTIES).filter((k) => k !== 'context')
SCHEMAS.Reading = object('A stored reading, with its level and alert.', READING_PROPERTIES, {
  example: READING_BP,
  required: READING_REQUIRED,
})

const { alert: _omitAlert, ...READING_PROPERTIES_NO_ALERT } = READING_PROPERTIES
void _omitAlert
SCHEMAS.ReadingWithoutAlert = object(
  'The Reading object without `alert`, as sent in `data.reading` of webhook events (the alert is in `data.alert`).',
  READING_PROPERTIES_NO_ALERT,
  { example: READING_BP_NO_ALERT, required: READING_REQUIRED.filter((k) => k !== 'alert') },
)

SCHEMAS.AlertTrigger = object(
  'One value that crossed a limit.',
  {
    value: str('Name of the value.', { enum: EVALUATED_VALUES, examples: ['systolic'] }),
    measured: num('Measured value, in `unit`.', { examples: [182] }),
    unit: str('Unit of `measured` and `limit`.', { examples: ['mmHg'] }),
    level: ref('Level'),
    limit: num('The limit that was crossed.', { examples: [180] }),
  },
  { example: ALERT.triggeredBy[0] },
)

SCHEMAS.Alert = object(
  [
    'What you turn into a push notification.',
    '`title` is short, for the notification title. `text` is patient-facing, in plain language, about the patient ("your").',
    '`reason` is technical, for logs and clinicians, and says which value crossed which limit.',
    'Texts never give medical advice; on critical levels `text` ends with "If you feel unwell, contact your care team or emergency services."',
    'Level words: en very high, high, low, very low; pt muito alta, alta, baixa, muito baixa; es muy alta, alta, baja, muy baja.',
  ].join(' '),
  {
    level: str('Overall level of the reading (never normal or unknown when there is an alert).', {
      enum: ALERT_LEVELS,
      examples: ['critical_high'],
    }),
    title: str('Short title for the notification.', { examples: [ALERT.title] }),
    text: str('Patient-facing text.', { examples: [ALERT.text] }),
    reason: str('Technical reason.', { examples: [ALERT.reason] }),
    locale: str('Language of the texts.', { enum: LOCALES, examples: ['en'] }),
    triggeredBy: { type: 'array', items: ref('AlertTrigger'), description: 'The values that crossed a limit.' },
  },
  { example: ALERT },
)

SCHEMAS.ReadingList = listOf('Reading', 'A page of readings, newest first, `alert` included.', {
  data: [READING_SPO2, READING_BP],
  hasMore: true,
  nextCursor: 'MjEwNDQ1NQ',
})

SCHEMAS.BatchRequest = object(
  'Body of `POST /readings/batch`.',
  {
    patientId: uuid(
      'Patient of the readings. Optional: with a secret key, send it here or in each reading; with a session token it may be omitted.',
      PATIENT_ID,
    ),
    readings: { type: 'array', maxItems: 100, items: ref('ReadingInput'), description: 'Up to 100 readings.' },
  },
  { required: ['readings'], example: BATCH_REQUEST },
)

SCHEMAS.BatchResult = object(
  'Result of `POST /readings/batch`: one item per reading, in the same order. Items are independent.',
  {
    data: {
      type: 'array',
      description: 'One result per item of `readings`.',
      items: object('Result of one item.', {
        index: int('Position of the item in `readings` (0 based).', { minimum: 0 }),
        status: str('`created`, `duplicate` (already stored, original returned) or `error`.', {
          enum: ['created', 'duplicate', 'error'],
        }),
        reading: nul(withDescription('Reading', 'The stored reading. null when `status` is `error`.')),
        error: nul(withDescription('ErrorObject', 'Why the item failed. null unless `status` is `error`.')),
      }),
    },
  },
  { example: BATCH_RESULT },
)

const limitField = (description) => nul(num(description))
SCHEMAS.Threshold = object(
  'Limits of one value: of one patient (`GET /patients/{id}/thresholds`) or the client default (`GET /thresholds`).',
  {
    type: ref('ReadingType'),
    value: str('Evaluated value.', { enum: EVALUATED_VALUES, examples: ['systolic'] }),
    unit: str('Unit of the limits: mmHg, bpm (pulse), %, C or mg/dL.', { examples: ['mmHg'] }),
    criticalHigh: limitField('At or above = critical_high. null when not set.'),
    attentionHigh: limitField('At or above = attention_high. null when not set.'),
    attentionLow: limitField('At or below = attention_low. null when not set.'),
    criticalLow: limitField('At or below = critical_low. null when not set.'),
    source: str(
      '`patient`: limits of this patient, set by the care team or with `PUT /patients/{id}/thresholds` (both see the same limits). `default`: client default.',
      { enum: ['patient', 'default'] },
    ),
  },
  { example: THRESHOLDS.data[0] },
)

SCHEMAS.ThresholdList = object(
  'Thresholds, one item per type and evaluated value.',
  { data: { type: 'array', items: ref('Threshold') } },
  { example: THRESHOLDS },
)

const limitInput = (description) => num(description, { minimum: 0, maximum: 1000 })
SCHEMAS.Limits = object(
  [
    'The four limits of one value, in the unit of the value (mmHg, bpm, %, C, mg/dL). All four are required,',
    'as numbers from 0 to 1000 (rounded to 2 decimals), and must satisfy',
    'criticalLow <= attentionLow <= attentionHigh <= criticalHigh.',
    'A reading at or above `criticalHigh` is critical_high, at or above `attentionHigh` attention_high,',
    'at or below `criticalLow` critical_low, at or below `attentionLow` attention_low, else normal.',
  ].join(' '),
  {
    criticalHigh: limitInput('At or above = critical_high.'),
    attentionHigh: limitInput('At or above = attention_high.'),
    attentionLow: limitInput('At or below = attention_low.'),
    criticalLow: limitInput('At or below = critical_low.'),
  },
  { example: PATIENT_LIMITS_BP.limits.systolic },
)

SCHEMAS.ThresholdsUpdate = object(
  [
    'Body of `PUT /patients/{id}/thresholds` and `PUT /thresholds`: one type per call and, in `limits`, the values to',
    'change. Values per type: blood_pressure `systolic`, `diastolic`, `pulse`; oxygen_saturation `spo2`, `pulse`;',
    'temperature `temperature` (C); glucose `glucose` (mg/dL). weight has no limits (400).',
  ].join(' '),
  {
    type: str('Reading type.', { enum: LIMIT_TYPES, examples: ['blood_pressure'] }),
    limits: {
      type: 'object',
      description: 'The values to change, each with its four limits. At least one. Values not sent keep their limits.',
      minProperties: 1,
      propertyNames: { enum: LIMIT_VALUES },
      additionalProperties: ref('Limits'),
      examples: [PATIENT_LIMITS_BP.limits],
    },
  },
  { example: PATIENT_LIMITS_BP },
)

SCHEMAS.Settings = object(
  'Alert settings of your integration for the mode of the key. Each mode has its own.',
  {
    mode: modeProp(),
    alertsEnabled: bool(
      'true (default): readings out of range carry an `alert` and send `reading.alert`. false: `alert` is always null and `reading.alert` is not sent; `level` and `levels` are still there.',
    ),
  },
  { example: SETTINGS_ON },
)

SCHEMAS.SettingsUpdate = object(
  'Body of `PUT /settings`.',
  { alertsEnabled: bool('true to use alerts, false to turn them off for this mode.') },
  { example: { alertsEnabled: false } },
)

SCHEMAS.PatientAlertsUpdate = object(
  'Body of `PUT /patients/{id}/alerts`.',
  {
    type: str('Reading type.', { enum: LIMIT_TYPES, examples: ['blood_pressure'] }),
    enabled: bool('false: no alert for this patient and type. true: alerts again.'),
  },
  { example: PATIENT_ALERTS_OFF },
)

SCHEMAS.PatientAlerts = object(
  'The alert switch of one patient for one type.',
  {
    type: str('Reading type.', { enum: LIMIT_TYPES, examples: ['blood_pressure'] }),
    enabled: bool('Whether this patient gets alerts for this type.'),
  },
  { example: PATIENT_ALERTS_OFF },
)

SCHEMAS.Device = object(
  'A device model of the catalog.',
  {
    model: str('Model id. Send it in `device.model`.', { examples: ['td3140'] }),
    name: str('Name of the model.', { examples: ['TaiDoc TD-3140'] }),
    manufacturer: str('Manufacturer.', { examples: ['TaiDoc Technology Corp.'] }),
    type: nul(withDescription('ReadingType', 'Reading type of the device. null for `manual` and `other`.')),
    connection: str('`ble` (Bluetooth), `manual` (typed by a person) or `other` (device not in the catalog).', {
      enum: ['ble', 'manual', 'other'],
    }),
    pairing: bool('true when the device must be paired with the phone before it sends readings.'),
    sdk: bool('true when the emmitec-rpm SDK supports it.'),
  },
  { example: DEVICES.data[0] },
)

SCHEMAS.DeviceList = object(
  'The device catalog.',
  { data: { type: 'array', items: ref('Device') } },
  { example: DEVICES },
)

const WEBHOOK_PROPERTIES = {
  url: str('HTTPS URL that receives the events.', { format: 'uri', examples: [WEBHOOK_URL] }),
  events: {
    type: 'array',
    description: 'Subscribed events.',
    items: { type: 'string', enum: SUBSCRIBABLE_EVENTS },
    examples: [['reading.alert']],
  },
  locale: str('Language of the alert texts in webhook events. Also the default locale of the API for this mode.', {
    enum: LOCALES,
  }),
  active: bool('true when events are delivered.'),
  secretHint: str('Hint of the signing secret, to tell which one is in use. The secret itself is never returned again.', {
    examples: ['whsec_...a1b2'],
  }),
  createdAt: dateTime('When the webhook was created.', '2026-11-24T14:00:00Z'),
  updatedAt: dateTime('When the webhook was last changed.', '2026-11-24T14:00:00Z'),
}

SCHEMAS.Webhook = object('The webhook of your integration for the mode of the key.', WEBHOOK_PROPERTIES, {
  example: WEBHOOK,
})

SCHEMAS.WebhookUpsert = object(
  'Body of `PUT /webhook`.',
  {
    url: str(
      'HTTPS URL that receives the events. Must start with `https://` (in test mode `http://localhost` is not allowed either; use a tunnel).',
      { format: 'uri', pattern: '^https://', examples: [WEBHOOK_URL] },
    ),
    events: {
      type: 'array',
      description: '`reading.alert` (level not normal or unknown) and/or `reading.created` (every reading).',
      items: { type: 'string', enum: SUBSCRIBABLE_EVENTS },
      uniqueItems: true,
      default: ['reading.alert'],
    },
    locale: str('Language of the alert texts in webhook events.', { enum: LOCALES }),
  },
  { required: ['url'], example: WEBHOOK_UPSERT },
)

SCHEMAS.WebhookWithSecret = {
  description:
    'The webhook plus its signing secret. Only returned on first creation and by `POST /webhook/rotate-secret`. Store the secret: it is shown once.',
  allOf: [
    ref('Webhook'),
    object('Signing secret.', {
      secret: str('Signing secret for `EmmiTec-Signature`.', { pattern: '^whsec_', examples: [WEBHOOK_SECRET] }),
    }),
  ],
  examples: [WEBHOOK_CREATED],
}

SCHEMAS.WebhookDeleted = object(
  'Result of `DELETE /webhook`.',
  { deleted: bool('Always true.', { examples: [true] }) },
  { example: { deleted: true } },
)

SCHEMAS.DiagnosticsRequest = object(
  'What the SDK (1.1.0+) tells EmmiTec support about the phone: steps and failures of a measurement and the offline queue. Never names, measured values or tokens.',
  {
    installationId: str('Random id of the app installation (not tied to the patient), to count phones.', {
      pattern: '^[0-9A-Za-z_-]{8,40}$',
      examples: ['inst_4hT9qL2mXa7RkP0w'],
    }),
    patientId: uuid(
      'Only with a secret key: the patient the events belong to. With a session token the patient comes from the token.',
      PATIENT_ID,
    ),
    events: {
      type: 'array',
      description: 'One entry per step, oldest first.',
      minItems: 1,
      maxItems: 100,
      items: object(
        'A step of the measurement on the phone.',
        {
          at: dateTime('When it happened on the phone. Missing, in the future or older than 7 days: the time it arrived.', '2026-11-24T14:03:09Z'),
          type: str('The step. Unknown types are kept as `other`.', {
            enum: [
              'ble.permission_denied',
              'ble.powered_off',
              'ble.unavailable',
              'ble.scan_started',
              'ble.scan_timeout',
              'ble.device_found',
              'ble.connect_failed',
              'ble.connected',
              'ble.disconnected',
              'ble.reading_parsed',
              'ble.parse_failed',
              'ble.measure_failed',
              'upload.failed',
              'queue.stored_offline',
              'queue.flushed',
              'sdk.error',
            ],
          }),
          deviceModel: str('Device model of the catalog (`GET /devices`).', { maxLength: 40, examples: ['omron-hem-7156t'] }),
          code: str('Error code of the SDK.', { maxLength: 60, examples: ['connection_failed'] }),
          message: str('A fixed message of the SDK. Never names or measured values.', { maxLength: 300 }),
          durationMs: int('How long the step took, in milliseconds.', { minimum: 0, examples: [9120] }),
        },
        { required: ['type'] },
      ),
    },
  },
  { required: ['events'], example: DIAGNOSTICS_FAILURE },
)

SCHEMAS.DiagnosticsAccepted = object(
  'How many events were stored.',
  { accepted: int('Number of events stored.', { minimum: 0, examples: [2] }) },
  { example: { accepted: 2 } },
)

SCHEMAS.WebhookTestResult = object(
  'Result of `POST /webhook/test`.',
  {
    delivered: bool('true when your endpoint answered 2xx within 10 seconds.'),
    statusCode: nul(int('HTTP status your endpoint answered. null when it did not answer.', { examples: [200] })),
    durationMs: int('How long the call took, in milliseconds.', { minimum: 0, examples: [182] }),
    eventId: str('Id of the `ping` event.', { pattern: EVENT_ID_PATTERN, examples: [EVENT_ID_PING] }),
    error: nul(str('Why the delivery failed. null when delivered.')),
  },
  { example: WEBHOOK_TEST_OK },
)

SCHEMAS.EventPatient = object(
  'The patient of a reading event.',
  {
    id: uuid('EmmiTec patient id.', PATIENT_ID),
    externalId: str('Your id for this person.', { examples: ['acme-user-123'] }),
  },
  { example: EVENT_PATIENT },
)

SCHEMAS.ReadingAlertEventData = object(
  '`data` of a `reading.alert` event.',
  { patient: ref('EventPatient'), reading: ref('ReadingWithoutAlert'), alert: ref('Alert') },
  { example: ALERT_EVENT_DATA },
)

SCHEMAS.ReadingCreatedEventData = object(
  '`data` of a `reading.created` event.',
  {
    patient: ref('EventPatient'),
    reading: ref('ReadingWithoutAlert'),
    alert: nul(withDescription('Alert', 'Alert of the reading. null when `level` is normal or unknown.')),
  },
  { example: CREATED_EVENT_DATA },
)

SCHEMAS.PingEventData = object(
  '`data` of a `ping` event.',
  { message: str('Fixed text.', { examples: ['Webhook test from EmmiTec'] }) },
  { example: PING_EVENT_DATA },
)

SCHEMAS.Event = object(
  'A webhook event with its delivery status.',
  {
    id: str('Event id (`evt_` + 32 hex). Same as the `id` of the webhook body.', {
      pattern: EVENT_ID_PATTERN,
      examples: [EVENT_ID_ALERT],
    }),
    type: str('Event type.', { enum: EVENT_TYPES }),
    createdAt: dateTime('When the event was created.', '2026-11-24T14:03:02Z'),
    status: str('`pending` (waiting for a delivery attempt), `delivered` or `failed` (all attempts failed).', {
      enum: EVENT_STATUSES,
    }),
    attempts: int('Delivery attempts so far.', { minimum: 0 }),
    lastStatusCode: nul(int('HTTP status of the last attempt. null when there was no answer or no attempt.')),
    lastError: nul(str('Error of the last attempt. null when none.')),
    deliveredAt: nul(dateTime('When it was delivered. null when not delivered.', '2026-11-24T14:03:03Z')),
    nextAttemptAt: nul(dateTime('When the next attempt is due. null when none is scheduled.', '2026-11-24T15:16:01Z')),
    data: {
      description: 'The `data` of the webhook body.',
      anyOf: [ref('ReadingAlertEventData'), ref('ReadingCreatedEventData'), ref('PingEventData')],
    },
  },
  { example: EVENT_DELIVERED },
)

SCHEMAS.EventList = listOf('Event', 'A page of events, newest first.', {
  data: [EVENT_PENDING, EVENT_DELIVERED],
  hasMore: false,
  nextCursor: null,
})

SCHEMAS.SimulateAlertRequest = object(
  'Body of `POST /sandbox/simulate-alert`.',
  {
    patientId: uuid('Patient (of the test mode) that gets the reading.', PATIENT_ID),
    type: str('Reading type. Default `blood_pressure`. `weight` is not evaluated and answers 400 `unsupported_type`.', {
      enum: ['blood_pressure', 'oxygen_saturation', 'temperature', 'glucose'],
      default: 'blood_pressure',
    }),
    level: str('Level the simulated values must produce. Default `critical_high`. `oxygen_saturation` has no high limits: only `attention_low`, `critical_low` and `normal`.', {
      enum: ['critical_high', 'attention_high', 'attention_low', 'critical_low', 'normal'],
      default: 'critical_high',
    }),
  },
  { required: ['patientId'], example: SIMULATE_REQUEST },
)

SCHEMAS.WebhookEnvelope = object(
  'Body of every webhook POST. `data` depends on `type`.',
  {
    id: str('Event id. Dedupe by it (delivery is at-least-once).', {
      pattern: EVENT_ID_PATTERN,
      examples: [EVENT_ID_ALERT],
    }),
    type: str('Event type.', { enum: EVENT_TYPES }),
    mode: modeProp(),
    createdAt: dateTime('When the event was created.', '2026-11-24T14:03:02Z'),
    apiVersion: str('Version of the API contract.', { examples: [API_VERSION] }),
    integrationId: uuid('Your integration id.', INTEGRATION_ID),
    data: { type: 'object', description: 'Event data.' },
  },
  { example: ALERT_EVENT },
)

const eventSchema = (description, type, dataSchema, example) => ({
  description,
  allOf: [
    ref('WebhookEnvelope'),
    object(`Fields specific to \`${type}\`.`, { type: { type: 'string', const: type }, data: ref(dataSchema) }),
  ],
  examples: [example],
})

SCHEMAS.ReadingAlertEvent = eventSchema(
  '`reading.alert`: a reading whose level is not normal or unknown. Default subscription.',
  'reading.alert',
  'ReadingAlertEventData',
  ALERT_EVENT,
)
SCHEMAS.ReadingCreatedEvent = eventSchema(
  '`reading.created`: every new reading. Opt-in (add it to `events`).',
  'reading.created',
  'ReadingCreatedEventData',
  CREATED_EVENT,
)
SCHEMAS.PingEvent = eventSchema(
  '`ping`: test event sent by `POST /webhook/test`.',
  'ping',
  'PingEventData',
  PING_EVENT,
)

// -------------------------------------------------------------------------------------------------------------------
// components.headers, components.parameters, components.responses

const HEADERS = {
  XRequestId: {
    description: 'Id of this request. Also in `error.requestId`. Send it to EmmiTec when you need help.',
    required: true,
    schema: { type: 'string', pattern: REQUEST_ID_PATTERN },
    example: REQUEST_ID,
  },
  XEmmiTecMode: {
    description: 'Mode of the key or token used: `test` or `live`. Present on every authenticated response.',
    required: false,
    schema: { type: 'string', enum: MODES },
    example: 'test',
  },
  RetryAfter: {
    description: 'Seconds to wait before trying again.',
    required: true,
    schema: { type: 'integer', minimum: 0 },
    example: 1,
  },
}
const STD_HEADERS = {
  'X-Request-Id': { $ref: '#/components/headers/XRequestId' },
  'X-EmmiTec-Mode': { $ref: '#/components/headers/XEmmiTecMode' },
}

const LOCALE_TEXT =
  'Language of the alert texts (`title`, `text`, `reason`): `en`, `pt` or `es`. Default: the webhook locale of your integration for this mode, else `en`.'

const PARAMETERS = {
  PatientId: {
    name: 'id',
    in: 'path',
    required: true,
    description: 'EmmiTec patient id (lowercase UUID).',
    schema: { type: 'string', format: 'uuid' },
    example: PATIENT_ID,
  },
  ReadingId: {
    name: 'id',
    in: 'path',
    required: true,
    description: 'EmmiTec reading id (string of digits).',
    schema: { type: 'string', pattern: READING_ID_PATTERN },
    example: '2104455',
  },
  EventId: {
    name: 'id',
    in: 'path',
    required: true,
    description: 'Event id (`evt_` + 32 hex).',
    schema: { type: 'string', pattern: EVENT_ID_PATTERN },
    example: EVENT_ID_ALERT,
  },
  Limit: {
    name: 'limit',
    in: 'query',
    required: false,
    description: 'Page size, 1 to 100.',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
  },
  Cursor: {
    name: 'cursor',
    in: 'query',
    required: false,
    description: 'Opaque cursor. Pass the `nextCursor` of the previous page.',
    schema: { type: 'string' },
  },
  ExternalId: {
    name: 'externalId',
    in: 'query',
    required: false,
    description: 'Only the patient with this `externalId`.',
    schema: { type: 'string', minLength: 1, maxLength: 100 },
    example: 'acme-user-123',
  },
  ReadingTypeQuery: {
    name: 'type',
    in: 'query',
    required: false,
    description: 'Only readings of this type.',
    schema: ref('ReadingType'),
    example: 'blood_pressure',
  },
  From: {
    name: 'from',
    in: 'query',
    required: false,
    description: 'Only readings measured at or after this instant (ISO 8601 UTC).',
    schema: { type: 'string', format: 'date-time' },
    example: '2026-11-01T00:00:00Z',
  },
  To: {
    name: 'to',
    in: 'query',
    required: false,
    description: 'Only readings measured at or before this instant (ISO 8601 UTC).',
    schema: { type: 'string', format: 'date-time' },
    example: '2026-11-24T23:59:59Z',
  },
  EventTypeQuery: {
    name: 'type',
    in: 'query',
    required: false,
    description: 'Only events of this type.',
    schema: { type: 'string', enum: EVENT_TYPES },
    example: 'reading.alert',
  },
  Locale: {
    name: 'locale',
    in: 'query',
    required: false,
    description: LOCALE_TEXT,
    schema: { type: 'string', enum: LOCALES },
    example: 'en',
  },
  AcceptLanguage: {
    name: 'Accept-Language',
    in: 'header',
    required: false,
    description: `Alternative to the \`locale\` query parameter, same values (\`en\`, \`pt\`, \`es\`). ${LOCALE_TEXT.split('. ')[1]}`,
    schema: { type: 'string' },
    example: 'pt',
  },
}

const errorExample = (summary, type, code, message, param = null) => ({
  summary,
  value: { error: { type, code, message, param, requestId: REQUEST_ID } },
})

function errorResponse(description, examples, extraHeaders = {}) {
  return {
    description,
    headers: { ...STD_HEADERS, ...extraHeaders },
    content: { 'application/json': { schema: ref('Error'), examples } },
  }
}

const RESPONSES = {
  BadRequest: errorResponse('Bad body or parameters. `code` tells which kind; `param` tells which field.', {
    validationFailed: errorExample(
      'A value is out of range',
      'invalid_request_error',
      'validation_failed',
      'values.systolic must be an integer between 40 and 300.',
      'values.systolic',
    ),
    invalidJson: errorExample(
      'The body is not valid JSON',
      'invalid_request_error',
      'invalid_json',
      'The request body is not valid JSON.',
    ),
    unsupportedType: errorExample(
      'Unknown reading type',
      'invalid_request_error',
      'unsupported_type',
      'type must be one of: blood_pressure, oxygen_saturation, temperature, glucose, weight.',
      'type',
    ),
    unknownDevice: errorExample(
      'Unknown device model',
      'invalid_request_error',
      'unknown_device',
      'device.model must be an id from GET /devices, "manual" or "other".',
      'device.model',
    ),
    limitsOrder: errorExample(
      'Limits out of order',
      'invalid_request_error',
      'validation_failed',
      'limits.systolic must satisfy criticalLow <= attentionLow <= attentionHigh <= criticalHigh.',
      'limits.systolic',
    ),
    limitMissing: errorExample(
      'One of the four limits is missing',
      'invalid_request_error',
      'validation_failed',
      'limits.glucose.attentionLow is required, a number between 0 and 1000 (send all four limits).',
      'limits.glucose.attentionLow',
    ),
  }),
  Unauthorized: errorResponse(
    'Token missing, invalid or revoked, or expired. The message says which. The token is never echoed.',
    {
      missing: errorExample('No token', 'authentication_error', 'unauthorized', 'Bearer token is missing.'),
      invalid: errorExample(
        'Invalid or revoked token',
        'authentication_error',
        'unauthorized',
        'Bearer token is invalid or revoked.',
      ),
      expired: errorExample('Expired session token', 'authentication_error', 'unauthorized', 'Bearer token is expired.'),
    },
  ),
  Forbidden: errorResponse(
    'The token cannot do this: a session token outside its scope, a live key when the integration has no live client, a live key on a sandbox helper, a test key on `PUT /thresholds`, or the integration is suspended.',
    {
      integrationSuspended: errorExample(
        'Integration suspended',
        'permission_error',
        'forbidden',
        'This integration is suspended. Contact EmmiTec.',
      ),
      sandboxDefaults: errorExample(
        'Test key on PUT /thresholds',
        'permission_error',
        'forbidden',
        'The sandbox defaults are shared; set limits per patient with PUT /patients/{id}/thresholds.',
      ),
      sessionTokenScope: errorExample(
        'Session token outside its scope',
        'permission_error',
        'forbidden',
        'A session token cannot call this endpoint or see this patient.',
      ),
      noLiveClient: errorExample(
        'Live key without a live client',
        'permission_error',
        'forbidden',
        'This integration has no live client yet. Use a test key.',
      ),
      sandboxLiveKey: errorExample(
        'Live key on a sandbox helper',
        'permission_error',
        'forbidden',
        'Sandbox helpers only work with a test key.',
      ),
    },
  ),
  NotFound: errorResponse('Not found for this integration and mode.', {
    patient: errorExample('Patient not found', 'invalid_request_error', 'not_found', 'Patient not found.', 'id'),
    reading: errorExample('Reading not found', 'invalid_request_error', 'not_found', 'Reading not found.', 'id'),
    webhook: errorExample(
      'Webhook not configured',
      'invalid_request_error',
      'not_found',
      'No webhook is configured for this mode.',
    ),
    event: errorExample('Event not found', 'invalid_request_error', 'not_found', 'Event not found.', 'id'),
  }),
  Conflict: errorResponse(
    'Conflict with existing data, for example an email already used by another person on the client, or no default limits to change for this type.',
    {
      emailInUse: errorExample(
        'Email already used',
        'invalid_request_error',
        'conflict',
        'This email is already used by another person on the client.',
        'email',
      ),
      noClientDefaults: errorExample(
        'No default limits for this type',
        'invalid_request_error',
        'conflict',
        'This client has no default limits for this type yet. Contact EmmiTec.',
      ),
    },
  ),
  PatientDisabled: errorResponse('The patient is disabled for measurements.', {
    patientDisabled: errorExample(
      'Patient disabled',
      'invalid_request_error',
      'patient_disabled',
      'This patient is disabled for measurements.',
      'patientId',
    ),
  }),
  RateLimited: errorResponse(
    'More than 30 requests per second for this key or session token. Wait `Retry-After` seconds.',
    {
      rateLimited: errorExample(
        'Too many requests',
        'rate_limit_error',
        'rate_limited',
        'Too many requests. Retry after 1 second.',
      ),
    },
    { 'Retry-After': { $ref: '#/components/headers/RetryAfter' } },
  ),
  InternalError: errorResponse('Unexpected error. The message is generic; EmmiTec has the `requestId` in its logs.', {
    internalError: errorExample(
      'Unexpected error',
      'api_error',
      'internal_error',
      'Something went wrong on our side. Contact EmmiTec with the requestId.',
    ),
  }),
}

// a 401 has no authenticated key, so no mode
delete RESPONSES.Unauthorized.headers['X-EmmiTec-Mode']

const ERROR_BY_STATUS = {
  400: 'BadRequest',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'NotFound',
  409: 'Conflict',
  422: 'PatientDisabled',
  429: 'RateLimited',
  500: 'InternalError',
}

// -------------------------------------------------------------------------------------------------------------------
// Operations (one list feeds the OpenAPI paths and the Postman collection)

const TAGS = [
  { name: 'Status', description: 'Check that a token works and which mode it uses.' },
  {
    name: 'Patients',
    description: 'Patients of your integration. A test key only sees test patients; a live key only sees live patients.',
  },
  {
    name: 'Session tokens',
    description: 'Tokens for ONE patient, minted by your backend with the secret key and handed to your mobile app.',
  },
  {
    name: 'Readings',
    description: 'Store device readings and read them back with their level and alert.',
  },
  {
    name: 'Alert settings',
    description:
      'Decide if your integration uses alerts, and set the limits that trigger them: per patient, or as the defaults of your live client. Patients can also have alerts turned off per type.',
  },
  { name: 'Devices', description: 'The catalog of supported devices. Use a model id in `device.model`.' },
  {
    name: 'Webhook',
    description: 'One webhook per integration and mode. EmmiTec POSTs signed events to your HTTPS endpoint.',
  },
  { name: 'Events', description: 'Recent webhook events with their delivery status. Resend the ones that failed.' },
  { name: 'Sandbox', description: 'Helpers for test mode only. A live key gets 403 `forbidden`.' },
]

const TOKEN = {
  secret: 'Secret key. A session token gets 403 `forbidden`.',
  any: 'Secret key or session token.',
  sessionOnly: 'Session token only (returns the patient of the token).',
  ownPatient:
    'Secret key or session token. Session token: only for its own patient (`id` must be the patient of the token), else 403 `forbidden`.',
  readingOwnPatient:
    'Secret key or session token. Session token: only readings of its own patient, else 403 `forbidden`.',
  reading:
    'Secret key or session token. With a secret key, `patientId` is required. With a session token it may be omitted; if sent, it must be the patient of the token.',
  sandbox: 'Secret key, test mode only (`emk_test_...`). A live key or a session token gets 403 `forbidden`.',
  liveOnly: 'Secret key, live mode only (`emk_live_...`). A test key or a session token gets 403 `forbidden`.',
}

const json = (schema, examples) => ({ 'application/json': { schema, examples } })
const ok = (description, schema, examples) => ({ description, headers: STD_HEADERS, content: json(schema, examples) })
const ex = (summary, value) => ({ summary, value })
const body = (schemaName, examples, required = true) => ({ required, content: json(ref(schemaName), examples) })

const OPS = []

/**
 * @param {string} method  lowercase HTTP method
 * @param {string} path    OpenAPI path
 * @param {object} spec    operation data; `postman` holds the Postman variants (never written to the OpenAPI)
 */
function add(method, path, spec) {
  OPS.push({ method, path, ...spec })
}

add('get', '/ping', {
  id: 'getPing',
  tag: 'Status',
  summary: 'Check a token',
  token: TOKEN.any,
  description:
    'Returns the mode, the kind of token, the integration it belongs to and its plan (`trial` with `trialEndsAt` and `daysLeft` during the 90-day pilot). With a session token, `auth` is `session_token` and `patientId` is the patient of the token.',
  responses: {
    200: ok('The token works.', ref('Ping'), {
      secretKey: ex('With a secret key (pilot)', PING_SECRET),
      sessionToken: ex('With a session token', PING_SESSION),
      activePlan: ex('Active plan', { ...PING_SECRET, plan: PLAN_ACTIVE }),
    }),
  },
  errors: [401, 403, 429, 500],
})

add('get', '/me', {
  id: 'getMe',
  tag: 'Patients',
  summary: 'Get the patient of a session token',
  token: TOKEN.sessionOnly,
  description: 'Use it in the mobile app to read the patient the session token was minted for.',
  responses: { 200: ok('The patient of the token.', ref('Patient'), { patient: ex('Patient', PATIENT) }) },
  errors: [401, 403, 429, 500],
  postman: [{ auth: 'session' }],
})

add('post', '/patients', {
  id: 'createPatient',
  tag: 'Patients',
  summary: 'Create a patient',
  token: TOKEN.secret,
  description:
    'Idempotent by `externalId`: when a patient with the same `externalId` already exists for this integration and mode, the API answers 200 with the existing patient and ignores differences in the body (use `PATCH /patients/{id}` to change it).',
  body: body('PatientCreate', { maria: ex('Maria Silva', PATIENT_CREATE) }),
  responses: {
    201: ok('Created: a new patient.', ref('Patient'), { created: ex('New patient', PATIENT) }),
    200: ok(
      'A patient with this `externalId` already exists for this integration and mode. The existing patient is returned; differences in the body are ignored.',
      ref('Patient'),
      { existing: ex('Existing patient', PATIENT) },
    ),
  },
  errors: [400, 401, 403, 409, 429, 500],
  postman: [{ test: 'patientId' }],
})

add('get', '/patients', {
  id: 'listPatients',
  tag: 'Patients',
  summary: 'List patients',
  token: TOKEN.secret,
  description:
    'Only patients of this integration and mode, newest first. Filter by `externalId` to find the EmmiTec id of one of your users.',
  params: ['ExternalId', 'Limit', 'Cursor'],
  responses: {
    200: ok('A page of patients.', ref('PatientList'), {
      page: ex('One patient', { data: [PATIENT], hasMore: false, nextCursor: null }),
    }),
  },
  errors: [400, 401, 403, 429, 500],
})

add('get', '/patients/{id}', {
  id: 'getPatient',
  tag: 'Patients',
  summary: 'Get a patient',
  token: TOKEN.ownPatient,
  description: 'In the mobile app, `GET /me` returns the same object without needing the id.',
  params: ['PatientId'],
  responses: { 200: ok('The patient.', ref('Patient'), { patient: ex('Patient', PATIENT) }) },
  errors: [401, 403, 404, 429, 500],
})

add('patch', '/patients/{id}', {
  id: 'updatePatient',
  tag: 'Patients',
  summary: 'Update a patient',
  token: TOKEN.secret,
  description:
    'Send any of `firstName`, `lastName`, `birthDate`, `sex`, `phone`, `language`, `heightCm`. Fields you do not send are kept.',
  params: ['PatientId'],
  body: body('PatientUpdate', { phoneAndHeight: ex('New phone and height', PATIENT_UPDATE) }),
  responses: { 200: ok('The updated patient.', ref('Patient'), { updated: ex('Updated patient', PATIENT_UPDATED) }) },
  errors: [400, 401, 403, 404, 409, 429, 500],
})

add('post', '/patients/{id}/session-tokens', {
  id: 'createSessionToken',
  tag: 'Session tokens',
  summary: 'Mint a session token',
  token: TOKEN.secret,
  description: [
    'Creates a token for ONE patient. Call it from your backend and hand the token to your mobile app (the emmitec-rpm SDK uses it).',
    'A test key mints `emst_test_...`, a live key mints `emst_live_...`. The token is shown only in this response.',
    'Default lifetime 7 days (604800 s), min 300 s, max 30 days (2592000 s). Revoke with `DELETE /patients/{id}/session-tokens`.',
    '\n\nA session token can only call: `GET /ping`, `GET /me`, `GET /devices`, `POST /readings`, `POST /readings/batch`, `GET /readings/{id}`, and `GET /patients/{id}/readings` and `GET /patients/{id}/thresholds` for its own patient. Anything else gets 403 `forbidden`.',
  ].join(' '),
  params: ['PatientId'],
  body: body('SessionTokenCreate', { sevenDays: ex('7 days (the default)', { expiresInSeconds: 604800 }) }, false),
  responses: {
    201: ok('Created. Hand `token` to the app.', ref('SessionToken'), {
      created: ex('New session token', { token: SESSION_TOKEN, patientId: PATIENT_ID, expiresAt: '2026-12-01T14:03:00Z' }),
    }),
  },
  errors: [400, 401, 403, 404, 429, 500],
  postman: [{ test: 'sessionToken' }],
})

add('delete', '/patients/{id}/session-tokens', {
  id: 'revokeSessionTokens',
  tag: 'Session tokens',
  summary: 'Revoke all session tokens of a patient',
  token: TOKEN.secret,
  description: 'Revokes every session token of this patient. Calls with those tokens then get 401 `unauthorized`.',
  params: ['PatientId'],
  responses: {
    200: ok('How many tokens were revoked.', ref('SessionTokensRevoked'), { revoked: ex('Three tokens', { revoked: 3 }) }),
  },
  errors: [401, 403, 404, 429, 500],
})

add('post', '/readings', {
  id: 'createReading',
  tag: 'Readings',
  summary: 'Create a reading',
  token: TOKEN.reading,
  description: [
    'Stores one reading, evaluates it against the thresholds of the patient and returns it with `level`, `levels` and `alert` (null when the level is normal or unknown).',
    '`measuredAt` must not be more than 10 minutes in the future nor older than 365 days.',
    'Idempotent: the same `externalId` again (or, without `externalId`, the same patient + type + measuredAt + values) answers 200 with the original reading and `duplicate: true`.',
    'Values are returned in the canonical unit; weight readings get `bmi` when the patient has `heightCm`.',
  ].join(' '),
  params: ['Locale', 'AcceptLanguage'],
  body: body('ReadingInput', {
    bloodPressure: ex('Blood pressure (secret key)', READING_INPUT),
    sessionToken: ex('Blood pressure (session token, no patientId)', READING_INPUT_SESSION),
    oxygenSaturation: ex('Oxygen saturation', READING_INPUT_SPO2),
    temperature: ex('Temperature in F', READING_INPUT_TEMPERATURE),
    glucose: ex('Glucose in mmol/L, fasting', READING_INPUT_GLUCOSE),
    weight: ex('Weight typed by a person', READING_INPUT_WEIGHT),
  }),
  responses: {
    201: ok('Created.', ref('Reading'), {
      bloodPressureAlert: ex('Blood pressure with an alert', READING_BP),
      weightWithBmi: ex('Weight with bmi (no thresholds: level unknown)', READING_WEIGHT),
    }),
    200: ok('Duplicate: the reading was already stored. The original is returned with `duplicate: true`.', ref('Reading'), {
      duplicate: ex('Duplicate', READING_BP_DUPLICATE),
    }),
  },
  errors: [400, 401, 403, 404, 422, 429, 500],
  postman: [
    { name: 'Create reading (secret key)', example: 'bloodPressure', test: 'readingId' },
    { name: 'Create reading (session token)', example: 'sessionToken', auth: 'session', test: 'readingId' },
  ],
})

add('post', '/readings/batch', {
  id: 'createReadingsBatch',
  tag: 'Readings',
  summary: 'Create readings in a batch',
  token: TOKEN.reading,
  description: [
    'Up to 100 readings in one call. Items are independent: each one gets its own `status` (`created`, `duplicate` or `error`), in the same order (`index`).',
    'The call answers 200 even when some items fail. The same rules as `POST /readings` apply to every item.',
  ].join(' '),
  params: ['Locale', 'AcceptLanguage'],
  body: body('BatchRequest', { threeReadings: ex('Created, duplicate and error', BATCH_REQUEST) }),
  responses: {
    200: ok('One result per item.', ref('BatchResult'), { mixed: ex('Created, duplicate and error', BATCH_RESULT) }),
  },
  errors: [400, 401, 403, 429, 500],
})

add('get', '/readings/{id}', {
  id: 'getReading',
  tag: 'Readings',
  summary: 'Get a reading',
  token: TOKEN.readingOwnPatient,
  description: 'Returns the reading with `alert` recomputed in the requested locale.',
  params: ['ReadingId', 'Locale', 'AcceptLanguage'],
  responses: { 200: ok('The reading.', ref('Reading'), { reading: ex('Blood pressure with an alert', READING_BP) }) },
  errors: [401, 403, 404, 429, 500],
})

add('get', '/patients/{id}/readings', {
  id: 'listPatientReadings',
  tag: 'Readings',
  summary: 'List readings of a patient',
  token: TOKEN.ownPatient,
  description: 'Readings of the patient, newest first, `alert` included. Filter by `type` and by a `from`/`to` window.',
  params: ['PatientId', 'ReadingTypeQuery', 'From', 'To', 'Limit', 'Cursor', 'Locale', 'AcceptLanguage'],
  responses: {
    200: ok('A page of readings.', ref('ReadingList'), {
      page: ex('Two readings, more pages', { data: [READING_SPO2, READING_BP], hasMore: true, nextCursor: 'MjEwNDQ1NQ' }),
    }),
  },
  errors: [400, 401, 403, 404, 429, 500],
})

add('get', '/patients/{id}/thresholds', {
  id: 'listPatientThresholds',
  tag: 'Alert settings',
  summary: 'List thresholds of a patient',
  token: TOKEN.ownPatient,
  description:
    'The limits used to compute `level` and `alert`. `source` is `patient` when the patient has limits of their own (set by the care team or with `PUT /patients/{id}/thresholds`), `default` when they come from the client default. Missing limits are null; a value without limits gets level `unknown`.',
  params: ['PatientId'],
  responses: { 200: ok('Thresholds of the patient.', ref('ThresholdList'), { thresholds: ex('Thresholds', THRESHOLDS) }) },
  errors: [401, 403, 404, 429, 500],
})

add('put', '/patients/{id}/thresholds', {
  id: 'updatePatientThresholds',
  tag: 'Alert settings',
  summary: 'Set the limits of a patient',
  token: TOKEN.secret,
  description: [
    'Sets the limits of one patient for one type. They are the same limits the care team sees and edits in the EmmiTec portal, and the next readings of this patient use them right away.',
    'In `limits`, send the values you want to change, each with its four limits as numbers (0 to 1000) in order: criticalLow <= attentionLow <= attentionHigh <= criticalHigh.',
    'Values you do not send keep the limits that apply today; when one of them has no limits to keep, the API answers 400 with `param` `limits.<value>` (send that value too).',
    'Values per type: blood_pressure `systolic`, `diastolic` (mmHg), `pulse` (bpm); oxygen_saturation `spo2` (%), `pulse` (bpm); temperature `temperature` (C); glucose `glucose` (mg/dL). weight has no limits (400).',
    'The response lists every value of the type, all with `source: "patient"`.',
  ].join(' '),
  params: ['PatientId'],
  body: body('ThresholdsUpdate', {
    bloodPressure: ex('Blood pressure: systolic and diastolic', PATIENT_LIMITS_BP),
    oxygenSaturation: ex('Oxygen saturation: SpO2 (no high alert) and pulse', PATIENT_LIMITS_SPO2),
    temperature: ex('Temperature in C', PATIENT_LIMITS_TEMPERATURE),
    glucose: ex('Glucose in mg/dL', PATIENT_LIMITS_GLUCOSE),
  }),
  responses: {
    200: ok('Every value of the type, with the limits that now apply.', ref('ThresholdList'), {
      bloodPressure: ex('Blood pressure (pulse was not sent and kept its limits)', PATIENT_LIMITS_BP_RESULT),
    }),
  },
  errors: [400, 401, 403, 404, 429, 500],
})

add('put', '/patients/{id}/alerts', {
  id: 'updatePatientAlerts',
  tag: 'Alert settings',
  summary: 'Turn alerts on or off for a patient',
  token: TOKEN.secret,
  description: [
    'Per patient and type. It is the same switch the care team has in the EmmiTec portal.',
    'Off: readings of this patient and type are still stored and get `level` and `levels`, but `alert` is null and no `reading.alert` event is sent.',
    'In test mode, `POST /sandbox/simulate-alert` turns alerts back on for the simulated type.',
  ].join(' '),
  params: ['PatientId'],
  body: body('PatientAlertsUpdate', {
    off: ex('No blood pressure alerts for this patient', PATIENT_ALERTS_OFF),
    on: ex('Blood pressure alerts back on', { ...PATIENT_ALERTS_OFF, enabled: true }),
  }),
  responses: {
    200: ok('The switch, as saved.', ref('PatientAlerts'), { off: ex('Blood pressure alerts off', PATIENT_ALERTS_OFF) }),
  },
  errors: [400, 401, 403, 404, 429, 500],
  // running the collection in order must not leave the test patient without alerts
  postman: [{ example: 'on' }],
})

add('get', '/thresholds', {
  id: 'listClientThresholds',
  tag: 'Alert settings',
  summary: 'List the default limits of your client',
  token: TOKEN.secret,
  description: [
    'The default limits of the client of this mode: the shared sandbox defaults with a test key, the defaults of your live client with a live key.',
    'They apply to every patient that has no limits of their own (`GET /patients/{id}/thresholds` shows what applies to one patient). Values without default limits are left out.',
  ].join(' '),
  responses: {
    200: ok('Default limits, all with `source: "default"`.', ref('ThresholdList'), {
      sandbox: ex('Sandbox defaults (test key)', SANDBOX_DEFAULTS),
    }),
  },
  errors: [401, 403, 429, 500],
})

add('put', '/thresholds', {
  id: 'updateClientThresholds',
  tag: 'Alert settings',
  summary: 'Change the default limits of your live client',
  token: TOKEN.liveOnly,
  description: [
    'Live key only. A test key gets 403 `forbidden`: the sandbox defaults are shared by every partner, so set limits per patient with `PUT /patients/{id}/thresholds`.',
    'Send one type per call and, in `limits`, the values to change, each with its four limits (same rules as `PUT /patients/{id}/thresholds`). Values you do not send keep their defaults.',
    'The new defaults apply to every patient of your live client without limits of their own, including patients the care team added outside the API.',
    '409 `conflict` when your client has no default limits for this type yet: EmmiTec sets them up.',
  ].join(' '),
  body: body('ThresholdsUpdate', { glucose: ex('Glucose default', CLIENT_LIMITS_GLUCOSE) }),
  responses: {
    200: ok('The defaults of the type, as saved.', ref('ThresholdList'), {
      glucose: ex('Glucose default (live)', CLIENT_LIMITS_GLUCOSE_RESULT),
    }),
  },
  errors: [400, 401, 403, 409, 429, 500],
  postman: [{ name: 'Change the default limits (live key only)', test: 'liveOnly' }],
})

add('get', '/settings', {
  id: 'getSettings',
  tag: 'Alert settings',
  summary: 'Get the alert settings',
  token: TOKEN.secret,
  description: 'Whether alerts are on for your integration in the mode of the key. Test and live have separate settings. Default: on.',
  responses: { 200: ok('The settings of this mode.', ref('Settings'), { on: ex('Alerts on (the default)', SETTINGS_ON) }) },
  errors: [401, 403, 429, 500],
})

add('put', '/settings', {
  id: 'updateSettings',
  tag: 'Alert settings',
  summary: 'Turn alerts on or off',
  token: TOKEN.secret,
  description: [
    'Turns alerts on or off for your integration in the mode of the key.',
    'Off: readings are still stored and still get `level` and `levels`, but `alert` is null in every response (and in the SDK), `reading.alert` is not sent, and `reading.created` (when subscribed) is still sent with `alert: null`.',
    'It only changes what EmmiTec sends to you: in live mode the readings still reach the care team.',
  ].join(' '),
  body: body('SettingsUpdate', {
    off: ex('Turn alerts off', { alertsEnabled: false }),
    on: ex('Turn alerts back on', { alertsEnabled: true }),
  }),
  responses: {
    200: ok('The settings, as saved.', ref('Settings'), {
      off: ex('Alerts off', SETTINGS_OFF),
      on: ex('Alerts on', SETTINGS_ON),
    }),
  },
  errors: [400, 401, 403, 429, 500],
  // running the collection in order must not leave the sandbox without alerts
  postman: [{ example: 'on' }],
})

add('get', '/devices', {
  id: 'listDevices',
  tag: 'Devices',
  summary: 'List supported devices',
  token: 'Any token (secret key or session token).',
  description: [
    'The v1 catalog, plus `manual` (typed by a person) and `other` (a device not in the catalog).',
    'Send the `model` in `device.model` of a reading. `pairing: true` means the device must be paired with the phone first',
    '(`uam820bt` asks for a pairing code). `hc059` sends its weight by Bluetooth advertising only (no connection).',
  ].join(' '),
  responses: { 200: ok('The catalog.', ref('DeviceList'), { catalog: ex('Catalog v1', DEVICES) }) },
  errors: [401, 403, 429, 500],
})

add('post', '/diagnostics', {
  id: 'sendDiagnostics',
  tag: 'Devices',
  summary: 'Send app diagnostics',
  token: TOKEN.any,
  description: [
    'Used by the SDK (from 1.1.0) to tell EmmiTec support what happened on the phone: Bluetooth steps and failures',
    'and the offline queue. Never send names, measured values or tokens. Only EmmiTec reads it (90 days).',
    'You do not need to call it yourself; the SDK does.',
  ].join(' '),
  body: body('DiagnosticsRequest', { failure: ex('A connection that failed', DIAGNOSTICS_FAILURE) }),
  responses: { 202: ok('Accepted.', ref('DiagnosticsAccepted'), { ok: ex('Accepted', { accepted: 2 }) }) },
  errors: [400, 401, 404, 429, 500],
})

add('get', '/webhook', {
  id: 'getWebhook',
  tag: 'Webhook',
  summary: 'Get the webhook',
  token: TOKEN.secret,
  description:
    'The webhook of this integration for the mode of the key. 404 `not_found` when none is configured. The secret is never returned here, only `secretHint`.',
  responses: { 200: ok('The webhook.', ref('Webhook'), { webhook: ex('Webhook', WEBHOOK) }) },
  errors: [401, 403, 404, 429, 500],
})

add('put', '/webhook', {
  id: 'upsertWebhook',
  tag: 'Webhook',
  summary: 'Create or update the webhook',
  token: TOKEN.secret,
  description: [
    'One webhook per integration and mode. `url` must start with `https://` (in test mode `http://localhost` is not allowed either; use a tunnel).',
    'On first creation the response also has `secret` (`whsec_...`), shown only once: store it to verify `EmmiTec-Signature`.',
    'Later updates do not return it; use `POST /webhook/rotate-secret` for a new one.',
  ].join(' '),
  body: body('WebhookUpsert', { alertsAndReadings: ex('Alerts and every reading', WEBHOOK_UPSERT) }),
  responses: {
    200: ok(
      'The webhook. `secret` is present only when this call created the webhook.',
      {
        anyOf: [ref('WebhookWithSecret'), ref('Webhook')],
      },
      {
        created: ex('First creation (with secret)', WEBHOOK_CREATED),
        updated: ex('Update (no secret)', WEBHOOK_UPDATED),
      },
    ),
  },
  errors: [400, 401, 403, 429, 500],
})

add('delete', '/webhook', {
  id: 'deleteWebhook',
  tag: 'Webhook',
  summary: 'Delete the webhook',
  token: TOKEN.secret,
  description: 'Deletes the webhook of this integration for the mode of the key. No more events are sent.',
  responses: { 200: ok('Deleted.', ref('WebhookDeleted'), { deleted: ex('Deleted', { deleted: true }) }) },
  errors: [401, 403, 404, 429, 500],
})

add('post', '/webhook/rotate-secret', {
  id: 'rotateWebhookSecret',
  tag: 'Webhook',
  summary: 'Rotate the signing secret',
  token: TOKEN.secret,
  description: 'Creates a new signing secret and returns it once, with the webhook. The old secret stops signing immediately.',
  responses: {
    200: ok('The webhook with the new secret.', ref('WebhookWithSecret'), { rotated: ex('New secret', WEBHOOK_ROTATED) }),
  },
  errors: [401, 403, 404, 429, 500],
})

add('post', '/webhook/test', {
  id: 'testWebhook',
  tag: 'Webhook',
  summary: 'Send a test event',
  token: TOKEN.secret,
  description: 'Sends a `ping` event to your URL now, synchronously (10 s timeout), and returns the result.',
  responses: {
    200: ok('Result of the delivery.', ref('WebhookTestResult'), {
      delivered: ex('Delivered', WEBHOOK_TEST_OK),
      timedOut: ex('Your endpoint did not answer', WEBHOOK_TEST_TIMEOUT),
    }),
  },
  errors: [401, 403, 404, 429, 500],
  postman: [{ test: 'eventId' }],
})

add('get', '/events', {
  id: 'listEvents',
  tag: 'Events',
  summary: 'List events',
  token: TOKEN.secret,
  description: 'Recent webhook events of this integration and mode with their delivery status, newest first.',
  params: ['EventTypeQuery', 'Limit', 'Cursor'],
  responses: {
    200: ok('A page of events.', ref('EventList'), {
      page: ex('A pending and a delivered event', { data: [EVENT_PENDING, EVENT_DELIVERED], hasMore: false, nextCursor: null }),
    }),
  },
  errors: [400, 401, 403, 429, 500],
})

add('post', '/events/{id}/resend', {
  id: 'resendEvent',
  tag: 'Events',
  summary: 'Resend an event',
  token: TOKEN.secret,
  description: 'Schedules the event again now and returns it. Use it after your endpoint was down.',
  params: ['EventId'],
  responses: { 200: ok('The event, scheduled again.', ref('Event'), { scheduled: ex('Scheduled again', EVENT_RESENT) }) },
  errors: [401, 403, 404, 429, 500],
})

add('post', '/sandbox/simulate-alert', {
  id: 'simulateAlert',
  tag: 'Sandbox',
  summary: 'Simulate an alert',
  token: TOKEN.sandbox,
  description: [
    'Creates a real sandbox reading whose values produce the requested `level` for the thresholds of this patient, and runs the full pipeline, webhook included.',
    'Defaults: `type` blood_pressure, `level` critical_high. `weight` is rejected (400 `unsupported_type`); `oxygen_saturation` accepts only `attention_low`, `critical_low` and `normal`.',
    'It turns on alerts for that type for the patient. The created reading has `device.model` `other` and an `externalId` that starts with `sim_`.',
  ].join(' '),
  params: ['Locale', 'AcceptLanguage'],
  body: body('SimulateAlertRequest', { criticalHigh: ex('Very high blood pressure', SIMULATE_REQUEST) }),
  responses: { 201: ok('Created: the simulated reading.', ref('Reading'), { simulated: ex('Simulated reading', READING_SIMULATED) }) },
  errors: [400, 401, 403, 404, 422, 429, 500],
})

// -------------------------------------------------------------------------------------------------------------------
// Webhooks (requests EmmiTec sends to the partner)

function webhookHeaderParams(type, example) {
  return [
    {
      name: 'User-Agent',
      in: 'header',
      required: true,
      description: 'Always `EmmiTec-Webhooks/1.0`.',
      schema: { type: 'string' },
      example: 'EmmiTec-Webhooks/1.0',
    },
    {
      name: 'EmmiTec-Event-Id',
      in: 'header',
      required: true,
      description: 'Event id, same as `id` in the body. Dedupe by it.',
      schema: { type: 'string', pattern: EVENT_ID_PATTERN },
      example: example.id,
    },
    {
      name: 'EmmiTec-Event-Type',
      in: 'header',
      required: true,
      description: 'Event type, same as `type` in the body.',
      schema: { type: 'string', enum: EVENT_TYPES },
      example: type,
    },
    {
      name: 'EmmiTec-Signature',
      in: 'header',
      required: true,
      description: [
        'Format `t=<unix seconds>,v1=<hex>`, where v1 = hex HMAC-SHA256(secret, "<t>.<raw body>").',
        'Reject the request when |now - t| > 300 s.',
        `The example was computed with the example secret \`${WEBHOOK_SECRET}\` over the compact JSON of the example body.`,
      ].join(' '),
      schema: { type: 'string', pattern: '^t=[0-9]+,v1=[0-9a-f]{64}$' },
      example: signatureOf(example),
    },
  ]
}

function webhook(id, type, summary, schemaName, example, intro) {
  return {
    post: {
      operationId: id,
      tags: ['Webhook'],
      summary,
      description: [intro, DELIVERY_TEXT, VERIFY_TEXT].join('\n\n'),
      security: [],
      parameters: webhookHeaderParams(type, example),
      requestBody: {
        required: true,
        description: 'The event, as JSON.',
        content: json(ref(schemaName), { [type.replace('.', '_')]: ex(summary, example) }),
      },
      responses: {
        200: {
          description:
            'Return any 2xx within 10 seconds. Anything else (or no answer in 10 s) is retried: 1 min, 5 min, 15 min, 1 h, 3 h, 6 h, 12 h, 8 attempts total.',
        },
      },
    },
  }
}

const WEBHOOKS = {
  'reading.alert': webhook(
    'readingAlertWebhook',
    'reading.alert',
    'Reading alert',
    'ReadingAlertEvent',
    ALERT_EVENT,
    'Sent when a reading has a level that is not normal or unknown. Default subscription. `data` has the patient, the reading (without `alert`) and the alert to turn into a push notification.',
  ),
  'reading.created': webhook(
    'readingCreatedWebhook',
    'reading.created',
    'Reading created',
    'ReadingCreatedEvent',
    CREATED_EVENT,
    'Sent for every new reading. Opt-in: add `reading.created` to `events` with `PUT /webhook`.',
  ),
  ping: webhook(
    'pingWebhook',
    'ping',
    'Ping',
    'PingEvent',
    PING_EVENT,
    'Test event, sent only by `POST /webhook/test`.',
  ),
}

// -------------------------------------------------------------------------------------------------------------------
// OpenAPI document

function operationObject(o) {
  const responses = { ...o.responses }
  for (const status of o.errors) responses[status] = { $ref: `#/components/responses/${ERROR_BY_STATUS[status]}` }
  return {
    operationId: o.id,
    tags: [o.tag],
    summary: o.summary,
    description: `**Token:** ${o.token}\n\n${o.description}`,
    ...(o.params ? { parameters: o.params.map((p) => ({ $ref: `#/components/parameters/${p}` })) } : {}),
    ...(o.body ? { requestBody: o.body } : {}),
    responses,
  }
}

const paths = {}
for (const o of OPS) {
  paths[o.path] = paths[o.path] || {}
  paths[o.path][o.method] = operationObject(o)
}

const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'EmmiTec Partner API',
    version: API_VERSION,
    description: [
      'Store readings from Bluetooth medical devices on the EmmiTec platform from your own app and backend, and receive alert payloads (title, text, reason and the reading that triggered them) to build your own push notifications.',
      'Test and live use the same base URL. The key prefix decides the mode: `emk_test_` keys use an isolated sandbox where no clinician is ever notified; `emk_live_` keys use your real client and readings reach the care team. Every response has `X-Request-Id`; authenticated responses also have `X-EmmiTec-Mode`.',
      'JSON only, UTF-8. Dates are ISO 8601 UTC with `Z`. Lists are newest first with `limit` (1 to 100, default 25) and an opaque `cursor`. Rate limit: 30 requests per second per key or session token.',
    ].join('\n\n'),
    contact: { name: 'EmmiTec', email: 'contato@emmitec.health', url: 'https://emmitec.health/developers' },
    license: { name: 'Proprietary', url: 'https://emmitec.health/terms' },
  },
  externalDocs: { description: 'Guides and quickstart', url: 'https://emmitec.health/developers' },
  servers: [{ url: BASE_URL, description: 'Production. Test and live share it; the key decides the mode.' }],
  security: [{ bearerAuth: [] }],
  tags: TAGS,
  paths,
  webhooks: WEBHOOKS,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: [
          '`Authorization: Bearer <token>` on every request. Two kinds of token:',
          '\n\n- **Secret key** (`emk_test_...` or `emk_live_...`): generated in the customer portal (https://emmitec.health/portal), where you can copy it again at any time, or issued by EmmiTec. Only EmmiTec revokes keys. Server to server only: never ship it inside a mobile app or a website.',
          '\n- **Patient session token** (`emst_test_...` or `emst_live_...`): minted by your backend with `POST /patients/{id}/session-tokens` for ONE patient and handed to your mobile app. It can only call `GET /ping`, `GET /me`, `GET /devices`, `POST /readings`, `POST /readings/batch`, `GET /readings/{id}`, and `GET /patients/{id}/readings` and `GET /patients/{id}/thresholds` for its own patient; anything else gets 403 `forbidden`.',
          '\n\nMissing, invalid, revoked or expired token: 401 `unauthorized`.',
        ].join(''),
      },
    },
    headers: HEADERS,
    parameters: PARAMETERS,
    responses: RESPONSES,
    schemas: SCHEMAS,
  },
}

// -------------------------------------------------------------------------------------------------------------------
// Postman collection v2.1

const PATH_VARIABLE = { patients: 'patientId', readings: 'readingId', events: 'eventId' }

/** Postman variables in place of example ids and times, so the requests run in sequence. */
function forPostman(value, key) {
  if (Array.isArray(value)) return value.map((v) => forPostman(v))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, forPostman(v, k)]))
  }
  if (value === PATIENT_ID) return '{{patientId}}'
  if (key === 'measuredAt') return '{{$isoTimestamp}}'
  return value
}

function postmanUrl(path, params) {
  const segments = path.split('/').filter(Boolean)
  const pathParts = segments.map((s, i) => (s === '{id}' ? `{{${PATH_VARIABLE[segments[i - 1]]}}}` : s))
  const query = params
    .filter((p) => p.in === 'query')
    .map((p) => ({
      key: p.name,
      value: String(p.example ?? p.schema.default ?? ''),
      description: p.description,
      disabled: true,
    }))
  return {
    raw: `{{baseUrl}}/${pathParts.join('/')}`,
    host: ['{{baseUrl}}'],
    path: pathParts,
    ...(query.length ? { query } : {}),
  }
}

const bearer = (variable) => ({ type: 'bearer', bearer: [{ key: 'token', value: `{{${variable}}}`, type: 'string' }] })

const SETTERS = {
  patientId: 'body.id',
  sessionToken: 'body.token',
  readingId: 'body.id',
  eventId: 'body.eventId',
}

function testScript(variable) {
  if (variable === 'liveOnly') {
    // live-only route: with the default test key the expected answer is 403
    const lines = [
      "pm.test('2xx with a live key, 403 with a test key', function () {",
      "  if (pm.response.headers.get('X-EmmiTec-Mode') === 'test') {",
      '    pm.expect(pm.response.code).to.eql(403);',
      '  } else {',
      '    pm.expect(pm.response.code).to.be.within(200, 299);',
      '  }',
      '});',
    ]
    return [{ listen: 'test', script: { type: 'text/javascript', exec: lines } }]
  }
  const lines = [
    "pm.test('Status is 2xx', function () {",
    '  pm.expect(pm.response.code).to.be.within(200, 299);',
    '});',
  ]
  if (variable) {
    const expr = SETTERS[variable]
    lines.push(
      'const body = pm.response.json();',
      `if (body && ${expr}) {`,
      `  pm.collectionVariables.set('${variable}', ${expr});`,
      '}',
    )
  }
  return [{ listen: 'test', script: { type: 'text/javascript', exec: lines } }]
}

function postmanRequests(o) {
  const params = (o.params || []).map((name) => PARAMETERS[name])
  const variants = o.postman || [{}]
  return variants.map((variant) => {
    const headers = []
    let bodyObject
    if (o.body) {
      const examples = o.body.content['application/json'].examples
      const exampleName = variant.example || Object.keys(examples)[0]
      bodyObject = {
        mode: 'raw',
        raw: JSON.stringify(forPostman(examples[exampleName].value), null, 2),
        options: { raw: { language: 'json' } },
      }
      headers.push({ key: 'Content-Type', value: 'application/json' })
    }
    for (const p of params.filter((x) => x.in === 'header')) {
      headers.push({ key: p.name, value: String(p.example ?? ''), description: p.description, disabled: true })
    }
    return {
      name: variant.name || o.summary,
      event: testScript(variant.test),
      request: {
        ...(variant.auth === 'session' ? { auth: bearer('sessionToken') } : {}),
        method: o.method.toUpperCase(),
        header: headers,
        ...(bodyObject ? { body: bodyObject } : {}),
        url: postmanUrl(o.path, params),
        description: `**Token:** ${o.token}\n\n${o.description}`,
      },
      response: [],
    }
  })
}

const postman = {
  info: {
    _postman_id: '7d3e9a51-2c4b-4f6e-9a8d-1b5c7e3f0a92',
    name: 'EmmiTec Partner API v1',
    description: [
      `EmmiTec Partner API v1 (version ${API_VERSION}). Set \`secretKey\` to your \`emk_test_...\` key and run the requests in order:`,
      'Create patient sets `patientId`, Mint a session token sets `sessionToken`, Create reading sets `readingId`, Send a test event sets `eventId`.',
      'The key prefix decides the mode (test or live); the base URL is the same. Never put a live secret key in a shared workspace.',
      'Reading bodies use `{{$isoTimestamp}}` for `measuredAt` so they stay inside the 365-day window.',
      'v1.1 adds the Alert settings folder; "Change the default limits" needs a live key and answers 403 with a test key (its test expects that).',
    ].join(' '),
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: bearer('secretKey'),
  variable: [
    { key: 'baseUrl', value: BASE_URL, type: 'string' },
    { key: 'secretKey', value: 'emk_test_replace_me', type: 'string' },
    { key: 'sessionToken', value: 'emst_test_replace_me', type: 'string' },
    { key: 'patientId', value: '', type: 'string' },
    { key: 'readingId', value: '', type: 'string' },
    { key: 'eventId', value: '', type: 'string' },
  ],
  item: TAGS.map((tag) => ({
    name: tag.name,
    description: tag.description,
    item: OPS.filter((o) => o.tag === tag.name).flatMap(postmanRequests),
  })),
}

// -------------------------------------------------------------------------------------------------------------------
// Write

function write(fileName, data) {
  const text = `${JSON.stringify(data, null, 2)}\n`
  // first character outside ASCII (no em-dash, curly quotes, accents in the public files)
  let bad = -1
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 0x7f) {
      bad = i
      break
    }
  }
  if (bad !== -1) {
    throw new Error(`${fileName}: non-ASCII character near: ${JSON.stringify(text.slice(Math.max(0, bad - 40), bad + 10))}`)
  }
  const target = resolve(OUT_DIR, fileName)
  writeFileSync(target, text, 'utf8')
  return target
}

mkdirSync(OUT_DIR, { recursive: true })
const written = [
  write('openapi.json', openapi),
  write('emmitec-partner-api.postman_collection.json', postman),
]
for (const file of written) console.log(`wrote ${file}`)
console.log(`${OPS.length} operations, ${Object.keys(WEBHOOKS).length} webhooks`)
