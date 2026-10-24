import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS === 'true' ? '/zariya-approval-workflow/' : '/',
  server: { port: 5173, proxy: { '/api': process.env.VITE_API_PROXY_TARGET || 'http://localhost:8080' } },
  build: { outDir: resolve(process.cwd(), '../docs'), emptyOutDir: true }
});
