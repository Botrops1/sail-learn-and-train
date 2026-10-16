// M34 (rope ends and Phase 6 sign-off): live checks for scripts/shots.mjs (PHASE6_SPEC 10.6).
// Labels contain "m34", which matches none of openPage's label tests, so every page opens Held
// still on flat water with the clock chip and the mini-map hidden.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { setSheet, showSection } from './ui.mjs';

export const M34_SCENES = [];

const boat = JSON.parse(readFileSync('content/boat/hanse508.json', 'utf8'));
const winch = boat.cockpitHardware.winches.find((w) => w.id === 'winch_primary_starboard');
const bin = boat.cockpitHardware.ropeBins.boxes.find((b) => b.side === 'starboard');
const rope = boat.modelDetail.winchRope;
const add = (p, d) => p.map((v, i) => v + d[i]);

/** The three close-ups, each taken at High and Low detail (PHASE6_SPEC 10.6). */
const WRAPS_LINK = '?mode=realistic&wd=90&ws=12&cam=helm&wp=b5.3.t&wsb=a5.2.h&lb=0&debug=1';
const wrapsTarget = [winch.x, winch.y + rope.wrapTopAboveBase, winch.z];
const handTarget = [
  winch.x - rope.handAftM,
  boat.deck.cockpit.coamingTopY + rope.handAboveCoamingM,
  winch.z - rope.handInboardM,
];
const CLOSE_UPS = [
  {
    name: 'tail-box',
    link: '?wd=90&ws=12&lb=0&debug=1',
    position: [-6.6, 2.4, 2.4],
    target: [bin.x, 1.55, bin.z],
    fov: 40,
  },
  {
    name: 'winch-wraps',
    link: WRAPS_LINK,
    position: add(wrapsTarget, [0.7, 0.5, 0.9]),
    target: wrapsTarget,
    fov: 40,
  },
  {
    name: 'rope-end-hand',
    link: WRAPS_LINK,
    position: add(handTarget, [0, 0.5, 0.8]),
    target: handTarget,
    fov: 40,
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
