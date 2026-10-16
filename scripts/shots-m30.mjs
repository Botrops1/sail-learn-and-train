// M30 (hull and deck closed): live checks for scripts/shots.mjs (PHASE6_SPEC 6.6). No scenes.
// Labels contain "m30", which matches none of openPage's label tests, so every page opens Held
// still on flat water with the clock chip and the mini-map hidden (the Phase 1 picture).
import path from 'node:path';
import { setSheet } from './ui.mjs';

export const M30_SCENES = [];

/** Close-ups (boat coordinates: x forward, y up, z starboard), PHASE6_SPEC 6.6. */
const CLOSE_UPS = [
  { name: 'junction-starboard', position: [-1.5, 4.2, 2.6], target: [-3.1, 1.5, 1.3], fov: 45 },
  { name: 'junction-port', position: [-1.5, 4.2, -2.6], target: [-3.1, 1.5, -1.3], fov: 45 },
  { name: 'junction-low-angle', position: [-0.5, 2.4, 2.1], target: [-3.6, 1.6, 1.5], fov: 50 },
  { name: 'deck-edge-midship', position: [0.5, 2.6, 5.5], target: [0.0, 1.6, 2.3], fov: 45 },
  { name: 'stern-quarter', position: [-11.5, 2.8, 4.5], target: [-8.0, 1.3, 1.5], fov: 45 },
];

export async function liveM30Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M30 ${what}: ${detail}`);
    console.log(`live M30 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const [phone] = viewports;
  /** A close-up from a boat position; the debug overlay (needed for the hook) is hidden. */
  const closeUp = async (page, view) => {
    await setSheet(page, 'peek');
    await page.addStyleTag({ content: '.debug { display: none !important; }' });
    await page.evaluate((v) => window.__sailDebug.setView(v.position, v.target, v.fov), view);
    await page.waitForTimeout(1500);
  };

  // The junction of the coachroof, the channels and the cockpit, and the deck edge, at both details.
  for (const detail of ['high', 'low']) {
    const { context, page } = await openPage(
      phone,
      `m30 close-ups ${detail}`,
      `?wd=60&ws=12&lb=0&debug=1&detail=${detail}`,
    );
    await page.waitForTimeout(1000);
    for (const view of CLOSE_UPS) {
      await closeUp(page, view);
      await shot(page, `live-${view.name}-${detail}`);
    }
    await context.close();
  }

  // A tap on the fairing's outer side finds the fairing or the channel, never the deck or the cockpit
  // (that would mean the tap went through a hole).
  {
    const { context, page } = await openPage(
      phone,
      'm30 junction tap',
      '?wd=60&ws=12&lb=0&debug=1',
    );
    await page.waitForTimeout(1000);
    await closeUp(page, {
      position: [-2.0, 2.4, 3.2],
      target: [-3.3, 1.6, 1.41],
      fov: 40,
    });
    const box = await page.locator('canvas.scene-canvas').boundingBox();
    const point = await page.evaluate(() => window.__sailDebug.project(-3.3, 1.6, 1.41));
    await page.mouse.click(box.x + point.x, box.y + point.y);
    await page.waitForTimeout(400);
    const id = await page.evaluate(() =>
      document.querySelector('[data-testid="info-card"]')?.getAttribute('data-part-id'),
    );
    check(
      'tap the moulding under the channel',
      id === 'part_coachroof' || id === 'fit_line_channels',
      String(id),
    );
    await shot(page, 'live-junction-tap');
    await context.close();
  }
}
