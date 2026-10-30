// M64 (Helm camera, PHASE9_SPEC 10.8): live checks for scripts/shots.mjs, on the test clock (the
// glides depend on app time). No scenes: the six pictures are taken inside the live checks.
// Labels contain "m64", so openPage starts with every section folded.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { helmView, setCamera, waitForLink } from './ui.mjs';

export const M64_SCENES = [];

const EYE_PORT = [-8.2, 2.65, -0.88];
const AHEAD_PORT = [-3.6042, 0.9399, -1.8569];
const PANEL_PORT = [-7.0663, 2.0241, -0.7628];
const ROPES_PORT = [-6.9, 1.6, -1.6];

export async function liveM64Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M64 ${what}: ${detail}`);
    console.log(`live M64 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const desktop = viewports[2];
  const BASE = 'debug=1&held=1&sea=flat';
  const pose = (page) => page.evaluate(() => window.__sailDebug.cameraPose());
  const near = (a, b, tol = 0.01) => a.every((v, i) => Math.abs(v - b[i]) <= tol);
  const fmt = (v) => `(${v.map((x) => x.toFixed(3)).join(', ')})`;
  const pressed = (page, id) => page.getByTestId(id).getAttribute('aria-pressed');
  const hideDebug = (page) =>
    page.addStyleTag({ content: '.debug, .label3d { display: none !important; }' });

  for (const viewport of [phone, desktop]) {
    const name = viewport.name;

    // 1. The buttons show on Helm only.
    {
      const { context, page } = await openPage(viewport, 'm64 buttons', `?${BASE}&cam=helm`, {
        testClock: true,
      });
      const count = await page.locator('[data-testid="helm-views"] button:visible').count();
      check(`buttons on Helm ${name}`, count === 3, `${count} buttons`);
      await setCamera(page, 'side-port');
      const shown = await page.getByTestId('helm-views').isVisible();
      check(`buttons hidden on Port ${name}`, !shown, shown ? 'shown' : 'hidden');
      await context.close();
    }

    // 2 to 6. One page, in order.
    {
      const { context, page } = await openPage(viewport, 'm64 views', `?${BASE}&cam=helm`, {
        testClock: true,
      });
      await page.waitForTimeout(600);

      await helmView(page, 'panel');
      await waitForLink(page, ['hl=p']);
      await page.waitForTimeout(600);
      let p = await pose(page);
      check(
        `Panel ${name}`,
        near(p.target, PANEL_PORT) && (await pressed(page, 'helm-look-panel')) === 'true',
        `target ${fmt(p.target)}, pressed ${await pressed(page, 'helm-look-panel')}`,
      );

      await helmView(page, 'ropes');
      await page.waitForTimeout(250);
      p = await pose(page);
      check(`Ropes: the eye stays ${name}`, near(p.position, EYE_PORT), `eye ${fmt(p.position)}`);
      await page.waitForTimeout(350);
      p = await pose(page);
      await waitForLink(page, ['hl=r']);
      check(`Ropes ${name}`, near(p.target, ROPES_PORT), `target ${fmt(p.target)}`);

      await helmView(page, 'ropes');
      await waitForLink(page, [], ['hl=']);
      await page.waitForTimeout(600);
      p = await pose(page);
      check(`Ropes again: Ahead ${name}`, near(p.target, AHEAD_PORT), `target ${fmt(p.target)}`);

      await helmView(page, 'other');
      await waitForLink(page, ['hw=s']);
      await page.waitForTimeout(600);
      p = await pose(page);
      check(
        `Other wheel ${name}`,
        Math.abs(p.position[2] - 0.88) <= 0.01,
        `eye z ${p.position[2].toFixed(3)}`,
      );

      await setCamera(page, 'side-port');
      await setCamera(page, 'helm');
      const link = await waitForLink(page, ['hw=s'], ['hl=']);
      check(`Helm opens the last wheel, Ahead ${name}`, true, link);

      // 7. Dragging switches to Free and hides the buttons.
      const canvas = await page.locator('canvas.scene-canvas').boundingBox();
      const cx = canvas.x + canvas.width / 2;
      const cy = canvas.y + canvas.height / 3;
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      for (let i = 1; i <= 10; i += 1) await page.mouse.move(cx + i * 15, cy + i * 4);
      await page.mouse.up();
      await waitForLink(page, ['cam=free']);
      const chip = await page.getByTestId('camera-chip').locator('.chip-label').innerText();
      const shown = await page.getByTestId('helm-views').isVisible();
      check(`drag: Free, buttons hidden ${name}`, chip === 'Free' && !shown, `${chip}, ${shown}`);
      await context.close();
    }

    // 8. The old link opens today's Helm view.
    {
      const { context, page } = await openPage(viewport, 'm64 old link', `?${BASE}&cam=helm`, {
        testClock: true,
      });
      await page.waitForTimeout(600);
      const p = await pose(page);
      check(
        `old link ${name}`,
        near(p.position, EYE_PORT) && near(p.target, AHEAD_PORT),
        `eye ${fmt(p.position)}, target ${fmt(p.target)}`,
      );
      await context.close();
    }

    // 9. Russian: the buttons fit; the audit passes.
    {
      const { context, page } = await openPage(
        viewport,
        'm64 russian',
        `?${BASE}&lang=ru&cam=helm`,
        {
          testClock: true,
        },
      );
      await page.waitForTimeout(600);
      const box = (id) => page.getByTestId(id).boundingBox();
      const group = await box('helm-views');
      const view = await page.locator('.view, [data-testid="view"]').first().boundingBox();
      const chipBox = await box('camera-chip');
      const strip = await page.getByTestId('instrument-strip').boundingBox();
      const heights = [];
      for (const id of ['helm-look-ropes', 'helm-look-panel', 'helm-other-wheel']) {
        heights.push((await box(id)).height);
      }
      const overlaps = (a, b) =>
        a &&
        b &&
        a.x < b.x + b.width &&
        b.x < a.x + a.width &&
        a.y < b.y + b.height &&
        b.y < a.y + a.height;
      const inside = view
        ? group.x >= view.x - 1 &&
          group.y >= view.y - 1 &&
          group.x + group.width <= view.x + view.width + 1 &&
          group.y + group.height <= view.y + view.height + 1
        : true;
      check(
        `Russian fits ${name}`,
        inside &&
          heights.every((h) => h <= 48) &&
          !overlaps(group, chipBox) &&
          !overlaps(group, strip),
        `group ${JSON.stringify(group)}, heights ${heights.join('/')}`,
      );
      const found = await auditPage(page, `m64 helm buttons ${name}`);
      check(`audit ${name}`, found.length === 0, found.join('; ') || 'clean');
      problems.push(...[]);
      await context.close();
    }
  }

  // Pictures, High, the debug overlay hidden, 1,000 ms after load.
  for (const viewport of [phone, desktop]) {
    for (const wheel of ['port', 'starboard']) {
      for (const look of ['ahead', 'panel', 'ropes']) {
        const keys = `${wheel === 'starboard' ? '&hw=s' : ''}${look === 'ahead' ? '' : `&hl=${look === 'panel' ? 'p' : 'r'}`}`;
        const { context, page } = await openPage(
          viewport,
          `m64 helm-${wheel}-${look}`,
          `?${BASE}&detail=high&cam=helm${keys}`,
          { testClock: true },
        );
        await hideDebug(page);
        await page.waitForTimeout(1000);
        await page.realWaitForTimeout(600);
        await page.screenshot({
          path: path.join(outDir, `${prefix}live-${viewport.name}-m64-helm-${wheel}-${look}.png`),
          timeout: 120000,
        });
        await context.close();
      }
    }
  }
}
