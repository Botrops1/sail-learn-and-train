// M68 (debrief, PHASE10_SPEC 8.7): live checks for scripts/shots.mjs, on the test clock (a run and
// the time a mistake takes depend on app time). Labels contain "m68", so openPage starts with every
// section folded and sails (no held=1).
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { isStacked, showSection } from './ui.mjs';

const START = 'm=exercise&ex=points-of-sail&exp=0&debug=1';

export const M68_SCENES = [];

export async function liveM68Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M68 ${what}: ${detail}`);
    console.log(`live M68 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
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
  /** Waits (app time) until the run is on `step`, at most `limitS`. */
  const waitForStep = async (page, step, limitS) => {
    const from = (await run(page)).elapsedS;
    for (;;) {
      const now = await run(page);
      if (now.step >= step) return true;
      if (now.elapsedS - from > limitS) return false;
      await page.waitForTimeout(500);
    }
  };
  const waitForMistakeCount = async (page, count, limitS) => {
    const from = (await run(page)).elapsedS;
    for (;;) {
      const now = await run(page);
      if (now.log.filter((e) => e.kind === 'mistake').length >= count) return true;
      if (now.elapsedS - from > limitS) return false;
      await page.waitForTimeout(250);
    }
  };
  /** The good run of steps 1 to 4 (M66), leaving the run at step 5. */
  const toStep5 = async (page) => {
    const plan = [
      async () => controls(page, { ctl_mainsheet: 12 }),
      async () => {
        await turn(page, 2);
        await controls(page, { ctl_mainsheet: 25 });
      },
      async () => {
        await turn(page, 3);
        await controls(page, { ctl_mainsheet: 50, ctl_jib_sheet: 100 });
      },
      async () => {
        await turn(page, 4);
        await controls(page, { ctl_mainsheet: 100 });
      },
    ];
    for (const [index, doStep] of plan.entries()) {
      await doStep();
      if (!(await waitForStep(page, index + 1, 40))) return false;
    }
    return true;
  };
  const showExercises = async (page) => {
    if (await isStacked(page)) await showSection(page, 'exercises');
  };
  const rows = (page, kind) => page.locator(`[data-testid="debrief-row"][data-kind="${kind}"]`);

  for (const viewport of [phone, desktop]) {
    const name = viewport.name;

    // 1 and 2: a run with two mistakes, back to step 5, finished; then the actions toggle.
    {
      const { context, page } = await openPage(viewport, 'm68 flow', `?${START}`, {
        testClock: true,
      });
      await showExercises(page);
      await page.getByTestId('exercise-start').click();
      await page.waitForTimeout(500);
      const reached = await toStep5(page);
      check(`good run to step 5 ${name}`, reached, `reached ${reached}`);

      // 3. So far, during the run.
      await showExercises(page);
      await page.getByTestId('exercise-so-far').click();
      await page.waitForTimeout(200);
      const soFar = await page
        .getByTestId('debrief-summary')
        .innerText()
        .catch(() => '');
      const soFarSteps = await rows(page, 'step').count();
      check(
        `so far ${name}`,
        /4 of 5 steps · mistakes: 0/.test(soFar) && soFarSteps === 4,
        JSON.stringify({ soFar, soFarSteps }),
      );
      await page.getByTestId('exercise-so-far').click();

      await turn(page, 6);
      const gotBoth = await waitForMistakeCount(page, 2, 60);
      await page.waitForTimeout(300);
      await showExercises(page);
      await page.getByTestId('exercise-waypoint-back-4').click();
      await page.waitForTimeout(500);
      await turn(page, 3);
      const finished = await waitForStep(page, 5, 40);
      await page.waitForTimeout(500);
      await showExercises(page);
      const summary = await page
        .getByTestId('debrief-summary')
        .innerText()
        .catch(() => '');
      const mistakeRows = rows(page, 'mistake');
      const mistakeCount = await mistakeRows.count();
      const texts = [];
      for (let i = 0; i < mistakeCount; i += 1) texts.push(await mistakeRows.nth(i).innerText());
      const backRows = await rows(page, 'back').count();
      check(
        `done with a mistake ${name}`,
        reached &&
          gotBoth &&
          finished &&
          /5 of 5 steps · mistakes: 2/.test(summary) &&
          mistakeCount === 2 &&
          texts.every((x) => /Just before, you:/.test(x) && /Autopilot: 60° to port/.test(x)) &&
          backRows === 1,
        JSON.stringify({ gotBoth, finished, summary, mistakeCount, backRows, texts }),
      );
      await shot(page, `live-${name}-m68-debrief`);
      problems.push(...(await auditPage(page, `m68 ${name} debrief`)));

      // 2. Show my actions.
      const actionsBefore = await rows(page, 'action').count();
      await page.getByTestId('debrief-actions-toggle').click();
      await page.waitForTimeout(200);
      const actionRows = rows(page, 'action');
      const actionCount = await actionRows.count();
      const listText = await page.getByTestId('debrief-list').innerText();
      check(
        `actions toggle ${name}`,
        actionsBefore === 0 && actionCount > 0 && /Main sheet: 30 → 12 %/.test(listText),
        JSON.stringify({ actionsBefore, actionCount }),
      );
      await shot(page, `live-${name}-m68-actions`);
      problems.push(...(await auditPage(page, `m68 ${name} actions`)));
      await context.close();
    }

    // 4. Russian: a good run to the done card, no overflow.
    {
      const { context, page } = await openPage(
        viewport,
        'm68 ru',
        `?m=exercise&ex=points-of-sail&debug=1&lang=ru`,
        { testClock: true },
      );
      await showExercises(page);
      await page.getByTestId('exercise-start').click();
      await page.waitForTimeout(500);
      const reached = await toStep5(page);
      await turn(page, 3);
      const finished = await waitForStep(page, 5, 40);
      await page.waitForTimeout(500);
      await showExercises(page);
      await page.getByTestId('debrief-actions-toggle').click();
      await page.waitForTimeout(200);
      const overflow = await page.evaluate(() => {
        const box = document.querySelector('[data-testid="exercise-debrief"]');
        return {
          page: document.documentElement.scrollWidth > window.innerWidth + 1,
          box: box ? box.scrollWidth > box.clientWidth + 1 : true,
        };
      });
      check(
        `russian debrief ${name}`,
        reached && finished && !overflow.page && !overflow.box,
        JSON.stringify({ reached, finished, overflow }),
      );
      await shot(page, `live-${name}-m68-ru`);
      problems.push(...(await auditPage(page, `m68 ${name} ru debrief`)));
      await context.close();
    }
  }
}
