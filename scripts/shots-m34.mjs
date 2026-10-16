// M34 (rope ends and Phase 6 sign-off): live checks for scripts/shots.mjs (PHASE6_SPEC 10.6).
// Labels contain "m34", which matches none of openPage's label tests, so every page opens Held
// still on flat water with the clock chip and the mini-map hidden.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { setSheet, showSection } from './ui.mjs';

export const M34_SCENES = [];

const boat = JSON.parse(readFileSync('content/boat/hanse508.json', 'utf8'));
const bin = boat.cockpitHardware.ropeBins.boxes.find((b) => b.side === 'starboard');
const add = (p, d) => p.map((v, i) => v + d[i]);

/**
 * The close-ups, each taken at High and Low detail (PHASE6_SPEC 10.6, changed on PR #81): the
 * starboard rope box and the gap in front of it, from above and outboard of the winch, with the
 * lines not in use (Easy), a rope held in the hand (no turns), and ropes on the winch.
 */
const BOX_VIEW = {
  position: add([bin.x, 0, bin.z], [1.2, 2.1, 1.1]),
  target: [bin.x + 0.25, 1.5, bin.z],
  fov: 38,
};
const CLOSE_UPS = [
  { name: 'box-idle', link: '?wd=90&ws=12&lb=0&debug=1', ...BOX_VIEW },
  {
    name: 'box-in-hand',
    link: '?mode=realistic&wd=90&ws=12&wsb=a5.0.h&lb=0&debug=1',
    ...BOX_VIEW,
  },
  {
    name: 'box-on-winch',
    link: '?mode=realistic&wd=90&ws=12&wp=b5.3.t&wsb=a5.2.h&lb=0&debug=1',
    ...BOX_VIEW,
  },
  {
    // The backstay's block and its two ends in a V down to the aft faces of the rope boxes.
    name: 'backstay-v',
    link: '?wd=90&ws=12&lb=0&debug=1',
    position: [-15, 6.5, 3.5],
    target: [-7, 4.2, 0],
    fov: 50,
  },
  {
    // The open stern from behind: the cockpit floor ends at the transom, nothing stands above it.
    name: 'stern-open',
    link: '?wd=90&ws=12&lb=0&debug=1',
    position: [-14, 3.5, 0],
    target: [-8.3, 1.6, 0],
    fov: 40,
  },
  {
    // The whole stern from behind and above: the floor is flat to the transom.
    name: 'stern-floor',
    link: '?wd=90&ws=12&lb=0&debug=1',
    position: [-11.5, 4.2, 0],
    target: [-7.8, 1.2, 0],
    fov: 55,
  },
];

export async function liveM34Checks({ openPage, viewports, outDir, prefix, problems }) {
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const [phone] = viewports;

  for (const closeUp of CLOSE_UPS) {
    for (const detail of ['high', 'low']) {
      const { context, page } = await openPage(
        phone,
        `m34 ${closeUp.name} ${detail}`,
        `${closeUp.link}&detail=${detail}`,
      );
      await page.waitForTimeout(1000);
      await setSheet(page, 'peek');
      await page.addStyleTag({ content: '.debug { display: none !important; }' });
      await page.evaluate((v) => window.__sailDebug.setView(v.position, v.target, v.fov), closeUp);
      await page.waitForTimeout(1500);
      await shot(page, `live-${closeUp.name}-${detail}`);
      await context.close();
    }
  }

  // The Harbour gear block passes the accessibility audit.
  {
    const { context, page } = await openPage(phone, 'm34 harbour', '?wd=60&ws=12');
    await showSection(page, 'harbour');
    problems.push(...(await auditPage(page, 'm34 harbour')));
    await context.close();
  }
}
