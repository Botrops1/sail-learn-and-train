// M9 (trim quality and telltales): scenes and live checks for scripts/shots.mjs.
// The Sails block of the Ropes tab, the telltales close up, the blanketed jib and a torn sail.
// Their labels contain "m9" so the script opens them Sailing (older scenes are held still).
import path from 'node:path';
import { setSheet } from './ui.mjs';

const SAILS = '[data-section="sails"] [data-testid="sails-panel"]';

/** Screenshots at every size (the Sails block in the Ropes tab; the 3D view is the usual one). */
export const M9_SCENES = [
  {
    name: 'sails-panel-good',
    query: '?wd=60&ws=12&ms=25&js=50&cam=side-starboard',
    scrollTo: SAILS,
    waitMs: 2500,
  },
  {
    name: 'sails-panel-stalled',
    query: '?wd=60&ws=12&ms=0&js=50&cam=side-starboard',
    scrollTo: SAILS,
    waitMs: 2500,
  },
  {
    name: 'sails-panel-luffing',
    query: '?wd=60&ws=12&ms=100&js=50&cam=side-starboard',
    scrollTo: SAILS,
    waitMs: 2500,
  },
  {
    name: 'sails-panel-blanketed',
    query: '?wd=175&ws=12&ms=100&js=100&cam=side-port',
    scrollTo: SAILS,
    waitMs: 2500,
  },
];

/**
 * Close-ups of the telltale zone, from the starboard (+1) or port (-1) side: `near` the ribbons
 * at half height on the main (x about -0.6), `wide` the main's three heights and the jib's. She
 * leans to port in these scenes (wind from starboard), so the rig stands `leanDeg` off upright:
 * the view is centred on where the sail really is.
 */
function closeView(side, range, leanDeg) {
  const lean = -12.7 * Math.sin((leanDeg * Math.PI) / 180);
  const distance = range === 'near' ? 3.3 : 9;
  const x = range === 'near' ? -0.6 : 1.2;
  return {
    position: [x, 12.7, lean + side * distance],
    target: [x, 12.7, lean],
    fov: 44,
  };
}

/** The whole mainsail from the port side, to show the tear. */
const TEAR_VIEW = { position: [-4, 12, -30], target: [-2.5, 12, 0], fov: 42 };

const text = (page, id) => page.getByTestId(id).innerText();

export async function liveM9Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M9 ${what}: ${detail}`);
    console.log(`live M9 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone, foldable, desktop] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const closeUp = async (page, view) => {
    await setSheet(page, 'peek');
    await page.addStyleTag({
      content: '.debug, .label3d { display: none !important; }',
    });
    await page.evaluate((v) => window.__sailDebug.setView(v.position, v.target, v.fov), view);
    await page.waitForTimeout(900);
  };

  // The chip and hint of each sail for four trim settings (PT-23, PT-37).
  for (const [label, query, main, jib] of [
    ['good', '?wd=60&ws=12&ms=25&js=50', 'Good', null],
    ['stalled', '?wd=60&ws=12&ms=0&js=50', 'Stalled', null],
    ['luffing', '?wd=60&ws=12&ms=100&js=50', 'Luffing', null],
    ['run', '?wd=175&ws=12&ms=100&js=100', 'Pushed (running)', 'Blanketed by the main'],
  ]) {
    const { context, page } = await openPage(phone, `m9 ${label}`, query);
    await page.waitForTimeout(2500);
    const mainChip = await text(page, 'trim-chip-main');
    check(`${label}: main chip`, mainChip === main, mainChip);
    if (jib) {
      const jibChip = await text(page, 'trim-chip-jib');
      check(`${label}: jib chip`, jibChip === jib, jibChip);
    }
    await context.close();
  }

  // Telltale close-ups at the three sizes: both streaming (good), the leeward ones hanging
  // (stalled, seen from the leeward side), the windward ones lifting (luffing).
  for (const viewport of [phone, foldable, desktop]) {
    for (const [name, query, side, lean] of [
      ['good-windward', '?wd=60&ws=12&ms=25&js=50&cam=side-starboard&debug=1', 1, 14],
      ['good-leeward', '?wd=60&ws=12&ms=25&js=50&cam=side-port&debug=1', -1, 14],
      ['stalled-leeward', '?wd=60&ws=12&ms=0&js=50&cam=side-port&debug=1', -1, 14],
      ['luffing-windward', '?wd=60&ws=12&ms=100&js=50&cam=side-starboard&debug=1', 1, 6],
      ['luffing-leeward', '?wd=60&ws=12&ms=100&js=50&cam=side-port&debug=1', -1, 6],
    ]) {
      for (const range of ['near', 'wide']) {
        const { context, page } = await openPage(viewport, `m9 ${name} ${viewport.name}`, query);
        await page.waitForTimeout(2500);
        await closeUp(page, closeView(side, range, lean));
        await shot(page, `telltales-${name}-${range}-${viewport.name}`);
        await context.close();
      }
    }
  }

  // Flogging: the wear bar, then torn, with the tear on the sail and the Repair button.
  {
    const { context, page } = await openPage(
      phone,
      'm9 torn',
      '?wd=0&ws=25&held=1&cam=side-port&debug=1',
    );
    await page.waitForTimeout(2500);
    check('no badge on new sails', await page.getByTestId('strip-sail').isHidden(), 'hidden');
    await page.evaluate(() => window.__sailDebug.setDamage(0.6, 0.2));
    await page.waitForTimeout(800);
    check('badge from half worn', await page.getByTestId('strip-sail').isVisible(), 'visible');
    check(
      'wear bar text',
      (await text(page, 'trim-wear-main')).includes('Flogging wears the sail'),
      await text(page, 'trim-wear-main'),
    );
    await page.evaluate(() => window.__sailDebug.setDamage(1, 1));
    await page.waitForTimeout(800);
    check('main chip says Torn', (await text(page, 'trim-chip-main')) === 'Torn', 'Torn');
    check('Repair button', await page.getByTestId('repair-sails').isVisible(), 'visible');
    await closeUp(page, TEAR_VIEW);
    await shot(page, 'torn-phone');
    await setSheet(page, 'half');
    await page.getByTestId('repair-sails').scrollIntoViewIfNeeded();
    await page.getByTestId('repair-sails').click();
    await page.waitForTimeout(500);
    check('repair clears Torn', (await text(page, 'trim-chip-main')) !== 'Torn', 'repaired');
    await context.close();
  }
}
