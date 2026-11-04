import { execSync } from 'node:child_process';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/** Where GitHub Pages serves the site; the base path (main or a PR preview) is added to it. */
const SITE_ORIGIN = 'https://botrops1.github.io';

/**
 * Link previews need full addresses (WhatsApp, Telegram and Facebook do not resolve relative
 * ones): `%SITE_URL%` in index.html becomes the site's full address, so a PR preview points at
 * its own picture.
 */
function siteUrl(): Plugin {
  let base = '/';
  return {
    name: 'site-url',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml(html) {
      return html.replaceAll('%SITE_URL%', `${SITE_ORIGIN}${base}`);
    },
  };
}

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
  plugins: [siteUrl()],
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
    // Some simulation sweeps take a few seconds; the 5 s default failed them on a busy machine.
    testTimeout: 30_000,
  },
});
