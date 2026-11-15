// M67 (mistakes and waypoints, PHASE10_SPEC 7.8): live checks for scripts/shots.mjs, on the test
// clock (a hold, a run and the six seconds a mistake shows depend on app time). Labels contain
// "m67", so openPage starts with every section folded and sails (no held=1). The good run that
// only leads to the state a check looks at goes at ×16 (scripts/exercise-drive.mjs); the phone runs
// the whole flow, the desktop the moments that show its own layout (the mistake card, the Carry on
// button over the view, the waypoint rows).
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { FAST, read, run, setSpeed, toStep5, turn, waitForStep } from './exercise-drive.mjs';
import { exerciseLine, isStacked, showSection, waitForLink } from './ui.mjs';

const START = 'm=exercise&ex=points-of-sail';

export const M67_SCENES = [];

export async function liveM67Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M67 ${what}: ${detail}`);
    console.log(`live M67 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const desktop = viewports[2];
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  /** Waits (app time) until a mistake with this id is the run's last one, at most `limitS`. */
  const waitForMistake = async (page, id, limitS) => {
    const from = (await run(page)).elapsedS;
    for (;;) {
      const now = await run(page);
      if (now.mistake?.mistakeId === id) return true;
      // A paused run's app time stands still: count real polls instead.
      if (now.elapsedS - from > limitS) return false;
      await page.waitForTimeout(250);
    }
  };
  const showExercises = async (page) => {
    if (await isStacked(page)) await showSection(page, 'exercises');
  };

  for (const viewport of [phone, desktop]) {
    const name = viewport.name;
    // The phone runs the whole flow; the desktop the moments that show its own layout (the logic
    // of the later steps is the same code and is checked once, on the phone).
    const full = viewport === phone;

    // 1 to 4, and 6: one page, in order (pausing on).
    {
      const { context, page } = await openPage(viewport, 'm67 flow', `?${START}&debug=1`, {
        testClock: true,
      });
      await showExercises(page);
      const boxChecked = await page.getByTestId('exercise-pause-on-mistake').isChecked();
      await page.getByTestId('exercise-start').click();
      await page.waitForTimeout(500);
      const reached = await toStep5(page);
      check(`good run to step 5 ${name}`, reached, `reached ${reached}`);

      // 1. Pause on a mistake.
      await turn(page, 6);
      // At ×16 up to the mistake: the run pauses on it, so its time is exact; then back to ×1.
      await setSpeed(page, FAST);
      const gotLee = await waitForMistake(page, 'by-the-lee', 25);
      await setSpeed(page, 1);
      await page.waitForTimeout(300);
      const state = await run(page);
      const paused = await page.evaluate(() => window.__sailExercise.read().paused);
      await showExercises(page);
      const card = page.getByTestId('exercise-mistake');
      const cardText = (await card.innerText().catch(() => '')) ?? '';
      const lineText = await exerciseLine(page);
      const t0 = (await run(page)).elapsedS;
      await page.waitForTimeout(3000);
      const t1 = (await run(page)).elapsedS;
      check(
        `pause on a mistake ${name}`,
        boxChecked &&
          gotLee &&
          state.status === 'mistake' &&
          paused &&
          /You are sailing by the lee/.test(cardText) &&
          /Why/.test(cardText) &&
          /What to do/.test(cardText) &&
          /^Paused:/.test(lineText ?? '') &&
          t0 === t1,
        JSON.stringify({ boxChecked, gotLee, status: state.status, paused, lineText, t0, t1 }),
      );
      await shot(page, `live-${name}-m67-mistake`);
      problems.push(...(await auditPage(page, `m67 ${name} mistake`)));

      // 2. Carry on: running; the next mistake (the gybe) shows the card again.
      // M92 (issue #172): the time widget's button says Carry on and does the same as the card's.
      const overView = page.getByTestId('pause-button');
      const overViewText = (await overView.isVisible()) ? await overView.innerText() : '';
      check(
        `Carry on over the 3D view ${name}`,
        overViewText === 'Carry on',
        JSON.stringify({ overViewText }),
      );
      await overView.click();
      await page.waitForTimeout(300);
      const running = (await run(page)).status === 'running';
      check(
        `the button says Pause once running ${name}`,
        running && (await overView.innerText()) === 'Pause',
        JSON.stringify({ running }),
      );
      if (full) {
        await setSpeed(page, FAST);
        const gotGybe = await waitForMistake(page, 'accidental-gybe', 35);
        await setSpeed(page, 1);
        await page.waitForTimeout(300);
        await showExercises(page);
        const again = await page
          .getByTestId('exercise-mistake')
          .isVisible()
          .catch(() => false);
        check(
          `carry on, then the gybe ${name}`,
          running && gotGybe && again,
          JSON.stringify({ running, gotGybe, again }),
        );
      }

      if (full) {
        // 3. Back: step 5 again, the boat at about 135 degrees from the wind, no card.
        const backLabel = await page.getByTestId('exercise-back').innerText();
        await page.getByTestId('exercise-back').click();
        await page.waitForTimeout(500);
        const after = await run(page);
        const lineAfter = await exerciseLine(page);
        const twa = Math.abs((await read(page)).twaDeg);
        const cardGone = !(await page
          .getByTestId('exercise-mistake')
          .isVisible()
          .catch(() => false));
        check(
          `back to the start of step 5 ${name}`,
          /^Back to the start of step 5$/.test(backLabel) &&
            after.status === 'running' &&
            after.step === 4 &&
            /^5\/5 · /.test(lineAfter ?? '') &&
            twa > 120 &&
            twa < 150 &&
            cardGone,
          JSON.stringify({
            backLabel,
            status: after.status,
            step: after.step,
            lineAfter,
            twa,
            cardGone,
          }),
        );
        await shot(page, `live-${name}-m67-back`);
      }

      // 4. Waypoint link: step 4's waypoint opens in a new page at step 4.
      await showExercises(page);
      const href = await page.getByTestId('exercise-waypoint-link-3').getAttribute('href');
      const rows = await page.locator('[data-testid^="exercise-waypoint-back-"]').count();
      check(`waypoint rows ${name}`, rows === 5 && !!href, `${rows} rows, ${href}`);
      problems.push(...(await auditPage(page, `m67 ${name} waypoints`)));
      if (full && href) {
        const search = new URL(href).search;
        const second = await openPage(viewport, 'm67 waypoint', search, { testClock: true });
        await showExercises(second.page);
        const from = await second.page
          .getByTestId('exercise-from-step')
          .innerText()
          .catch(() => '');
        await second.page.getByTestId('exercise-start').click();
        await second.page.waitForTimeout(500);
        const line = await exerciseLine(second.page);
        check(
          `waypoint link ${name}`,
          from === 'This link starts at step 4.' && /^4\/5 · /.test(line ?? ''),
          JSON.stringify({ from, line }),
        );
        await second.context.close();
      }

      if (full) {
        // 6. Try again from the done card: finish step 5, then a fresh run.
        await turn(page, 3);
        await setSpeed(page, FAST);
        const finished = (await waitForStep(page, 5, 40)) <= 40;
        await setSpeed(page, 1);
        await page.waitForTimeout(500);
        await showExercises(page);
        const doneVisible = await page
          .getByTestId('exercise-done')
          .isVisible()
          .catch(() => false);
        if (doneVisible) await page.getByTestId('exercise-again').click();
        await page.waitForTimeout(800);
        await showExercises(page);
        const fresh = await run(page);
        const sheet = (await read(page)).controls.ctl_mainsheet;
        await page.getByTestId('exercise-start').click();
        await page.waitForTimeout(500);
        const started = await run(page);
        check(
          `try again ${name}`,
          finished &&
            doneVisible &&
            fresh.status === 'setup' &&
            fresh.step === 0 &&
            Math.round(sheet) === 30 &&
            started.step === 0 &&
            started.elapsedS < 1,
          JSON.stringify({
            finished,
            doneVisible,
            status: fresh.status,
            sheet,
            elapsed: started.elapsedS,
          }),
        );
      }
      await context.close();
    }

    // 5. Not pausing (phone only: the same code on every size).
    if (full) {
      const { context, page } = await openPage(viewport, 'm67 nopause', `?${START}&debug=1`, {
        testClock: true,
      });
      await showExercises(page);
      await page.getByTestId('exercise-pause-on-mistake').uncheck();
      await page.waitForTimeout(300);
      const search = await waitForLink(page, ['exp=0']);
      await page.getByTestId('exercise-start').click();
      await page.waitForTimeout(500);
      const reached = await toStep5(page);
      await turn(page, 6);
      const gotLee = await waitForMistake(page, 'by-the-lee', 25);
      await page.waitForTimeout(300);
      const state = await run(page);
      const lineNow = await page.getByTestId('step-card-text').innerText();
      const flagged = (await page.getByTestId('step-card').getAttribute('data-tone')) === 'mistake';
      const going = !(await read(page)).paused;
      await page.waitForTimeout(6300);
      const lineLater = await page.getByTestId('step-card-text').innerText();
      const flaggedLater =
        (await page.getByTestId('step-card').getAttribute('data-tone')) === 'mistake';
      check(
        `not pausing ${name}`,
        reached &&
          gotLee &&
          search.includes('exp=0') &&
          state.status === 'running' &&
          going &&
          /^Mistake: /.test(lineNow) &&
          flagged &&
          /^5\/5 · /.test(lineLater) &&
          !flaggedLater,
        JSON.stringify({
          reached,
          gotLee,
          search,
          status: state.status,
          lineNow,
          flagged,
          lineLater,
        }),
      );
      await context.close();
    }
  }
}
