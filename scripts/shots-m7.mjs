// M7 (map and wind instrument): scenes and live checks for scripts/shots.mjs.
// The bird's-eye map (no-go zone, points of sail, winds, track, zoom, boat up, taps) and the
// wind instrument dial in the Wind tab. Their labels contain "m7" so the script opens them
// Sailing (older scenes are held still).
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';

/** Screenshots at every size. The script waits `waitMs` before each (the track needs time). */
export const M7_SCENES = [
  {
    name: 'map-close-hauled',
    query: '?wd=45&ws=12&ms=12&js=0&cam=map',
    waitMs: 20_000,
  },
  { name: 'map-run', query: '?wd=175&ws=12&ms=100&js=100&cam=map', waitMs: 8000 },
  {
    name: 'map-close-hauled-boat-up',
    query: '?wd=85&ws=12&ms=12&js=0&hdg=40&cam=map',
    click: ['map-boat-up'],
    waitMs: 12_000,
  },
  {
    name: 'map-beam-reach-zoomed-in',
    query: '?wd=90&ws=12&ms=40&js=100&cam=map',
    click: ['map-zoom-in'],
    // After the short hint on the map has faded out (about 8 s).
    waitMs: 10_000,
  },
  {
    name: 'map-in-irons',
    query: '?wd=0&ws=12&ms=10&js=10&bs=3&ap=off&cam=map',
    waitMs: 4000,
  },
  {
    name: 'map-held',
    query: '?wd=60&ws=12&ms=30&js=50&held=1&cam=map',
    waitMs: 1500,
  },
  {
    name: 'map-tap-no-go',
    query: '?wd=45&ws=12&ms=12&js=0&cam=map&sel=term_no_go_zone',
    waitMs: 6000,
  },
  {
    name: 'instrument',
    query: '?wd=90&ws=12&ms=40&js=100&cam=side-port',
    tab: 'Wind',
    centre: '[data-testid="wind-instrument"]',
    waitMs: 3000,
  },
  {
    name: 'instrument-held',
    query: '?wd=90&ws=12&ms=40&js=100&held=1&cam=side-port',
    tab: 'Wind',
    centre: '[data-testid="wind-instrument"]',
    waitMs: 1500,
  },
  {
    name: 'instrument-run',
    query: '?wd=-150&ws=18&ms=100&js=100&hdg=20&cam=side-port',
    tab: 'Wind',
    centre: '[data-testid="wind-instrument"]',
    waitMs: 3000,
  },
];

const text = async (page, id) => (await page.getByTestId(id).textContent()) ?? '';

export async function liveM7Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M7 ${what}: ${detail}`);
    console.log(`live M7 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const search = (page) => page.evaluate(() => window.location.search);
  const mapShown = (page) => page.getByTestId('map-canvas').isVisible();
  const sceneShown = (page) => page.locator('canvas.scene-canvas').isVisible();
  const cardId = (page) =>
    page.evaluate(() => {
      const card = document.querySelector('[data-testid="info-card"]');
      return card && !card.hidden ? card.getAttribute('data-part-id') : null;
    });
  /** Taps the map at an offset from the boat, by bearing (clockwise from up) and radius. */
  const tapMap = async (page, bearingDeg, radius) => {
    const box = await page.getByTestId('map-canvas').boundingBox();
    const centre = await page.evaluate(() => window.__sailMap.centre());
    const a = (bearingDeg * Math.PI) / 180;
    await page.mouse.click(
      box.x + centre.x + radius * Math.sin(a),
      box.y + centre.y - radius * Math.cos(a),
    );
  };

  // The map: close-hauled, winds, bold point of sail, a track after a while.
  {
    const { context, page } = await openPage(
      phone,
      'm7 map close-hauled',
      '?wd=45&ws=12&ms=12&js=0&cam=map&debug=1',
    );
    await page.waitForTimeout(1500);
    check('map shows, 3D scene hidden', (await mapShown(page)) && !(await sceneShown(page)), 'map');
    check(
      'true wind box',
      (await text(page, 'map-wind-text')) === 'True wind 12 kn from 045°',
      await text(page, 'map-wind-text'),
    );
    check('scale bar 100 m at 1 m/px', (await text(page, 'map-scale')) === '100 m', 'scale');
    check(
      'boat enlarged note',
      await page.getByTestId('map-enlarged').isVisible(),
      'visible at 1 m/px',
    );
    await page.waitForTimeout(8000);
    const points = await page.evaluate(() => window.__sailMap?.trackPoints() ?? -1);
    check('track grows (about one point a second)', points >= 6 && points <= 14, `${points}`);

    // Zoom: + halves the metres per pixel, − doubles.
    await page.getByTestId('map-zoom-in').click();
    check(
      'zoom in: scale 50 m',
      (await text(page, 'map-scale')) === '50 m',
      await text(page, 'map-scale'),
    );
    check(
      'zoom in: boat no longer enlarged',
      !(await page.getByTestId('map-enlarged').isVisible()),
      'hidden at 0.5 m/px',
    );
    check(
      'zoom in is at its limit',
      await page.getByTestId('map-zoom-in').isDisabled(),
      'disabled',
    );
    await page.getByTestId('map-zoom-out').click();
    await page.getByTestId('map-zoom-out').click();
    check(
      'zoom out twice: scale 200 m',
      (await text(page, 'map-scale')) === '200 m',
      await text(page, 'map-scale'),
    );
    await page.getByTestId('map-zoom-in').click();
    check('link keeps cam=map', (await search(page)).includes('cam=map'), await search(page));

    // Boat up / North up.
    await page.getByTestId('map-boat-up').click();
    check(
      'boat up pressed',
      (await page.getByTestId('map-boat-up').getAttribute('aria-pressed')) === 'true',
      'aria-pressed',
    );
    await page.getByTestId('map-north-up').click();
    check(
      'north up pressed again',
      (await page.getByTestId('map-north-up').getAttribute('aria-pressed')) === 'true',
      'aria-pressed',
    );

    // Taps. Wind from 045, heading 000: the wedge is centred on bearing 45, the apparent wind
    // arrow (about 30° off the bow) is well inside it, so tap the wedge away from the arrow.
    await tapMap(page, 75, 70);
    check(
      'tap on the wedge: No-go zone',
      (await cardId(page)) === 'term_no_go_zone',
      String(await cardId(page)),
    );
    await page.keyboard.press('Escape');
    await tapMap(page, 28, 48);
    check(
      'tap on the blue arrow: Apparent wind',
      (await cardId(page)) === 'term_apparent_wind',
      String(await cardId(page)),
    );
    await page.keyboard.press('Escape');
    await tapMap(page, 0, 3);
    check(
      'tap on the boat: Hull',
      (await cardId(page)) === 'part_hull',
      String(await cardId(page)),
    );
    await page.keyboard.press('Escape');
    await tapMap(page, 225, 300);
    check('tap on open water: nothing', (await cardId(page)) === null, String(await cardId(page)));
    await page.getByTestId('map-wind-box').click();
    check('wind box: Test wind', (await cardId(page)) === 'env_wind', String(await cardId(page)));
    await page.keyboard.press('Escape');

    // Back to 3D.
    await page.getByRole('button', { name: 'Side (port)' }).click();
    await page.waitForTimeout(800);
    check('back to 3D', !(await mapShown(page)) && (await sceneShown(page)), 'scene shown');
    check(
      'link says side-port',
      (await search(page)).includes('cam=side-port'),
      await search(page),
    );
    await shot(page, 'live-phone-back-to-3d');
    await page.getByRole('button', { name: 'Map' }).click();
    await page.waitForTimeout(600);
    check('Map button opens the map again', await mapShown(page), 'map');
    await context.close();
  }

  // Close-hauled: "Close-hauled" bold; running: "Run" bold (read from the canvas via debug).
  for (const [label, query, expected] of [
    ['close-hauled', '?wd=45&ws=12&ms=12&js=0&cam=map&debug=1', 'close_hauled'],
    ['running', '?wd=175&ws=12&ms=100&js=100&cam=map&debug=1', 'run'],
    ['beam reach', '?wd=90&ws=12&ms=40&js=100&cam=map&debug=1', 'beam_reach'],
    ['in the no-go zone', '?wd=20&ws=12&ms=10&js=10&bs=2&ap=off&cam=map&debug=1', 'no_go'],
  ]) {
    const { context, page } = await openPage(phone, `m7 point of sail ${label}`, query);
    await page.waitForTimeout(1500);
    const bold = await page.evaluate(() => window.__sailMap?.currentPointOfSail() ?? null);
    check(`point of sail while ${label}`, bold === expected, String(bold));
    await context.close();
  }

  // The map does not draw the 3D scene (saves the battery): the 3D canvas keeps its last frame
  // and the frame loop spends almost nothing. Only the layout is checked here.
  {
    const { context, page } = await openPage(
      phone,
      'm7 map debug',
      '?wd=45&ws=12&ms=12&js=0&cam=map&debug=1',
    );
    await page.waitForTimeout(3000);
    const overlay = await page.getByTestId('debug-overlay').innerText();
    console.log(
      `live M7 map frames: ${overlay.replace(/\s+/g, ' ').slice(0, 160)} (software rendering)`,
    );
    await shot(page, 'live-phone-map-debug');
    await context.close();
  }

  // Accessibility (names, touch targets, text size, keyboard) on the map and on the Wind tab.
  for (const [name, query, tab] of [
    ['map', '?wd=45&ws=12&ms=12&js=0&cam=map', null],
    ['wind tab with the instrument', '?wd=90&ws=12&ms=40&js=100', 'Wind'],
  ]) {
    const { context, page } = await openPage(phone, `m7 a11y ${name}`, query);
    await page.waitForTimeout(800);
    if (tab) await page.getByRole('tab', { name: tab }).click();
    const found = await auditPage(page, `a11y ${name}`);
    check(`accessibility: ${name}`, found.length === 0, found.length ? found.join(' | ') : 'clean');
    await context.close();
  }

  // The wind instrument.
  {
    const { context, page } = await openPage(phone, 'm7 instrument', '?wd=90&ws=12&ms=40&js=100');
    await page.getByRole('tab', { name: 'Wind' }).click();
    await page.waitForTimeout(3000);
    const aws = parseFloat((await text(page, 'instrument-aws')).replace(/[^\d.]/g, ''));
    const tws = parseFloat((await text(page, 'instrument-tws')).replace(/[^\d.]/g, ''));
    check('AWS about 14.5 kn', aws >= 13.5 && aws <= 15.5, `${aws}`);
    check('TWS 12.0', tws === 12, `${tws}`);
    const rotation = async (id) =>
      parseFloat(
        /rotate\((-?[\d.]+)\)/.exec(await page.getByTestId(id).getAttribute('transform'))?.[1],
      );
    const awa = await rotation('needle-apparent');
    const twa = await rotation('needle-true');
    check('apparent needle about 56°', awa >= 50 && awa <= 62, `${awa}`);
    check('true needle at 90°', twa === 90, `${twa}`);
    check(
      'speed and heading under the dial',
      /^Speed \d\.\d kn · Heading 0°$/.test(await text(page, 'instrument-under')),
      await text(page, 'instrument-under'),
    );
    await context.close();
  }
  {
    const { context, page } = await openPage(
      phone,
      'm7 instrument held',
      '?wd=90&ws=12&ms=40&js=100&held=1',
    );
    await page.getByRole('tab', { name: 'Wind' }).click();
    await page.waitForTimeout(800);
    const awa = await page.getByTestId('needle-apparent').getAttribute('transform');
    const twa = await page.getByTestId('needle-true').getAttribute('transform');
    check('held still: both needles coincide', awa === twa, `${awa} / ${twa}`);
    await context.close();
  }
}
