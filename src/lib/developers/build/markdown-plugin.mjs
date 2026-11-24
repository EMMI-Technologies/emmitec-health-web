/*
 * Docs para desenvolvedores: transforma src/content/developers/<lang>/<slug>.md em módulos JS
 * na hora do build (markdown-it + shiki). O navegador recebe HTML pronto e já colorido, sem
 * nenhum highlighter em tempo de execução.
 *
 * - import page from '.../en/webhooks.md'  ->  { title, description, html, toc }
 * - import index from 'virtual:developers-index'  ->  títulos, intertítulos e endpoints de todas
 *   as páginas nos dois idiomas (para a busca), sem o HTML.
 *
 * Sintaxe extra no Markdown:
 * - ```bash title="Create a patient"        bloco com título
 * - ```bash tab="cURL" / ```js tab="Node.js" blocos seguidos com tab= viram um grupo de abas
 * - ::: note | ::: warning | ::: tip [título]  callouts
 * - ::: steps   numera os h2 de dentro (passo a passo)
 * - ::: next    lista de links do "próximo passo"
 * - um parágrafo só com `POST /patients`  vira o selo do endpoint
 *
 * Arquivo .mjs (e não .ts) porque roda no Node, e o tsconfig do app (DOM, sem tipos do Node)
 * inclui todo o src/. A assinatura para o vite.config.ts está em markdown-plugin.d.mts.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import MarkdownIt from 'markdown-it'
import container from 'markdown-it-container'
import { createHighlighter } from 'shiki'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = path.resolve(HERE, '../../../content/developers')
const VIRTUAL_ID = 'virtual:developers-index'
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID
const LANGS = ['en', 'pt']

/* ---------------------------------------------------------------
   Tema do código: fundo night-900 da marca, tons foscos (nada neon).
   Cada cor vira uma classe curta (o CSS das docs define as cores),
   para o HTML não carregar um style="" por token.
   --------------------------------------------------------------- */
const C = {
  fg: '#e6e8eb',
  comment: '#8b95a3',
  keyword: '#6fd6e6',
  string: '#a8dfc4',
  number: '#f2c48d',
  fn: '#c9bafc',
  prop: '#a3c9f5',
  type: '#86dccf',
  param: '#f0b9a6',
  punct: '#b4bcc7',
}
const CLASS_BY_COLOR = {
  [C.comment]: 'tc',
  [C.keyword]: 'tk',
  [C.string]: 'ts',
  [C.number]: 'tn',
  [C.fn]: 'tf',
  [C.prop]: 'tp',
  [C.type]: 'tt',
  [C.param]: 'ta',
  [C.punct]: 'to',
}

const THEME = {
  name: 'emmitec-night',
  type: 'dark',
  colors: { 'editor.background': '#0e1117', 'editor.foreground': C.fg },
  tokenColors: [
    { settings: { foreground: C.fg } },
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: C.comment } },
    {
      scope: [
        'keyword',
        'storage',
        'storage.type',
        'storage.modifier',
        'keyword.control',
        'keyword.operator.new',
        'keyword.operator.expression',
        'keyword.operator.logical.python',
        'variable.language',
        'constant.language.import-export-all',
      ],
      settings: { foreground: C.keyword },
    },
    {
      scope: ['string', 'string.quoted', 'string.template', 'punctuation.definition.string', 'string.unquoted'],
      settings: { foreground: C.string },
    },
    {
      scope: [
        'constant.numeric',
        'constant.language',
        'constant.character',
        'variable.other.normal.shell',
        'variable.other.special.shell',
        'punctuation.definition.variable.shell',
        'variable.other.positional.shell',
      ],
      settings: { foreground: C.number },
    },
    {
      scope: [
        'entity.name.function',
        'support.function',
        'meta.function-call.generic',
        'entity.name.command',
        'support.function.builtin.shell',
      ],
      settings: { foreground: C.fn },
    },
    {
      scope: [
        'support.type.property-name',
        'meta.object-literal.key',
        'variable.other.property',
        'variable.other.object.property',
        'entity.name.tag',
        'constant.other.option',
        'support.type.property-name.json',
      ],
      settings: { foreground: C.prop },
    },
    {
      scope: [
        'entity.name.type',
        'support.type',
        'support.class',
        'entity.name.class',
        'entity.other.inherited-class',
        'support.type.primitive',
      ],
      settings: { foreground: C.type },
    },
    { scope: ['variable.parameter', 'meta.parameters variable'], settings: { foreground: C.param } },
    {
      scope: ['punctuation', 'meta.brace', 'keyword.operator', 'punctuation.separator', 'punctuation.terminator'],
      settings: { foreground: C.punct },
    },
    // aspas das strings ficam na cor da string (vêm depois de punctuation)
    { scope: ['punctuation.definition.string'], settings: { foreground: C.string } },
    { scope: ['punctuation.definition.comment'], settings: { foreground: C.comment } },
  ],
}

const CODE_LANGS = ['bash', 'json', 'javascript', 'typescript', 'tsx', 'jsx', 'python', 'http', 'jsonc']
const LANG_ALIAS = { sh: 'bash', shell: 'bash', curl: 'bash', js: 'javascript', ts: 'typescript', py: 'python' }
const LANG_NAME = {
  bash: 'Terminal',
  json: 'JSON',
  jsonc: 'JSON',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  tsx: 'TSX',
  jsx: 'JSX',
  python: 'Python',
  http: 'HTTP',
  text: 'Text',
}

const UI = {
  en: { copy: 'Copy', note: 'Note', warning: 'Warning', tip: 'Tip', anchor: 'Link to this section' },
  pt: { copy: 'Copiar', note: 'Nota', warning: 'Atenção', tip: 'Dica', anchor: 'Link para esta seção' },
}

const ICONS = {
  note: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 9v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="6.2" r="1.1" fill="currentColor"/></svg>',
  tip: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M7.5 15h5M8.2 17.5h3.6M10 2.5a5.5 5.5 0 0 0-3.2 10c.5.4.7.9.7 1.5h5c0-.6.2-1.1.7-1.5A5.5 5.5 0 0 0 10 2.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  warning: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M10 2.8 1.9 16.6h16.2L10 2.8Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 8v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="14.4" r="1" fill="currentColor"/></svg>',
  copy: '<svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M13 4.6V4.5A1.5 1.5 0 0 0 11.5 3h-7A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13h.1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
}

/* ---------------------------------------------------------------
   Utilidades
   --------------------------------------------------------------- */
const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[`'"\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseFrontmatter(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src)
  if (!m) return { data: {}, body: src }
  const data = {}
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i < 0) continue
    const key = line.slice(0, i).trim()
    let value = line.slice(i + 1).trim()
    if (/^".*"$/.test(value) || /^'.*'$/.test(value)) value = value.slice(1, -1)
    data[key] = value
  }
  return { data, body: src.slice(m[0].length) }
}

function parseInfo(info) {
  const lang = (info.trim().split(/\s+/)[0] || 'text').toLowerCase()
  const attrs = {}
  for (const m of info.matchAll(/(\w+)="([^"]*)"/g)) attrs[m[1]] = m[2]
  return { lang: LANG_ALIAS[lang] ?? lang, attrs }
}

/** Texto puro de um token inline (para id e sumário). */
function inlineText(token) {
  if (!token?.children) return token?.content ?? ''
  return token.children
    .map((c) => (c.type === 'text' || c.type === 'code_inline' ? c.content : ''))
    .join('')
}

/* ---------------------------------------------------------------
   Highlighter (um só, criado uma vez)
   --------------------------------------------------------------- */
let highlighterPromise = null
let hl = null
async function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({ themes: [THEME], langs: CODE_LANGS }).then((h) => {
      hl = h
      return h
    })
  }
  return highlighterPromise
}

function highlight(code, lang) {
  const src = code.replace(/\n$/, '')
  if (!hl || !CODE_LANGS.includes(lang)) return escapeHtml(src)
  const { tokens } = hl.codeToTokens(src, { lang, theme: 'emmitec-night' })
  return tokens
    .map((line) =>
      line
        .map((t) => {
          const color = (t.color || '').toLowerCase()
          const text = escapeHtml(t.content)
          if (!color || color === C.fg) return text
          const cls = CLASS_BY_COLOR[color]
          return cls ? `<span class="${cls}">${text}</span>` : `<span style="color:${color}">${text}</span>`
        })
        .join(''),
    )
    .join('\n')
}

function copyButton(L) {
  return `<button type="button" class="dx-copy" data-copy>${ICONS.copy}<span>${L.copy}</span></button>`
}

function codeBlock(code, info, L) {
  const { lang, attrs } = parseInfo(info)
  const title = attrs.title || LANG_NAME[lang] || lang
  return (
    `<div class="dx-code">` +
    `<div class="dx-code__bar"><span class="dx-code__title">${escapeHtml(title)}</span>${copyButton(L)}</div>` +
    `<pre class="dx-pre" data-lang="${lang}"><code>${highlight(code, lang)}</code></pre>` +
    `</div>\n`
  )
}

function codeTabs(fences, L) {
  const tabs = fences.map((f) => {
    const { lang, attrs } = parseInfo(f.info)
    return { lang, label: attrs.tab, key: slugify(attrs.tab), code: f.content }
  })
  const buttons = tabs
    .map(
      (t, i) =>
        `<button type="button" role="tab" class="dx-tab" data-tab="${t.key}" aria-selected="${i === 0}">${escapeHtml(t.label)}</button>`,
    )
    .join('')
  const panels = tabs
    .map(
      (t, i) =>
        `<pre class="dx-pre" data-panel="${t.key}" data-lang="${t.lang}"${i === 0 ? '' : ' hidden'}><code>${highlight(t.code, t.lang)}</code></pre>`,
    )
    .join('')
  return (
    `<div class="dx-code dx-code--tabs" data-tabs>` +
    `<div class="dx-code__bar"><div class="dx-tabs" role="tablist">${buttons}</div>${copyButton(L)}</div>` +
    panels +
    `</div>\n`
  )
}

const METHOD_RE = /^(GET|POST|PUT|PATCH|DELETE)\s+(\/\S*)$/

/* ---------------------------------------------------------------
   markdown-it por idioma
   --------------------------------------------------------------- */
function createMd(lang) {
  const L = UI[lang] ?? UI.en
  const md = new MarkdownIt({ html: true, linkify: false, typographer: false })

  // ids nos intertítulos + sumário + endpoints (para a busca)
  md.core.ruler.push('dx_headings', (state) => {
    const env = state.env
    env.toc = env.toc ?? []
    env.endpoints = env.endpoints ?? []
    const used = new Map()
    const tokens = state.tokens
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]
      if (t.type === 'heading_open' && (t.tag === 'h2' || t.tag === 'h3' || t.tag === 'h4')) {
        const text = inlineText(tokens[i + 1]).trim()
        let id = slugify(text) || 'section'
        const n = used.get(id) ?? 0
        used.set(id, n + 1)
        if (n) id = `${id}-${n + 1}`
        t.attrSet('id', id)
        tokens[i + 2].meta = { id }
        if (t.tag !== 'h4') env.toc.push({ id, text, level: Number(t.tag.slice(1)) })
      }
      // parágrafo só com `POST /patients` -> selo do endpoint
      if (t.type === 'paragraph_open') {
        const inline = tokens[i + 1]
        const kids = inline?.children ?? []
        if (kids.length === 1 && kids[0].type === 'code_inline') {
          const m = METHOD_RE.exec(kids[0].content.trim())
          if (m && tokens[i + 2]?.type === 'paragraph_close') {
            let epId = `ep-${m[1].toLowerCase()}-${slugify(m[2]) || 'root'}`
            const seen = used.get(epId) ?? 0
            used.set(epId, seen + 1)
            if (seen) epId = `${epId}-${seen + 1}`
            const html = `<p class="dx-endpoint" id="${epId}"><span class="dx-method dx-method--${m[1].toLowerCase()}">${m[1]}</span><code>${escapeHtml(m[2])}</code></p>\n`
            const block = new state.Token('html_block', '', 0)
            block.content = html
            tokens.splice(i, 3, block)
            env.endpoints.push({ id: epId, text: `${m[1]} ${m[2]}` })
          }
        }
      }
    }
  })

  // blocos seguidos com tab="..." viram um grupo de abas
  md.core.ruler.push('dx_code_tabs', (state) => {
    const tokens = state.tokens
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== 'fence' || !/\btab="/.test(tokens[i].info)) continue
      let j = i
      while (j < tokens.length && tokens[j].type === 'fence' && /\btab="/.test(tokens[j].info)) j++
      const block = new state.Token('html_block', '', 0)
      block.content = codeTabs(tokens.slice(i, j), L)
      tokens.splice(i, j - i, block)
    }
  })

  md.renderer.rules.fence = (tokens, idx) => codeBlock(tokens[idx].content, tokens[idx].info, L)

  md.renderer.rules.heading_close = (tokens, idx) => {
    const t = tokens[idx]
    const id = t.meta?.id
    if (!id) return `</${t.tag}>\n`
    return `<a class="dx-anchor" href="#${id}" aria-label="${L.anchor}">#</a></${t.tag}>\n`
  }

  md.renderer.rules.table_open = () => '<div class="dx-table"><table>\n'
  md.renderer.rules.table_close = () => '</table></div>\n'

  const defaultLinkOpen =
    md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = tokens[idx].attrGet('href') ?? ''
    if (/^https?:\/\//.test(href) || href.startsWith('mailto:')) {
      tokens[idx].attrSet('target', '_blank')
      tokens[idx].attrSet('rel', 'noopener noreferrer')
    }
    return defaultLinkOpen(tokens, idx, options, env, self)
  }

  for (const kind of ['note', 'tip', 'warning']) {
    md.use(container, kind, {
      render(tokens, idx) {
        const t = tokens[idx]
        if (t.nesting === 1) {
          const title = t.info.trim().slice(kind.length).trim()
          return (
            `<div class="dx-callout dx-callout--${kind}" role="note"><span class="dx-callout__icon">${ICONS[kind]}</span><div class="dx-callout__body">` +
            (title ? `<p class="dx-callout__title">${md.renderInline(title)}</p>` : '')
          )
        }
        return '</div></div>\n'
      },
    })
  }
  md.use(container, 'steps', {
    render: (tokens, idx) => (tokens[idx].nesting === 1 ? '<div class="dx-steps">\n' : '</div>\n'),
  })
  md.use(container, 'next', {
    render: (tokens, idx) => (tokens[idx].nesting === 1 ? '<div class="dx-next">\n' : '</div>\n'),
  })

  return md
}

const mds = {}
const mdFor = (lang) => (mds[lang] ??= createMd(lang))

function langOf(file) {
  const dir = path.basename(path.dirname(file))
  return LANGS.includes(dir) ? dir : 'en'
}

/** Página completa (HTML + sumário). */
export async function renderPage(src, lang) {
  await getHighlighter()
  const { data, body } = parseFrontmatter(src)
  const env = {}
  const html = mdFor(lang).render(body, env)
  return {
    title: data.title ?? '',
    description: data.description ?? '',
    html,
    toc: env.toc ?? [],
  }
}

/** Só o que a busca precisa (sem HTML). */
async function indexPage(src, lang) {
  await getHighlighter()
  const { data, body } = parseFrontmatter(src)
  const env = {}
  mdFor(lang).parse(body, env)
  // o core roda no parse: toc e endpoints já estão no env
  return {
    title: data.title ?? '',
    description: data.description ?? '',
    headings: (env.toc ?? []).map((h) => ({ id: h.id, text: h.text })),
    endpoints: env.endpoints ?? [],
  }
}

function listContentFiles() {
  const out = []
  for (const lang of LANGS) {
    const dir = path.join(CONTENT_DIR, lang)
    if (!fs.existsSync(dir)) continue
    for (const f of fs.readdirSync(dir)) if (f.endsWith('.md')) out.push({ lang, file: path.join(dir, f) })
  }
  return out
}

/** Plugin do Vite. */
export function developersMarkdown() {
  const isDocMd = (id) => {
    const clean = id.split('?')[0].replace(/\\/g, '/')
    return clean.endsWith('.md') && clean.includes('/src/content/developers/')
  }
  return {
    name: 'emmitec-developers-markdown',
    enforce: 'pre',
    // no dev, página nova ou apagada também refaz o índice da busca
    configureServer(server) {
      const refresh = (file) => {
        if (!isDocMd(file)) return
        const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID)
        if (mod) server.moduleGraph.invalidateModule(mod)
      }
      server.watcher.on('add', refresh)
      server.watcher.on('unlink', refresh)
      server.watcher.on('change', refresh)
    },
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID
      return null
    },
    async load(id) {
      if (id !== RESOLVED_VIRTUAL_ID) return null
      const pages = []
      for (const { lang, file } of listContentFiles()) {
        this.addWatchFile(file)
        const src = fs.readFileSync(file, 'utf8')
        const slug = path.basename(file, '.md')
        pages.push({ lang, slug, ...(await indexPage(src, lang)) })
      }
      return { code: `export default ${JSON.stringify(pages)}`, map: null, moduleType: 'js' }
    },
    async transform(src, id) {
      if (!isDocMd(id)) return null
      const file = id.split('?')[0]
      const page = await renderPage(src, langOf(file))
      return { code: `export default ${JSON.stringify(page)}`, map: null, moduleType: 'js' }
    },
  }
}
