/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { inlinePins } from './src/plugins/inlinePins'

export default defineConfig({
  base: '/roadie/',
  plugins: [
    TanStackRouterVite(),
    react(),
    tailwindcss(),
    inlinePins(),
    {
      name: 'static-dir-index',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url?.match(/\/roadie\/status\/?$/)) {
            req.url = '/roadie/status/index.html';
          }
          if (req.url?.match(/\/roadie\/wall\/?$/)) {
            req.url = '/roadie/wall/index.html';
          }
          next();
        });
      },
    },
  ],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'lcov', 'html'],
      include: ['src/lib/**'],
    },
  },
})
