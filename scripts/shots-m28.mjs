// M28 (mini-map): scenes and live checks for scripts/shots.mjs (PHASE5_SPEC 9.7).
// Labels contain "m28", so openPage adds no `mm=0`: the app opens as it does without a link
// (Sailing, Coastal waves, the clock chip shown, the mini-map on).
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import {
  closeSettings,
  openSettings,
  setCamera,
  setSheet,
  showSection,
  viewBottom,
  waitForLink,
} from './ui.mjs';

const BOAT = '?wd=60&ws=12';
/** The water colour of the map (COLOURS.water in mapView.ts), as RGB. */
const WATER = [217, 235, 246];

export const M28_SCENES = [
  // At ×16 three seconds are 48 s of sailing, so the track is longer than the drawn boat.
  { name: 'mini-map', query: `${BOAT}&tx=16`, waitMs: 3000 },
  { name: 'mini-map-off', query: `${BOAT}&mm=0` },
];

export async function liveM28Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M28 ${what}: ${detail}`);
    console.log(`live M28 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone, , desktop] = viewports;
  const visible = (page, id) => page.getByTestId(id).isVisible();
  const focused = (page) =>
    page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? '');
  const close = async (page) => {
    await page.getByTestId('map-close').click();
  };

  // 1. Where it sits: 96 px, 8 px above the chip row, above the sheet; hidden at full height.
  {
    const { context, page } = await openPage(phone, 'm28 place', BOAT);
    await page.waitForTimeout(500);
    const map = page.getByTestId('mini-map');
    check('mini-map shown while sailing', await map.isVisible(), 'visible');
    const box = await map.boundingBox();
    check(
      'size 96 x 96',
      Math.abs(box.width - 96) <= 1 && Math.abs(box.height - 96) <= 1,
      `${box.width} x ${box.height}`,
    );
    const rowTop = await viewBottom(page);
    const gap = rowTop - (box.y + box.height);
    check('8 px above the chip row', Math.abs(gap - 8) <= 1, `${gap} px`);
    const sheet = await page.getByTestId('sheet').boundingBox();
    check(
      'above the sheet',
      box.y + box.height <= sheet.y,
      `bottom ${box.y + box.height}, sheet ${sheet.y}`,
    );
    await setSheet(page, 'full');
    check('hidden at full', !(await map.isVisible()), 'hidden');
    await setSheet(page, 'half');
    check('back at half', await map.isVisible(), 'visible');
    await context.close();
  }

  // 2. Held still hides it; Sailing brings it back.
  {
    const { context, page } = await openPage(phone, 'm28 held', `${BOAT}&held=1`);
    await page.waitForTimeout(500);
    check('hidden in Held still', !(await visible(page, 'mini-map')), 'hidden');
    await showSection(page, 'conditions');
    await page.getByTestId('boat-mode').getByText('Sailing', { exact: true }).click();
    await setSheet(page, 'half');
    await page.waitForTimeout(300);
    check('shown after Sailing', await visible(page, 'mini-map'), 'visible');
    await context.close();
  }

  // 3. A tap opens the full map, Close returns to the view it came from.
  {
    const { context, page } = await openPage(phone, 'm28 open', BOAT);
    await page.waitForTimeout(500);
    await page.getByTestId('mini-map').click();
    await waitForLink(page, ['cam=map']);
    check('full map shown', await visible(page, 'map-canvas'), 'map-canvas');
    check('mini-map hidden on the map', !(await visible(page, 'mini-map')), 'hidden');
    check('focus on Close', (await focused(page)) === 'map-close', await focused(page));
    await close(page);
    await waitForLink(page, ['cam=side-port']);
    check('mini-map back after Close', await visible(page, 'mini-map'), 'visible');
    await setCamera(page, 'top');
    await page.getByTestId('mini-map').click();
    await waitForLink(page, ['cam=map']);
    await close(page);
    await waitForLink(page, ['cam=top']);
    check('Close returns to Top', await visible(page, 'mini-map'), 'cam=top');
    await context.close();
  }

  // 4. A link that opens on the map: Close goes to Port.
  {
    const { context, page } = await openPage(phone, 'm28 link map', `?cam=map&wd=60&ws=12`);
    await page.waitForTimeout(500);
    await close(page);
    await waitForLink(page, ['cam=side-port']);
    await context.close();
  }

  // 5. The switch in Settings.
  {
    const { context, page } = await openPage(phone, 'm28 switch', BOAT);
    await page.waitForTimeout(500);
    await openSettings(page);
    await page.getByTestId('mini-map-switch').uncheck();
    await waitForLink(page, ['mm=0']);
    await closeSettings(page);
    check('hidden by the switch', !(await visible(page, 'mini-map')), 'hidden');
    await openSettings(page);
    await page.getByTestId('mini-map-switch').check();
    await waitForLink(page, [], ['mm=']);
    await closeSettings(page);
    check('shown again', await visible(page, 'mini-map'), 'visible');
    await context.close();
  }

  // 6. Not blank: the boat is drawn in the middle; the track grows. A picture of the mini-map.
  {
    const { context, page } = await openPage(phone, 'm28 drawn', `${BOAT}&debug=1&tx=16`);
    const centre = () =>
      page.evaluate(() => {
        const canvas = document.querySelector('[data-testid="mini-map-canvas"]');
        const ctx = canvas.getContext('2d');
        const [r, g, b, a] = ctx.getImageData(
          Math.floor(canvas.width / 2),
          Math.floor(canvas.height / 2),
          1,
          1,
        ).data;
        return { r, g, b, a };
      });
    let pixel = await centre();
    const isBoat = (p) => p.a === 255 && (p.r !== WATER[0] || p.g !== WATER[1] || p.b !== WATER[2]);
    for (let i = 0; i < 20 && !isBoat(pixel); i += 1) {
      await page.waitForTimeout(100);
      pixel = await centre();
    }
    check('boat drawn in the middle', isBoat(pixel), JSON.stringify(pixel));
    await page.waitForFunction(() => window.__sailMap.trackPoints() >= 20, undefined, {
      timeout: 60_000,
    });
    await page
      .getByTestId('mini-map')
      .screenshot({ path: path.join(outDir, `${prefix}live-m28-mini-map.png`) });
    await context.close();
  }

  // 7. Show me keeps the setting.
  {
    const { context, page } = await openPage(phone, 'm28 show me', '?mm=0&m=learn&learn=rope_vang');
    await page.waitForTimeout(500);
    await page.getByTestId('learn-show-me').click();
    await page.waitForTimeout(500);
    const link = await waitForLink(page, ['mm=0']);
    check('Show me keeps mm=0', link.includes('mm=0'), link);
    await context.close();
  }

  // 8. Accessibility with the mini-map shown, on a phone and on a desktop (160 px).
  {
    let opened = await openPage(phone, 'm28 a11y phone', BOAT);
    await opened.page.waitForTimeout(500);
    problems.push(...(await auditPage(opened.page, 'm28 mini-map, phone')));
    await opened.context.close();

    opened = await openPage(desktop, 'm28 a11y desktop', BOAT);
    await opened.page.waitForTimeout(500);
    const box = await opened.page.getByTestId('mini-map').boundingBox();
    check(
      'desktop size 160 x 160',
      Math.abs(box.width - 160) <= 1 && Math.abs(box.height - 160) <= 1,
      `${box.width} x ${box.height}`,
    );
    problems.push(...(await auditPage(opened.page, 'm28 mini-map, desktop')));
    await opened.page.screenshot({ path: path.join(outDir, `${prefix}live-m28-desktop.png`) });
    await opened.context.close();
  }

  // 10. Beside the panel the warnings (Gybe!, Round-up, …) sit above the mini-map, never under it
  // (independent review of PR 68, finding 1): the alert stack's bottom edge is above its top.
  for (const size of [
    { name: 'foldable-820x1000', width: 820, height: 1000, layout: 'side' },
    { name: 'tablet-1024x768', width: 1024, height: 768, layout: 'side' },
  ]) {
    const { context, page } = await openPage(size, `m28 alerts ${size.name}`, BOAT);
    await page.waitForTimeout(500);
    const box = await page.getByTestId('mini-map').boundingBox();
    const alerts = await page.evaluate(() => {
      const rect = document.querySelector('.rig-alerts').getBoundingClientRect();
      return { bottom: rect.bottom };
    });
    check(
      `${size.name}: warnings above the mini-map`,
      box !== null && alerts.bottom <= box.y,
      `alerts end at ${alerts.bottom}, mini-map starts at ${box?.y}`,
    );
    await context.close();
  }

  // 9. Four chips fit a 360 px phone in Russian with the map open.
  {
    const small = { name: 'phone-360x740', width: 360, height: 740, layout: 'stacked' };
    const { context, page } = await openPage(
      small,
      'm28 russian chips',
      '?lang=ru&cam=map&wd=60&ws=12',
    );
    await page.waitForTimeout(500);
    const boxes = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="view-bottom"] > :not([hidden])')].map((node) => {
        const r = node.getBoundingClientRect();
        return { id: node.getAttribute('data-testid'), left: r.left, right: r.right };
      }),
    );
    const inside = boxes.every((b) => b.left >= 0 && b.right <= 360);
    const apart = boxes.every((b, i) => i === 0 || b.left >= boxes[i - 1].right - 0.5);
    check('chips inside 360 px', inside && apart, JSON.stringify(boxes));
    await page.screenshot({ path: path.join(outDir, `${prefix}live-m28-russian-chips.png`) });
    await context.close();
  }
}
