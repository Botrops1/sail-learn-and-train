// M66 (Exercises mode and the coach, PHASE10_SPEC 6.8): scenes and live checks for scripts/shots.mjs,
// on the test clock (a hold and a run depend on app time). Labels contain "m66", so openPage starts
// with every section folded and sails (no held=1).
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { exerciseLine, isStacked, setMode, setSheet, showSection, waitForLink } from './ui.mjs';

const START = 'm=exercise&ex=points-of-sail';

export const M66_SCENES = [
  { name: 'exercise-list', query: '?m=exercise', section: 'exercises', sheet: 'half' },
  { name: 'exercise-setup', query: `?${START}`, section: 'exercises', sheet: 'half' },
  { name: 'exercise-setup-ru', query: `?${START}&lang=ru`, section: 'exercises', sheet: 'half' },
];

export async function liveM66Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M66 ${what}: ${detail}`);
    console.log(`live M66 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const desktop = viewports[2];
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const run = (page) => page.evaluate(() => window.__sailExercise.state());
  const act = (page, action) => page.evaluate((a) => window.__sailExercise.dispatch(a), action);
  const turn = async (page, times) => {
    for (let i = 0; i < times; i += 1) {
      await act(page, { type: 'autopilot', command: { turnDeg: -10 } });
    }
  };
  const controls = (page, values) => act(page, { type: 'setControls', values });
  /** Waits (app time) until the run is on `step`, at most `limitS`; returns the app seconds it took. */
  const waitForStep = async (page, step, limitS) => {
    const from = (await run(page)).elapsedS;
    for (;;) {
      const now = await run(page);
      if (now.step >= step) return now.elapsedS - from;
      if (now.elapsedS - from > limitS) return Infinity;
      await page.waitForTimeout(500);
    }
  };
  const link = (page) => page.evaluate(() => window.location.search);

  for (const viewport of [phone, desktop]) {
    const name = viewport.name;

    // 1 to 3, and 6 to 10: one page, in order.
    {
      const { context, page } = await openPage(viewport, 'm66 flow', '?wd=60&ws=12&debug=1', {
        testClock: true,
      });
      await setMode(page, 'exercise');
      await page.waitForTimeout(500);
      if (await isStacked(page)) await showSection(page, 'exercises');
      const item = page.getByTestId('exercise-item-points-of-sail');
      check(
        `mode: the list ${name}`,
        (await item.isVisible()) && /Trim through/.test(await item.innerText()),
        await item.innerText(),
      );

      await item.click();
      await page.waitForTimeout(500);
      const setup = page.getByTestId('exercise-setup');
      const headings = await setup.locator('h4').allInnerTexts();
      const steps = await setup.locator('ol.exercise-steps li').count();
      const easyPressed = await page
        .getByTestId('exercise-ropes-easy')
        .getAttribute('aria-pressed');
      const search = await link(page);
      await page.waitForTimeout(3000);
      const idle = (await run(page)).elapsedS;
      check(
        `setup card ${name}`,
        headings.slice(0, 4).join() ===
          'What you see,What is happening,The right action,The typical mistake' &&
          steps === 5 &&
          easyPressed === 'true' &&
          search.includes('ex=points-of-sail') &&
          search.includes('mode=easy') &&
          idle === 0,
        JSON.stringify({ headings, steps, easyPressed, search, idle }),
      );
      await shot(page, `live-${name}-m66-setup`);
      problems.push(...(await auditPage(page, `m66 ${name} setup`)));

      // 3. Locked.
      await showSection(page, 'conditions');
      const note = await page.getByTestId('exercise-locked-conditions').isVisible();
      const inert = await page
        .locator('[data-section="conditions"] .section-body')
        .evaluate((n) => n.hasAttribute('inert'));
      await act(page, { type: 'setControls', values: { ctl_wind_speed: 20 } });
      const wind = await page.evaluate(() => window.__sailExercise.read().twsKn);
      check(
        `locked conditions ${name}`,
        note && inert && Math.round(wind) === 12,
        JSON.stringify({ note, inert, wind }),
      );
      await showSection(page, 'exercises');

      // 4. Run.
      await page.getByTestId('exercise-start').click();
      await page.waitForTimeout(500);
      const first = await exerciseLine(page);
      check(
        `run starts ${name}`,
        first !== null &&
          first.startsWith('1/5 · Close-hauled: haul the main in until it stops flapping.'),
        String(first),
      );
      const plan = [
        [async () => controls(page, { ctl_mainsheet: 12 }), 15],
        [
          async () => {
            await turn(page, 2);
            await controls(page, { ctl_mainsheet: 25 });
          },
          30,
        ],
        [
          async () => {
            await turn(page, 3);
            await controls(page, { ctl_mainsheet: 50, ctl_jib_sheet: 100 });
          },
          30,
        ],
        [
          async () => {
            await turn(page, 4);
            await controls(page, { ctl_mainsheet: 100 });
          },
          30,
        ],
        [async () => turn(page, 3), 35],
      ];
      let slow = '';
      for (const [index, [doStep, limit]] of plan.entries()) {
        await doStep();
        const took = await waitForStep(page, index + 1, limit);
        if (!(took <= limit)) slow += ` step ${index + 1} took ${took}`;
      }
      await page.waitForTimeout(500);
      const finalRun = await run(page);
      check(
        `run to the end ${name}`,
        slow === '' && finalRun.status === 'done',
        `${finalRun.status} step ${finalRun.step}${slow}`,
      );
      const doneVisible = await page
        .getByTestId('exercise-done')
        .isVisible()
        .catch(() => false);
      if (!doneVisible) await showSection(page, 'exercises');
      const doneText = await page.getByTestId('exercise-done').innerText();
      const doneLine = await exerciseLine(page);
      check(
        `done card and line ${name}`,
        /Well done!/.test(doneText) &&
          /Time: \d+:\d\d/.test(doneText) &&
          /^Done ✓/.test(doneLine ?? ''),
        `${doneText} | ${doneLine}`,
      );
      await shot(page, `live-${name}-m66-done`);

      // 5. Tick.
      await page.getByTestId('exercise-list').click();
      await page.waitForTimeout(300);
      const tick = await page.getByTestId('exercise-tick-points-of-sail').innerText();
      // The address bar is written a moment after a change: reload only once it is the list's.
      await waitForLink(page, ['m=exercise'], ['ex=']);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      if (await isStacked(page)) await showSection(page, 'exercises');
      const tickAfter = await page
        .getByTestId('exercise-tick-points-of-sail')
        .innerText()
        .catch(() => 'missing');
      check(
        `tick kept ${name}`,
        /^✓ best \d+:\d\d$/.test(tick) && tickAfter === tick,
        `${tick} / ${tickAfter}`,
      );
      await context.close();
    }

    // 6 to 9: How?, Stop, a mode change, the line tap.
    {
      const { context, page } = await openPage(viewport, 'm66 how', `?${START}&debug=1`, {
        testClock: true,
      });
      await showSection(page, 'exercises');
      await page.getByTestId('exercise-start').click();
      await page.waitForTimeout(500);
      if (await isStacked(page)) await showSection(page, 'exercises');
      await page.getByTestId('exercise-how').click();
      const how = await page.getByTestId('exercise-how-text').isVisible();
      await page.getByTestId('exercise-open').click();
      await page.waitForTimeout(500);
      const ropesOpen = await page.getByTestId('section-ropes').getAttribute('data-open');
      check(
        `How? and Show the controls ${name}`,
        how && ropesOpen === 'true',
        `how ${how}, ropes open ${ropesOpen}`,
      );
      problems.push(...(await auditPage(page, `m66 ${name} step card`)));

      if (await isStacked(page)) {
        await setSheet(page, 'peek');
        await page.getByTestId('exercise-line').click();
        await page.waitForTimeout(600);
        const shown = await page.getByTestId('exercise-step').isVisible();
        check(`line tap shows the Exercises section ${name}`, shown, String(shown));
      }

      await showSection(page, 'exercises');
      const stop = page.getByTestId('exercise-stop');
      await stop.click();
      await stop.click();
      await page.waitForTimeout(300);
      const listBack = await page.getByTestId('exercise-item-points-of-sail').isVisible();
      await showSection(page, 'conditions');
      const noNote = !(await page.getByTestId('exercise-locked-conditions').isVisible());
      check(
        `stop returns to the list, unlocked ${name}`,
        listBack && noNote,
        JSON.stringify({ listBack, noNote }),
      );
      await context.close();
    }

    {
      const { context, page } = await openPage(viewport, 'm66 mode', `?${START}&debug=1`, {
        testClock: true,
      });
      await showSection(page, 'exercises');
      await page.getByTestId('exercise-start').click();
      await page.waitForTimeout(300);
      await setMode(page, 'easy');
      await page.waitForTimeout(300);
      const hidden = !(await page.getByTestId('exercise-line').isVisible());
      const state = await run(page);
      check(
        `mode change ends the run ${name}`,
        hidden && state === null,
        JSON.stringify({ hidden, state }),
      );
      await context.close();
    }

    // Russian: the setup card fits and the audit passes.
    {
      const { context, page } = await openPage(viewport, 'm66 ru', `?${START}&lang=ru`, {
        testClock: true,
      });
      await showSection(page, 'exercises');
      const overflow = await page.evaluate(() =>
        Math.max(
          0,
          ...[...document.querySelectorAll('.panel-scroll, .section-body')].map(
            (n) => n.scrollWidth - n.clientWidth,
          ),
        ),
      );
      check(`Russian setup card fits ${name}`, overflow <= 0, `overflow ${overflow}`);
      problems.push(...(await auditPage(page, `m66 ${name} setup ru`)));
      await context.close();
    }
  }
}
