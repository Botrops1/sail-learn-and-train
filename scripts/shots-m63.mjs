// M63 (live panel, PHASE9_SPEC 9.7): live checks for scripts/shots.mjs, on the test clock (the
// redraw rate and the thruster press depend on app time). No scenes: the close-ups are taken inside
// the live checks (as M62 does). Labels contain "m63", so openPage starts with every section folded.
import path from 'node:path';
import { setSheet } from './ui.mjs';

export const M63_SCENES = [];

const VIEW = {
  query: 'cam=helm',
  target: [-7.0663, 2.0241, -0.7628],
  position: [-7.856, 2.447, -0.846],
  fov: 40,
};

export async function liveM63Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M63 ${what}: ${detail}`);
    console.log(`live M63 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const desktop = viewports[2];
  const stats = (page) => page.evaluate(() => window.__sailDebug.panelStats());
  const open = async (viewport, what, query) => {
    const opened = await openPage(viewport, `m63 ${what}`, `?${query}`);
    await opened.page.waitForTimeout(1000);
    return opened;
  };
  const bothViewports = [phone, desktop];

  for (const viewport of bothViewports) {
    const name = viewport.name;
    // 1. The compass follows the heading.
    {
      const { context, page } = await open(
        viewport,
        'heading',
        'debug=1&held=1&sea=flat&cam=helm&hdg=90',
      );
      const s = await stats(page);
      check(
        `heading ${name}`,
        s.drawn.headingDeg === 90 && s.redraws >= 1,
        `drawn ${s.drawn.headingDeg}, ${s.redraws} redraws`,
      );
      await context.close();
    }
    // 2. The engine: the rev counter and the lever.
    {
      const { context, page } = await open(
        viewport,
        'engine',
        'debug=1&held=1&sea=flat&cam=helm&eng=1&lv=66',
      );
      const s = await stats(page);
      check(
        `engine ${name}`,
        s.drawn.rpm >= 1800 && s.drawn.rpm <= 1900 && Math.abs(s.pose.leverDeg - 29.7) <= 0.1,
        `drawn ${Math.round(s.drawn.rpm)} rpm, lever ${s.pose.leverDeg}°`,
      );
      await context.close();
    }
    // 3. Far: nothing is redrawn.
    {
      const { context, page } = await open(
        viewport,
        'far',
        'debug=1&held=1&sea=flat&cam=side-port&hdg=90',
      );
      const s = await stats(page);
      check(
        `far ${name}`,
        s.redraws === 0 && s.drawn.headingDeg === 0 && s.latest.headingDeg === 90,
        `${s.redraws} redraws, drawn ${s.drawn.headingDeg}, latest ${s.latest.headingDeg}`,
      );
      await context.close();
    }
    // 4. The autopilot line.
    {
      const { context, page } = await open(
        viewport,
        'autopilot',
        'debug=1&sea=flat&cam=helm&ws=12&wd=135&ap=hdg&hdg=45',
      );
      const s = await stats(page);
      check(
        `autopilot ${name}`,
        s.drawn.autopilot === 'heading' && s.drawn.courseText === 'HDG 045°',
        `${s.drawn.autopilot} "${s.drawn.courseText}"`,
      );
      await context.close();
    }
    // 5. A thruster held down leans the stick.
    {
      const { context, page } = await open(
        viewport,
        'thruster',
        'debug=1&held=1&sea=flat&m=harbour&cam=helm',
      );
      await page.keyboard.press('Escape');
      await page.keyboard.down('KeyD');
      await page.waitForTimeout(500);
      const down = await stats(page);
      await page.keyboard.up('KeyD');
      await page.waitForTimeout(500);
      const up = await stats(page);
      check(
        `thruster ${name}`,
        down.latest.bow === 1 &&
          down.pose.bowDeg === 25 &&
          up.latest.bow === 0 &&
          up.pose.bowDeg === 0,
        `held bow ${down.latest.bow} / ${down.pose.bowDeg}°, let go ${up.latest.bow} / ${up.pose.bowDeg}°`,
      );
      await context.close();
    }
    // 6. The redraw rate.
    {
      const { context, page } = await open(
        viewport,
        'rate',
        'debug=1&sea=flat&cam=helm&ws=15&wm=gusty',
      );
      const before = (await stats(page)).redraws;
      for (let i = 0; i < 20; i += 1) await page.waitForTimeout(100);
      const after = (await stats(page)).redraws;
      check(
        `redraw rate ${name}`,
        after - before >= 2 && after - before <= 11,
        `${after - before} redraws in 2 s`,
      );
      await context.close();
    }
  }

  // Close-ups at both details.
  for (const detail of ['high', 'low']) {
    for (const viewport of bothViewports) {
      for (const scene of [
        {
          name: 'live-panel-sailing',
          query: `debug=1&sea=flat&cam=helm&ws=12&wd=135&ap=hdg&hdg=45&eng=1&lv=66&detail=${detail}`,
          key: null,
        },
        {
          name: 'live-panel-harbour',
          query: `debug=1&held=1&sea=flat&m=harbour&cam=helm&detail=${detail}`,
          key: 'KeyD',
        },
      ]) {
        const { context, page } = await open(viewport, `${scene.name} ${detail}`, scene.query);
        await setSheet(page, 'peek');
        await page.addStyleTag({ content: '.debug, .label3d { display: none !important; }' });
        await page.evaluate((v) => window.__sailDebug.setView(v.position, v.target, v.fov), VIEW);
        if (scene.key) {
          await page.keyboard.press('Escape');
          await page.keyboard.down(scene.key);
        }
        await page.waitForTimeout(3000);
        await page.screenshot({
          path: path.join(outDir, `${prefix}live-${viewport.name}-m63-${scene.name}-${detail}.png`),
          timeout: 120000,
        });
        if (scene.key) await page.keyboard.up(scene.key);
        await context.close();
      }
    }
  }
}
