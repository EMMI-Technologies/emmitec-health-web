/*
 * Referência da API (/developers/api-reference): publica o build de navegador do @scalar/api-reference
 * (standalone.esm.js + chunks, com Vue próprio) em /developers/scalar/<versão>/.
 *
 * Por que fora do grafo do app: importado normalmente, o Scalar divide o módulo do Vue com o site, e o
 * bundler mantém no pedaço de abertura do site tudo o que o Scalar usa do Vue (SSR, hidratação...):
 * a abertura de qualquer página crescia ~18 kB. Assim, o site não muda nada e a referência baixa o
 * Scalar só quando alguém abre essa página.
 *
 * Arquivos .js porque o Amplify só serve como arquivo o que termina em js/css/json/etc.; o resto vira
 * index.html. Versão no caminho para um deploy novo nunca misturar pedaços de versões diferentes.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function scalarBrowserDir() {
  const entry = require.resolve('@scalar/api-reference') // .../dist/index.js
  return path.join(path.dirname(entry), 'browser')
}

function scalarVersion() {
  const pkgFile = path.join(path.dirname(scalarBrowserDir()), '..', 'package.json')
  return JSON.parse(fs.readFileSync(pkgFile, 'utf8')).version
}

function listFiles(dir) {
  const out = ['standalone.esm.js']
  for (const f of fs.readdirSync(path.join(dir, 'chunks'))) if (f.endsWith('.js')) out.push(`chunks/${f}`)
  return out
}

const stripSourceMap = (code) => code.replace(/\n?\/\/# sourceMappingURL=\S+\s*$/, '\n')

export function developersScalar() {
  const dir = scalarBrowserDir()
  const base = `/developers/scalar/${scalarVersion()}/`
  return {
    name: 'emmitec-developers-scalar',
    config() {
      return { define: { __SCALAR_BASE__: JSON.stringify(base) } }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0]
        if (!url.startsWith(base)) return next()
        const rel = url.slice(base.length)
        const file = path.join(dir, rel)
        if (!file.startsWith(dir) || !rel.endsWith('.js') || !fs.existsSync(file)) return next()
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8')
        res.end(stripSourceMap(fs.readFileSync(file, 'utf8')))
      })
    },
    generateBundle() {
      for (const rel of listFiles(dir)) {
        this.emitFile({
          type: 'asset',
          fileName: `${base.slice(1)}${rel}`,
          source: stripSourceMap(fs.readFileSync(path.join(dir, rel), 'utf8')),
        })
      }
    },
  }
}
