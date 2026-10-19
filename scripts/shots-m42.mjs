// M42 (places and the marina, PHASE7_SPEC 8.9): scenes and live checks for scripts/shots.mjs.
// Labels contain "m42", so openPage lets the app open as it does without a link (Sailing, default
// waves; a place link sets its own sea). The live checks run on the test clock (shots.mjs passes
// `onTestClock`), but none of them needs app time to pass: the boat stands still (`ws=0`).
import path from 'node:path';
import { choosePlace, setCamera, setSheet, showSection, waitForLink } from './ui.mjs';

export const M42_SCENES = [
  {
    name: 'marina-map',
    query: '?pl=marina&m=harbour&cam=map',
    click: ['map-zoom-out', 'map-zoom-out'],
  },
  {
    name: 'marina-busy-tight-map',
    query: '?pl=marina&ml=tight&tr=busy&m=harbour&cam=map',
    click: ['map-zoom-out', 'map-zoom-out'],
  },
  {
    name: 'marina-berth',
    query: '?pl=marina&tr=busy&m=harbour&pe=2.8&pn=1480.0&hdg=180&cam=side-port',
    sheet: 'peek',
  },
  { name: 'marina-fairway', query: '?pl=marina&m=harbour&cam=bow', sheet: 'peek' },
  { name: 'place-section', query: '?pl=marina&m=harbour', section: 'place', sheet: 'half' },
  {
    name: 'place-section-ru',
    query: '?lang=ru&pl=marina&m=harbour',
    section: 'place',
    sheet: 'full',
  },
];

export async function liveM42Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M42 ${what}: ${detail}`);
    console.log(`live M42 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const cardName = (page) =>
    page.locator('[data-testid="info-card"] .card-name').first().textContent();
  const zoomOutTwice = async (page) => {
    for (let i = 0; i < 2; i += 1) {
      await page.getByTestId('map-zoom-out').click();
      await page.waitForTimeout(150);
    }
  };
  /** Taps a map point (metres east, north of the start) on the map canvas. */
  const tapMap = async (page, eastM, northM) => {
    const box = await page.getByTestId('map-canvas').boundingBox();
    const point = await page.evaluate(([e, n]) => window.__sailMap.toScreen(e, n), [eastM, northM]);
    await page.mouse.click(box.x + point.x, box.y + point.y);
    await page.waitForTimeout(300);
  };
  const pressed = (page, id) => page.getByTestId(id).getAttribute('aria-pressed');

  // 1. Choose the marina: the link gets the place and her position; on the map a tap on the quay
  // (35 m east and 39 m north of her) opens the quay's card.
  {
    const { context, page } = await openPage(phone, 'm42 choose', '?m=harbour&ws=0&debug=1', {
      testClock: true,
    });
    await choosePlace(page, 'marina');
    const link = await waitForLink(page, ['pl=marina', 'pe=-95.0', 'pn=1468.0']);
    check('choose: the link has the place and her position', true, link);
    check(
      'choose: Marina is pressed',
      (await pressed(page, 'place-marina')) === 'true',
      String(await pressed(page, 'place-marina')),
    );
    await setSheet(page, 'peek');
    await setCamera(page, 'map');
    await page.waitForTimeout(500);
    await zoomOutTwice(page);
    await page.waitForTimeout(500);
    await shot(page, 'm42-choose-map');
    await tapMap(page, -60, 1507);
    const name = (await cardName(page))?.trim();
    check('choose: a tap on the quay names it', name === 'Quay', JSON.stringify(name));
    await context.close();
  }

  // 2. A tap on a moored yacht on the map names it (busy: every berth but ours is taken).
  {
    const { context, page } = await openPage(
      phone,
      'm42 yacht tap',
      '?pl=marina&tr=busy&m=harbour&ws=0&cam=map&debug=1',
      { testClock: true },
    );
    await setSheet(page, 'peek');
    await page.waitForTimeout(500);
    await zoomOutTwice(page);
    await page.waitForTimeout(500);
    await tapMap(page, -46.75, 1493);
    const name = (await cardName(page))?.trim();
    check('yacht tap: the card names the yacht', name === 'Moored yacht', JSON.stringify(name));
    await context.close();
  }

  // 3. Layout and traffic: Tight sends her back to the start (north 1472) and is in the link.
  {
    const { context, page } = await openPage(phone, 'm42 layout', '?pl=marina&m=harbour&ws=0', {
      testClock: true,
    });
    await showSection(page, 'place');
    await page.getByTestId('marina-layout-tight').click();
    const link = await waitForLink(page, ['ml=tight', 'pn=1472.0']);
    check('layout: the link has ml=tight and pn=1472.0', true, link);
    await page.getByTestId('marina-traffic-busy').click();
    const busy = await waitForLink(page, ['tr=busy', 'ml=tight']);
    check('traffic: the link has tr=busy and keeps ml=tight', true, busy);
    await page.getByTestId('place-marina').click();
    await waitForLink(page, ['pn=1472.0']);
    check('place: choosing the same place again keeps the start', true, 'pn=1472.0');
    await shot(page, 'm42-layout');
    await context.close();
  }

  // 4. A shared link opens the same place, layout and traffic (a reload is the link opened again).
  {
    const { context, page } = await openPage(
      phone,
      'm42 reload',
      '?pl=marina&ml=spacious&tr=empty&m=harbour&ws=0&pe=-60.0&pn=1470.0&hdg=90',
      { testClock: true },
    );
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('canvas.scene-canvas', { state: 'attached', timeout: 30_000 });
    await showSection(page, 'place');
    const state = [
      await pressed(page, 'place-marina'),
      await pressed(page, 'marina-layout-spacious'),
      await pressed(page, 'marina-traffic-empty'),
    ].join();
    check('reload: place, layout and traffic are pressed', state === 'true,true,true', state);
    const link = await waitForLink(page, ['pl=marina', 'ml=spacious', 'tr=empty', 'pe=-60.0']);
    check('reload: the link still has the position', link.includes('pn=1470.0'), link);
    await context.close();
  }

  // 5. Open water: no place keys, the layout rows are hidden; choosing Marina shows them.
  {
    const { context, page } = await openPage(phone, 'm42 old link', '?wd=60&ws=12');
    await page.waitForTimeout(600);
    const link = await page.evaluate(() => window.location.search);
    check('old link: no place key in the written link', !/[?&](pl|ml|tr|pe|pn)=/.test(link), link);
    await showSection(page, 'place');
    const hidden = await page.getByTestId('marina-layout').isHidden();
    check('old link: the layout row is hidden in open water', hidden, String(hidden));
    await page.getByTestId('place-marina').click();
    await page.waitForTimeout(300);
    const shown = await page.getByTestId('marina-layout').isVisible();
    check('old link: Marina shows the layout row', shown, String(shown));
    await page.getByTestId('place-open').click();
    await page.waitForTimeout(300);
    const back = await waitForLink(page, [], ['pl=', 'pe=', 'pn=']);
    check('old link: back in open water the place keys go', true, back);
    await context.close();
  }
}
