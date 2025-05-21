// vite.config.js
import { defineConfig } from 'vite'  // Add this import
import react from '@vitejs/plugin-react'  // Add this if using React

export default defineConfig({
  plugins: [react()],  // Include if using React
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})