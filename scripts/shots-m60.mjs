// M60 (smooth, whipped ropes, PHASE9_SPEC 6.9): live checks for scripts/shots.mjs. No scenes: the
// close-ups are taken inside the live checks (as M50 does). Labels contain "m60", so openPage
// starts with every section folded. Every link adds debug=1&held=1&sea=flat so tap points do not
// drift.
import path from 'node:path';
import { closeUpOn, setSheet, waitForLink } from './ui.mjs';

export const M60_SCENES = [];

const BASE = 'debug=1&held=1&sea=flat';

/** Close-ups aimed at a part (6.9); the directions are first guesses (boat frame). */
const CLOSE_UPS = [
  {
    name: 'mast-foot',
    q: 'cam=side-port',
    part: 'fit_mast_base_turning_blocks',
    from: [-1, 0.8, -0.6],
    distance: 1.4,
  },
  {
    name: 'clutches-starboard',
    q: 'cam=side-starboard',
    part: 'clutch_bank_a',
    from: [0.6, 0.9, -0.8],
    distance: 1.2,
  },
  {
    name: 'winch-wrap',
    q: 'mode=realistic&wp=b5.3.t&cam=side-port',
    part: 'winch_primary_port',
    from: [0.4, 0.9, 0.6],
    distance: 0.9,
  },
  {
    name: 'boom-blocks',
    q: 'cam=side-port',
    part: 'fit_mainsheet_boom_blocks',
    from: [-0.3, -0.6, -1],
    distance: 1.6,
  },
];

/** The gap between the port rope box and the coaming: aimed by hand (fit_rope_bin covers both boxes). */
const BOX_GAP = { target: [-7.45, 1.45, -1.55], direction: [0.7, 0.9, 0.5], distance: 1.5 };

export async function liveM60Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M60 ${what}: ${detail}`);
    console.log(`live M60 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const desktop = viewports[2];
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const open = async (viewport, what, query) => {
    const opened = await openPage(viewport, `m60 ${what}`, `?${query}&${BASE}`);
    await opened.page.waitForTimeout(800);
    return opened;
  };
  const stats = (page) => page.evaluate(() => window.__sailDebug.ropeStats());

  // Close-ups (3.6: both details, phone and desktop).
  for (const detail of ['high', 'low']) {
    for (const viewport of [phone, desktop]) {
      for (const view of CLOSE_UPS) {
        const { context, page } = await open(
          viewport,
          `${view.name} ${detail}`,
          `${view.q}&detail=${detail}`,
        );
        const aimed = await closeUpOn(page, view.part, view.from, view.distance);
        check(`${view.name} ${detail} ${viewport.name}: ${view.part} is drawn`, aimed, `${aimed}`);
        await shot(page, `live-${viewport.name}-m60-${view.name}-${detail}`);
        await context.close();
      }
      const { context, page } = await open(
        viewport,
        `box-gap ${detail}`,
        `cam=side-port&detail=${detail}`,
      );
      await setSheet(page, 'peek');
      await page.addStyleTag({ content: '.debug { display: none !important; }' });
      await page.evaluate((v) => {
        const length = Math.hypot(...v.direction);
        const position = v.target.map((value, i) => value + (v.direction[i] / length) * v.distance);
        window.__sailDebug.setView(position, v.target, 40);
      }, BOX_GAP);
      await page.waitForTimeout(800);
      await shot(page, `live-${viewport.name}-m60-box-gap-port-${detail}`);
      await context.close();
    }
  }

  for (const viewport of [phone, desktop]) {
    const v = viewport.name;

    // 1-2. The drawn ropes at both details.
    {
      const { context, page } = await open(viewport, 'high', 'cam=side-port&detail=high');
      const got = await stats(page);
      const want = {
        strands: 22,
        points: 958,
        whipped: 11,
        radialSegments: 12,
        finite: true,
        braid: true,
      };
      check(
        `${v} High: rope stats`,
        Object.entries(want).every(([key, value]) => got[key] === value),
        JSON.stringify(got),
      );

      // 4. Taps still work on the smoothed ropes.
      await setSheet(page, 'peek');
      await page.addStyleTag({ content: '.debug { display: none !important; }' });
      const at = await page.evaluate(() => window.__sailDebug.partPoint('rope_vang', 0.25));
      const box = await page.locator('canvas.scene-canvas').boundingBox();
      await page.mouse.click(box.x + at.x, box.y + at.y);
      const link = await waitForLink(page, ['sel=rope_vang']);
      check(`${v} tap on the vang selects it`, true, link);
      await context.close();
    }
    {
      const { context, page } = await open(viewport, 'low', 'cam=side-port&detail=low');
      const got = await stats(page);
      const ok =
        got.radialSegments === 6 &&
        got.points === 958 &&
        got.braid === false &&
        got.finite === true;
      check(`${v} Low: rope stats`, ok, JSON.stringify(got));
      await context.close();
    }

    // 3. Realistic with a rope on the winch: more points, 11 whipped tails.
    {
      const { context, page } = await open(
        viewport,
        'realistic',
        'mode=realistic&wp=b5.3.t&cam=side-port',
      );
      const got = await stats(page);
      check(
        `${v} Realistic winch wrap: more points, 11 whipped`,
        got.points > 958 && got.whipped === 11 && got.finite === true,
        JSON.stringify(got),
      );
      await context.close();
    }
  }
}
