import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// '/' because the site is served at the root of thebbgc.com. Asset URLs in
// index.html are written root-relative and Vite rewrites them with this base.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        score: resolve(__dirname, 'score/index.html'),
      },
    },
  },
})
