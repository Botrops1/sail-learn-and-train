// M71 (setting and furling the sails, Alone or With crew, PHASE10_SPEC 11.8): scenes and live checks
// for scripts/shots.mjs, on the test clock (a run depends on app time). Labels contain "m71", so
// openPage starts with every section folded and sails (no held=1). The long runs are on the phone
// only (a desktop-size 3D frame is ten times slower to draw, and the cards are the same).
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { exerciseLine, showSection } from './ui.mjs';

export const M71_SCENES = [
  {
    name: 'exercise-set-sails-setup',
    query: '?m=exercise&ex=set-sails',
    section: 'exercises',
    sheet: 'half',
  },
  {
    name: 'exercise-furl-sails-setup',
    query: '?m=exercise&ex=furl-sails',
    section: 'exercises',
    sheet: 'half',
  },
];

const W = 'winch_primary_starboard';
const P = 'winch_primary_port';

export async function liveM71Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M71 ${what}: ${detail}`);
    console.log(`live M71 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const desktop = viewports[2];
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const run = (page) => page.evaluate(() => window.__sailExercise.state());
  const read = (page) => page.evaluate(() => window.__sailExercise.read());
  const act = (page, action) => page.evaluate((a) => window.__sailExercise.dispatch(a), action);
  const real = (page, action) => act(page, { type: 'realistic', action });
  const onWinch = async (page, key, winch) => {
    await real(page, { type: 'onWinch', key });
    for (let i = 0; i < 3; i += 1) await real(page, { type: 'turn', winch, delta: 1 });
    await real(page, { type: 'selfTailer', winch, into: true });
  };
  const button = (page, winch, held) => real(page, { type: 'button', winch, held });
  // "Show the controls" folds the Exercises section in the side layout too, so always reopen it.
  const open = (page) => showSection(page, 'exercises');
  const start = async (page) => {
    await open(page);
    await page.getByTestId('exercise-start').click();
    await page.waitForTimeout(500);
  };
  /** Waits (app time) until the run is on `step`, at most `limitS`; `each` runs every 250 ms. */
  const waitForStep = async (page, step, limitS, each) => {
    const from = (await run(page)).elapsedS;
    for (;;) {
      const now = await run(page);
      if (now.step >= step) return true;
      if (now.elapsedS - from > limitS) return false;
      if (each) await each();
      await page.waitForTimeout(250);
    }
  };
  /** Holds a winch button until `done(read)` is true, then lets go (once). */
  const releaser = (page, winch, done) => {
    let held = true;
    return async () => {
      if (held && done(await read(page))) {
        held = false;
        await button(page, winch, false);
      }
    };
  };
  const waitVisible = async (page, testid, triesLeft = 20) => {
    for (let i = 0; i < triesLeft; i += 1) {
      if (await page.getByTestId(testid).isVisible()) return true;
      await page.waitForTimeout(250);
    }
    return false;
  };

  if (phone) {
    // 1. Setup: Realistic and Alone are chosen; Easy hides the crew row.
    {
      const { context, page } = await openPage(phone, 'm71 setup', '?m=exercise&ex=set-sails', {
        testClock: true,
      });
      await open(page);
      const pressed = async (id) => page.getByTestId(id).getAttribute('aria-pressed');
      const realistic = await pressed('exercise-ropes-realistic');
      const alone = await pressed('exercise-crew-alone');
      await page.getByTestId('exercise-ropes-easy').click();
      await page.waitForTimeout(300);
      const hidden = (await page.getByTestId('exercise-crew-alone').count()) === 0;
      await page.getByTestId('exercise-ropes-realistic').click();
      await page.waitForTimeout(300);
      const back = await page.getByTestId('exercise-crew-alone').isVisible();
      check(
        'setup',
        realistic === 'true' && alone === 'true' && hidden && back,
        JSON.stringify({ realistic, alone, hidden, back }),
      );
      await shot(page, `live-${phone.name}-m71-set-sails-setup`);
      problems.push(...(await auditPage(page, `m71 ${phone.name} setup`)));
      await context.close();
    }

    // 2 and 3. Alone: Pause is off with its reason, and the good run reaches the done card.
    {
      const { context, page } = await openPage(
        phone,
        'm71 alone',
        '?m=exercise&ex=set-sails&debug=1',
        { testClock: true },
      );
      await start(page);
      const pause = page.getByTestId('pause-button');
      const disabled = await pause.isDisabled();
      const name = await pause.getAttribute('aria-label');
      await open(page);
      const note = await page.getByTestId('exercise-alone-note').isVisible();
      check(
        `alone ${phone.name}`,
        disabled && name === 'Alone: no Pause in this exercise' && note,
        JSON.stringify({ disabled, name, note }),
      );
      await shot(page, `live-${phone.name}-m71-alone-step`);
      const first = await exerciseLine(page);
      const s1 = await waitForStep(page, 1, 15);
      await real(page, { type: 'station', station: 'starboard' });
      await real(page, { type: 'clutch', key: 'a2', open: true });
      await onWinch(page, 'a3', W);
      await button(page, W, true);
      const s2 = await waitForStep(
        page,
        2,
        40,
        releaser(page, W, (n) => n.controls.ctl_main_furl >= 99),
      );
      await page.waitForTimeout(2000);
      await real(page, { type: 'clutch', key: 'a2', open: false });
      await real(page, { type: 'offWinch', winch: W });
      await act(page, { type: 'autopilot', command: 'wind' });
      for (let i = 0; i < 6; i += 1) {
        await act(page, { type: 'autopilot', command: { turnDeg: -10 } });
      }
      const s3 = await waitForStep(page, 3, 60);
      await real(page, { type: 'station', station: 'port' });
      await real(page, { type: 'clutch', key: 'r1', open: true });
      await real(page, { type: 'station', station: 'starboard' });
      await onWinch(page, 'a5', W);
      await button(page, W, true);
      const s4 = await waitForStep(
        page,
        4,
        80,
        releaser(page, W, (n) => n.controls.ctl_jib_sheet < 50),
      );
      await act(page, { type: 'engine', command: { leverPct: 0 } });
      await act(page, { type: 'engine', command: 'stop' });
      const s5 = await waitForStep(page, 5, 10);
      await open(page);
      const done = await waitVisible(page, 'exercise-done');
      await page.getByTestId('debrief-actions-toggle').click();
      await page.waitForTimeout(200);
      const listText = await page.getByTestId('debrief-list').innerText();
      check(
        `set-sails good run ${phone.name}`,
        first?.startsWith('1/5 ·') &&
          s1 &&
          s2 &&
          s3 &&
          s4 &&
          s5 &&
          done &&
          /Opened the clutch: Main furling/.test(listText),
        JSON.stringify({ first, s1, s2, s3, s4, s5, done, listText: listText.slice(0, 200) }),
      );
      await shot(page, `live-${phone.name}-m71-set-sails-done`);
      problems.push(...(await auditPage(page, `m71 ${phone.name} set-sails done`)));
      await context.close();
    }

    // 4. With crew: Pause works and stops app time.
    {
      const { context, page } = await openPage(
        phone,
        'm71 crew',
        '?m=exercise&ex=set-sails&exc=1&debug=1',
        { testClock: true },
      );
      await open(page);
      const chosen = await page.getByTestId('exercise-crew-crew').getAttribute('aria-pressed');
      await page.getByTestId('exercise-start').click();
      await page.waitForTimeout(500);
      const pause = page.getByTestId('pause-button');
      const enabled = await pause.isEnabled();
      await pause.click();
      await page.waitForTimeout(300);
      const t1 = (await run(page)).elapsedS;
      await page.waitForTimeout(2000);
      const t2 = (await run(page)).elapsedS;
      check(
        `with crew ${phone.name}`,
        chosen === 'true' && enabled && t2 === t1,
        JSON.stringify({ chosen, enabled, t1, t2 }),
      );
      await context.close();
    }

    // 5. furl-sails: the good run reaches the done card.
    {
      const { context, page } = await openPage(
        phone,
        'm71 furl',
        '?m=exercise&ex=furl-sails&debug=1',
        { testClock: true },
      );
      await start(page);
      await act(page, { type: 'engine', command: 'start' });
      const s1 = await waitForStep(page, 1, 5);
      await real(page, { type: 'station', station: 'starboard' });
      await real(page, { type: 'clutch', key: 'a5', open: true });
      await real(page, { type: 'station', station: 'port' });
      await onWinch(page, 'r1', P);
      await button(page, P, true);
      const s2 = await waitForStep(
        page,
        2,
        60,
        releaser(page, P, (n) => n.jibOutPct <= 1),
      );
      await act(page, { type: 'engine', command: { leverPct: 30 } });
      await act(page, { type: 'autopilot', command: 'heading' });
      for (let i = 0; i < 6; i += 1) {
        await act(page, { type: 'autopilot', command: { turnDeg: 10 } });
      }
      const s3 = await waitForStep(page, 3, 30);
      await real(page, { type: 'offWinch', winch: P });
      await real(page, { type: 'clutch', key: 'b3', open: true });
      await real(page, { type: 'station', station: 'starboard' });
      await real(page, { type: 'clutch', key: 'a3', open: true });
      await onWinch(page, 'a2', W);
      await button(page, W, true);
      const s4 = await waitForStep(
        page,
        4,
        45,
        releaser(page, W, (n) => n.controls.ctl_main_furl <= 1),
      );
      await open(page);
      const done = await waitVisible(page, 'exercise-done');
      check(
        `furl-sails good run ${phone.name}`,
        s1 && s2 && s3 && s4 && done,
        JSON.stringify({ s1, s2, s3, s4, done }),
      );
      await shot(page, `live-${phone.name}-m71-furl-sails-done`);
      problems.push(...(await auditPage(page, `m71 ${phone.name} furl-sails done`)));
      await context.close();
    }
  }

  // 6. The list shows "Setting and furling the sails" with both; setup cards audited; Russian fits.
  for (const viewport of [phone, desktop].filter(Boolean)) {
    const name = viewport.name;
    {
      const { context, page } = await openPage(viewport, 'm71 list', '?m=exercise', {
        testClock: true,
      });
      await open(page);
      const body = await page.getByTestId('exercise-panel').innerText();
      const ids = await page
        .locator('[data-testid^="exercise-item-"]')
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-testid')));
      check(
        `list ${name}`,
        /Setting and furling the sails/.test(body) &&
          ids.includes('exercise-item-set-sails') &&
          ids.includes('exercise-item-furl-sails') &&
          ids.length === 8,
        JSON.stringify(ids),
      );
      problems.push(...(await auditPage(page, `m71 ${name} list`)));
      await context.close();
    }
    for (const id of ['set-sails', 'furl-sails']) {
      const { context, page } = await openPage(viewport, 'm71 setup', `?m=exercise&ex=${id}`, {
        testClock: true,
      });
      await open(page);
      const visible = await page.getByTestId('exercise-setup').isVisible();
      check(`setup card ${id} ${name}`, visible, String(visible));
      problems.push(...(await auditPage(page, `m71 ${name} setup ${id}`)));
      await context.close();
    }
    for (const id of ['set-sails', 'furl-sails']) {
      const { context, page } = await openPage(viewport, 'm71 ru', `?m=exercise&ex=${id}&lang=ru`, {
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
      if (id === 'set-sails') await shot(page, `live-${name}-m71-ru-set-sails`);
      problems.push(...(await auditPage(page, `m71 ${name} ru ${id}`)));
      await context.close();
    }
  }

  // 7. Easy choice: Easy is chosen and the Crew row is hidden.
  {
    const { context, page } = await openPage(
      phone,
      'm71 easy',
      '?m=exercise&ex=set-sails&mode=easy',
      { testClock: true },
    );
    await open(page);
    const easy = await page.getByTestId('exercise-ropes-easy').getAttribute('aria-pressed');
    const hidden = (await page.getByTestId('exercise-crew-alone').count()) === 0;
    check('easy choice', easy === 'true' && hidden, JSON.stringify({ easy, hidden }));
    await context.close();
  }
}
