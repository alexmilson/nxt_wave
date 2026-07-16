import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages requires relative asset paths since the app is served from
// https://<user>.github.io/<repo>/ rather than the domain root.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
