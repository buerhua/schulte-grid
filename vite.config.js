import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  server: {
    port: Number(process.env.DEPLOY_RUN_PORT) || 5188,
    host: '0.0.0.0',
  },
  preview: {
    port: Number(process.env.DEPLOY_RUN_PORT) || 5166,
    host: '0.0.0.0',
  },
  build: {
    target: 'es2017',
    outDir: 'dist',
    sourcemap: true,
  },
}));