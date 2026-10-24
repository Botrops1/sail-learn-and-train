// M26 (phone layout with a pull-up sheet): scenes and live checks for scripts/shots.mjs
// (PHASE5_SPEC 7.9). Labels contain "m26", so openPage adds nothing: the app opens as it does
// without a link (Sailing, Coastal waves, the clock chip shown), the top area ends at 116 px.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { dragHandle, setCamera, setSheet, viewBottom } from './ui.mjs';

const BOAT = '?wd=60&ws=12&cam=side-port';

/** Phone size (CI) and wider: the sheet at its three heights, and Realistic. */
export const M26_SCENES = [
  { name: 'sheet-peek', query: BOAT, sheet: 'peek' },
  { name: 'sheet-half', query: BOAT },
  { name: 'sheet-full', query: BOAT, sheet: 'full' },
  { name: 'sheet-half-realistic', query: '?mode=realistic&st=port&cam=side-port' },
];

export async function liveM26Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M26 ${what}: ${detail}`);
    console.log(`live M26 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone, , desktop] = viewports;
  const landscape = viewports[3];
  const near = (value, target, tolerance = 1) => Math.abs(value - target) <= tolerance;
  const sheetBox = (page) => page.getByTestId('sheet').boundingBox();
  const heightOf = (page) => page.getByTestId('sheet').getAttribute('data-sheet');
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });

  // 1. Opens at half; the canvas fills the view; the page does not scroll.
  {
    const { context, page } = await openPage(phone, 'm26 half', '?wd=60&ws=12');
    await page.waitForTimeout(500);
    const box = await sheetBox(page);
    const canvas = await page.locator('canvas.scene-canvas').boundingBox();
    const scroll = await page.evaluate(() => ({
      w: document.documentElement.scrollWidth - window.innerWidth,
      h: document.documentElement.scrollHeight - window.innerHeight,
    }));
    check('opens at half', (await heightOf(page)) === 'half', await heightOf(page));
    check('half is 422 px', near(box.height, 422), `${box.height}`);
    check('the canvas is 844 px tall', near(canvas.height, 844), `${canvas.height}`);
    check('the page does not scroll', scroll.w <= 0 && scroll.h <= 0, JSON.stringify(scroll));
    await context.close();
  }

  // 2. Taps on the handle: half → full → peek → half.
  {
    const { context, page } = await openPage(phone, 'm26 taps', '?wd=60&ws=12');
    const handle = page.getByTestId('sheet-handle');
    const settle = () =>
      page.waitForFunction(
        () =>
          document.querySelector('[data-testid="sheet"]')?.getAttribute('data-sheet-moving') ===
          'false',
      );
    await handle.click();
    await settle();
    let box = await sheetBox(page);
    const chips = await page.getByTestId('view-bottom').boundingBox();
    check(
      'half → full',
      (await heightOf(page)) === 'full' && near(box.height, 668),
      `${box.height}`,
    );
    check(
      'full: the sheet starts at or below the chip row',
      box.y >= chips.y + chips.height - 1,
      `sheet top ${box.y}, chip row bottom ${chips.y + chips.height}`,
    );
    await handle.click();
    await settle();
    box = await sheetBox(page);
    const visibility = await page
      .locator('.panel-body')
      .evaluate((body) => getComputedStyle(body).visibility);
    check(
      'full → peek',
      (await heightOf(page)) === 'peek' && near(box.height, 128),
      `${box.height}`,
    );
    check('at peek the panel body is hidden', visibility === 'hidden', visibility);
    await handle.click();
    await settle();
    box = await sheetBox(page);
    check(
      'peek → half',
      (await heightOf(page)) === 'half' && near(box.height, 422),
      `${box.height}`,
    );
    await context.close();
  }

  // 3. Drags: slow past halfway, a fling, and a short slow drag that falls back. They run on the
  // map view: headless drawing of the 3D boat takes ~100 ms a frame, so a gesture sent through
  // the mouse would be slow in wall-clock time and never look like a fling.
  {
    const { context, page } = await openPage(phone, 'm26 drag', '?wd=60&ws=12&cam=map');
    await dragHandle(page, -150, 12, 50);
    check('drag up 150 px slowly → full', (await heightOf(page)) === 'full', await heightOf(page));
    await dragHandle(page, 120, 6, 0);
    check('a fling down from full → half', (await heightOf(page)) === 'half', await heightOf(page));
    await dragHandle(page, 50, 12, 50);
    check('drag down 50 px slowly → half', (await heightOf(page)) === 'half', await heightOf(page));
    await context.close();
  }

  // 4. Keyboard on the handle.
  {
    const { context, page } = await openPage(phone, 'm26 keys', '?wd=60&ws=12');
    await page.getByTestId('sheet-handle').focus();
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(400);
    check('ArrowDown → peek', (await heightOf(page)) === 'peek', await heightOf(page));
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(400);
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(400);
    check('ArrowUp twice → full', (await heightOf(page)) === 'full', await heightOf(page));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    check('Enter taps → peek', (await heightOf(page)) === 'peek', await heightOf(page));
    await context.close();
  }

  // 5. Framing: the masthead and the bottom of the keel lie between the top area and the chip
  // row (the whole boat is in view), at peek and at half.
  {
    const { context, page } = await openPage(phone, 'm26 framing', `${BOAT}&debug=1`);
    for (const height of ['peek', 'half']) {
      await setSheet(page, height);
      await page.waitForTimeout(800);
      const points = await page.evaluate(() => ({
        masthead: window.__sailDebug.project(0, 22, 0),
        keel: window.__sailDebug.project(0, -2.4, 0),
        top: document.querySelector('[data-testid="view-top"]').getBoundingClientRect().bottom,
      }));
      const canvas = await page.locator('canvas.scene-canvas').boundingBox();
      const bottom = await viewBottom(page);
      const inside = (point) => canvas.y + point.y > points.top && canvas.y + point.y < bottom;
      check(
        `the whole boat is framed at ${height}`,
        inside(points.masthead) && inside(points.keel),
        `masthead y ${Math.round(canvas.y + points.masthead.y)}, keel y ${Math.round(canvas.y + points.keel.y)}, free ${Math.round(points.top)}–${Math.round(bottom)}`,
      );
      if (height === 'half') await shot(page, 'live-phone-m26-framing-half');
    }
    await context.close();
  }

  // 6. The info card sits above the chip row and the sheet.
  {
    const { context, page } = await openPage(phone, 'm26 card', '?sel=part_boom&wd=60&ws=12');
    await page.waitForTimeout(500);
    const card = page.getByTestId('info-card');
    let box = await card.boundingBox();
    const chips = await viewBottom(page);
    const sheet = await sheetBox(page);
    check(
      'the boom card shows above the chip row and the sheet',
      !(await card.isHidden()) &&
        box !== null &&
        box.y + box.height <= chips + 1 &&
        box.y + box.height <= sheet.y + 1,
      `card bottom ${box && box.y + box.height}, chips ${chips}, sheet ${sheet.y}`,
    );
    await context.close();
    const second = await openPage(phone, 'm26 card peek', '?sel=rope_mainsheet&wd=60&ws=12');
    await setSheet(second.page, 'peek');
    await second.page.waitForTimeout(300);
    box = await second.page.getByTestId('info-card').boundingBox();
    check(
      'at peek the mainsheet card shows (the strip is hidden)',
      !(await second.page.getByTestId('info-card').isHidden()) && box !== null,
      JSON.stringify(box),
    );
    await shot(second.page, 'live-phone-m26-card-peek');
    await second.context.close();
    // At full the card would cover the instruments: it waits, and is back when the sheet comes down.
    const third = await openPage(phone, 'm26 card full', '?sel=part_boom&wd=60&ws=12');
    await setSheet(third.page, 'full');
    check(
      'at full the card is hidden',
      await third.page.getByTestId('info-card').isHidden(),
      'the card is still shown',
    );
    await setSheet(third.page, 'peek');
    check(
      'and it is back below full',
      !(await third.page.getByTestId('info-card').isHidden()),
      'the card is still hidden',
    );
    await third.context.close();
  }

  // 7. The map ends at the sheet's top; its zoom buttons are above it.
  {
    const { context, page } = await openPage(phone, 'm26 map', '?wd=60&ws=12');
    await setCamera(page, 'map');
    await page.waitForTimeout(600);
    const sheet = await sheetBox(page);
    const map = await page.getByTestId('map-canvas').boundingBox();
    const out = await page.getByTestId('map-zoom-out').boundingBox();
    check(
      'the map ends at the sheet',
      near(map.y + map.height, sheet.y),
      `map bottom ${map.y + map.height}, sheet top ${sheet.y}`,
    );
    check(
      'the zoom buttons are above the sheet',
      out.y + out.height <= sheet.y + 1,
      `zoom out bottom ${out.y + out.height}, sheet top ${sheet.y}`,
    );
    await shot(page, 'live-phone-m26-map-half');
    await context.close();
  }

  // 8. Side layout: no handle, panel on the right, no inset.
  for (const viewport of [desktop, landscape]) {
    const { context, page } = await openPage(viewport, 'm26 side', '?wd=60&ws=12');
    const handle = await page.getByTestId('sheet-handle').isHidden();
    const sheet = await sheetBox(page);
    const view = await page.locator('.view').boundingBox();
    const inset = await page
      .locator('.shell')
      .evaluate((shell) => shell.style.getPropertyValue('--view-bottom-inset'));
    check(
      `side layout ${viewport.name}`,
      handle && sheet.x >= view.x + view.width - 1 && inset === '0px',
      `handle hidden ${handle}, sheet x ${sheet.x}, view right ${view.x + view.width}, inset ${inset}`,
    );
    await context.close();
  }

  // 9. Rotation: full, sideways, back → full.
  {
    const { context, page } = await openPage(phone, 'm26 rotate', '?wd=60&ws=12');
    await setSheet(page, 'full');
    const layoutIs = (layout) =>
      page.waitForFunction((wanted) => document.documentElement.dataset.layout === wanted, layout);
    await page.setViewportSize({ width: 844, height: 390 });
    await layoutIs('side');
    const side = await page.evaluate(() => document.documentElement.dataset.layout);
    await page.setViewportSize({ width: 390, height: 844 });
    await layoutIs('stacked');
    await page.waitForTimeout(400);
    const box = await sheetBox(page);
    check(
      'rotating away and back keeps full',
      side === 'side' && (await heightOf(page)) === 'full' && near(box.height, 668),
      `${side}, ${await heightOf(page)}, ${box.height}`,
    );
    await context.close();
  }

  // 10. Accessibility audit at each height.
  {
    const { context, page } = await openPage(phone, 'm26 audit', '?wd=60&ws=12');
    for (const height of ['peek', 'half', 'full']) {
      await setSheet(page, height);
      problems.push(...(await auditPage(page, `m26 sheet ${height}`)));
    }
    await context.close();
  }

  // 11. Frame times (reported only; the owner checks the phone).
  {
    const { context, page } = await openPage(
      phone,
      'm26 frames',
      '?debug=1&wd=60&ws=20&wm=gusty&detail=low',
    );
    for (const height of ['peek', 'half']) {
      await setSheet(page, height);
      await page.waitForTimeout(3000);
      const overlay = (await page.getByTestId('debug-overlay').innerText()).replace(/\s+/g, ' ');
      console.log(`live M26 frame figures at ${height} (reported only): ${overlay.slice(0, 160)}`);
    }
    await context.close();
  }

  // 12. Reduced motion: the change is immediate.
  {
    const { context, page } = await openPage(phone, 'm26 reduced', '?wd=60&ws=12');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByTestId('sheet-handle').click();
    await page.waitForTimeout(50);
    const moving = await page.getByTestId('sheet').getAttribute('data-sheet-moving');
    const box = await sheetBox(page);
    check(
      'reduced motion: no animation',
      (await heightOf(page)) === 'full' && moving === 'false' && near(box.height, 668),
      `${await heightOf(page)}, moving ${moving}, ${box.height}`,
    );
    await context.close();
  }
}
