// M70 (gusts and too much wind, PHASE10_SPEC 10.7): scenes and live checks for scripts/shots.mjs,
// on the test clock (a run depends on app time). Labels contain "m70", so openPage starts with
// every section folded and sails (no held=1). The long runs are on the phone only (a desktop-size
// 3D frame is ten times slower to draw, and the cards are the same).
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { exerciseLine, showSection } from './ui.mjs';

export const M70_SCENES = [
  {
    name: 'exercise-gusts-setup',
    query: '?m=exercise&ex=gusts',
    section: 'exercises',
    sheet: 'half',
  },
  {
    name: 'exercise-reduce-setup',
    query: '?m=exercise&ex=reduce-sail',
    section: 'exercises',
    sheet: 'half',
  },
];

export async function liveM70Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M70 ${what}: ${detail}`);
    console.log(`live M70 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const desktop = viewports[2];
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const run = (page) => page.evaluate(() => window.__sailExercise.state());
  const read = (page) => page.evaluate(() => window.__sailExercise.read());
  const act = (page, action) => page.evaluate((a) => window.__sailExercise.dispatch(a), action);
  const controls = (page, values) => act(page, { type: 'setControls', values });
  const rows = (page, kind) => page.locator(`[data-testid="debrief-row"][data-kind="${kind}"]`);
  // "Show the controls" folds the Exercises section in the side layout too, so always reopen it.
  const open = (page) => showSection(page, 'exercises');
  const start = async (page) => {
    await open(page);
    await page.getByTestId('exercise-start').click();
    await page.waitForTimeout(500);
  };
  /** Waits (app time) until the run is on `step`, at most `limitS`; `each` runs every 500 ms. */
  const waitForStep = async (page, step, limitS, each) => {
    const from = (await run(page)).elapsedS;
    for (;;) {
      const now = await run(page);
      if (now.step >= step) return true;
      if (now.status === 'mistake' || now.elapsedS - from > limitS) return false;
      if (each) await each();
      await page.waitForTimeout(500);
    }
  };
  /** The UI redraws on the next animation frame; give it a few real retries before giving up. */
  const waitVisible = async (page, testid, triesLeft = 20) => {
    for (let i = 0; i < triesLeft; i += 1) {
      if (await page.getByTestId(testid).isVisible()) return true;
      await page.waitForTimeout(250);
    }
    return false;
  };
  // The GUST badge shows above 1.1 x the mean wind (16.5 kn here): ease the main while it shows.
  const easeInGusts = (page) => async () => {
    const now = await read(page);
    const want = now.twsKn > 16.5 ? 45 : 25;
    if (Math.round(now.controls.ctl_mainsheet) !== want)
      await controls(page, { ctl_mainsheet: want });
  };

  if (phone) {
    // 1. Gusts: the easing policy gets through three gusts, then trim; no mistake.
    {
      const { context, page } = await openPage(phone, 'm70 gusts', '?m=exercise&ex=gusts&debug=1', {
        testClock: true,
      });
      await start(page);
      const first = await exerciseLine(page);
      const policy = easeInGusts(page);
      const s1 = await waitForStep(page, 1, 200, policy);
      const line2 = await exerciseLine(page);
      const s2 = await waitForStep(page, 2, 30, policy);
      await open(page);
      const done = await waitVisible(page, 'exercise-done');
      const mistakeRows = await rows(page, 'mistake').count();
      check(
        `gusts good run ${phone.name}`,
        first?.startsWith('1/2 ·') &&
          line2?.startsWith('2/2 ·') &&
          s1 &&
          s2 &&
          done &&
          mistakeRows === 0,
        JSON.stringify({ first, line2, s1, s2, done, mistakeRows }),
      );
      await shot(page, `live-${phone.name}-m70-gusts-done`);
      problems.push(...(await auditPage(page, `m70 ${phone.name} gusts done`)));
      await context.close();
    }

    // 2. Gusts, sheet held: the mistake card within 60 s of app time.
    {
      const { context, page } = await openPage(
        phone,
        'm70 gusts held',
        '?m=exercise&ex=gusts&debug=1',
        { testClock: true },
      );
      await start(page);
      let seen = false;
      let elapsedS = 0;
      for (let i = 0; i < 130 && !seen; i += 1) {
        await page.waitForTimeout(500);
        const now = await run(page);
        elapsedS = now.elapsedS;
        seen = now.status === 'mistake';
      }
      await open(page);
      const shown = await waitVisible(page, 'exercise-mistake');
      const text = shown ? await page.getByTestId('exercise-mistake').innerText() : '';
      check(
        `gusts held ${phone.name}`,
        seen && elapsedS <= 61 && /heeled too far/.test(text),
        JSON.stringify({ seen, elapsedS, text: text.slice(0, 100) }),
      );
      await shot(page, `live-${phone.name}-m70-gusts-mistake`);
      problems.push(...(await auditPage(page, `m70 ${phone.name} gusts mistake`)));
      await context.close();
    }

    // 3. reduce-sail: the good run, and the actions in the debrief.
    {
      const { context, page } = await openPage(
        phone,
        'm70 reduce',
        '?m=exercise&ex=reduce-sail&debug=1',
        { testClock: true },
      );
      await start(page);
      await controls(page, { ctl_jib_sheet: 100 });
      await page.waitForTimeout(500);
      await controls(page, { ctl_jib_furl: 40 });
      const s1 = await waitForStep(page, 1, 12);
      await controls(page, { ctl_jib_sheet: 75, ctl_main_furl: 60 });
      const s2 = await waitForStep(page, 2, 12);
      await controls(page, { ctl_mainsheet: 35 });
      const s3 = await waitForStep(page, 3, 25);
      await open(page);
      const done = await waitVisible(page, 'exercise-done');
      await page.getByTestId('debrief-actions-toggle').click();
      await page.waitForTimeout(200);
      const listText = await page.getByTestId('debrief-list').innerText();
      const heel = Math.abs((await read(page)).heelDeg);
      check(
        `reduce-sail good run ${phone.name}`,
        s1 &&
          s2 &&
          s3 &&
          done &&
          heel < 20 &&
          /Jib sheet: 30 → 100 %/.test(listText) &&
          /Jib sheet: 100 → 75 %/.test(listText),
        JSON.stringify({ s1, s2, s3, done, heel, listText: listText.slice(0, 300) }),
      );
      await shot(page, `live-${phone.name}-m70-reduce-done`);
      problems.push(...(await auditPage(page, `m70 ${phone.name} reduce done`)));
      await context.close();
    }
  }

  // 4. The list shows "Wind and weather" with both exercises; setup cards audited; Russian fits.
  for (const viewport of [phone, desktop].filter(Boolean)) {
    const name = viewport.name;
    {
      const { context, page } = await openPage(viewport, 'm70 list', '?m=exercise', {
        testClock: true,
      });
      await open(page);
      const body = await page.getByTestId('exercise-panel').innerText();
      const ids = await page
        .locator('[data-testid^="exercise-item-"]')
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-testid')));
      check(
        `list ${name}`,
        /Wind and weather/.test(body) &&
          ids.includes('exercise-item-gusts') &&
          ids.includes('exercise-item-reduce-sail'),
        JSON.stringify(ids),
      );
      problems.push(...(await auditPage(page, `m70 ${name} list`)));
      await context.close();
    }
    for (const id of ['gusts', 'reduce-sail']) {
      const { context, page } = await openPage(viewport, 'm70 setup', `?m=exercise&ex=${id}`, {
        testClock: true,
      });
      await open(page);
      const visible = await page.getByTestId('exercise-setup').isVisible();
      check(`setup card ${id} ${name}`, visible, String(visible));
      problems.push(...(await auditPage(page, `m70 ${name} setup ${id}`)));
      await context.close();
    }
    for (const id of ['gusts', 'reduce-sail']) {
      const { context, page } = await openPage(viewport, 'm70 ru', `?m=exercise&ex=${id}&lang=ru`, {
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
      if (id === 'reduce-sail') await shot(page, `live-${name}-m70-ru-reduce`);
      problems.push(...(await auditPage(page, `m70 ${name} ru ${id}`)));
      await context.close();
    }
  }
}
