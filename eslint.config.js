import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['dist/', 'node_modules/', 'docs/', 'test-results/', 'playwright-report/'] },
  js.configs.recommended,
  tseslint.configs.strict,
  {
    files: ['src/**/*.ts', 'scripts/compare/**/*.ts'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['scripts/**/*.{js,mjs}', 'tests/**/*.ts', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    // Playwright runs some callbacks of the screenshot script inside the page.
    files: ['scripts/shots.mjs', 'scripts/visual-shots.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    // PHASE1_SPEC 9.1: the model is pure. No three.js, no DOM, no imports from the other layers.
    files: ['src/model/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^three($|/)',
              message: 'src/model must not use three.js (PHASE1_SPEC 9.1).',
            },
            {
              regex: '(^|/)(render3d|ui|app)(/|$)',
              message: 'src/model must not import from render3d/, ui/ or app/ (PHASE1_SPEC 9.1).',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'src/model must not touch the DOM.' },
        { name: 'document', message: 'src/model must not touch the DOM.' },
        { name: 'navigator', message: 'src/model must not touch the DOM.' },
        { name: 'location', message: 'src/model must not touch the DOM.' },
        { name: 'localStorage', message: 'src/model must not touch the DOM.' },
      ],
    },
  },
  prettier,
);
