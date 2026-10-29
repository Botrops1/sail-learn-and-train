// M61 (blocks and rounded hardware, PHASE9_SPEC 7.6): live checks for scripts/shots.mjs. No
// scenes: the close-ups are taken inside the live checks (as M50 and M60 do). Labels contain
// "m61", so openPage starts with every section folded. Every link adds debug=1&held=1&sea=flat.
import path from 'node:path';
import { closeUpOn, setSheet, waitForLink } from './ui.mjs';

export const M61_SCENES = [];

const BASE = 'debug=1&held=1&sea=flat';

/** Close-ups aimed at a part (7.6), boat frame: x forward, y up, z starboard. */
const PART_VIEWS = [
  { name: 'boom-blocks', part: 'fit_mainsheet_boom_blocks', from: [-0.3, -0.6, -1], distance: 1.8 },
  { name: 'clutches-port', part: 'clutch_bank_b', from: [0.6, 0.9, 0.8], distance: 1.0 },
];

/** Close-ups at fixed places (7.6); positions from the boat file's numbers. */
const FIXED_VIEWS = [
  {
    name: 'deck-block-port',
    target: [-3.08, 1.98, -0.42],
    direction: [1, 0.8, -0.5],
    distance: 0.7,
  },
  {
    name: 'turning-blocks',
    target: [0, 1.85, 0],
    direction: [-0.6, 0.8, -0.7],
    distance: 1.1,
  },
  {
    name: 'backstay-block',
    target: [-5.52, 8.25, 0],
    direction: [-0.5, 0, -1],
    distance: 1.2,
  },
  {
    name: 'coaming-and-box-port',
    position: [-6.6, 2.3, -0.4],
    target: [-7.6, 1.5, -1.55],
  },
];

const TAPPED = [
  'fit_mainsheet_boom_blocks',
  'fit_mainsheet_deck_blocks',
  'fit_mast_base_turning_blocks',
];

export async function liveM61Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M61 ${what}: ${detail}`);
    console.log(`live M61 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const desktop = viewports[2];
  const shot = (page, name) =>
    page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`), timeout: 120000 });
  const open = async (viewport, what, query) => {
    const opened = await openPage(viewport, `m61 ${what}`, `?${query}&${BASE}`);
    await opened.page.waitForTimeout(800);
    return opened;
  };

  for (const detail of ['high', 'low']) {
    for (const viewport of [phone, desktop]) {
      for (const view of PART_VIEWS) {
        const { context, page } = await open(
          viewport,
          `${view.name} ${detail}`,
          `cam=side-port&detail=${detail}`,
        );
        const aimed = await closeUpOn(page, view.part, view.from, view.distance);
        check(`${view.name} ${detail} ${viewport.name}: ${view.part} is drawn`, aimed, `${aimed}`);
        await shot(page, `live-${viewport.name}-m61-${view.name}-${detail}`);
        await context.close();
      }
      const { context, page } = await open(
        viewport,
        `fixed ${detail}`,
        `cam=side-port&detail=${detail}`,
      );
      await setSheet(page, 'peek');
      await page.addStyleTag({ content: '.debug { display: none !important; }' });
      for (const view of FIXED_VIEWS) {
        await page.evaluate((v) => {
          let position = v.position;
          if (!position) {
            const length = Math.hypot(...v.direction);
            position = v.target.map((value, i) => value + (v.direction[i] / length) * v.distance);
          }
          window.__sailDebug.setView(position, v.target, 40);
        }, view);
        await page.waitForTimeout(800);
        await shot(page, `live-${viewport.name}-m61-${view.name}-${detail}`);
      }
      await context.close();
    }
  }

  // The three small block parts stay tappable (at both details): a part has several hit areas
  // (one per block), and from the side some blocks face away with a rope in front, so at least
  // one of its hit areas must select it.
  for (const detail of ['high', 'low']) {
    for (const id of TAPPED) {
      const { context, page } = await open(
        phone,
        `tap ${detail}`,
        `cam=side-port&detail=${detail}`,
      );
      await setSheet(page, 'peek');
      await page.addStyleTag({ content: '.debug { display: none !important; }' });
      const centres = await page.evaluate(
        (partId) => window.__sailDebug.hitCentres().filter((c) => c.partId === partId),
        id,
      );
      const box = await page.locator('canvas.scene-canvas').boundingBox();
      let found = false;
      for (const centre of centres) {
        await page.mouse.click(box.x + centre.x, box.y + centre.y);
        const linked = await waitForLink(page, [`sel=${id}`]).catch(() => '');
        if (linked) {
          found = true;
          break;
        }
      }
      check(`tap ${id} ${detail}`, found, `${centres.length} hit areas`);
      await context.close();
    }
  }
}
