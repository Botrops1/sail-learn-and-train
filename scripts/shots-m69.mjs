// M69 (tacking, getting out of irons, gybing, PHASE10_SPEC 9.7): scenes and live checks for
// scripts/shots.mjs, on the test clock (a run depends on app time). Labels contain "m69", so
// openPage starts with every section folded and sails (no held=1).
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { exerciseLine, isStacked, showSection } from './ui.mjs';

export const M69_SCENES = [
  {
    name: 'exercise-tacking-setup',
    query: '?m=exercise&ex=tacking',
    section: 'exercises',
    sheet: 'half',
  },
  {
    name: 'exercise-gybing-setup',
    query: '?m=exercise&ex=gybing',
    section: 'exercises',
    sheet: 'half',
  },
];

export async function liveM69Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M69 ${what}: ${detail}`);
    console.log(`live M69 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const desktop = viewports[2];
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const run = (page) => page.evaluate(() => window.__sailExercise.state());
  const read = (page) => page.evaluate(() => window.__sailExercise.read());
  const act = (page, action) => page.evaluate((a) => window.__sailExercise.dispatch(a), action);
  const controls = (page, values) => act(page, { type: 'setControls', values });
  const pilot = (page, command) => act(page, { type: 'autopilot', command });
  /** Waits (app time) until the run is on `step`, at most `limitS`; `each` runs every 250 ms. */
  const waitForStep = async (page, step, limitS, each) => {
    const from = (await run(page)).elapsedS;
    for (;;) {
      const now = await run(page);
      if (now.step >= step) return true;
      if (now.status === 'mistake' || now.elapsedS - from > limitS) return false;
      if (each) await each();
      await page.waitForTimeout(250);
    }
  };
  const open = async (page) => {
    if (await isStacked(page)) await showSection(page, 'exercises');
  };
  const start = async (page) => {
    await open(page);
    await page.getByTestId('exercise-start').click();
    await page.waitForTimeout(500);
  };
  const howText = async (page) => {
    await open(page);
    await page.getByTestId('exercise-how').click();
    const text = await page.getByTestId('exercise-how-text').innerText();
    await page.getByTestId('exercise-open').click();
    return text;
  };
  const centreWhenOver = (page) => async () => {
    const now = await read(page);
    if (now.twaDeg > 35 && now.controls.ctl_rudder !== 0) await controls(page, { ctl_rudder: 0 });
  };
  /** The UI redraws on the next animation frame; give it a few real retries before giving up. */
  const waitVisible = async (page, testid, triesLeft = 20) => {
    for (let i = 0; i < triesLeft; i += 1) {
      if (await page.getByTestId(testid).isVisible()) return true;
      await page.waitForTimeout(250);
    }
    return false;
  };

  for (const viewport of [phone, desktop]) {
    const name = viewport.name;

    // 1. Tacking.
    {
      const { context, page } = await openPage(
        viewport,
        'm69 tacking',
        '?m=exercise&ex=tacking&debug=1',
        { testClock: true },
      );
      await start(page);
      const first = await exerciseLine(page);
      await pilot(page, 'tack');
      const s1 = await waitForStep(page, 1, 90);
      await pilot(page, 'off');
      await controls(page, { ctl_rudder: -25 });
      const line2 = await exerciseLine(page);
      await page.waitForTimeout(300);
      const how2 = await howText(page);
      const each = centreWhenOver(page);
      const s2 = await waitForStep(page, 2, 30, each);
      const s3 = await waitForStep(page, 3, 75, each);
      await pilot(page, 'wind');
      await act(page, { type: 'autopilot', command: { turnDeg: -10 } });
      const s4 = await waitForStep(page, 4, 45);
      const afterS4 = await run(page);
      await open(page);
      const done = await waitVisible(page, 'exercise-done');
      check(
        `tacking good run ${name}`,
        first?.startsWith('1/4 ·') &&
          line2?.startsWith('2/4 ·') &&
          /Standby/.test(how2) &&
          how2.includes('−25°') &&
          s1 &&
          s2 &&
          s3 &&
          s4 &&
          done,
        JSON.stringify({ first, line2, how2, s1, s2, s3, s4, done, afterS4 }),
      );
      await shot(page, `live-${name}-m69-tacking-done`);
      problems.push(...(await auditPage(page, `m69 ${name} tacking done`)));
      await context.close();
    }

    // 2. Irons.
    {
      const { context, page } = await openPage(
        viewport,
        'm69 irons',
        '?m=exercise&ex=irons&debug=1',
        { testClock: true },
      );
      await start(page);
      await controls(page, { ctl_mainsheet: 60, ctl_jib_sheet: 60 });
      const s1 = await waitForStep(page, 1, 5);
      await controls(page, { ctl_rudder: 30 });
      const s2 = await waitForStep(page, 2, 80);
      const twa = Math.abs((await read(page)).twaDeg);
      await controls(page, { ctl_rudder: 0, ctl_mainsheet: 12, ctl_jib_sheet: 30 });
      const s3 = await waitForStep(page, 3, 50);
      await open(page);
      const done = await waitVisible(page, 'exercise-done');
      check(
        `irons good run ${name}`,
        s1 && s2 && twa >= 35 && s3 && done,
        JSON.stringify({ s1, s2, twa, s3, done }),
      );
      await shot(page, `live-${name}-m69-irons-done`);
      problems.push(...(await auditPage(page, `m69 ${name} irons done`)));
      await context.close();
    }

    // 3. Gybing: the good run, and the gybe report beside the done card.
    {
      const { context, page } = await openPage(
        viewport,
        'm69 gybing',
        '?m=exercise&ex=gybing&debug=1',
        { testClock: true },
      );
      await start(page);
      await controls(page, { ctl_mainsheet: 5 });
      const s1 = await waitForStep(page, 1, 10);
      await pilot(page, 'tack');
      const s2 = await waitForStep(page, 2, 30);
      await controls(page, { ctl_mainsheet: 100 });
      const s3 = await waitForStep(page, 3, 15);
      await pilot(page, 'heading');
      for (let i = 0; i < 3; i += 1) {
        await act(page, { type: 'autopilot', command: { turnDeg: 10 } });
      }
      const s4 = await waitForStep(page, 4, 35);
      await open(page);
      const done = await waitVisible(page, 'exercise-done');
      const report = await page.getByTestId('gybe-report').isVisible();
      check(
        `gybing good run ${name}`,
        s1 && s2 && s3 && s4 && done && report,
        JSON.stringify({ s1, s2, s3, s4, done, report }),
      );
      await shot(page, `live-${name}-m69-gybing-done`);
      problems.push(...(await auditPage(page, `m69 ${name} gybing done`)));
      await context.close();
    }

    // 4. Gybing with the main out.
    {
      const { context, page } = await openPage(
        viewport,
        'm69 gybing wrong',
        '?m=exercise&ex=gybing&debug=1',
        { testClock: true },
      );
      await start(page);
      await pilot(page, 'tack');
      await waitForStep(page, 1, 30);
      await waitVisible(page, 'exercise-mistake');
      await open(page);
      const card = page.getByTestId('exercise-mistake');
      const text = (await card.innerText().catch(() => '')) ?? '';
      check(`gybing mistake ${name}`, /accidental gybe/i.test(text), text.slice(0, 120));
      await shot(page, `live-${name}-m69-gybing-mistake`);
      problems.push(...(await auditPage(page, `m69 ${name} gybing mistake`)));
      await context.close();
    }

    // 5. The list, and Russian setup cards.
    {
      const { context, page } = await openPage(viewport, 'm69 list', '?m=exercise', {
        testClock: true,
      });
      await open(page);
      const ids = await page
        .locator('[data-testid^="exercise-item-"]')
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-testid')));
      check(
        `list ${name}`,
        JSON.stringify(ids) ===
          JSON.stringify([
            'exercise-item-points-of-sail',
            'exercise-item-tacking',
            'exercise-item-irons',
            'exercise-item-gybing',
          ]),
        JSON.stringify(ids),
      );
      problems.push(...(await auditPage(page, `m69 ${name} list`)));
      await context.close();
    }
    for (const id of ['tacking', 'irons', 'gybing']) {
      const { context, page } = await openPage(viewport, 'm69 ru', `?m=exercise&ex=${id}&lang=ru`, {
        testClock: true,
      });
      await open(page);
      const overflow = await page.evaluate(() => {
        const box = document.querySelector('[data-testid="exercise-setup"]');
        return {
          page: document.documentElement.scrollWidth > window.innerWidth + 1,
          box: box ? box.scrollWidth > box.clientWidth + 1 : true,
        };
      });
      check(
        `russian setup ${id} ${name}`,
        !overflow.page && !overflow.box,
        JSON.stringify(overflow),
      );
      if (id === 'gybing') await shot(page, `live-${name}-m69-ru-gybing`);
      problems.push(...(await auditPage(page, `m69 ${name} ru ${id}`)));
      await context.close();
    }
  }
}
