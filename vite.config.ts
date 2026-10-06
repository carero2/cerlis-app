import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// BASE_PATH permite publicar en un subdirectorio (p. ej. GitHub Pages: /cerlis-app/).
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  build: {
    // El SDK de Firebase va en su propio chunk y solo se carga si hay sincronización.
    chunkSizeWarningLimit: 800,
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
