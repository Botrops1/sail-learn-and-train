// M62 (helm pedestals and panels, PHASE9_SPEC 8.8): live checks for scripts/shots.mjs. No scenes:
// the close-ups are taken inside the live checks (as M50 and M61 do). Labels contain "m62", so
// openPage starts with every section folded. Every link adds debug=1&held=1&sea=flat.
import path from 'node:path';
import { setSheet, waitForLink } from './ui.mjs';

export const M62_SCENES = [];

const BASE = 'debug=1&held=1&sea=flat';

/** Close-ups (8.8), boat frame: x forward, y up, z starboard. */
const VIEWS = [
  {
    name: 'panel-port',
    query: 'cam=helm',
    target: [-7.0663, 2.0241, -0.7628],
    position: [-7.856, 2.447, -0.846],
    fov: 40,
  },
  {
    name: 'panel-starboard',
    query: 'cam=helm',
    target: [-7.0663, 2.0241, 0.7628],
    position: [-7.856, 2.447, 0.846],
    fov: 40,
  },
  {
    name: 'pedestals-from-aft',
    query: 'cam=helm',
    target: [-7.0, 1.6, 0],
    position: [-9.0, 2.8, 0],
    fov: 50,
  },
  {
    name: 'pedestal-side',
    query: 'cam=helm',
    target: [-7.0, 1.6, -0.8],
    position: [-7.2, 2.2, -2.4],
    fov: 45,
  },
  {
    name: 'handle-rest',
    query: 'mode=realistic&hd=helm.s&cam=helm',
    target: [-7.2, 1.0, 0.05],
    position: [-7.7, 1.8, 0.75],
    fov: 40,
  },
];

/** Parts tapped from the panel-port view: an id may have several hit areas, one must select it. */
const TAPPED = [
  'fit_compass',
  'fit_instrument_display',
  'engine_control',
  'fit_autopilot_control',
  'fit_thruster_joysticks',
];

export async function liveM62Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M62 ${what}: ${detail}`);
    console.log(`live M62 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const desktop = viewports[2];
  const shot = (page, name) =>
    page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`), timeout: 120000 });
  const open = async (viewport, what, query) => {
    const opened = await openPage(viewport, `m62 ${what}`, `?${query}&${BASE}`);
    await opened.page.waitForTimeout(800);
    return opened;
  };
  const clean = async (page) => {
    await setSheet(page, 'peek');
    await page.addStyleTag({ content: '.debug { display: none !important; }' });
  };
  const aim = (page, view) =>
    page.evaluate((v) => window.__sailDebug.setView(v.position, v.target, v.fov), view);

  // Close-ups at both details, phone and desktop.
  for (const detail of ['high', 'low']) {
    for (const viewport of [phone, desktop]) {
      for (const view of VIEWS) {
        const { context, page } = await open(
          viewport,
          `${view.name} ${detail}`,
          `${view.query}&detail=${detail}`,
        );
        await clean(page);
        await aim(page, view);
        await page.waitForTimeout(800);
        await shot(page, `live-${viewport.name}-m62-${view.name}-${detail}`);
        await context.close();
      }
    }
  }

  // Taps from the panel-port view, at both details and on the phone and the desktop.
  for (const detail of ['high', 'low']) {
    for (const viewport of [phone, desktop]) {
      const { context, page } = await open(viewport, `taps ${detail}`, `cam=helm&detail=${detail}`);
      await clean(page);
      await aim(page, VIEWS[0]);
      await page.waitForTimeout(800);
      for (const id of TAPPED) {
        // A tap opens the part's card and may move the layout: aim again before each one.
        await clean(page);
        await aim(page, VIEWS[0]);
        await page.waitForTimeout(500);
        const box = await page.locator('canvas.scene-canvas').boundingBox();
        const centres = await page.evaluate(
          (partId) => window.__sailDebug.hitCentres().filter((c) => c.partId === partId),
          id,
        );
        let found = false;
        for (const centre of centres) {
          await page.mouse.click(box.x + centre.x, box.y + centre.y);
          const linked = await waitForLink(page, [`sel=${id}`]).catch(() => '');
          if (linked) {
            found = true;
            break;
          }
        }
        check(`tap ${id} ${detail} ${viewport.name}`, found, `${centres.length} hit areas`);
      }
      // The rail's top bar selects the pedestal.
      await clean(page);
      await aim(page, VIEWS[0]);
      await page.waitForTimeout(500);
      const box = await page.locator('canvas.scene-canvas').boundingBox();
      const bar = await page.evaluate(() => window.__sailDebug.partPoint('fit_helm_pedestal', 0.5));
      let railTapped = false;
      if (bar) {
        await page.mouse.click(box.x + bar.x, box.y + bar.y);
        railTapped = Boolean(await waitForLink(page, ['sel=fit_helm_pedestal']).catch(() => ''));
      }
      check(`tap rail ${detail} ${viewport.name}`, railTapped, bar ? 'tapped' : 'no rail point');
      await context.close();
    }
  }

  // The instruments are hidden beyond 6 m and shown by the spotlight (8.4).
  {
    const { context, page } = await open(phone, 'far', 'cam=side-port');
    const far = await page.evaluate(
      () => window.__sailDebug.hitCentres().filter((c) => c.partId === 'fit_compass').length,
    );
    check('side view: no compass hit area', far === 0, `${far}`);
    await context.close();
  }
  for (const viewport of [phone, desktop]) {
    const { context, page } = await open(viewport, 'learn', 'm=learn&learn=fit_compass');
    const button = page.getByTestId('learn-show-on-boat');
    await button.waitFor({ timeout: 5000 });
    await button.click();
    await page.waitForTimeout(1000);
    const state = await page.evaluate(() => ({
      spot: window.__sailDebug.spotlight(),
      compass: window.__sailDebug.hitCentres().filter((c) => c.partId === 'fit_compass').length,
    }));
    check(
      `Where is it? ${viewport.name}`,
      Boolean(state.spot) && state.compass > 0,
      `spotlight ${state.spot ? state.spot.partId : 'none'}, ${state.compass} compass hit areas`,
    );
    await context.close();
  }
}
