import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base must match the GitHub repo name for GitHub Pages.
export default defineConfig({
  plugins: [react()],
  base: '/bbgc-tournament/',
})
