// Screenshots for the PR (PHASE1_SPEC 11, "Visual").
// Usage: npm run shots   (builds first, then serves dist/ and drives headless Chromium)
// Writes PNGs into docs/screenshots/<milestone>/ and fails on any console error, a wrong
// layout mode, a page that scrolls, a tap that shows an unknown part, or a camera/URL problem.
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { createServer, preview } from 'vite';

const MILESTONE = process.env.SHOTS_MILESTONE ?? 'm1';
const OUT_DIR = path.join('docs', 'screenshots', MILESTONE);
const BASE_PATH = '/sail-learn-and-train/';

/** The three sizes from the spec, plus a landscape phone to show the rotation switch. */
const VIEWPORTS = [
  { name: 'phone-390x844', width: 390, height: 844, layout: 'stacked' },
  { name: 'foldable-820x1000', width: 820, height: 1000, layout: 'side' },
  { name: 'desktop-1440x900', width: 1440, height: 900, layout: 'side' },
  {
    name: 'phone-landscape-844x390',
    width: 844,
    height: 390,
    layout: 'side',
    only: ['side-port', 'card-boom'],
  },
];

/** What to show at each size. `tab` is clicked before the shot. */
const SCENES = [
  { name: 'side-port', query: '?cam=side-port' },
  { name: 'side-starboard', query: '?cam=side-starboard' },
  { name: 'top', query: '?cam=top' },
  { name: 'bow', query: '?cam=bow' },
  { name: 'helm', query: '?cam=helm' },
  { name: 'card-boom', query: '?cam=side-port&sel=part_boom' },
  { name: 'view-tab', query: '?cam=top&debug=1', tab: 'View' },
];

/** Parts a tap must find somewhere in the sweep (WORKFLOW.md M1 checklist). */
const MUST_IDENTIFY = [
  'part_mast',
  'part_boom',
  'part_keel',
  'part_hull',
  'part_forestay',
  'part_backstay',
  'part_shroud',
  'sail_main',
  'sail_jib',
  'helm_port',
  'helm_starboard',
  'winch_primary_port',
  'winch_primary_starboard',
  'clutch_bank_a',
  'clutch_bank_b',
  'part_vang_strut',
  'fit_sprayhood',
  'part_lifelines',
  'fit_self_tacking_track',
];

/** Parts that must never be drawn (not on the reference boat). */
const MUST_NOT_IDENTIFY = ['winch_secondary_port', 'winch_secondary_starboard'];

const LAUNCH_ARGS = [
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
];

const server = await preview({ preview: { port: 4173, strictPort: false }, logLevel: 'warn' });
const origin =
  server.resolvedUrls?.local[0]?.replace(/\/sail-learn-and-train\/?$/, '') ??
  'http://localhost:4173';
const browser = await chromium.launch({ args: LAUNCH_ARGS });

await rm(OUT_DIR, { recursive: true, force: true });
await mkdir(OUT_DIR, { recursive: true });

const problems = [];

async function openPage(viewport, label, query) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    hasTouch: viewport.width < 1000,
    isMobile: false,
  });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      problems.push(`${label}: console ${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => problems.push(`${label}: page error: ${error.message}`));
  await page.goto(`${origin}${BASE_PATH}${query}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas.scene-canvas', { timeout: 10_000 });
  return { context, page };
}

const cardPart = (page) =>
  page.evaluate(() => {
    const card = document.querySelector('[data-testid="info-card"]');
    if (!card || card.hidden) return null;
    return {
      id: card.getAttribute('data-part-id'),
      name: card.querySelector('.card-name')?.textContent ?? '',
    };
  });

try {
  for (const viewport of VIEWPORTS) {
    for (const scene of SCENES) {
      if (viewport.only && !viewport.only.includes(scene.name)) continue;
      const label = `${viewport.name}/${scene.name}`;
      const { context, page } = await openPage(viewport, label, scene.query);
      if (scene.tab) await page.getByRole('tab', { name: scene.tab }).click();
      await page.waitForTimeout(1200);

      const facts = await page.evaluate(() => ({
        layout: document.documentElement.dataset.layout,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        sceneError: document.querySelector('.scene-error')?.textContent ?? null,
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
      console.log(`${file}  layout=${facts.layout}  ${facts.version}  ${facts.url}`);
      await context.close();
    }
  }

  // Tap-to-identify sweep: tap a grid over the 3D view in several presets and collect what the
  // card shows. Every tap must give a registered part with a name (or nothing, for the sky).
  const found = new Map();
  const sweeps = [
    { viewport: VIEWPORTS[0], cam: 'side-port' },
    { viewport: VIEWPORTS[0], cam: 'bow' },
    { viewport: VIEWPORTS[0], cam: 'helm' },
    { viewport: VIEWPORTS[2], cam: 'side-starboard' },
    { viewport: VIEWPORTS[2], cam: 'top' },
  ];
  for (const { viewport, cam } of sweeps) {
    const label = `taps ${viewport.name}/${cam}`;
    const { context, page } = await openPage(viewport, label, `?cam=${cam}`);
    await page.waitForTimeout(800);
    const box = await page.locator('canvas.scene-canvas').boundingBox();
    const barTop = await page
      .locator('.camera-bar')
      .evaluate((bar) => bar.getBoundingClientRect().top);
    const step = viewport.width < 500 ? 14 : 24;
    let taps = 0;
    for (let y = box.y + step / 2; y < barTop - 4; y += step) {
      for (let x = box.x + step / 2; x < box.x + box.width; x += step) {
        await page.mouse.click(x, y);
        taps += 1;
        const part = await cardPart(page);
        if (!part) continue;
        if (!part.id || !part.name) problems.push(`${label}: tap at ${x},${y} gave an empty card`);
        found.set(part.id, (found.get(part.id) ?? 0) + 1);
        await page.keyboard.press('Escape');
      }
    }
    const search = await page.evaluate(() => window.location.search);
    if (!search.includes(`cam=${cam}`))
      problems.push(`${label}: taps changed the camera (${search})`);
    console.log(`${label}: ${taps} taps`);
    await context.close();
  }
  console.log(
    `identified by tapping: ${[...found.entries()].map(([id, n]) => `${id}×${n}`).join(', ')}`,
  );
  for (const id of MUST_IDENTIFY) {
    if (!found.has(id)) problems.push(`tap sweep never identified ${id}`);
  }
  for (const id of MUST_NOT_IDENTIFY) {
    if (found.has(id)) problems.push(`tap sweep found ${id}, which should not be drawn`);
  }

  // Live checks on one page, no reload: layout follows resizes; camera buttons and dragging
  // reach the URL (only the preset is stored, a drag gives cam=free).
  const { context, page } = await openPage(VIEWPORTS[0], 'live', '');
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
  const expectUrl = async (what, expected) => {
    await page.waitForTimeout(500);
    const search = await page.evaluate(() => window.location.search);
    const ok = search === expected;
    if (!ok) problems.push(`live ${what}: got ${search}, expected ${expected}`);
    console.log(`live ${what} -> ${search} ${ok ? 'ok' : 'WRONG'}`);
  };
  await page.getByRole('button', { name: 'Top' }).click();
  await expectUrl('Top button', '?v=1&cam=top&step=5');
  const canvas = await page.locator('canvas.scene-canvas').boundingBox();
  const cx = canvas.x + canvas.width / 2;
  const cy = canvas.y + canvas.height / 3;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 10; i += 1) await page.mouse.move(cx + i * 15, cy + i * 4);
  await page.mouse.up();
  await expectUrl('drag', '?v=1&cam=free&step=5');
  await page.getByRole('tab', { name: 'View' }).click();
  await page.getByText('Side (starboard)', { exact: true }).click();
  await page.getByText('1 %', { exact: true }).click();
  await page.getByText('Debug overlay', { exact: true }).click();
  await expectUrl('View tab', '?v=1&cam=side-starboard&step=1&debug=1');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT_DIR, 'live-desktop-after-drag-and-starboard.png') });
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}

// Proportion check (M1 "done when"): the model rendered at the scale of the reference sketches,
// with the sketch laid on top. Served by the Vite dev server from scripts/compare/.
const dev = await createServer({ server: { port: 5190, strictPort: false }, logLevel: 'warn' });
await dev.listen();
const compareBrowser = await chromium.launch({ args: LAUNCH_ARGS });
try {
  for (const [view, width, height] of [
    ['side', 824, 1168],
    ['plan', 792, 400],
  ]) {
    const page = await compareBrowser.newPage({ viewport: { width, height } });
    page.on('pageerror', (error) => problems.push(`compare ${view}: page error: ${error.message}`));
    await page.goto(`${dev.resolvedUrls.local[0]}scripts/compare/index.html?view=${view}`);
    await page.waitForSelector('body[data-ready="1"]', { state: 'attached', timeout: 30_000 });
    const file = path.join(OUT_DIR, `compare-${view}-model-vs-sketch.png`);
    await page.screenshot({ path: file });
    console.log(file);
  }
} finally {
  await compareBrowser.close();
  await dev.close();
}

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):\n${problems.join('\n')}`);
  process.exit(1);
}
console.log('\nNo console errors, layouts as expected, no page scroll, taps and camera OK.');
