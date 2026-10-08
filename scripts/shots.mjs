// Screenshots for the PR (PHASE1_SPEC 11, "Visual").
// Usage: npm run shots   (builds first, then serves dist/ and drives headless Chromium)
// Writes PNGs into docs/screenshots/<milestone>/ and fails on any console error,
// a wrong layout mode, or a page that scrolls sideways.
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { preview } from 'vite';

const MILESTONE = process.env.SHOTS_MILESTONE ?? 'm0';
const OUT_DIR = path.join('docs', 'screenshots', MILESTONE);
const BASE_PATH = '/sail-learn-and-train/';

/** The three sizes from the spec, plus a landscape phone to show the rotation switch. */
const VIEWPORTS = [
  { name: 'phone-390x844', width: 390, height: 844, layout: 'stacked' },
  { name: 'foldable-820x1000', width: 820, height: 1000, layout: 'side' },
  { name: 'desktop-1440x900', width: 1440, height: 900, layout: 'side' },
  { name: 'phone-landscape-844x390', width: 844, height: 390, layout: 'side' },
];

/** What to show at each size. `tab` is clicked before the shot. */
const SCENES = [
  { name: 'default', query: '' },
  { name: 'view-tab-debug', query: '?debug=1', tab: 'View' },
];

const server = await preview({ preview: { port: 4173, strictPort: false }, logLevel: 'warn' });
const origin =
  server.resolvedUrls?.local[0]?.replace(/\/sail-learn-and-train\/?$/, '') ??
  'http://localhost:4173';

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

await rm(OUT_DIR, { recursive: true, force: true });
await mkdir(OUT_DIR, { recursive: true });

const problems = [];
try {
  for (const viewport of VIEWPORTS) {
    for (const scene of SCENES) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        hasTouch: viewport.width < 1000,
        isMobile: false,
      });
      const page = await context.newPage();
      const label = `${viewport.name}/${scene.name}`;
      page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
          problems.push(`${label}: console ${message.type()}: ${message.text()}`);
        }
      });
      page.on('pageerror', (error) => problems.push(`${label}: page error: ${error.message}`));

      await page.goto(`${origin}${BASE_PATH}${scene.query}`, { waitUntil: 'networkidle' });
      await page.waitForSelector('canvas.scene-canvas', { timeout: 10_000 });
      if (scene.tab) await page.getByRole('tab', { name: scene.tab }).click();
      await page.waitForTimeout(1200);

      const facts = await page.evaluate(() => ({
        layout: document.documentElement.dataset.layout,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        sceneError: document.querySelector('.scene-error')?.textContent ?? null,
        webgl: (() => {
          const canvas = document.querySelector('canvas.scene-canvas');
          const gl = canvas?.getContext('webgl2');
          return gl ? gl.getParameter(gl.VERSION) : null;
        })(),
        version: document.querySelector('[data-testid="build-version"]')?.textContent ?? null,
        url: window.location.search,
      }));
      if (facts.layout !== viewport.layout) {
        problems.push(`${label}: layout ${facts.layout}, expected ${viewport.layout}`);
      }
      if (facts.scrollWidth > facts.innerWidth) {
        problems.push(
          `${label}: page scrolls sideways (${facts.scrollWidth} > ${facts.innerWidth})`,
        );
      }
      if (facts.scrollHeight > facts.innerHeight) {
        problems.push(
          `${label}: page scrolls vertically (${facts.scrollHeight} > ${facts.innerHeight})`,
        );
      }
      if (facts.sceneError) problems.push(`${label}: ${facts.sceneError}`);

      const file = path.join(OUT_DIR, `${viewport.name}-${scene.name}.png`);
      await page.screenshot({ path: file });
      console.log(
        `${file}  layout=${facts.layout}  webgl=${facts.webgl}  ${facts.version}  ${facts.url}`,
      );
      await context.close();
    }
  }

  // Live checks on one page, no reload: the layout follows resizes across 700 px and aspect 0.8,
  // and settings changed in the panel reach the URL.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on('pageerror', (error) => problems.push(`live: page error: ${error.message}`));
  await page.goto(`${origin}${BASE_PATH}`, { waitUntil: 'networkidle' });
  const steps = [
    { width: 390, height: 844, layout: 'stacked' },
    { width: 844, height: 390, layout: 'side' },
    { width: 699, height: 600, layout: 'stacked' },
    { width: 700, height: 600, layout: 'side' },
    { width: 800, height: 1001, layout: 'stacked' },
    { width: 1440, height: 900, layout: 'side' },
  ];
  for (const step of steps) {
    await page.setViewportSize({ width: step.width, height: step.height });
    await page.waitForTimeout(150);
    const layout = await page.evaluate(() => document.documentElement.dataset.layout);
    const ok = layout === step.layout;
    if (!ok)
      problems.push(`live resize ${step.width}x${step.height}: ${layout}, expected ${step.layout}`);
    console.log(`live resize ${step.width}x${step.height} -> ${layout} ${ok ? 'ok' : 'WRONG'}`);
  }
  await page.getByRole('tab', { name: 'View' }).click();
  await page.getByText('1 %', { exact: true }).click();
  await page.getByText('Debug overlay', { exact: true }).click();
  await page.waitForTimeout(500);
  const search = await page.evaluate(() => window.location.search);
  const urlOk = search === '?v=1&cam=side-port&step=1&debug=1';
  if (!urlOk) problems.push(`live URL sync: got ${search}`);
  console.log(`live URL sync -> ${search} ${urlOk ? 'ok' : 'WRONG'}`);
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):\n${problems.join('\n')}`);
  process.exit(1);
}
console.log('\nNo console errors, layouts as expected, no page scroll.');
