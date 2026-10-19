// M45 (the bay: depth, seabed, shore lines and buoys, PHASE7_SPEC 11.8): scenes and live checks
// for scripts/shots.mjs. Labels contain "m45", so openPage lets the app open as it does without a
// link (Sailing, default waves; a place link sets its own sea). The live checks run on the test
// clock (shots.mjs passes `onTestClock`): waitForTimeout moves the app's time on by exactly that long.
import path from 'node:path';
import { choosePlace, lineAction, setSheet, waitForLink } from './ui.mjs';

/** The term_grounding Show me link: the keel 1 m east of the 2.4 m line, 1 kn towards the shore. */
const SHALLOW = '?cam=side-port&pl=bay&pe=-1676.4&pn=0.0&hdg=270&bs=1.0';
/** The bow tip 0.1 m from buoy 1, no wind, at rest. */
const BUOY = '?pl=bay&m=harbour&pe=-1457.0&pn=0.0&hdg=90&ws=0&cam=side-port';
/** The stern 27.5 m from the ring at (-1700, 0). */
const SHORE = '?pl=bay&m=harbour&pe=-1665.0&pn=0.0&hdg=90&ws=0';

export const M45_SCENES = [
  { name: 'bay-entrance', query: '?pl=bay&m=harbour&cam=top', sheet: 'peek' },
  {
    name: 'bay-map',
    query: '?pl=bay&m=harbour&cam=map',
    click: ['map-zoom-out', 'map-zoom-out', 'map-zoom-out'],
    sheet: 'peek',
  },
  { name: 'bay-shallow', query: `${SHALLOW}&m=harbour`, sheet: 'peek' },
  { name: 'bay-buoy', query: BUOY, sheet: 'peek' },
  { name: 'bay-shore', query: `${SHORE}&cam=top`, sheet: 'peek' },
  { name: 'bay-lines-section', query: BUOY, section: 'harbour', sheet: 'full' },
  { name: 'bay-lines-section-ru', query: `${BUOY}&lang=ru`, section: 'harbour', sheet: 'full' },
];

export async function liveM45Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M45 ${what}: ${detail}`);
    console.log(`live M45 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  /** Asks `ready` every `stepMs` of app time until it says yes, at most `maxMs`. */
  const poll = async (page, ready, maxMs, stepMs = 100) => {
    for (let waited = 0; waited <= maxMs; waited += stepMs) {
      if (await ready()) return true;
      await page.waitForTimeout(stepMs);
    }
    return false;
  };
  const text = async (page, id) => ((await page.getByTestId(id).textContent()) ?? '').trim();
  const alertText = async (page) => {
    const alert = page.getByTestId('damage-alert');
    return (await alert.isVisible()) ? ((await alert.textContent()) ?? '') : '';
  };
  const cardName = (page) =>
    page.locator('[data-testid="info-card"] .card-name').first().textContent();
  /** Taps a map point (metres east, north of the start) on the map canvas (needs debug=1). */
  const tapMap = async (page, eastM, northM) => {
    const box = await page.getByTestId('map-canvas').boundingBox();
    const point = await page.evaluate(([e, n]) => window.__sailMap.toScreen(e, n), [eastM, northM]);
    await page.mouse.click(box.x + point.x, box.y + point.y);
    await page.waitForTimeout(300);
  };

  // 1. The depth on the instrument strip: a number in the bay, gone in open water.
  {
    const { context, page } = await openPage(phone, 'm45 depth', '?pl=bay&m=harbour', {
      testClock: true,
    });
    const depth = page.getByTestId('strip-depth');
    const shown = await depth.isVisible();
    const words = shown ? ((await depth.textContent()) ?? '').trim() : '';
    check('depth: the strip shows a depth in the bay', /^Depth \d+\.\d m$/.test(words), words);
    await choosePlace(page, 'open');
    await page.waitForTimeout(300);
    check('depth: it is hidden in open water', !(await depth.isVisible()), 'strip-depth');
    await context.close();
  }

  // 2. A mooring buoy: pick it up with the bow; the link keeps the line.
  {
    const { context, page } = await openPage(phone, 'm45 buoy', BUOY, { testClock: true });
    await lineAction(page, 'bl', 'take');
    const link = await waitForLink(page, ['ln=bl1:']);
    check('buoy: the link has the bow line to buoy 1', true, link);
    const status = await text(page, 'line-bl-status');
    check('buoy: the row says it is tied', /^Tied:/.test(status), status);
    await shot(page, 'm45-buoy-tied');
    await context.close();
  }

  // 3. Aground: the keel touches in the shallows and the alert names the bottom and the keel.
  {
    const { context, page } = await openPage(phone, 'm45 aground', `${SHALLOW}&m=harbour&tx=4`, {
      testClock: true,
    });
    const reported = await poll(page, async () => /keel/.test(await alertText(page)), 3000);
    const words = await alertText(page);
    check(
      'aground: within 3 s the alert names the seabed and the keel',
      reported && /Seabed/.test(words),
      words,
    );
    const depth = await page.getByTestId('strip-depth').getAttribute('class');
    check('aground: the depth on the strip is red', /is-shallow/.test(depth ?? ''), String(depth));
    await shot(page, 'm45-aground');
    await context.close();
  }

  // 4. A shore line: the crew takes it ashore in 30 s; the link keeps it.
  {
    const { context, page } = await openPage(phone, 'm45 shore', `${SHORE}&tx=4`, {
      testClock: true,
    });
    await lineAction(page, 'sl', 'take');
    const swimming = await text(page, 'line-sl-status');
    check(
      'shore: the crew is taking the line ashore',
      /taking the line ashore/.test(swimming),
      swimming,
    );
    const tied = await poll(
      page,
      async () => /^Tied:/.test(await text(page, 'line-sl-status')),
      32000,
      500,
    );
    check('shore: the line gets tied', tied, await text(page, 'line-sl-status'));
    const link = await waitForLink(page, ['ln=sl1:']);
    check('shore: the link has the shore line to ring 1', true, link);
    await context.close();
  }

  // 5. A tap on the map names a rock, a ring and a buoy (she lies in the middle of the bay, so all
  // three are within 1 m per pixel of the canvas).
  {
    const { context, page } = await openPage(
      phone,
      'm45 map taps',
      '?pl=bay&m=harbour&ws=0&cam=map&debug=1&pe=-1560.0&pn=0.0&hdg=90',
      { testClock: true },
    );
    await setSheet(page, 'peek');
    await page.waitForTimeout(500);
    for (let i = 0; i < 3; i += 1) {
      await page.getByTestId('map-zoom-out').click();
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(500);
    for (const [east, north, expected] of [
      [-1480, -60, 'Underwater rock'],
      [-1700, 60, 'Shore ring'],
      [-1450, 100, 'Mooring buoy'],
    ]) {
      await tapMap(page, east, north);
      const name = ((await cardName(page)) ?? '').trim();
      check(`map: a tap at ${east}, ${north} names it`, name === expected, JSON.stringify(name));
    }
    await context.close();
  }
}
