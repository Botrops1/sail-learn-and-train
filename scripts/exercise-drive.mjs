// Helpers that drive an exercise run from a browser check (the `window.__sailExercise` debug hook,
// `debug=1` in the link). Shared by the M66, M67 and M68 checks, which all start with the same
// good run through the five steps of "Trim through the points of sail".
//
// The pages are on the test clock, so every second of app time costs frames to draw. A good run
// that is only the way to the state a check looks at goes at the highest time scale (`FAST`), as a
// learner could set it with the time bar. A hold or a limit counts the run's own seconds (which the
// scale multiplies), so it means the same at any scale; the scale goes back to ×1 (explicitly: the
// coach resets it only when a step has its own speed-up) before anything that is read after a
// moment of app time, such as the six seconds a mistake shows or a run that must start at 0 s.

/** The fastest scale of the time bar's list (`windModes.timeScales` in content/boat/hanse508.json). */
export const FAST = 16;

/**
 * The scale for a scripted pilot that steers a manoeuvre one decision per tick (the harbour and
 * anchor runs): the manoeuvre is slow, the limits that matter are checked in tests/harbourPilot.ts,
 * and a run in the browser only has to show that the coach, the cards and the controls work.
 */
export const PILOT_SPEED = 4;

export const run = (page) => page.evaluate(() => window.__sailExercise.state());
export const read = (page) => page.evaluate(() => window.__sailExercise.read());
export const act = (page, action) =>
  page.evaluate((a) => window.__sailExercise.dispatch(a), action);
export const controls = (page, values) => act(page, { type: 'setControls', values });

/**
 * Sets the time scale (the time bar's speed). The store ignores a scale the page does not allow;
 * the exercise keeps the scale until a step has its own speed-up, so put it back with
 * `setSpeed(page, 1)` when the fast part is over.
 */
export const setSpeed = (page, scale) => act(page, { type: 'setTimeScale', scale });

/** The autopilot turns 10 degrees to port, `times` times. */
export async function turn(page, times) {
  for (let i = 0; i < times; i += 1) {
    await act(page, { type: 'autopilot', command: { turnDeg: -10 } });
  }
}

/**
 * Waits (app time) until the run is on `step`, at most `limitS` app seconds. Returns the app
 * seconds the run took to start that step (its own `stepStartS`, so a poll that comes late at a
 * high scale does not add to it), or Infinity.
 */
export async function waitForStep(page, step, limitS) {
  const from = (await run(page)).elapsedS;
  for (;;) {
    const now = await run(page);
    if (now.step >= step) return now.stepStartS - from;
    if (now.elapsedS - from > limitS) return Infinity;
    await page.waitForTimeout(500);
  }
}

/**
 * The good run of steps 1 to 4 (M66), leaving the run at step 5, at the scale `speed` (the
 * default FAST; 1 plays it in real time). The scale goes back to ×1 at the end. Returns false if
 * a step takes more app seconds than its limit.
 */
export async function toStep5(page, { speed = FAST } = {}) {
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
  if (speed !== 1) await setSpeed(page, speed);
  let reached = true;
  for (const [index, doStep] of plan.entries()) {
    await doStep();
    if (!((await waitForStep(page, index + 1, 40)) <= 40)) {
      reached = false;
      break;
    }
  }
  if (speed !== 1) await setSpeed(page, 1);
  return reached;
}
