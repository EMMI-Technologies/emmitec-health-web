import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
// docs para desenvolvedores (/developers): o conteúdo NÃO entra no site desde 26/11/2026 (vem do backend do portal,
// só com sessão; ver src/lib/developers/build/build-private-docs.mjs). Aqui fica só o Scalar da referência da API.
// referência da API: o Scalar sai como arquivos próprios em /developers/scalar/ (fora do bundle do site)
import { developersScalar } from './src/lib/developers/build/scalar-plugin.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    developersScalar() as Plugin,
    tailwindcss(),
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
