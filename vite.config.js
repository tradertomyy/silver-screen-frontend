import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Removed external: ['socket.io-client']
  },
  optimizeDeps: {
    include: ['socket.io-client'],
    exclude: ['hls.js']
  },
  server: {
    proxy: {
      '/socket.io': {
        target: 'https://movie-socket-server.onrender.com',
        changeOrigin: true,
        ws: true
      }
    }
  }
});