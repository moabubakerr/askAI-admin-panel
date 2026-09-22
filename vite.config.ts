import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // Read with an empty prefix so unprefixed API_UPSTREAM is visible. This runs
  // in Node while the dev server starts; nothing here reaches the bundle, and
  // no VITE_-prefixed variable is defined, so nothing can be inlined into it.
  const env = loadEnv(mode, '.', '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      // The bundle only ever calls /api/... relative, because the API serves no
      // CORS headers. In the container nginx proxies that prefix; in
      // development this does. Both strip the prefix, so a call to
      // /api/admin/stats reaches the upstream as /admin/stats.
      proxy: {
        '/api': {
          target: env.API_UPSTREAM || 'http://127.0.0.1:18000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
