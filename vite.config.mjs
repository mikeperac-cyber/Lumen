import { defineConfig } from 'vite';
function routeCodeSplitPlugin() {
  const virtualPrefix = '\0virtual:lumen-';
  const virtualMap = new Map();

  return {
    name: 'lumen-route-code-split',
    enforce: 'pre',
    resolveId(id) {
      if (id.startsWith('virtual:lumen-')) {
        return virtualPrefix + id.slice('virtual:lumen-'.length);
      }
      if (id.startsWith(virtualPrefix)) {
        return id;
      }
    },
    load(id) {
      if (id.startsWith(virtualPrefix)) {
        const key = id.slice(virtualPrefix.length);
        return virtualMap.get(key) || '';
      }
    },
    transform(code, id) {
      // Only transform app.js during build
      if ((id.endsWith('/app.js') || id.endsWith('\\app.js')) && !id.startsWith(virtualPrefix)) {
        const lines = code.split('\n');
        
        // Find split boundaries:
        // Batch 1: Morning Brief to Review (1634 to 3436)
        // Batch 2: Goals, Habits, Achievements, Notes, Vault (3437 to 5572)
        // Batch 3: Voice, Pomodoro, Sync, Analytics, Finance (5573 to 7560)
        // Batch 4: Students Workspace & Dossiers (7561 to 8954)
        // Batch 5: Performance, Teaching Schedule, Settings (8955 to 10297)

        const idx1 = lines.findIndex(l => l.includes('/* ============ Morning Brief ============ */'));
        const idx2 = lines.findIndex(l => l.includes('/* ---------- Task completion   goal progress ---------- */') || l.includes('/* ---------- Task completion'));
        const idx3 = lines.findIndex(l => l.includes('/* ============ Voice ============ */'));
        const idx4 = lines.findIndex(l => l.includes('/* ============ Students Workspace & Dossiers ============ */'));
        const idx5 = lines.findIndex(l => l.includes('/* ============ Offline indicator ============ */') || l.includes('/* ============ Performance & Velocity Monitor ============ */'));
        const idx6 = lines.findIndex(l => l.includes('/* ============ Global search ============ */'));

        if (idx1 > 0 && idx2 > idx1 && idx3 > idx2 && idx4 > idx3 && idx5 > idx4 && idx6 > idx5) {
          const chunk1Code = lines.slice(idx1, idx2).join('\n');
          const chunk2Code = lines.slice(idx2, idx3).join('\n');
          const chunk3Code = lines.slice(idx3, idx4).join('\n');
          const chunk4Code = lines.slice(idx4, idx5).join('\n');
          const chunk5Code = lines.slice(idx5, idx6).join('\n');

          virtualMap.set('chunk-overview', `export function initOverview() {\n${chunk1Code}\n}`);
          virtualMap.set('chunk-habits-vault', `export function initHabitsVault() {\n${chunk2Code}\n}`);
          virtualMap.set('chunk-finance-voice', `export function initFinanceVoice() {\n${chunk3Code}\n}`);
          virtualMap.set('chunk-students', `export function initStudents() {\n${chunk4Code}\n}`);
          virtualMap.set('chunk-settings-schedule', `export function initSettingsSchedule() {\n${chunk5Code}\n}`);

          const mainPart1 = lines.slice(0, idx1).join('\n');
          const mainPart2 = lines.slice(idx6).join('\n');

          // In transformed app.js, import the chunks dynamically on startup / renderView
          const dynamicImports = `
const _chunkPromises = [
  import('virtual:lumen-chunk-overview').then(m => m.initOverview()),
  import('virtual:lumen-chunk-habits-vault').then(m => m.initHabitsVault()),
  import('virtual:lumen-chunk-finance-voice').then(m => m.initFinanceVoice()),
  import('virtual:lumen-chunk-students').then(m => m.initStudents()),
  import('virtual:lumen-chunk-settings-schedule').then(m => m.initSettingsSchedule())
];
await Promise.all(_chunkPromises);
`;

          return {
            code: `${mainPart1}\n${dynamicImports}\n${mainPart2}`,
            map: null
          };
        }
      }
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [routeCodeSplitPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    manifest: true,
    chunkSizeWarningLimit: 250,
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
          if (id.includes('chunk-overview')) return 'routes-overview';
          if (id.includes('chunk-habits-vault')) return 'routes-habits-vault';
          if (id.includes('chunk-finance-voice')) return 'routes-finance-voice';
          if (id.includes('chunk-students')) return 'routes-students';
          if (id.includes('chunk-settings-schedule')) return 'routes-settings-schedule';
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