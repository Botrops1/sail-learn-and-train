// M5 (polish and Phase 1 sign-off): scenes and live checks for scripts/shots.mjs.
// Labels in 3D, the halyards in 3D, Realistic mode's ropes wrapped on the winches, the error
// boundary (no WebGL, a 3D view that fails, a lost graphics context, an uncaught error), the
// accessibility audit, the footer disclaimer and the frame times in the debug overlay.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';

/** Screenshots at every size. */
export const M5_SCENES = [
  { name: 'labels-side-port', query: '?wd=60&ws=12&cam=side-port&lb=1' },
  { name: 'labels-top-mainsheet', query: '?wd=90&ws=12&ms=50&cam=top&lb=1&sel=rope_mainsheet' },
  { name: 'labels-helm', query: '?wd=60&ws=12&cam=helm&lb=1' },
  { name: 'spi-halyard-selected', query: '?wd=60&ws=12&cam=side-port&sel=rope_spi_halyard' },
  { name: 'main-halyard-selected-top', query: '?wd=60&ws=12&cam=top&sel=rope_main_halyard' },
  {
    name: 'realistic-ropes-on-winches-helm',
    query: '?mode=realistic&wd=90&ws=12&cam=helm&wp=b5.3.t&wsb=a5.2.h',
  },
  { name: 'view-tab-labels-toggle', query: '?lb=1&cam=side-port', tab: 'View' },
  { name: 'footer-disclaimer', query: '?wd=60&ws=12', scrollTo: '[data-testid="disclaimer"]' },
];

/** Close-ups (boat coordinates: x forward, y up, z starboard) for the live checks. */
const CLOSE_UPS = {
  portWinch: { position: [-8.45, 2.75, -2.55], target: [-7.05, 1.62, -1.6], fov: 38 },
  starboardWinch: { position: [-8.45, 2.75, 2.55], target: [-7.05, 1.62, 1.6], fov: 38 },
  mastFoot: { position: [-2.4, 3.6, 2.2], target: [0, 2.35, 0], fov: 40 },
  masthead: { position: [6.5, 24, -6.5], target: [0.1, 20.8, 0], fov: 32 },
};

export async function liveM5Checks({
  openPage,
  browser,
  origin,
  viewports,
  outDir,
  prefix,
  problems,
}) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M5 ${what}: ${detail}`);
    console.log(`live M5 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const [phone, foldable, desktop] = viewports;
  const search = (page) => page.evaluate(() => window.location.search);
  /** A close-up from a boat position; the debug overlay (needed for the hook) is hidden. */
  const closeUp = async (page, view) => {
    await page.addStyleTag({ content: '.debug { display: none !important; }' });
    await page.evaluate((v) => window.__sailDebug.setView(v.position, v.target, v.fov), view);
    await page.waitForTimeout(800);
  };
  const waitUrl = (page, test) =>
    page.waitForFunction(test, undefined, { timeout: 3000 }).catch(() => undefined);

  // Labels in 3D: on from the link, a tap on a label selects its part, off from the View tab.
  for (const viewport of [phone, desktop]) {
    const { context, page } = await openPage(viewport, `labels ${viewport.name}`, '?lb=1&wd=60');
    await page.waitForTimeout(1500);
    const shown = await page.locator('.label3d.label3d-shown').count();
    check(`labels shown (${viewport.name})`, shown >= 6, `${shown} labels`);
    const mast = page.locator('.label3d.label3d-shown[data-part-id="part_mast"]');
    check(`mast label (${viewport.name})`, (await mast.count()) === 1, 'shown');
    await mast.click();
    await waitUrl(page, () => window.location.search.includes('sel=part_mast'));
    check(
      `tap a label (${viewport.name})`,
      (await search(page)).includes('sel=part_mast'),
      await search(page),
    );
    const selectedLabel = await page.locator('.label3d-selected').getAttribute('data-part-id');
    check(
      `selected label highlighted (${viewport.name})`,
      selectedLabel === 'part_mast',
      String(selectedLabel),
    );
    await shot(page, `live-${viewport.name}-labels-mast-selected`);
    await page.getByRole('tab', { name: 'View' }).click();
    await page.getByText('Labels in 3D', { exact: true }).click();
    await waitUrl(page, () => !window.location.search.includes('lb=1'));
    const hidden = await page.locator('[data-testid="labels3d"]').isHidden();
    check(
      `labels off (${viewport.name})`,
      hidden && !(await search(page)).includes('lb='),
      await search(page),
    );
    await context.close();
  }

  // Halyards in 3D: a tap on each one in the view finds it; close-ups of the mast foot and top.
  {
    const { context, page } = await openPage(
      desktop,
      'halyards',
      '?wd=60&ws=12&cam=side-port&debug=1&detail=high',
    );
    await page.waitForTimeout(1000);
    const box = await page.locator('canvas.scene-canvas').boundingBox();
    const tapAt = async (partId, fraction) => {
      const p = await page.evaluate(
        ([id, f]) => window.__sailDebug.partPoint(id, f),
        [partId, fraction],
      );
      if (!p) return null;
      await page.mouse.click(box.x + p.x, box.y + p.y);
      await page.waitForTimeout(300);
      return page.evaluate(() =>
        document.querySelector('[data-testid="info-card"]')?.getAttribute('data-part-id'),
      );
    };
    const spi = await tapAt('rope_spi_halyard', 0);
    check('tap the gennaker halyard on the mast front', spi === 'rope_spi_halyard', String(spi));
    await shot(page, 'live-desktop-spi-halyard-tapped');
    await page.keyboard.press('Escape');
    await closeUp(page, CLOSE_UPS.mastFoot);
    await page.locator('[data-select="rope_main_halyard"]').click();
    await page.waitForTimeout(800);
    await shot(page, 'live-desktop-mast-foot-main-halyard-selected');
    const main = await tapAt('rope_main_halyard', 0.5);
    check('tap the main halyard at the mast foot', main === 'rope_main_halyard', String(main));
    await closeUp(page, CLOSE_UPS.masthead);
    await page.locator('[data-select="rope_spi_halyard"]').click();
    await page.waitForTimeout(800);
    await shot(page, 'live-desktop-masthead-spi-halyard-selected');
    await context.close();
  }

  // Realistic mode in 3D: the rope put on a winch is drawn wrapped with its turns. Put the vang
  // on the port winch with the buttons, three turns, into the self-tailer; then the jib sheet on
  // the starboard winch wrapped the wrong way, tail in the hand.
  for (const viewport of [phone, foldable]) {
    const { context, page } = await openPage(
      viewport,
      `winch wraps ${viewport.name}`,
      '?mode=realistic&wd=90&ws=12&debug=1&detail=high&sel=rope_vang',
    );
    await page.waitForTimeout(800);
    const strip = page.getByTestId('real-strip');
    const press = async (name, times = 1) => {
      for (let i = 0; i < times; i += 1) {
        await strip.getByRole('button', { name, exact: true }).first().click();
        await page.waitForTimeout(150);
      }
    };
    await press('Put on winch');
    await press('Add turn ↻', 3);
    await press('Into self-tailer');
    await waitUrl(page, () => window.location.search.includes('wp=b5.3.t'));
    check(
      `vang on the port winch (${viewport.name})`,
      (await search(page)).includes('wp=b5.3.t'),
      await search(page),
    );
    await closeUp(page, CLOSE_UPS.portWinch);
    await page.waitForTimeout(800);
    await shot(page, `live-${viewport.name}-port-winch-vang-3-turns-self-tailer`);
    // The rope comes off again: the 3D rope ends at its clutch.
    await press('Out of self-tailer');
    await press('Remove turn ↺', 3);
    await press('Take off winch');
    await waitUrl(page, () => !window.location.search.includes('wp='));
    await page.waitForTimeout(500);
    await shot(page, `live-${viewport.name}-port-winch-empty`);
    await context.close();
  }
  {
    const { context, page } = await openPage(
      phone,
      'winch wrong way',
      '?mode=realistic&st=starboard&wd=90&ws=12&wsb=a5.-2.h&debug=1&detail=high',
    );
    await page.waitForTimeout(800);
    await closeUp(page, CLOSE_UPS.starboardWinch);
    await page.waitForTimeout(800);
    await shot(page, 'live-phone-starboard-winch-jib-sheet-wrong-way-in-hand');
    await context.close();
  }

  // Error boundary 1: no WebGL. The message replaces the 3D view; the panel still works.
  for (const viewport of [phone, desktop]) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.width < 1000,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        return /webgl/.test(type) ? null : original.call(this, type, ...rest);
      };
    });
    await page.goto(`${origin}/sail-learn-and-train/?wd=90&ws=12`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const message = await page
      .getByTestId('scene-error')
      .innerText()
      .catch(() => '');
    check(
      `no WebGL: message (${viewport.name})`,
      message.includes('3D not supported on this device'),
      message.split('\n')[0],
    );
    await page.locator('[data-select="rope_vang"]').click();
    await page.getByRole('button', { name: 'More: Vang' }).click();
    await waitUrl(page, () => window.location.search.includes('vg=55'));
    check(
      `no WebGL: the panel works (${viewport.name})`,
      (await search(page)).includes('vg=55'),
      await search(page),
    );
    check(
      `no WebGL: no errors (${viewport.name})`,
      errors.length === 0,
      errors.join(' | ') || 'none',
    );
    await page.getByTestId('scene-error').scrollIntoViewIfNeeded();
    await shot(page, `live-${viewport.name}-no-webgl-message`);
    await context.close();
  }

  // Error boundary 2: the 3D view fails while running, then the graphics context is lost and
  // comes back; 3: an uncaught error shows the banner once.
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto(`${origin}/sail-learn-and-train/?wd=90&ws=12`, { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas.scene-canvas');
    await page.waitForTimeout(800);
    // Context lost: the message says the view is paused; restored: the message goes.
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas.scene-canvas');
      const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      window.__lose = gl.getExtension('WEBGL_lose_context');
      window.__lose.loseContext();
    });
    await page.waitForTimeout(500);
    const lost = await page
      .getByTestId('scene-error')
      .innerText()
      .catch(() => '');
    check('context lost: message', lost.includes('The 3D view is paused'), lost.split('\n')[0]);
    await shot(page, 'live-phone-context-lost-message');
    await page.evaluate(() => window.__lose.restoreContext());
    await page.waitForTimeout(1000);
    const back = await page.getByTestId('scene-error').count();
    check('context restored: message gone', back === 0, `${back} message(s)`);
    // A failing draw call: the 3D view stops with a message, the panel keeps working.
    await page.evaluate(() => {
      for (const proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
        proto.drawElements = () => {
          throw new Error('test: a draw call failed');
        };
      }
    });
    await page.waitForTimeout(800);
    const failed = await page
      .getByTestId('scene-error')
      .innerText()
      .catch(() => '');
    check(
      '3D fails while running: message',
      failed.includes('The 3D view stopped working'),
      failed.split('\n')[0],
    );
    await page.locator('[data-select="rope_vang"]').click();
    await page.getByRole('button', { name: 'More: Vang' }).click();
    await waitUrl(page, () => window.location.search.includes('vg=55'));
    check('3D failed: the panel works', (await search(page)).includes('vg=55'), await search(page));
    await shot(page, 'live-phone-3d-failed-message');
    // An uncaught error anywhere: the banner, once.
    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error('test: something went wrong');
      });
      setTimeout(() => {
        throw new Error('test: a second error');
      });
    });
    await page.waitForTimeout(500);
    const banners = await page.getByTestId('error-banner').count();
    check('uncaught error: one banner', banners === 1, `${banners} banner(s)`);
    await shot(page, 'live-phone-error-banner');
    await page.getByTestId('error-banner').getByRole('button', { name: 'Close' }).click();
    check('banner closes', (await page.getByTestId('error-banner').count()) === 0, 'closed');
    await context.close();
  }

  // Accessibility audit (phone): names, text sizes, touch targets, keyboard focus.
  for (const [name, query, tab] of [
    ['ropes-easy', '?sel=rope_vang', null],
    ['wind', '', 'Wind'],
    ['view', '?lb=1', 'View'],
    ['realistic-port', '?mode=realistic&sel=rope_vang', null],
    ['realistic-starboard', '?mode=realistic&st=starboard&wsb=a5.3.t&hd=starboard.w', null],
    ['realistic-helm', '?mode=realistic&st=helm', null],
    ['realistic-mast', '?mode=realistic&st=mast&hd=mast.w', null],
  ]) {
    const { context, page } = await openPage(phone, `a11y ${name}`, query);
    await page.waitForTimeout(600);
    if (tab) await page.getByRole('tab', { name: tab }).click();
    const found = await auditPage(page, `a11y ${name}`);
    check(`accessibility ${name}`, found.length === 0, found.length ? found.join(' | ') : 'clean');
    await context.close();
  }

  // Footer: version, disclaimer and the source link.
  {
    const { context, page } = await openPage(phone, 'footer', '');
    const text = await page.locator('footer.footer').innerText();
    check(
      'footer disclaimer',
      text.includes('Learning aid, not a substitute for sailing instruction.'),
      text.replace(/\n/g, ' | '),
    );
    await context.close();
  }

  // Frame times in the debug overlay (headless software rendering: not the phone's numbers).
  for (const viewport of [phone, desktop]) {
    const { context, page } = await openPage(
      viewport,
      `perf ${viewport.name}`,
      '?debug=1&lb=1&wd=60',
    );
    await page.waitForTimeout(3000);
    const overlay = await page.getByTestId('debug-overlay').innerText();
    const row = (label) => new RegExp(`${label}\\s+(.+)`).exec(overlay)?.[1] ?? '?';
    const ok = /Work\/frame\s+step [\d.]+ · 3D [\d.]+ ms/.test(overlay);
    check(
      `debug frame times (${viewport.name}, headless)`,
      ok,
      `FPS ${row('FPS')}, slowest ${row('Slowest')}, ${row('Work/frame')}, ${row('Detail')}, calls ${row('Draw calls')}`,
    );
    await shot(page, `live-${viewport.name}-debug-frame-times`);
    await context.close();
  }
}
