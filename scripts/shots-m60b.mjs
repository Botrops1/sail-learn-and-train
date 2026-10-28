// M60b (deck and coachroof shape, PHASE9_SPEC 6b.6): live checks for scripts/shots.mjs. No scenes:
// the close-ups are taken inside the live checks (as M50 and M60 do). Labels contain "m60b", so
// openPage starts with every section folded. Every link adds debug=1&held=1&sea=flat.
import path from 'node:path';
import { setSheet } from './ui.mjs';

export const M60B_SCENES = [];

const BASE = 'debug=1&held=1&sea=flat';

/** Close-ups (6b.6), boat frame: x forward, y up, z starboard. */
const CLOSE_UPS = [
  { name: 'roof-front', target: [1.9, 1.7, 0.6], position: [3.6, 3.2, 1.8] },
  { name: 'roof-front-top', target: [1.9, 1.6, 0], position: [1.95, 5.5, 0.01] },
  { name: 'roof-to-coaming', target: [-3.4, 1.7, 1.7], position: [-1.2, 3.0, 3.6] },
  { name: 'roof-plan', target: [-1.5, 1.6, 0], position: [-1.5, 9.0, 0.01] },
  { name: 'foredeck', target: [4.2, 1.65, 0], position: [2.2, 3.4, 1.6] },
];

export async function liveM60bChecks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M60b ${what}: ${detail}`);
    console.log(`live M60b ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const desktop = viewports[2];
  const shot = (page, name) =>
    page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`), timeout: 120000 });

  for (const detail of ['high', 'low']) {
    for (const viewport of [phone, desktop]) {
      const { context, page } = await openPage(
        viewport,
        `m60b close-ups ${detail}`,
        `?cam=side-port&detail=${detail}&${BASE}`,
      );
      await page.waitForTimeout(800);
      await setSheet(page, 'peek');
      await page.addStyleTag({ content: '.debug { display: none !important; }' });
      for (const view of CLOSE_UPS) {
        await page.evaluate((v) => window.__sailDebug.setView(v.position, v.target, 40), view);
        await page.waitForTimeout(800);
        await shot(page, `live-${viewport.name}-m60b-${view.name}-${detail}`);
      }
      await context.close();
    }
  }

  // The front of the coachroof: a tap on each side of the junction finds the deck or the roof,
  // never nothing and never the sea (that would be the old slot).
  {
    const { context, page } = await openPage(phone, 'm60b front tap', `?${BASE}`);
    await page.waitForTimeout(800);
    await setSheet(page, 'peek');
    const box = await page.locator('canvas.scene-canvas').boundingBox();
    await page.addStyleTag({ content: '.debug { display: none !important; }' });
    for (const z of [0.9, -0.9]) {
      // A close view along the junction, so no sail or rail lies between the camera and the tap.
      await page.evaluate(
        (zz) => window.__sailDebug.setView([2.7, 2.4, zz], [1.93, 1.61, zz], 40),
        z,
      );
      await page.waitForTimeout(800);
      const point = await page.evaluate((zz) => window.__sailDebug.project(1.93, 1.61, zz), z);
      await page.mouse.click(box.x + point.x, box.y + point.y);
      await page.waitForTimeout(400);
      const id = await page.evaluate(() =>
        document.querySelector('[data-testid="info-card"]')?.getAttribute('data-part-id'),
      );
      check(
        `tap at z ${z} finds the deck or the roof`,
        id === 'part_deck' || id === 'part_coachroof',
        String(id),
      );
    }
    await context.close();
  }
}
