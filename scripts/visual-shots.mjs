// Before/after screenshots for visual work (M3b): the camera presets, close-ups set through the
// debug-only camera hook, and the render cost (draw calls, triangles, FPS) per detail level.
// Usage: npm run build && node scripts/visual-shots.mjs
//   VISUAL_DIST  folder with a built site (default dist)
//   VISUAL_OUT   output folder (default docs/screenshots/m3b/after)
//   VISUAL_DETAIL  comma-separated detail levels to shoot, e.g. "high,low"; empty = no parameter
//   (the build before M3b has no detail setting)
// Fails on console errors. Writes stats.json and stats.md next to the PNGs.
import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const DIST = process.env.VISUAL_DIST ?? 'dist';
const OUT = process.env.VISUAL_OUT ?? path.join('docs', 'screenshots', 'm3b', 'after');
const DETAILS = (process.env.VISUAL_DETAIL ?? 'high,low').split(',').filter(Boolean);
const BASE = '/sail-learn-and-train/';
// Optional filters while iterating: comma-separated viewport names / shot names.
const ONLY_VIEWPORTS = process.env.VISUAL_VIEWPORTS?.split(',');
const ONLY_SHOTS = process.env.VISUAL_SHOTS?.split(',');

const VIEWPORTS = [
  { name: 'phone-390x844', width: 390, height: 844 },
  { name: 'foldable-820x1000', width: 820, height: 1000 },
  { name: 'desktop-1440x900', width: 1440, height: 900 },
];

/** `view`: camera position, target and lens for a close-up (boat frame: x fwd, y up, z stbd). */
const SHOTS = [
  { name: 'side-port', query: '?wd=60&ws=12&cam=side-port' },
  { name: 'top', query: '?wd=60&ws=12&cam=top' },
  { name: 'bow', query: '?wd=60&ws=12&cam=bow' },
  { name: 'helm', query: '?wd=60&ws=12&cam=helm' },
  {
    name: 'closeup-mast-foot-from-aft',
    query: '?wd=60&ws=12',
    view: { position: [-3.9, 3.25, 2.3], target: [-0.9, 2.0, 0.1], fov: 50 },
  },
  {
    name: 'closeup-mast-foot-from-front',
    query: '?wd=60&ws=12',
    view: { position: [1.9, 3.5, 1.7], target: [-0.9, 2.0, 0.0], fov: 50 },
  },
  {
    name: 'closeup-sprayhood',
    query: '?wd=60&ws=12',
    view: { position: [-6.4, 3.4, 3.0], target: [-3.2, 2.0, 0.3], fov: 50 },
  },
  {
    name: 'run-sail-on-spreaders-edge',
    query: '?wd=175&ws=12&ms=100',
    view: { position: [-3.4, 10.2, -7.6], target: [-0.8, 8.4, -1.9], fov: 50 },
  },
  {
    name: 'run-sail-on-spreaders-from-front',
    query: '?wd=175&ws=12&ms=100',
    view: { position: [1.6, 10.8, -4.2], target: [-0.85, 8.1, -1.9], fov: 50 },
  },
  {
    name: 'closeup-hull-waterline',
    query: '?wd=60&ws=12',
    view: { position: [2.0, 1.4, -7.0], target: [-1.2, 0.3, -2.2], fov: 50 },
  },
  { name: 'run-top', query: '?wd=175&ws=12&ms=100&cam=top' },
];

/** Serves the built site at BASE (no Vite needed, so an old build can be served too). */
function serve(root) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    let file = url.pathname.startsWith(BASE) ? url.pathname.slice(BASE.length) : '';
    if (file === '' || file.endsWith('/')) file += 'index.html';
    const full = path.join(root, file);
    try {
      await stat(full);
      response.writeHead(200, {
        'content-type': types[path.extname(full)] ?? 'application/octet-stream',
      });
      createReadStream(full).pipe(response);
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

const server = await serve(DIST);
const origin = `http://localhost:${server.address().port}`;
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const problems = [];
const stats = [];
const levels = DETAILS.length > 0 ? DETAILS : [null];

async function open(viewport, label, query) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    hasTouch: viewport.width < 1000,
  });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`${label}: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`${label}: ${error.message}`));
  await page.goto(`${origin}${BASE}${query}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas.scene-canvas', { timeout: 15_000 });
  return { context, page };
}

try {
  for (const viewport of VIEWPORTS) {
    if (ONLY_VIEWPORTS && !ONLY_VIEWPORTS.includes(viewport.name)) continue;
    for (const level of levels) {
      for (const shot of SHOTS) {
        if (ONLY_SHOTS && !ONLY_SHOTS.includes(shot.name)) continue;
        const label = `${viewport.name}/${level ?? 'default'}/${shot.name}`;
        const query = `${shot.query}&debug=1${level ? `&detail=${level}` : ''}`;
        const { context, page } = await open(viewport, label, query);
        await page.addStyleTag({ content: '.debug { display: none !important; }' });
        if (shot.view) {
          const { position, target, fov } = shot.view;
          await page.evaluate(
            ([p, t, f]) => window.__sailDebug.setView(p, t, f),
            [position, target, fov],
          );
        }
        await page.waitForTimeout(1500);
        const suffix = level ? `-${level}` : '';
        await page.screenshot({
          path: path.join(OUT, `${viewport.name}-${shot.name}${suffix}.png`),
        });
        console.log(label);
        await context.close();
      }
      // Render cost: the debug overlay's numbers, side view, after a few seconds of rendering.
      const { context, page } = await open(
        viewport,
        `${viewport.name} stats`,
        `?wd=60&ws=12&cam=side-port&debug=1${level ? `&detail=${level}` : ''}`,
      );
      await page.waitForTimeout(4000);
      const overlay = await page.getByTestId('debug-overlay').innerText();
      const hook = await page.evaluate(() => window.__sailDebug.stats());
      const fps = Number(/FPS\s+(\d+)/.exec(overlay)?.[1] ?? NaN);
      stats.push({ viewport: viewport.name, detail: level ?? 'default', fps, ...hook, overlay });
      console.log(`${viewport.name} ${level ?? ''}: ${JSON.stringify(hook)} fps ${fps}`);
      await context.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}

await writeFile(path.join(OUT, 'stats.json'), `${JSON.stringify(stats, null, 2)}\n`);
const table = [
  '| Viewport | Detail | Draw calls | Triangles | FPS (headless, software WebGL) |',
  '|---|---|---|---|---|',
  ...stats.map((s) => `| ${s.viewport} | ${s.detail} | ${s.calls} | ${s.triangles} | ${s.fps} |`),
].join('\n');
await writeFile(path.join(OUT, 'stats.md'), `${table}\n`);
console.log(table);
if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):\n${problems.join('\n')}`);
  process.exit(1);
}
