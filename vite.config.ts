import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: false },
  build: {
    // Recharts ocupa ~530 kB sin comprimir (~157 kB gzip) por sí solo.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Los gráficos van en un chunk aparte que el navegador puede cachear.
        manualChunks: { charts: ['recharts'] },
      },
    },
  },
});
