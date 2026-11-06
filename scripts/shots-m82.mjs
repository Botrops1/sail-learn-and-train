// M82 (Realistic ropes in the bar, PHASE10_PHONE_SPEC 9.7): live checks for scripts/shots.mjs, on
// the test clock, on the 390 × 844 phone. Labels contain "m82".
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { showSection } from './ui.mjs';

export const M82_SCENES = [];

/** Setting the sails, Realistic, Alone: seconds allowed per step (PHASE10_PHONE_SPEC 9.6). */
const SET_LIMITS_S = [13, 28, 43, 58, 9];
const TICK_MS = 200;
const W_STARBOARD = 'winch_primary_starboard';

export async function liveM82Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M82 ${what}: ${detail}`);
    console.log(`live M82 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const run = (page) => page.evaluate(() => window.__sailExercise.state());
  const read = (page) => page.evaluate(() => window.__sailExercise.read());
  const act = (page, action) => page.evaluate((a) => window.__sailExercise.dispatch(a), action);
  const tid = (page, id) => page.getByTestId(id);
  const tap = async (page, id, n = 1) => {
    for (let i = 0; i < n; i += 1) await tid(page, id).click();
  };
  const flashing = (page, id) =>
    page.evaluate(
      (x) =>
        document.querySelector(`[data-testid="${x}"]`)?.classList.contains('bar-row-flash') ??
        false,
      id,
    );

  /** App time passes only in the waits: poll until the run is past `step` (or the limit). */
  const untilPast = async (page, step, limitS) => {
    let r = await run(page);
    const from = r.elapsedS;
    while (r.step <= step && r.status === 'running' && r.elapsedS - from < limitS + 5) {
      await page.waitForTimeout(250);
      r = await run(page);
    }
    return { r, tookS: r.elapsedS - from };
  };
  /** Holds a button down (pointer) until `done(read)` or the limit, then lets go. */
  const holdUntil = async (page, id, done, limitS) => {
    const button = tid(page, id);
    const box = await button.boundingBox();
    if (!box) throw new Error(`holdUntil: ${id} has no box`);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    let polls = 0;
    try {
      while (!done(await read(page)) && polls * (TICK_MS / 1000) < limitS) {
        await page.waitForTimeout(TICK_MS);
        polls += 1;
      }
    } finally {
      await page.mouse.up();
    }
    return polls * (TICK_MS / 1000);
  };

  // 1. Setting the sails, Realistic, Alone, by taps only.
  {
    const { context, page } = await openPage(
      phone,
      'm82 set sails by taps',
      '?m=exercise&ex=set-sails&debug=1',
      { testClock: true },
    );
    await showSection(page, 'exercises');
    await tid(page, 'exercise-start').click();
    await page.waitForTimeout(500);
    const durations = [];
    let stepStart = (await run(page)).stepStartS;
    const stepDone = async (n) => {
      const { r } = await untilPast(page, n, SET_LIMITS_S[n]);
      // The step's whole time, taps and holds included (app time passes in the waits).
      const tookS = (r.step > n ? r.stepStartS : r.elapsedS) - stepStart;
      stepStart = r.stepStartS;
      durations.push(tookS);
      const mistake = (r.log ?? []).filter((e) => e.kind === 'mistake').map((e) => e.mistakeId);
      check(
        `step ${n + 1} done by taps within ${SET_LIMITS_S[n]} s`,
        (r.step > n || r.status === 'done') && tookS <= SET_LIMITS_S[n],
        `step index ${r.step}, status ${r.status}, ${tookS.toFixed(1)} s, mistakes ${JSON.stringify(mistake)}`,
      );
      return r.step > n || r.status === 'done';
    };

    // Step 1: nothing to do.
    check(
      'step 1 shows "nothing to do" and no station switch',
      (await tid(page, 'bar-nothing').isVisible()) && (await tid(page, 'bar-stations').isHidden()),
      'bar-nothing visible, bar-stations hidden',
    );
    await stepDone(0);

    // Step 2: the main furling clutch and the starboard winch.
    check(
      'step 2 shows the station switch with a dot at Starboard and the hint to go there',
      (await tid(page, 'bar-stations').isVisible()) &&
        (await tid(page, 'bar-station-starboard').locator('.bar-station-dot').isVisible()) &&
        (await tid(page, 'bar-other-station').isVisible()),
      'switch, dot and "nothing at this station" shown while the learner is not at Starboard',
    );
    await shot(page, 'm82-phone-set-step2-other-station');
    await tap(page, 'bar-station-starboard');
    check(
      'at Starboard the rows show and the hint goes',
      (await tid(page, 'bar-clutch-a2').isVisible()) &&
        (await tid(page, 'bar-other-station').isHidden()),
      'clutch row visible',
    );
    await tap(page, 'bar-clutch-a2');
    await tap(page, `bar-winch-${W_STARBOARD}-on`);
    await tap(page, `bar-winch-${W_STARBOARD}-turn`, 3);
    await tap(page, `bar-winch-${W_STARBOARD}-tail`);
    await shot(page, 'm82-phone-set-step2-tailed');
    await holdUntil(
      page,
      `bar-winch-${W_STARBOARD}-hold`,
      (s) => s.controls.ctl_main_furl >= 99,
      60,
    );
    await stepDone(1);

    // Step 3: let the rope stop (a clutch closed on a running rope is a mistake), close the clutch,
    // take the rope off, autopilot to the wind and turn.
    await page.waitForTimeout(2200);
    await tap(page, 'bar-clutch-a2');
    await tap(page, `bar-winch-${W_STARBOARD}-off`);
    await tap(page, 'bar-ap-wind');
    await tap(page, 'bar-ap-port', 6);
    await stepDone(2);

    // Step 4: the Genoa roll clutch at Port, the Genoa sheet on the Starboard winch.
    await tap(page, 'bar-station-port');
    await tap(page, 'bar-clutch-r1');
    await tap(page, 'bar-station-starboard');
    await tap(page, `bar-winch-${W_STARBOARD}-on`);
    await tap(page, `bar-winch-${W_STARBOARD}-turn`, 3);
    await tap(page, `bar-winch-${W_STARBOARD}-tail`);
    await holdUntil(
      page,
      `bar-winch-${W_STARBOARD}-hold`,
      (s) => s.controls.ctl_jib_sheet < 50,
      70,
    );
    await stepDone(3);

    // Step 5: the engine to neutral and off.
    await tap(page, 'bar-lever-astern', 6);
    await tap(page, 'engine-startstop-bar');
    await stepDone(4);
    const r = await run(page);
    const mistakes = (r.log ?? []).filter((e) => e.kind === 'mistake').length;
    check(
      'Setting the sails (Realistic) finished by the bar alone, no mistake',
      r.status === 'done' && mistakes === 0,
      `status ${r.status}, mistakes ${mistakes}, steps ${durations.map((d) => d.toFixed(1)).join(', ')} s`,
    );
    await shot(page, 'm82-phone-set-done');
    await context.close();
  }

  // 2. Watch Furling the sails, Realistic.
  {
    const { context, page } = await openPage(
      phone,
      'm82 watch furl sails',
      '?m=exercise&ex=furl-sails&debug=1',
      { testClock: true },
    );
    await showSection(page, 'exercises');
    check(
      'the setup card offers Watch it for a Realistic exercise',
      await tid(page, 'exercise-watch').isVisible(),
      'exercise-watch visible',
    );
    await tid(page, 'exercise-watch').click();
    await page.waitForTimeout(500);
    await act(page, { type: 'setTimeScale', scale: 4 });
    let sawStations = false;
    let sawWinch = false;
    let cards = 0;
    let shotTaken = false;
    for (let guard = 0; guard < 80; guard += 1) {
      let shown = false;
      for (let i = 0; i < 800; i += 1) {
        if (await tid(page, 'exercise-demo-card').isVisible()) {
          shown = true;
          break;
        }
        const r = await run(page);
        if (r === null || r.status === 'done' || r.status === 'failed') break;
        await page.waitForTimeout(TICK_MS);
        if (await flashing(page, 'bar-stations')) {
          sawStations = true;
          if (!shotTaken) {
            shotTaken = true;
            await shot(page, 'm82-phone-watch-furl-stations');
          }
        }
        if (await flashing(page, 'bar-row-winch-port-winch_primary_port-r1')) sawWinch = true;
      }
      if (!shown) break;
      cards += 1;
      await tid(page, 'exercise-demo-next').click();
      await page.waitForTimeout(300);
    }
    const r = await run(page);
    check(
      'Furling the sails watched to the end (4 step cards or fewer)',
      r.status === 'done' && cards >= 3 && cards <= 4,
      `status ${r.status}, ${cards} cards, ${r.elapsedS.toFixed(1)} s`,
    );
    check('the station switch flashed', sawStations, `seen with bar-row-flash: ${sawStations}`);
    check('the Port winch row flashed', sawWinch, `seen with bar-row-flash: ${sawWinch}`);
    await context.close();
  }

  // 3. Show me in Realistic ropes: the button is on the bar, and the audit.
  {
    const { context, page } = await openPage(
      phone,
      'm82 show me set sails',
      '?m=exercise&ex=set-sails&debug=1',
      { testClock: true },
    );
    await showSection(page, 'exercises');
    await tid(page, 'exercise-start').click();
    await page.waitForTimeout(500);
    check(
      'Show me is on the bar in Realistic ropes',
      await tid(page, 'exercise-bar-showme').isVisible(),
      'exercise-bar-showme visible',
    );
    await untilPast(page, 0, 13);
    await tap(page, 'bar-station-starboard');
    problems.push(...(await auditPage(page, 'm82 phone realistic bar')));
    await context.close();
  }
}
