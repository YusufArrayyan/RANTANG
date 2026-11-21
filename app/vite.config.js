import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' agar bisa dibuka dari GitHub Pages maupun server lokal
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2020', chunkSizeWarningLimit: 400 },
})
