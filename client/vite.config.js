import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/projects/shelfflow/',
  server: {
    port: 5173,
    proxy: {
      '/projects/shelfflow/api': 'http://localhost:3000',
      '/projects/shelfflow/uploads': 'http://localhost:3000',
    },
  },
  build: { outDir: 'dist', sourcemap: false },
});
