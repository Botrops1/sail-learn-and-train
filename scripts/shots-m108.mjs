// M108 (Gennaker exercises, PHASE_RIGGING_SPEC 10.5): live checks for scripts/shots.mjs. Joins the
// m103 group, on the test clock, on the phone, in English. The good runs, the checks and the
// pilots are unit tests (tests/exercises.test.ts, tests/exercisePilots.test.ts); here only the
// real page: Watch plays each exercise to its done card, and the step bar's gennaker buttons take
// a touch tap.
import path from 'node:path';
import { demoStepCard, showSection } from './ui.mjs';

export const M108_SCENES = [];

const TICK_MS = 200;

export async function liveM108Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M108 ${what}: ${detail}`);
    console.log(`live M108 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const run = (page) => page.evaluate(() => window.__sailExercise.state());
  const act = (page, action) => page.evaluate((a) => window.__sailExercise.dispatch(a), action);
  const tid = (page, id) => page.getByTestId(id);

  /** Watch plays the exercise at ×16: every "Step done" card is tapped on, up to the done card. */
  const watchToTheEnd = async (page) => {
    await showSection(page, 'exercises');
    await tid(page, 'exercise-watch').click();
    await page.waitForTimeout(500);
    await act(page, { type: 'setTimeScale', scale: 16 });
    let stepsDone = 0;
    for (let i = 0; i < 1500; i += 1) {
      const r = await run(page);
      if (r === null || r.status === 'done' || r.status === 'failed') break;
      if (await demoStepCard(page).isVisible()) {
        await tid(page, 'exercise-demo-next').click();
        stepsDone += 1;
        await page.waitForTimeout(300);
      } else await page.waitForTimeout(TICK_MS);
    }
    const r = await run(page);
    return { status: r?.status ?? 'none', stepsDone, log: r?.log ?? [] };
  };

  // 1. Each exercise's Watch run reaches its done card, with no mistake on the way.
  for (const [id, steps] of [
    ['gennaker-rig', 7],
    ['gennaker-gybe', 5],
    ['gennaker-douse', 5],
  ]) {
    const { context, page } = await openPage(
      phone,
      `m108 watch ${id}`,
      `?m=exercise&ex=${id}&debug=1`,
      {
        testClock: true,
      },
    );
    const end = await watchToTheEnd(page);
    const mistakes = end.log.filter((entry) => entry.kind === 'mistake').length;
    await showSection(page, 'exercises');
    const doIt = await tid(page, 'exercise-demo-doit').isVisible();
    check(
      `${id}: Watch reaches the done card (${steps} steps), no mistake`,
      end.status === 'done' && doIt && mistakes === 0,
      `status ${end.status}, steps tapped on ${end.stepsDone}, done card ${doIt}, mistakes ${mistakes}`,
    );
    if (id === 'gennaker-rig') await shot(page, 'm108-phone-rig-done');
    await context.close();
  }

  // 2. gennaker-rig, Do it myself, touch: the bar offers the gennaker's steps, and a tap ticks the first.
  {
    const { context, page } = await openPage(
      phone,
      'm108 do it myself',
      '?m=exercise&ex=gennaker-rig&debug=1',
      { testClock: true },
    );
    await showSection(page, 'exercises');
    await tid(page, 'exercise-start').tap();
    await page.waitForTimeout(500);
    const next = tid(page, 'bar-gennaker-next');
    const shown = await next.isVisible();
    const before = (await run(page))?.step;
    const box = shown ? await next.boundingBox() : null;
    check(
      'Do it myself: the bar shows "Next step", at least 44 px tall',
      shown && (box?.height ?? 0) >= 44,
      `shown ${shown}, height ${box?.height}`,
    );
    await shot(page, 'm108-phone-rig-bar');
    if (shown) await next.tap();
    await page.waitForTimeout(500);
    const after = await run(page);
    check(
      'a touch tap on "Next step" does the first step: the exercise goes on to step 2',
      before === 0 && (after?.step ?? 0) >= 1,
      `step ${before} → ${after?.step}`,
    );
    await showSection(page, 'sails');
    const ticked = await page.getByTestId('gennaker-step-1').getAttribute('data-done');
    check(
      'the Sails section ticks the first rigging step',
      ticked === 'true',
      `data-done ${ticked}`,
    );
    await context.close();
  }
}
