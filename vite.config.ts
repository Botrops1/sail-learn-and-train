import { execSync } from 'node:child_process';
import { defineConfig } from 'vitest/config';

/** Full commit hash of the build: GitHub Actions provides it, locally ask git. */
function commitHash(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

export default defineConfig({
  base: '/sail-learn-and-train/',
  define: {
    __BUILD_HASH__: JSON.stringify(commitHash()),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  build: {
    target: 'es2022',
    rolldownOptions: {
      output: {
        // three.js in its own chunk: it changes rarely (better caching) and the size budget
        // in PHASE1_SPEC 10 is measured without it.
        codeSplitting: {
          groups: [{ name: 'three', test: /node_modules[\\/]three[\\/]/ }],
        },
      },
    },
    // The three.js chunk alone is about 535 kB minified (about 133 kB gzipped).
    chunkSizeWarningLimit: 700,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
