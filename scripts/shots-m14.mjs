// M14 (Waves): scenes and live checks for scripts/shots.mjs (PHASE3_SPEC 6.9).
// Labels contain "m14", so the script opens them Sailing and without the `sea=flat` it adds to
// the older scenes. The 3D view is drawn by software in headless Chromium, so the checks look at
// the numbers (status line, debug overlay) and at whether the picture moves, not at the speed.
import path from 'node:path';

/** Screenshots at every size. The script waits `waitMs` before each. */
export const M14_SCENES = [
  { name: 'waves-coastal', query: '?wd=90&ws=15&ms=50&js=100&cam=side-port', waitMs: 3000 },
  { name: 'waves-open', query: '?wd=45&ws=20&ms=20&js=0&sea=open&cam=bow', waitMs: 3000 },
  { name: 'waves-flat', query: '?wd=90&ws=15&ms=50&js=100&sea=flat', waitMs: 3000 },
  {
    name: 'waves-panel',
    query: '?wd=90&ws=15',
    tab: 'Wind',
    scrollTo: '[data-testid="sea-setting"]',
    waitMs: 1500,
  },
];

export async function liveM14Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M14 ${what}: ${detail}`);
    console.log(`live M14 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  // The radio inputs are hidden; the label around them is what a finger taps.
  const tap = (page, id) => page.locator('label.segment', { has: page.getByTestId(id) }).click();
  const status = (page) => page.getByTestId('sea-status').textContent();
  const search = (page) => page.evaluate(() => window.location.search);
  const urlHas = async (page, test) => {
    await page.waitForFunction(test, null, { timeout: 3000 }).catch(() => undefined);
    return search(page);
  };

  // Coastal link: the status line and a heave that moves.
  {
    const { context, page } = await openPage(phone, 'm14 coastal status', '?wd=90&ws=15&debug=1');
    await page.getByRole('tab', { name: 'Wind' }).click();
    await page.waitForTimeout(2000);
    const line = await status(page);
    check(
      'Coastal status line',
      line === 'Waves 0.7 m high, one every 3.8 s, from 090°',
      JSON.stringify(line),
    );
    const heaves = [];
    for (let i = 0; i < 5; i += 1) {
      const overlay = await page.getByTestId('debug-overlay').textContent();
      heaves.push(Number(/heave (-?\d+\.\d+)/.exec(overlay ?? '')?.[1]));
      await page.waitForTimeout(500);
    }
    check(
      'the boat heaves',
      heaves.some((value) => Math.abs(value) > 0.005),
      heaves.join(' '),
    );
    await shot(page, 'live-phone-m14-wind-tab-waves');

    // Tap Open sea: 1.5 m, and the link says so; Coastal again: the link has no sea.
    await tap(page, 'sea-open');
    await page.waitForTimeout(500);
    const open = await status(page);
    check('Open sea status', /^Waves 1\.5 m high/.test(open ?? ''), JSON.stringify(open));
    const withSea = await urlHas(page, () => window.location.search.includes('sea=open'));
    check('Open sea in the address bar', withSea.includes('sea=open'), withSea);
    await tap(page, 'sea-coastal');
    const without = await urlHas(page, () => !window.location.search.includes('sea='));
    check('Coastal leaves the address bar', !without.includes('sea='), without);
    await tap(page, 'sea-flat');
    await page.waitForTimeout(300);
    check('Flat status', (await status(page)) === 'Flat water: no waves.', await status(page));
    await context.close();
  }

  // Pause (issue #32): the picture stands still, then moves again after Resume.
  {
    const { context, page } = await openPage(phone, 'm14 pause', '?wd=90&ws=15&cam=side-port');
    await page.waitForTimeout(2500);
    await page.getByTestId('pause-button').click();
    await page.waitForTimeout(300);
    const canvas = page.locator('canvas.scene-canvas');
    const first = await canvas.screenshot();
    await page.waitForTimeout(1000);
    const second = await canvas.screenshot();
    check('Pause freezes the 3D view', first.equals(second), `${first.length} bytes`);
    await page.getByTestId('pause-button').click();
    await page.waitForTimeout(1000);
    const third = await canvas.screenshot();
    check('Resume moves it again', !second.equals(third), `${third.length} bytes`);
    await context.close();
  }

  // Held still: she still rolls on the waves; the time bar still says "Held still" in Flat only.
  {
    const { context, page } = await openPage(phone, 'm14 held', '?wd=90&ws=15&held=1&debug=1');
    await page.waitForTimeout(3000);
    const rolls = [];
    for (let i = 0; i < 5; i += 1) {
      const overlay = await page.getByTestId('debug-overlay').textContent();
      rolls.push(Number(/roll (-?\d+\.\d+)°/.exec(overlay ?? '')?.[1]));
      await page.waitForTimeout(400);
    }
    check(
      'Held still rolls on the waves',
      rolls.some((value) => Math.abs(value) > 0.1),
      rolls.join(' '),
    );
    const pause = await page.getByTestId('pause-button').isVisible();
    const chip = await page.getByTestId('held-chip').isVisible();
    check('Held still with waves keeps Pause', pause && !chip, `pause ${pause}, chip ${chip}`);
    // The speed buttons show too (owner, M14 PR): ×4 can be set.
    const faster = page.getByTestId('time-faster');
    const fasterShown = await faster.isVisible();
    if (fasterShown) await faster.click();
    await page
      .waitForFunction(() => window.location.search.includes('tx='), null, { timeout: 3000 })
      .catch(() => undefined);
    const withTx = await search(page);
    check(
      'Held still with waves has the speed buttons',
      fasterShown && withTx.includes('tx='),
      withTx,
    );
    await context.close();
    const flat = await openPage(phone, 'm14 held flat', '?wd=90&ws=15&held=1&sea=flat');
    await flat.page.waitForTimeout(1500);
    const flatChip = await flat.page.getByTestId('held-chip').isVisible();
    check('Held still + Flat shows the chip', flatChip, `chip ${flatChip}`);
    await flat.context.close();
  }

  // Tap on open water: the info card says "Water surface".
  {
    const { context, page } = await openPage(phone, 'm14 tap water', '?wd=90&ws=15&cam=top');
    await page.waitForTimeout(2000);
    const box = await page.locator('canvas.scene-canvas').boundingBox();
    await page.mouse.click(box.x + box.width * 0.12, box.y + box.height * 0.45);
    await page.waitForTimeout(500);
    const name = await page.locator('[data-testid="info-card"] .card-name').first().textContent();
    check('tap on the water', name === 'Water surface', JSON.stringify(name));
    await context.close();
  }
}
