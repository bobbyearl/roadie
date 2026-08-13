import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { inlinePins } from './src/plugins/inlinePins'

export default defineConfig({
  base: '/roadie/',
  plugins: [TanStackRouterVite(), react(), tailwindcss(), inlinePins()],
})
