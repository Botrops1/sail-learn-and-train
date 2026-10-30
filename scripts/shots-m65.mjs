// M65 (small fittings, PHASE9_SPEC 11.7): live checks for scripts/shots.mjs. No scenes: the
// close-ups are taken inside the live checks with __sailDebug.setView, as M50 does. Every link adds
// debug=1&held=1&sea=flat so tap points do not drift.
import path from 'node:path';
import { waitForLink } from './ui.mjs';

export const M65_SCENES = [];

const BASE = 'debug=1&held=1&sea=flat';

/** Close-ups (boat coordinates: x forward, y up, z to starboard), High only. */
const CLOSE_UPS = [
  { name: 'stanchion-base', position: [-0.8, 2.2, 3.1], target: [-1.4, 1.6, 2.17], fov: 40 },
  { name: 'chainplate', position: [-0.2, 2.3, 3.2], target: [-0.865, 1.7, 2.18], fov: 40 },
  { name: 'hatches-top', position: [0.5, 8.0, 0.5], target: [0.5, 1.96, 0], fov: 50 },
  { name: 'foredeck-hatch', position: [2.2, 2.8, 1.4], target: [3.6, 1.66, 0], fov: 45 },
  { name: 'portlights-side', position: [0.4, 1.8, 7.0], target: [0.4, 1.3, 2.0], fov: 45 },
  { name: 'cockpit-shadows', position: [-9.5, 3.2, 1.0], target: [-7.0, 1.5, 0], fov: 50 },
];

export async function liveM65Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M65 ${what}: ${detail}`);
    console.log(`live M65 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const desktop = viewports[2];
  const centres = (page, partId) =>
    page.evaluate((id) => window.__sailDebug.hitCentres().filter((c) => c.partId === id), partId);
  const open = async (viewport, what, query) => {
    const opened = await openPage(viewport, `m65 ${what}`, `?${query}&${BASE}`);
    await opened.page.waitForTimeout(800);
    return opened;
  };

  // Close-ups at both detail levels (phone and desktop).
  for (const viewport of [phone, desktop]) {
    for (const detail of ['high', 'low']) {
      for (const view of CLOSE_UPS) {
        const { context, page } = await open(viewport, view.name, `detail=${detail}`);
        await page.addStyleTag({ content: '.debug { display: none !important; }' });
        await page.evaluate((v) => window.__sailDebug.setView(v.position, v.target, v.fov), view);
        await page.waitForTimeout(1500);
        await page.screenshot({
          path: path.join(outDir, `${prefix}${view.name}-${detail}-${viewport.name}.png`),
        });
        await context.close();
      }
    }
  }

  for (const viewport of [phone, desktop]) {
    const v = viewport.name;
    const tapAt = async (page, c) => {
      const box = await page.locator('canvas.scene-canvas').boundingBox();
      await page.mouse.click(box.x + c.x, box.y + c.y);
    };

    // A tap on a hatch from above, and on a hull window from the side.
    for (const [partId, cam] of [
      ['fit_deck_hatch', 'top'],
      ['fit_portlight', 'side-port'],
    ]) {
      const { context, page } = await open(
        viewport,
        `tap ${partId}`,
        `detail=high&cam=${cam}${cam === 'top' ? '&mf=0&jf=0' : ''}`,
      );
      await page.addStyleTag({ content: '.debug { display: none !important; }' });
      const found = await centres(page, partId);
      check(`${v} ${partId} at High: has hit areas`, found.length > 0, `${found.length}`);
      // Some hit areas are hidden (the far side's windows; from above the sails are furled so they
      // do not cover the hatches): the first one that selects the part is enough.
      let link = '';
      for (const c of found) {
        await tapAt(page, c);
        await page.waitForTimeout(500);
        link = await page.evaluate(() => location.search);
        if (link.includes(`sel=${partId}`)) break;
      }
      check(`${v} ${partId}: a tap selects it`, link.includes(`sel=${partId}`), link);
      await context.close();
    }

    // At Low neither is drawn.
    {
      const { context, page } = await open(viewport, 'low none', 'detail=low&cam=top');
      for (const partId of ['fit_deck_hatch', 'fit_portlight']) {
        const found = await centres(page, partId);
        check(`${v} ${partId} at Low: not drawn`, found.length === 0, `${found.length}`);
      }
      await context.close();
    }
  }
}
