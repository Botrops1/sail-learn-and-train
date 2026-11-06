// M81 (Watch and Show me, PHASE10_PHONE_SPEC 8.8): live checks for scripts/shots.mjs, on the test
// clock, on the 390 × 844 phone. Labels contain "m81".
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { exerciseLine, showSection } from './ui.mjs';

export const M81_SCENES = [];

/** Points of sail: seconds allowed per step (PHASE10_PHONE_SPEC 8.6). */
const POS_LIMITS_S = [10, 21, 20, 22, 25];
const TICK_MS = 200;

export async function liveM81Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M81 ${what}: ${detail}`);
    console.log(`live M81 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const run = (page) => page.evaluate(() => window.__sailExercise.state());
  const read = (page) => page.evaluate(() => window.__sailExercise.read());
  const act = (page, action) => page.evaluate((a) => window.__sailExercise.dispatch(a), action);
  const tid = (page, id) => page.getByTestId(id);
  const cardShown = (page) => tid(page, 'exercise-demo-card').isVisible();
  const cardTitle = async (page) =>
    ((await tid(page, 'exercise-demo-card').locator('h3').textContent()) ?? '').trim();
  const flashing = (page, row) =>
    page.evaluate(
      (id) =>
        document.querySelector(`[data-testid="${id}"]`)?.classList.contains('bar-row-flash') ??
        false,
      row,
    );

  /** Polls (app time) until the demo card shows or the run is over; returns false on a timeout. */
  const untilCard = async (page, limitPolls, onTick = async () => {}) => {
    for (let i = 0; i < limitPolls; i += 1) {
      if (await cardShown(page)) return true;
      const r = await run(page);
      if (r === null || r.status === 'done' || r.status === 'failed') return false;
      await page.waitForTimeout(TICK_MS);
      await onTick();
    }
    return false;
  };
  const untilStatus = async (page, status, limitPolls) => {
    for (let i = 0; i < limitPolls; i += 1) {
      if ((await run(page))?.status === status) return true;
      await page.waitForTimeout(TICK_MS);
    }
    return false;
  };
  const tap = async (page, id, n = 1) => {
    for (let i = 0; i < n; i += 1) await tid(page, id).click();
  };
  const setControl = async (page, id, target) => {
    for (let guard = 0; guard < 120; guard += 1) {
      const value = (await read(page)).controls[id];
      if (Math.round(value) === target) return;
      await tid(page, `bar-${id}-${value > target ? 'less' : 'more'}`).click();
    }
    throw new Error(`setControl: ${id} never reached ${target}`);
  };
  const untilPast = async (page, step, limitS) => {
    let r = await run(page);
    const from = r.elapsedS;
    while (r.step <= step && r.status === 'running' && r.elapsedS - from < limitS + 5) {
      await page.waitForTimeout(250);
      r = await run(page);
    }
    return { r, tookS: r.elapsedS - from };
  };
  const watch = async (page) => {
    await showSection(page, 'exercises');
    await tid(page, 'exercise-watch').click();
    await page.waitForTimeout(500);
  };

  // 1. Watch Reduce sail.
  {
    const { context, page } = await openPage(
      phone,
      'm81 watch reduce sail',
      '?m=exercise&ex=reduce-sail&step=1&debug=1',
      { testClock: true },
    );
    await showSection(page, 'exercises');
    const startText = (await tid(page, 'exercise-start').textContent())?.trim();
    const order = await page.evaluate(() => {
      const names = [...document.querySelectorAll('.exercise-buttons button')].map((b) =>
        b.getAttribute('data-testid'),
      );
      return names.slice(0, 2).join(',');
    });
    check(
      'the setup card offers Watch it first and "Do it myself"',
      startText === 'Do it myself' && order === 'exercise-watch,exercise-start',
      `start "${startText}", order ${order}`,
    );
    await tid(page, 'exercise-watch').click();
    await page.waitForTimeout(500);
    const line = (await exerciseLine(page)) ?? '';
    check('the step line starts "Watching ·"', line.startsWith('Watching ·'), `"${line}"`);
    await act(page, { type: 'setTimeScale', scale: 16 });
    await page.waitForTimeout(300);
    check(
      'the ×4 cap is said under the time bar',
      await tid(page, 'time-demo-capped').isVisible(),
      'time-demo-capped visible at ×16',
    );
    await page.waitForTimeout(6500);
    check(
      'the ×4 note goes away after a few seconds',
      !(await tid(page, 'time-demo-capped').isVisible()),
      'time-demo-capped hidden after 6.5 s',
    );
    let ok = true;
    const titles = [];
    for (let step = 1; step <= 2; step += 1) {
      const shown = await untilCard(page, 400);
      if (!shown) {
        ok = false;
        break;
      }
      const title = await cardTitle(page);
      const how = ((await tid(page, 'exercise-demo-card').locator('p').textContent()) ?? '').trim();
      titles.push(`${title} / ${how.slice(0, 24)}…`);
      if (title !== `✓ Step ${step} done` || how.length < 10) ok = false;
      if (step === 1) await shot(page, 'm81-phone-watch-step-done');
      await tid(page, 'exercise-demo-next').click();
      await page.waitForTimeout(300);
    }
    check('the step cards come after steps 1 and 2', ok, titles.join(' | '));
    const finished = await untilStatus(page, 'done', 400);
    await showSection(page, 'exercises');
    check(
      'the done card has "Now do it myself"',
      finished && (await tid(page, 'exercise-demo-doit').isVisible()),
      `done ${finished}`,
    );
    await shot(page, 'm81-phone-watch-done');
    await tid(page, 'exercise-list').click();
    await page.waitForTimeout(300);
    const watched = await tid(page, 'exercise-watched-reduce-sail').isVisible();
    const ticked = await tid(page, 'exercise-tick-reduce-sail').count();
    check(
      'the list shows Watched and no tick',
      watched && ticked === 0,
      `watched ${watched}, ticks ${ticked}`,
    );
    await shot(page, 'm81-phone-list-watched');
    await context.close();
  }

  // 2. Watch Gybing.
  {
    const { context, page } = await openPage(
      phone,
      'm81 watch gybing',
      '?m=exercise&ex=gybing&step=1&debug=1',
      { testClock: true },
    );
    await watch(page);
    await act(page, { type: 'setTimeScale', scale: 4 });
    let sawFlash = false;
    let cards = 0;
    for (let guard = 0; guard < 60; guard += 1) {
      const shown = await untilCard(page, 600, async () => {
        if (await flashing(page, 'bar-row-control-ctl_mainsheet')) sawFlash = true;
      });
      if (!shown) break;
      cards += 1;
      await tid(page, 'exercise-demo-next').click();
      await page.waitForTimeout(300);
    }
    const r = await run(page);
    check(
      'Gybing watched to the end within 70 s of app time',
      r.status === 'done' && r.elapsedS <= 70 && cards === 3,
      `status ${r.status}, ${r.elapsedS.toFixed(1)} s, ${cards} cards`,
    );
    check('the main sheet row flashed', sawFlash, `seen with bar-row-flash: ${sawFlash}`);
    await context.close();
  }

  // 3 and 5. Show me, Points of sail step 2; then the debrief.
  {
    const { context, page } = await openPage(
      phone,
      'm81 show me points of sail',
      '?m=exercise&ex=points-of-sail&step=1&debug=1',
      { testClock: true },
    );
    await showSection(page, 'exercises');
    await tid(page, 'exercise-start').click();
    await page.waitForTimeout(500);
    await setControl(page, 'ctl_mainsheet', 12);
    const first = await untilPast(page, 0, POS_LIMITS_S[0]);
    check('step 1 done by taps', first.r.step === 1, `step ${first.r.step}`);
    check(
      'Show me is on the bar',
      await tid(page, 'exercise-bar-showme').isVisible(),
      'exercise-bar-showme visible',
    );
    await tid(page, 'exercise-bar-showme').click();
    await page.waitForTimeout(300);
    const line = (await exerciseLine(page)) ?? '';
    check('the step line starts "Showing ·"', line.startsWith('Showing ·'), `"${line}"`);
    await act(page, { type: 'setTimeScale', scale: 4 });
    const shown = await untilCard(page, 400);
    const title = shown ? await cardTitle(page) : '';
    check('the Now you card appears', shown && title === 'Now you', `"${title}"`);
    check(
      'the bar buttons are disabled while the app plays',
      await tid(page, 'bar-ctl_mainsheet-less').isDisabled(),
      'bar-ctl_mainsheet-less disabled',
    );
    const nowLine = (await exerciseLine(page)) ?? '';
    check(
      'the line points to the card and Resume is off',
      /Now you: tap/.test(nowLine) && (await tid(page, 'pause-button').isDisabled()),
      `"${nowLine}"`,
    );
    await shot(page, 'm81-phone-now-you');
    await tid(page, 'exercise-demo-back').click();
    await page.waitForTimeout(400);
    const r = await run(page);
    const value = ((await tid(page, 'bar-value-ctl_mainsheet').textContent()) ?? '').trim();
    check(
      'back: step 2 again, no demo, the main sheet reads 12 %',
      r.step === 1 && r.demo === null && /^12\b/.test(value),
      `step ${r.step}, demo ${r.demo}, value "${value}"`,
    );
    check(
      'back: the bar is enabled and Show me is there',
      (await tid(page, 'bar-ctl_mainsheet-less').isEnabled()) &&
        (await tid(page, 'exercise-bar-showme').isVisible()),
      'enabled, Show me visible',
    );
    await act(page, { type: 'setTimeScale', scale: 1 });
    // The learner finishes the exercise by taps.
    const script = [
      null,
      async () => {
        await tap(page, 'bar-ap-port', 2);
        await setControl(page, 'ctl_mainsheet', 25);
      },
      async () => {
        await tap(page, 'bar-ap-port', 3);
        await setControl(page, 'ctl_mainsheet', 50);
        await setControl(page, 'ctl_jib_sheet', 100);
      },
      async () => {
        await tap(page, 'bar-ap-port', 4);
        await setControl(page, 'ctl_mainsheet', 100);
      },
      async () => tap(page, 'bar-ap-port', 3),
    ];
    let ok = true;
    const took = [];
    for (let step = 1; step < script.length; step += 1) {
      if ((await run(page)).step !== step) {
        ok = false;
        took.push(`step ${step} not reached (at ${(await run(page)).step})`);
        break;
      }
      await script[step]();
      const { r: after, tookS } = await untilPast(page, step, POS_LIMITS_S[step]);
      took.push(tookS.toFixed(1));
      if (after.step <= step || tookS > POS_LIMITS_S[step]) ok = false;
    }
    const done = await run(page);
    check(
      'the learner finishes the exercise by taps',
      ok && done.status === 'done',
      `status ${done.status}, step ${done.step}, took ${took.join(' / ')}`,
    );
    // 5. The debrief: nothing of the demo between the step-1 entry and the "went back" entry.
    const log = done.log;
    const stepIndex = log.findIndex((e) => e.kind === 'step' && e.step === 0);
    const backIndex = log.findIndex((e) => e.kind === 'back');
    const between = log.slice(stepIndex + 1, backIndex).filter((e) => e.kind === 'action');
    check(
      'the demo’s own moves are not in the log',
      stepIndex >= 0 && backIndex > stepIndex && between.length === 0,
      `${between.length} action entries between the step and the way back`,
    );
    await showSection(page, 'exercises');
    await tid(page, 'debrief-actions-toggle').click();
    const rows = await tid(page, 'debrief-row').allInnerTexts();
    const went = rows.filter((text) => /went back|back/i.test(text)).length;
    check('the debrief shows the way back', went >= 1, `${rows.length} rows, ${went} "back" rows`);
    await context.close();
  }

  // 4. Let me try it, Watch Leaving the berth.
  {
    const { context, page } = await openPage(
      phone,
      'm81 let me try it leave berth',
      '?m=exercise&ex=leave-berth&step=1&debug=1',
      { testClock: true },
    );
    await watch(page);
    const shown = await untilCard(page, 200);
    check('the card after step 1 shows', shown, `shown ${shown}`);
    await tid(page, 'exercise-demo-try').click();
    await page.waitForTimeout(400);
    const r = await run(page);
    const lines = (await read(page)).lines;
    check(
      'Let me try it goes back to step 1 with no demo',
      r.step === 0 && r.demo === null && r.status === 'running' && lines.includes('ll'),
      `step ${r.step}, demo ${r.demo}, lines ${lines.join(',')}`,
    );
    await context.close();
  }

  // 7. Stop watching on a paused card keeps a row's own disabled buttons off (Tacking step 4: the
  // autopilot is off, so its ±10° buttons stay disabled).
  {
    const { context, page } = await openPage(
      phone,
      'm81 stop watching keeps disabled buttons',
      '?m=exercise&ex=tacking&step=1&debug=1',
      { testClock: true },
    );
    await watch(page);
    await act(page, { type: 'setTimeScale', scale: 4 });
    let reached = false;
    for (let guard = 0; guard < 6; guard += 1) {
      if (!(await untilCard(page, 700))) break;
      if ((await run(page)).step === 3) {
        reached = true;
        break;
      }
      await tid(page, 'exercise-demo-next').click();
      await page.waitForTimeout(300);
    }
    const lockedWhile = reached && (await tid(page, 'bar-ap-port').isDisabled());
    if (reached) await tid(page, 'exercise-bar-stopdemo').click();
    await page.waitForTimeout(300);
    const r = await run(page);
    check(
      'Stop watching keeps the autopilot buttons off while the autopilot is off',
      reached && lockedWhile && r.demo === null && (await tid(page, 'bar-ap-port').isDisabled()),
      `reached step 4: ${reached}, demo ${r.demo}`,
    );
    await context.close();
  }

  // 6. Accessibility with the demo card shown, and the Russian card.
  {
    const { context, page } = await openPage(
      phone,
      'm81 audit demo card',
      '?m=exercise&ex=reduce-sail&step=1&debug=1',
      { testClock: true },
    );
    await watch(page);
    await act(page, { type: 'setTimeScale', scale: 16 });
    const shown = await untilCard(page, 400);
    check('the demo card shows for the audit', shown, `shown ${shown}`);
    problems.push(...(await auditPage(page, 'm81 phone demo card')));
    await context.close();
  }
  {
    const { context, page } = await openPage(
      phone,
      'm81 russian demo card',
      '?m=exercise&ex=reduce-sail&lang=ru&step=1&debug=1',
      { testClock: true },
    );
    await watch(page);
    await act(page, { type: 'setTimeScale', scale: 16 });
    const shown = await untilCard(page, 400);
    const fit = await page.evaluate(() => {
      const card = document.querySelector('[data-testid="exercise-demo-card"]');
      const box = card.getBoundingClientRect();
      return {
        right: Math.round(box.right),
        width: window.innerWidth,
        wide: card.scrollWidth > card.clientWidth + 1,
      };
    });
    check(
      'the Russian card fits',
      shown && fit.right <= fit.width && !fit.wide,
      `card right ${fit.right} of ${fit.width}, overflow ${fit.wide}`,
    );
    await shot(page, 'm81-phone-ru-card');
    await context.close();
  }
}
