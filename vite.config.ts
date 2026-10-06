import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// Identificador único de cada publicación: la app lo compara con version.json
// para saber si hay una versión más nueva y ofrecer recargar.
const BUILD_ID = process.env.GITHUB_SHA?.slice(0, 12) || Date.now().toString(36)

function versionFile(): Plugin {
  return {
    name: 'cerlis-version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ build: BUILD_ID, version: pkg.version }),
      })
    },
  }
}

// BASE_PATH permite publicar en un subdirectorio (p. ej. GitHub Pages: /cerlis-app/).
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), versionFile()],
  build: {
    // El SDK de Firebase va en su propio chunk y solo se carga si hay sincronización.
    chunkSizeWarningLimit: 800,
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
})
