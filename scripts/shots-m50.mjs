// M50 (the winch handle in 3D, PHASE8_SPEC 8.8): live checks for scripts/shots.mjs. No scenes:
// the close-ups are taken inside the live checks with __sailDebug.setView, as M30 does. Labels
// contain "m50", so openPage starts with every section folded. Every link adds
// debug=1&held=1&sea=flat so tap points do not drift.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { setSheet, showSection, waitForLink } from './ui.mjs';

export const M50_SCENES = [];

const BASE = 'debug=1&held=1&sea=flat';

/** Close-ups (boat coordinates: x forward, y up, z to starboard); the handle fills about a third. */
const CLOSE_UPS = [
  {
    name: 'handle-port-rest',
    q: 'mode=realistic',
    position: [-7.6, 1.9, -2.4],
    target: [-7.6, 1.45, -1.55],
    fov: 40,
  },
  {
    name: 'handle-in-winch',
    q: 'mode=realistic&hd=port.w',
    position: [-7.0, 2.2, -2.3],
    target: [-7.25, 1.85, -1.55],
    fov: 40,
  },
  {
    name: 'handle-mast-rest',
    q: 'mode=realistic&hd=mast.s',
    position: [-0.9, 2.8, 1.9],
    target: [-0.1, 1.98, 1.05],
    fov: 40,
  },
  {
    name: 'handle-in-gearbox',
    q: 'mode=realistic&hd=mast.w&st=mast',
    position: [-1.4, 2.8, 0.6],
    target: [-0.3, 2.5, -0.08],
    fov: 40,
  },
  {
    name: 'handle-helm-rest',
    q: 'mode=realistic&hd=helm.s',
    position: [-8.6, 2.0, 0.9],
    target: [-7.3, 1.05, 0],
    fov: 40,
  },
  {
    name: 'gearbox-close-up',
    q: 'mode=realistic',
    position: [-1.35, 2.6, -0.08],
    target: [-0.2, 2.45, -0.08],
    fov: 40,
  },
];

export async function liveM50Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M50 ${what}: ${detail}`);
    console.log(`live M50 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const desktop = viewports[2];
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const handle = (page) =>
    page.evaluate(() =>
      window.__sailDebug.hitCentres().find((c) => c.partId === 'part_winch_handle'),
    );
  /** Taps the handle where its hit area is on the canvas. */
  const tapHandle = async (page) => {
    const centre = await handle(page);
    const box = await page.locator('canvas.scene-canvas').boundingBox();
    await page.mouse.click(box.x + centre.x, box.y + centre.y);
    await page.waitForTimeout(300);
  };
  /** Looks straight down at the handle's place, 3 m up, so it sits high above the info card. */
  const lookDownAt = async (page, [x, y, z]) => {
    await page.addStyleTag({ content: '.debug { display: none !important; }' });
    await page.evaluate((v) => window.__sailDebug.setView(v.position, v.target, 40), {
      position: [x, y + 3, z + 0.01],
      target: [x, y + 0.6, z],
    });
    await page.waitForTimeout(1200);
  };
  const open = async (viewport, what, query) => {
    const opened = await openPage(viewport, `m50 ${what}`, `?${query}&${BASE}`);
    await opened.page.waitForTimeout(800);
    return opened;
  };

  // Close-ups (phone and desktop).
  for (const viewport of [phone, desktop]) {
    for (const view of CLOSE_UPS) {
      const { context, page } = await open(viewport, view.name, view.q);
      await setSheet(page, 'peek');
      await page.addStyleTag({ content: '.debug { display: none !important; }' });
      await page.evaluate((v) => window.__sailDebug.setView(v.position, v.target, v.fov), view);
      await page.waitForTimeout(1500);
      await shot(page, `live-${viewport.name}-${view.name}`);
      await context.close();
    }
  }

  for (const viewport of [phone, desktop]) {
    const v = viewport.name;

    // 1-3. The handle lies at port; a first tap selects it, a second takes it.
    {
      const { context, page } = await open(viewport, 'tap', 'mode=realistic&cam=top');
      await showSection(page, 'ropes');
      await setSheet(page, 'peek');
      await lookDownAt(page, [-7.6, 1.43, -1.55]);
      check(`${v} lies at port: drawn`, Boolean(await handle(page)), 'hitCentres');
      await tapHandle(page);
      await waitForLink(page, ['sel=part_winch_handle']);
      check(`${v} first tap selects it: still drawn`, Boolean(await handle(page)), 'hitCentres');
      await tapHandle(page);
      const link = await waitForLink(page, ['hd=c']);
      check(`${v} second tap takes it: carried, hidden`, !(await handle(page)), link);
      await page.waitForTimeout(300);
      const pressed = await page
        .locator('.station-button[data-station="port"][aria-pressed="true"]')
        .count();
      check(`${v} the port station is current`, pressed > 0, `${pressed}`);
      problems.push(...(await auditPage(page, `m50 ${v} handle taken`)));
      await context.close();
    }

    // 4. From the mast's roof, two taps walk to the Mast station.
    {
      const { context, page } = await open(
        viewport,
        'mast',
        'mode=realistic&hd=mast.s&st=port&cam=top',
      );
      await setSheet(page, 'peek');
      await lookDownAt(page, [-0.13, 1.98, 1.05]);
      await tapHandle(page);
      await tapHandle(page);
      const link = await waitForLink(page, ['st=mast', 'hd=c']);
      check(`${v} two taps at the mast: station and carried`, true, link);
      await context.close();
    }

    // 5. Easy ropes: not drawn.
    {
      const { context, page } = await open(viewport, 'easy', 'cam=side-port');
      check(`${v} Easy ropes: not drawn`, !(await handle(page)), 'hitCentres');
      await context.close();
    }

    // 6. Learn's Show it working for the handle: it is drawn after the scene loads.
    {
      const { context, page } = await open(viewport, 'learn', 'm=learn&learn=part_winch_handle');
      await showSection(page, 'learn');
      await page.getByTestId('learn-show-me').click();
      await page.waitForTimeout(1500);
      check(`${v} Show it working: the handle is drawn`, Boolean(await handle(page)), 'hitCentres');
      // In Learn two taps only select the handle (no stations to put it back): it stays drawn.
      await setSheet(page, 'peek');
      await lookDownAt(page, [-7.6, 1.43, -1.55]);
      await tapHandle(page);
      await tapHandle(page);
      const learnLink = await page.evaluate(() => location.search);
      check(
        `${v} Learn: two taps do not take it`,
        !learnLink.includes('hd=c') && Boolean(await handle(page)),
        learnLink,
      );
      await context.close();
    }
  }
}
