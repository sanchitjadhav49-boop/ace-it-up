import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Express API (app.js) runs on PORT or 3000. Proxy API routes so the
// frontend can call them with relative paths.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    proxy: {
      '/tests': 'http://localhost:3000',
      '/attempts': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
    },
  },
});
