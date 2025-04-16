import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    // Fix for axios and other dependencies that use global
    _global: ({})
  },
  server: {
    proxy: {
      '/webhook/whatsapp': {
        target: 'https://pkep-app.vercel.app',
        changeOrigin: true,
      },
      '/webhook': {
        target: 'https://pkep-app.vercel.app',
        changeOrigin: true,
      },
      '/api/webhook': {
        target: 'https://pkep-app.vercel.app',
        changeOrigin: true,
      }
    },
  },
});
