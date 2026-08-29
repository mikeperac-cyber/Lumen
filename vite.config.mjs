import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    manifest: true,
    chunkSizeWarningLimit: 400,
    rollupOptions: {
      input: 'index.html',
      output: {
        manualChunks(id) {
          if (id.includes('src/tasks')) return 'tasks';
          if (id.includes('src/vault')) return 'vault';
          if (id.includes('src/finance')) return 'finance';
          if (id.includes('src/students')) return 'students';
          if (id.includes('src/habits')) return 'habits';
          if (id.includes('src/schedule')) return 'schedule';
          if (id.includes('src/notes')) return 'notes';
          if (id.includes('src/lib') || id.includes('src/state') || id.includes('src/main.js')) return 'core';
        }
      }
    }
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}', 'tests/unit/**/*.{test,spec}.{js,ts}'],
    environment: 'node',
    globals: false,
    pool: 'forks',
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
});