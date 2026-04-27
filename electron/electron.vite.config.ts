import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
        '@main': resolve(__dirname, 'src/main'),
      },
    },
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
    build: {
      // Sandboxed preload scripts must be CJS — Electron's sandbox loader
      // doesn't execute ESM here, even from a .mjs file, so we force CJS.
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') },
        output: {
          format: 'cjs',
          entryFileNames: '[name].js',
        },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    plugins: [react()],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
        '@renderer': resolve(__dirname, 'src/renderer'),
        '@resources': resolve(__dirname, 'resources'),
      },
      // Force a single React instance — otherwise TanStack Query and our
      // components end up with different copies and every hook call throws
      // "Invalid hook call".
      dedupe: ['react', 'react-dom'],
    },
    server: {
      fs: {
        // Allow imports from outside src/renderer/ (e.g. resources/icon.png).
        allow: [resolve(__dirname)],
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client', '@tanstack/react-query', 'zustand'],
    },
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/renderer/index.html') },
      },
    },
  },
});
