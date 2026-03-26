import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    outDir: 'dist',           // Render expects this; make it explicit
    sourcemap: false,         // Disable sourcemaps in production for security/size
    chunkSizeWarningLimit: 1000,
  },
  server: {
    // Development proxy: forwards /api requests to local backend
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        ws: true,             // Enable WebSocket proxying for Socket.io in dev
        changeOrigin: true,
      }
    }
  }
})
