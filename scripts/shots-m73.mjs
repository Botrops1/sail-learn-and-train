// M73 (a more detailed marina, solid from everywhere, PHASE10_SPEC 15.8): scenes and live checks
// for scripts/shots.mjs. Labels contain "m73". The live checks run on the test clock (shots.mjs
// passes `onTestClock`); the boat stands still (`ws=0`) except in the bump check.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { setSheet, showSection } from './ui.mjs';

const ENTRANCE = '?pl=marina&m=harbour&pe=-200.0&pn=1476.0&hdg=90&ws=0&cam=helm';
// The start at the fairway's west end has no yacht near (the first berth is 29 m east of her), so the
// side view starts in the middle of the fairway (decided in the M73 PR).
// The red light straight ahead, clear of the buttons over the 3D view (from the entrance scene's start the
// helm view hides the entrance behind the cockpit).
const LIGHT_AHEAD = '?pl=marina&m=harbour&pe=-147.0&pn=1465.0&hdg=0&ws=0&cam=helm';
const SIDE =
  '?pl=marina&m=harbour&tr=busy&cam=side-port&ws=0&detail=high&pe=-30.0&pn=1468.0&hdg=90';

export const M73_SCENES = [
  { name: 'marina-entrance', query: ENTRANCE, sheet: 'peek' },
  { name: 'marina-side', query: SIDE, sheet: 'peek' },
  {
    name: 'marina-map',
    query: '?pl=marina&m=harbour&tr=busy&cam=map',
    click: ['map-zoom-out', 'map-zoom-out'],
  },
  {
    name: 'marina-low',
    query: '?pl=marina&m=harbour&tr=busy&cam=side-port&ws=0&detail=low',
    sheet: 'peek',
  },
];

export async function liveM73Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M73 ${what}: ${detail}`);
    console.log(`live M73 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone, , desktop] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const cardName = (page) =>
    page.locator('[data-testid="info-card"] .card-name').first().textContent();
  const tapAt = async (page, canvas, point) => {
    const box = await (
      canvas === 'map-canvas' ? page.getByTestId('map-canvas') : page.locator('canvas.scene-canvas')
    ).boundingBox();
    await page.mouse.click(box.x + point.x, box.y + point.y);
    await page.waitForTimeout(300);
  };

  // 1. On the map, a tap on the middle of the south mole names the breakwater.
  {
    const { context, page } = await openPage(
      phone,
      'm73 tap breakwater',
      '?pl=marina&m=harbour&tr=busy&cam=map&ws=0&debug=1',
      { testClock: true },
    );
    await setSheet(page, 'peek');
    for (let i = 0; i < 2; i += 1) {
      await page.getByTestId('map-zoom-out').click();
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(500);
    const point = await page.evaluate(() => window.__sailMap.toScreen(-15, 1427));
    await tapAt(page, 'map-canvas', point);
    const name = (await cardName(page))?.trim();
    await shot(page, 'm73-tap-breakwater');
    check('tap breakwater: the card names it', name === 'Breakwater', JSON.stringify(name));
    await context.close();
  }

  // 2. In 3D at the entrance, a tap on the red light names the harbour entrance light.
  {
    const { context, page } = await openPage(desktop, 'm73 tap light', `${LIGHT_AHEAD}&debug=1`, {
      testClock: true,
    });
    await setSheet(page, 'peek');
    await page.waitForTimeout(500);
    const point = await page.evaluate(() =>
      window.__sailDebug.marinaPartScreen('env_harbour_light'),
    );
    check('tap light: the red light is on screen', point !== null, JSON.stringify(point));
    if (point) {
      await tapAt(page, 'scene-canvas', point);
      const name = (await cardName(page))?.trim();
      check(
        'tap light: the card names it',
        name === 'Harbour entrance light',
        JSON.stringify(name),
      );
    }
    await context.close();
  }

  // 3. From the side, a tap on a moored yacht names it.
  {
    const { context, page } = await openPage(phone, 'm73 yacht tap', `${SIDE}&debug=1`, {
      testClock: true,
    });
    await setSheet(page, 'peek');
    await page.waitForTimeout(500);
    const point = await page.evaluate(() =>
      window.__sailDebug.marinaPartScreen('env_moored_yacht'),
    );
    check('yacht tap: a yacht is on screen', point !== null, JSON.stringify(point));
    if (point) {
      await tapAt(page, 'scene-canvas', point);
      const name = (await cardName(page))?.trim();
      check('yacht tap: the card names it', name === 'Moored yacht', JSON.stringify(name));
    }
    await context.close();
  }

  // 4. One bump, at most two damage lines (before M73 a bounce gave three or more).
  {
    const { context, page } = await openPage(
      phone,
      'm73 bump once',
      '?pl=marina&m=harbour&pe=2.8&pn=1490.4&hdg=180&ws=0&debug=1',
      { testClock: true },
    );
    const act = (action) => page.evaluate((a) => window.__sailExercise.dispatch(a), action);
    await page.waitForTimeout(500);
    // She backs towards the quay at about 0.2 m/s and bumps it after about 8 s; the bounce away is slow.
    await act({ type: 'engine', command: { leverPct: -40 } });
    await page.waitForTimeout(6000);
    await act({ type: 'engine', command: { leverPct: 0 } });
    await page.waitForTimeout(8000);
    await showSection(page, 'status');
    const rows = await page
      .locator('[data-testid="section-status"] .damage-list li.damage-item')
      .count();
    await shot(page, 'm73-bump-once');
    check('bump once: at most two damage lines', rows >= 1 && rows <= 2, `${rows} lines`);
    await context.close();
  }

  // 5. The accessibility audit on the Place section.
  {
    const { context, page } = await openPage(phone, 'm73 a11y', '?pl=marina&m=harbour&ws=0', {
      testClock: true,
    });
    await showSection(page, 'place');
    problems.push(...(await auditPage(page, 'm73 place section')));
    await context.close();
  }
}
