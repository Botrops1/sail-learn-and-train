// M118 (Dinghy exercises, PHASE_DINGHY_SPEC 12.5): live checks for scripts/shots.mjs. Joins the
// m103 group, on the test clock, on the phone, in English. The four runs, the checks and the
// pilots are unit tests (tests/exercisesDinghy.test.ts); here only the real page: the list the
// dinghy offers, Watch playing the capsize exercise through the capsize card, and a touch tap on
// the step bar's mainsheet row moving "Go and stop" on.
import path from 'node:path';
import { read, run, setSpeed, waitForStep } from './exercise-drive.mjs';
import { demoStepCard, exerciseItemTestIds, exerciseLine, setMode, showSection } from './ui.mjs';

export const M118_SCENES = [];

const TICK_MS = 200;

export async function liveM118Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M118 ${what}: ${detail}`);
    console.log(`live M118 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const tid = (page, id) => page.getByTestId(id);

  // 1. The dinghy's list: Exercise among the modes, one group, Dinghy, with its four exercises.
  {
    const { context, page } = await openPage(phone, 'm118 list', '?boat=dinghy', {
      testClock: true,
    });
    await page.waitForTimeout(500);
    await setMode(page, 'exercise');
    await showSection(page, 'exercises');
    await page.waitForTimeout(300);
    const modes = await page
      .locator('[data-testid^="mode-choice-"]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-mode')));
    const items = await page
      .locator('[data-testid^="exercise-item-"]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-testid')));
    const titles = await page
      .locator('[data-testid="exercise-panel"] .section-title')
      .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim()));
    check(
      'the dinghy offers Exercise; the list is one group, Dinghy, with its four exercises',
      modes.join() === 'learn,easy,exercise' &&
        titles.join() === 'Dinghy' &&
        JSON.stringify(items) === JSON.stringify(exerciseItemTestIds('dinghy')) &&
        items.length === 4,
      JSON.stringify({ modes, titles, items }),
    );
    await shot(page, 'm118-phone-list');
    await context.close();
  }

  // 2. Watch plays "Capsize and right her" at ×4: every "Step done" card is tapped on; the capsize
  // card shows while she is over; the run ends with the done card inside 60 s of test time.
  {
    const { context, page } = await openPage(
      phone,
      'm118 watch capsize',
      '?boat=dinghy&m=exercise&ex=dinghy-capsize&debug=1',
      { testClock: true },
    );
    await page.waitForTimeout(500);
    await showSection(page, 'exercises');
    await tid(page, 'exercise-watch').tap();
    await page.waitForTimeout(500);
    await setSpeed(page, 4);
    const seen = new Set();
    const phases = new Set();
    let cardShown = false;
    let testS = 0;
    let state = await run(page);
    if (state !== null) seen.add(state.step);
    while (testS < 60 && state !== null && state.status !== 'done' && state.status !== 'failed') {
      if (await demoStepCard(page).isVisible()) {
        await tid(page, 'exercise-demo-next').tap();
        await page.waitForTimeout(300);
        testS += 0.3;
      } else {
        await page.waitForTimeout(TICK_MS);
        testS += TICK_MS / 1000;
      }
      state = await run(page);
      if (state !== null) seen.add(state.step);
      phases.add((await read(page))?.dinghy?.capsize?.phase);
      cardShown ||= await tid(page, 'capsize-card').isVisible();
    }
    const end = await run(page);
    const mistakes = (end?.log ?? []).filter((entry) => entry.kind === 'mistake').length;
    await showSection(page, 'exercises');
    const doIt = await tid(page, 'exercise-demo-doit').isVisible();
    check(
      'Watch: the pilot passes swim, board, stand and climb-in with the capsize card showing, and ends on the done card within 60 s',
      end?.status === 'done' &&
        doIt &&
        mistakes === 0 &&
        cardShown &&
        [0, 1, 2, 3].every((step) => seen.has(step)) &&
        phases.has('swimming') &&
        phases.has('righting') &&
        phases.has('upright'),
      JSON.stringify({
        status: end?.status,
        doIt,
        mistakes,
        cardShown,
        steps: [...seen],
        phases: [...phases],
        testS: Math.round(testS),
      }),
    );
    await shot(page, 'm118-phone-capsize-done');
    await context.close();
  }

  // 3. Go and stop, Do it myself, touch: the bar shows the mainsheet row, a tap on its − brings
  // the sheet from 100 to 50 (about where the sail reads Good on this beam reach), and within
  // 15 s the step card moves on to "stop".
  {
    const { context, page } = await openPage(
      phone,
      'm118 do it myself',
      '?boat=dinghy&m=exercise&ex=dinghy-go-stop&debug=1',
      { testClock: true },
    );
    await page.waitForTimeout(500);
    await showSection(page, 'exercises');
    await tid(page, 'exercise-start').tap();
    await page.waitForTimeout(500);
    const row = tid(page, 'bar-row-control-ctl_mainsheet');
    const less = tid(page, 'bar-ctl_mainsheet-less');
    const shown = await row.isVisible();
    const box = shown ? await less.boundingBox() : null;
    const sheetNow = async () =>
      Number.parseInt(
        ((await tid(page, 'bar-value-ctl_mainsheet').textContent()) ?? '').trim(),
        10,
      );
    const start = shown ? await sheetNow() : NaN;
    let taps = 0;
    while (shown && (await sheetNow()) > 50 && taps < 40) {
      await less.tap();
      taps += 1;
      await page.waitForTimeout(50);
    }
    const sheet = shown ? await sheetNow() : NaN;
    await shot(page, 'm118-phone-gostop-bar');
    const took = await waitForStep(page, 1, 15);
    const now = await run(page);
    const line = await exerciseLine(page);
    check(
      'Go and stop: the bar has the mainsheet row (touch targets 44 px); − takes the sheet from 100 to 50 and the step card moves to "stop" within 15 s',
      shown &&
        (box?.height ?? 0) >= 44 &&
        start === 100 &&
        sheet <= 50 &&
        took <= 15 &&
        (now?.step ?? 0) >= 1 &&
        (line ?? '').includes('Let the mainsheet go'),
      JSON.stringify({
        shown,
        height: box?.height,
        start,
        sheet,
        taps,
        took,
        step: now?.step,
        line,
      }),
    );
    await shot(page, 'm118-phone-gostop-stop');
    await context.close();
  }
}
