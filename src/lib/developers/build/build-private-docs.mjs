/*
 * Conteúdo privado da documentação de parceiros (spec docs/specs/2026/q4/q4-2/docs-de-parceiros-so-com-login.md).
 *
 * Desde 26/11/2026 a documentação só é lida por quem tem conta no portal do cliente: o site mostra a entrada, e o
 * backend do portal (sr-backend-patients, /partner/v1/portal/docs...) serve o conteúdo com sessão. Este script é o
 * único caminho do Markdown até lá:
 *
 *   src/content/developers/<en|pt>/<slug>.md         ->  <saida>/paginas/<lang>/<slug>.json  { title, description, html, toc }
 *   (todas as páginas)                               ->  <saida>/indice.json                 { geradoEm, paginas: [títulos, intertítulos, endpoints] }
 *   src/content/developers/files/openapi.json        ->  <saida>/arquivos/openapi.json
 *   src/content/developers/files/*.postman_collection.json -> <saida>/arquivos/postman.json
 *
 * Saída: DOCS_PRIVADAS_DIR ou backends/sr-backend-patients/src/parceiros/docs-parceiros (irmão deste repositório).
 * Páginas que não existem mais são apagadas da saída. Depois: commit e push do backend (o deploy leva a pasta).
 *
 * Uso: npm run docs:privadas   (gera o OpenAPI e o Postman antes; ou node este-arquivo para só as páginas)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { indexPage, listContentFiles, renderPage } from './markdown.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FILES_DIR = path.resolve(HERE, '../../../content/developers/files')
const OUT_DIR = process.env.DOCS_PRIVADAS_DIR
  ? path.resolve(process.env.DOCS_PRIVADAS_DIR)
  : path.resolve(HERE, '../../../../../../backends/sr-backend-patients/src/parceiros/docs-parceiros')

const ARQUIVOS = [
  ['openapi.json', 'openapi.json'],
  ['emmitec-partner-api.postman_collection.json', 'postman.json'],
]

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(data), 'utf8')
}

const files = listContentFiles()
if (!files.length) {
  console.error('nenhuma página em src/content/developers')
  process.exit(1)
}

const indice = []
const esperados = new Set()
for (const { lang, file } of files) {
  const src = fs.readFileSync(file, 'utf8')
  const slug = path.basename(file, '.md')
  const page = await renderPage(src, lang)
  if (!page.title) {
    console.error(`${lang}/${slug}: sem title no frontmatter`)
    process.exit(1)
  }
  if (/—/.test(page.html) || /—/.test(page.title)) {
    console.error(`${lang}/${slug}: travessão no texto (proibido)`)
    process.exit(1)
  }
  writeJson(path.join(OUT_DIR, 'paginas', lang, `${slug}.json`), page)
  esperados.add(`${lang}/${slug}.json`)
  indice.push({ lang, slug, ...(await indexPage(src, lang)) })
}

// páginas apagadas no Markdown somem da saída
for (const lang of ['en', 'pt']) {
  const dir = path.join(OUT_DIR, 'paginas', lang)
  if (!fs.existsSync(dir)) continue
  for (const f of fs.readdirSync(dir)) if (!esperados.has(`${lang}/${f}`)) fs.unlinkSync(path.join(dir, f))
}

let arquivos = 0
for (const [origem, destino] of ARQUIVOS) {
  const from = path.join(FILES_DIR, origem)
  if (!fs.existsSync(from)) {
    console.error(`falta ${from} (rode npm run docs:openapi)`)
    process.exit(1)
  }
  writeJson(path.join(OUT_DIR, 'arquivos', destino), JSON.parse(fs.readFileSync(from, 'utf8')))
  arquivos++
}

const geradoEm = new Date().toISOString()
writeJson(path.join(OUT_DIR, 'indice.json'), { geradoEm, paginas: indice })
fs.writeFileSync(
  path.join(OUT_DIR, 'README.md'),
  [
    '# Documentação de parceiros (gerada, não editar)',
    '',
    'Gerada pelo site: `web/emmitec-health-web` > `npm run docs:privadas`, a partir de `src/content/developers/*.md`.',
    'Servida só com sessão do portal por `src/parceiros/portal.ts` (`GET /partner/v1/portal/docs...`), lida por `docs.ts`.',
    'Mudou a documentação: rode o script de novo e publique este backend.',
    '',
    `Última geração: ${geradoEm} (${indice.length} páginas, ${arquivos} arquivos).`,
    '',
  ].join('\n'),
  'utf8',
)
console.log(`${indice.length} páginas e ${arquivos} arquivos em ${OUT_DIR}`)
