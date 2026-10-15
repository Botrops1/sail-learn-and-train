// M16 (Wind on the water, buoys, horizon): scenes and live checks for scripts/shots.mjs
// (PHASE3_SPEC 8.8). Labels contain "m16", so the script opens them Sailing and without the
// `sea=flat` it adds to the older scenes. Headless Chromium draws the 3D view by software, so the
// live checks read numbers the page offers (the gust profile, the buoy's place on the canvas, the
// info card) and do not judge colours.
import path from 'node:path';
import { setSheet } from './ui.mjs';

/** Screenshots at every size. The script waits `waitMs` before each. */
export const M16_SCENES = [
  { name: 'water-windy', query: '?wd=90&ws=22&ms=50&js=100&sea=open&cam=side-port', waitMs: 3000 },
  { name: 'water-windy-top', query: '?wd=90&ws=22&ms=50&js=100&sea=open&cam=top', waitMs: 3000 },
  { name: 'water-light', query: '?wd=90&ws=6&ms=50&js=100&cam=side-port', waitMs: 3000 },
  { name: 'buoy-ahead', query: '?wd=90&ws=12&ms=40&js=100&held=1&cam=helm', waitMs: 3000 },
  { name: 'horizon', query: '?wd=90&ws=12&cam=side-starboard', waitMs: 3000 },
];

export async function liveM16Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M16 ${what}: ${detail}`);
    console.log(`live M16 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const cardName = (page) =>
    page.locator('[data-testid="info-card"] .card-name').first().textContent();

  // A gust shows on the water before it reaches the boat (PT-45). Seed 1's first gust begins
  // 33.7 s in: the profile shows it 60–200 m upwind while the water at the boat is still calm,
  // and the strip says GUST within 40 s.
  {
    const { context, page } = await openPage(
      phone,
      'm16 gust coming',
      '?wd=0&ws=12&ms=12&js=0&wm=gusty&seed=1&cam=helm&debug=1',
    );
    let seen = null;
    for (let i = 0; i < 120 && !seen; i += 1) {
      const profile = await page.evaluate(() => window.__sailWater?.gustProfile() ?? null);
      if (profile) {
        const ahead = profile.values.slice(8, 16);
        if (ahead.some((value) => value > 0.5) && profile.values[5] < 0.2) seen = profile;
      }
      if (!seen) await page.waitForTimeout(500);
    }
    check(
      'the gust shows upwind first',
      seen !== null,
      seen ? seen.values.map((v) => v.toFixed(2)).join(' ') : 'no profile with a gust ahead',
    );
    await shot(page, 'live-phone-gust-coming');
    // The simulation clock runs slower than the wall clock on a slow runner (the 3D picture now
    // fills the whole phone screen, M26), so the strip gets up to 80 s of real time, not 40.
    let badge = false;
    for (let i = 0; i < 160 && !badge; i += 1) {
      badge = await page.getByTestId('strip-gust').isVisible();
      if (!badge) await page.waitForTimeout(500);
    }
    check('then the strip shows GUST', badge, `badge ${badge}`);
    await context.close();
  }

  // A buoy on the map: zoom out to 2 m/px, tap 100 px above the boat (the N buoy, 200 m north).
  {
    const { context, page } = await openPage(
      phone,
      'm16 buoy map',
      '?wd=90&ws=12&held=1&cam=map&debug=1',
    );
    await page.waitForTimeout(1500);
    for (let i = 0; i < 4; i += 1) {
      await page.getByTestId('map-zoom-out').click();
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(500);
    const box = await page.getByTestId('map-canvas').boundingBox();
    const centre = await page.evaluate(() => window.__sailMap.centre());
    await shot(page, 'live-phone-buoys-map');
    await page.mouse.click(box.x + centre.x, box.y + centre.y - 100);
    await page.waitForTimeout(500);
    const name = await cardName(page);
    check('tap on a buoy on the map', name === 'Practice buoy', JSON.stringify(name));
    await context.close();
  }

  // A buoy in 3D: from the bow, looking ahead; it lies on the canvas and a tap on it opens its card.
  {
    const { context, page } = await openPage(phone, 'm16 buoy 3d', '?wd=90&ws=12&held=1&debug=1');
    await setSheet(page, 'peek');
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__sailDebug.setView([6.5, 2.5, 0], [60, 0.5, 0]));
    await page.waitForTimeout(500);
    const spot = await page.evaluate(() => window.__sailWater.buoyScreen('N'));
    const box = await page.locator('canvas.scene-canvas').boundingBox();
    const inside =
      spot !== null && spot.x >= 0 && spot.y >= 0 && spot.x <= box.width && spot.y <= box.height;
    check('the N buoy lies on the canvas', inside, JSON.stringify(spot));
    await shot(page, 'live-phone-buoy-3d');
    if (inside) {
      await page.mouse.click(box.x + spot.x, box.y + spot.y);
      await page.waitForTimeout(500);
      const name = await cardName(page);
      check('tap on the buoy in 3D', name === 'Practice buoy', JSON.stringify(name));
    }
    await context.close();
  }

  // White horses are scattered patches, not big bands (owner, M16 PR): a wide view from above,
  // for the eye. The check only makes sure the view could be taken.
  {
    const { context, page } = await openPage(
      phone,
      'm16 foam wide',
      '?wd=90&ws=22&ms=50&js=100&sea=open&debug=1',
    );
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.__sailDebug.setView([-40, 100, 80], [20, 0, -10]));
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      const overlay = document.querySelector('[data-testid="debug-overlay"]');
      if (overlay) overlay.style.display = 'none';
    });
    await shot(page, 'live-phone-foam-wide');
    await context.close();
  }
}
