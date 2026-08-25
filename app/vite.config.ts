import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Em produção o front e as Functions ficam no mesmo domínio do Azure Static Web
 * Apps, então /api resolve sozinho. Em desenvolvimento o proxy manda /api para
 * o servidor local da API (api/scripts/servidor-local.mjs, porta 7071).
 */
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true,
      },
    },
  },
});
