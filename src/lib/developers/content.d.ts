/* Módulos gerados pelo plugin de Markdown das docs (src/lib/developers/build). */

declare module '*.md' {
  const page: import('./types').DocModule
  export default page
}

declare module 'virtual:developers-index' {
  const index: import('./types').DocIndexEntry[]
  export default index
}

/** Caminho do build de navegador do Scalar (definido pelo plugin scalar-plugin.mjs). */
declare const __SCALAR_BASE__: string
