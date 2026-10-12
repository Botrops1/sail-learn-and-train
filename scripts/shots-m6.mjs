// M6 (the boat sails): scenes and live checks for scripts/shots.mjs.
// The strip, the apparent wind, the wake, Held still, the autopilot and the Wind tab compass.
// Their labels contain "m6" so the script opens them Sailing (older scenes are held still).
import path from 'node:path';

/** Screenshots at every size. The script waits `waitMs` before each (the wake needs time). */
export const M6_SCENES = [
  { name: 'beam-reach-side-port', query: '?wd=90&ws=12&ms=40&js=100&cam=side-port', waitMs: 3000 },
  { name: 'beam-reach-helm', query: '?wd=90&ws=12&ms=40&js=100&cam=helm', waitMs: 3000 },
  { name: 'beam-reach-top', query: '?wd=90&ws=12&ms=40&js=100&cam=top', waitMs: 3000 },
  { name: 'close-hauled-top', query: '?wd=45&ws=12&ms=12&js=0&cam=top', waitMs: 3000 },
  { name: 'held', query: '?wd=90&ws=12&held=1', waitMs: 1500 },
  {
    name: 'in-irons-side-port',
    query: '?wd=0&ws=12&ms=10&js=10&bs=0&ap=off&cam=side-port',
    waitMs: 2000,
  },
  {
    name: 'wind-tab',
    query: '?wd=90&ws=12&ms=40&js=100&hdg=40&cam=side-port',
    tab: 'Wind',
    centre: '[data-testid="wind-dial"]',
    waitMs: 2000,
  },
  {
    name: 'autopilot',
    query: '?wd=90&ws=12&ms=40&js=100&cam=side-port',
    scrollTo: '.ropes-easy [data-testid="autopilot"]',
    waitMs: 2000,
  },
  {
    name: 'realistic-helm-autopilot',
    query: '?wd=90&ws=12&ms=40&js=100&mode=realistic&st=helm&cam=helm',
    waitMs: 2500,
  },
  {
    name: 'autopilot-wind',
    query: '?wd=45&ws=12&ms=12&js=0&ap=wind&cam=top',
    scrollTo: '.ropes-easy [data-testid="autopilot"]',
    waitMs: 2000,
  },
];

/** The text of an instrument-strip part. */
const text = (page, id) => page.getByTestId(id).innerText();

export async function liveM6Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M6 ${what}: ${detail}`);
    console.log(`live M6 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const search = (page) => page.evaluate(() => window.location.search);

  // Sailing across the wind: about 7.7–8.8 kn, AUTO 0°, the apparent wind further forward.
  {
    const { context, page } = await openPage(phone, 'm6 beam reach', '?wd=90&ws=12&ms=40&js=100');
    await page.waitForTimeout(2500);
    const speed = parseFloat(await text(page, 'strip-speed'));
    check('beam reach speed', speed >= 7.7 && speed <= 8.8, `${speed} kn`);
    check(
      'autopilot badge',
      (await text(page, 'strip-auto')) === 'AUTO 0°',
      await text(page, 'strip-auto'),
    );
    const trueWind = await text(page, 'strip-true');
    const apparent = await text(page, 'strip-apparent');
    check('true wind', trueWind.startsWith('True 90° S'), trueWind);
    const awa = Number(/App (\d+)°/.exec(apparent)?.[1]);
    check('apparent wind is further forward', awa >= 50 && awa <= 65, apparent);
    await context.close();
  }

  // Held still is Phase 1.
  {
    const { context, page } = await openPage(phone, 'm6 held', '?wd=90&ws=12&ms=40&js=100&held=1');
    await page.waitForTimeout(1500);
    check(
      'held strip',
      (await text(page, 'strip-speed')) === 'Held still',
      await text(page, 'strip-speed'),
    );
    const trueWind = await text(page, 'strip-true');
    const apparent = await text(page, 'strip-apparent');
    check(
      'held: App = True',
      trueWind.replace('True', '') === apparent.replace('App', ''),
      `${trueWind} / ${apparent}`,
    );
    await context.close();
  }

  // Old links still work: the Phase 1 picture, the autopilot holds the course.
  {
    const { context, page } = await openPage(phone, 'm6 old link', '?wd=60');
    await page.waitForTimeout(1500);
    check(
      'old link: true wind',
      (await text(page, 'strip-true')).startsWith('True 60° S'),
      await text(page, 'strip-true'),
    );
    check(
      'old link: autopilot',
      (await text(page, 'strip-auto')) === 'AUTO 0°',
      await text(page, 'strip-auto'),
    );
    await context.close();
  }

  // Autopilot: +10 turns her 10° to starboard; then the wheel takes it to Standby with a notice.
  {
    const { context, page } = await openPage(phone, 'm6 autopilot', '?wd=90&ws=12&ms=40&js=100');
    await page.waitForTimeout(1000);
    await page.locator('.ropes-easy').getByTestId('autopilot-turn-10').click();
    check(
      'autopilot +10 target',
      (await text(page, 'strip-auto')) === 'AUTO 10°',
      await text(page, 'strip-auto'),
    );
    await page.waitForTimeout(6000);
    const heading = parseInt((await text(page, 'strip-heading')).replace(/\D/g, ''), 10);
    check('autopilot turns her', heading >= 5 && heading <= 14, `HDG ${heading}`);
    await shot(page, 'live-phone-autopilot-plus10');
    await page.locator('[data-select="part_rudder"]').click();
    await page
      .locator('.ropes-easy')
      .getByRole('button', { name: 'Turn the wheel to starboard' })
      .click();
    await page.waitForTimeout(400);
    check(
      'wheel takes the autopilot',
      (await text(page, 'strip-auto')) === '',
      `badge "${await text(page, 'strip-auto')}"`,
    );
    check('notice shown', await page.getByTestId('autopilot-notice').isVisible(), 'visible');
    await shot(page, 'live-phone-autopilot-standby-notice');
    await context.close();
  }

  // Wind presets are relative to the bow.
  {
    const { context, page } = await openPage(phone, 'm6 preset', '?wd=90&ws=12&hdg=40');
    await page.getByRole('tab', { name: 'Wind' }).click();
    await page.getByRole('button', { name: '45° starboard' }).click();
    await page.waitForTimeout(600);
    const url = await search(page);
    check('preset 45° starboard at heading 40', url.includes('wd=85'), url);
    await context.close();
  }

  // Boat mode switch.
  {
    const { context, page } = await openPage(phone, 'm6 switch', '?wd=90&ws=12&ms=40&js=100');
    await page.getByRole('tab', { name: 'Wind' }).click();
    await page.getByText('Held still', { exact: true }).click();
    await page.waitForTimeout(600);
    check(
      'switch to Held still',
      (await text(page, 'strip-speed')) === 'Held still',
      await text(page, 'strip-speed'),
    );
    check('link says held', (await search(page)).includes('held=1'), await search(page));
    await page.getByText('Sailing', { exact: true }).click();
    await page.waitForTimeout(3000);
    const speed = parseFloat(await text(page, 'strip-speed'));
    check('Sailing again accelerates', speed > 0.5, `${speed} kn`);
    await context.close();
  }

  // Frame rate (the headless browser is software-rendered: the numbers are only a floor).
  {
    const { context, page } = await openPage(
      phone,
      'm6 frames',
      '?wd=90&ws=12&ms=40&js=100&debug=1',
    );
    await page.waitForTimeout(3000);
    const overlay = await page.getByTestId('debug-overlay').innerText();
    const fps = /FPS\s+(\d+)/.exec(overlay)?.[1];
    console.log(`live M6 frames: FPS ${fps} (software rendering)`);
    await shot(page, 'live-phone-debug');
    await context.close();
  }
}
