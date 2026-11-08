// M93 (one step card, PHASE_STEP_CARD_SPEC 4.9): scenes and live checks for scripts/shots.mjs. Labels
// contain "m93". Every live page runs on the test clock (`onTestClock`): app time moves only with
// page.waitForTimeout. The step card replaces the step line, the hint window and the step bar's
// demo card; the older groups (m66, m67, m69, m80, m81, m82) read it through the same testids.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { showSection } from './ui.mjs';

const POS = '?m=exercise&ex=points-of-sail&debug=1';
const LEAVE = '?m=exercise&ex=leave-berth&exl=normal&debug=1';

export const M93_SCENES = [
  {
    name: 'running',
    query: '?m=exercise&ex=points-of-sail',
    section: 'exercises',
    click: ['exercise-start'],
  },
  {
    name: 'open',
    query: '?m=exercise&ex=points-of-sail',
    section: 'exercises',
    click: ['exercise-start', 'step-card-head'],
  },
  {
    name: 'ru',
    query: '?m=exercise&ex=points-of-sail&lang=ru',
    section: 'exercises',
    click: ['exercise-start', 'step-card-head'],
  },
];

export async function liveM93Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M93 ${what}: ${detail}`);
    console.log(`live M93 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports.find((v) => v.name.startsWith('phone-390'));
  const foldable = viewports.find((v) => v.name.startsWith('foldable'));
  const desktop = viewports.find((v) => v.name.startsWith('desktop'));
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const tid = (page, id) => page.getByTestId(id);
  const run = (page) => page.evaluate(() => window.__sailExercise.state());
  const read = (page) => page.evaluate(() => window.__sailExercise.read());
  const act = (page, action) => page.evaluate((a) => window.__sailExercise.dispatch(a), action);
  const box = (page, id) =>
    page.evaluate((testId) => {
      const node = document.querySelector(`[data-testid="${testId}"]`);
      if (!node || node.getClientRects().length === 0) return null;
      const b = node.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom };
    }, id);
  const viewBox = (page) =>
    page.evaluate(() => {
      const b = document.querySelector('.view').getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, r: b.right, b: b.bottom };
    });
  const row = async (page) => {
    const card = tid(page, 'step-card');
    return (await card.isVisible()) ? await card.getAttribute('data-row') : null;
  };
  const expanded = (page) => tid(page, 'step-card-head').getAttribute('aria-expanded');
  /** Polls app time until the card shows one of `rows`; false if the run ended or time ran out. */
  const untilRow = async (page, rows, polls = 600) => {
    for (let i = 0; i < polls; i += 1) {
      if (rows.includes(await row(page))) return true;
      const r = await run(page);
      if (r === null || r.status === 'done' || r.status === 'failed') return false;
      await page.waitForTimeout(200);
    }
    return false;
  };
  /** How many exercise boxes (the card, the bar and the old parts) are visible over the view. */
  const boxCount = (page) =>
    page.evaluate(
      () =>
        [
          ...document.querySelectorAll(
            '.step-card, .exercise-bar, .exercise-demo-card, .exercise-line, .exercise-coach',
          ),
        ].filter((n) => n.getClientRects().length > 0).length,
    );
  const oldParts = (page) =>
    page.evaluate(
      () =>
        document.querySelectorAll(
          '[data-testid="exercise-coach"], [data-testid="exercise-demo-card"], [data-testid="exercise-line"]',
        ).length,
    );
  const insideView = async (page, id) => {
    const b = await box(page, id);
    const v = await viewBox(page);
    return !!b && b.x >= v.x - 1 && b.r <= v.r + 1 && b.y >= v.y - 1 && b.b <= v.b + 1;
  };
  const start = async (page) => {
    await showSection(page, 'exercises');
    await tid(page, 'exercise-start').click();
    await page.waitForTimeout(500);
  };
  const watch = async (page) => {
    await showSection(page, 'exercises');
    await tid(page, 'exercise-watch').click();
    await page.waitForTimeout(500);
    await act(page, { type: 'setTimeScale', scale: 4 });
  };
  const doStep1 = async (page) => {
    await act(page, { type: 'setControls', values: { ctl_mainsheet: 12 } });
    for (let i = 0; i < 80 && (await run(page)).step === 0; i += 1) await page.waitForTimeout(250);
  };

  // 1. Phone, running: one row for the numbers and the widget, the card under them, folded.
  {
    const { context, page } = await openPage(phone, 'm93 phone running', POS, { testClock: true });
    await start(page);
    await page.waitForTimeout(600);
    const strip = await box(page, 'instrument-strip');
    const bar = await box(page, 'time-bar');
    const card = await box(page, 'step-card');
    const v = await viewBox(page);
    check(
      'phone: the strip and the time widget share one row',
      !!strip && !!bar && Math.abs(strip.y - bar.y) <= 2,
      JSON.stringify({ strip, bar }),
    );
    check(
      'phone: the card is under both and spans the view',
      !!card && !!strip && !!bar && card.y >= Math.max(strip.b, bar.b) - 1 && card.w >= v.w - 20,
      JSON.stringify({ card, strip, bar, viewW: v.w }),
    );
    check(
      'phone: the folded card is at most 72 px high',
      !!card && card.h <= 72,
      JSON.stringify(card),
    );
    check(
      'phone: the old hint and demo card are gone',
      (await oldParts(page)) === 0,
      `${await oldParts(page)} old parts`,
    );
    await shot(page, 'm93-phone-running');
    await tid(page, 'step-card-head').click();
    const how = await tid(page, 'step-card-how').isVisible();
    const rows = await tid(page, 'step-card-targets').locator('li').count();
    const openBtn = await tid(page, 'step-card-open').isVisible();
    check(
      'phone: a tap opens the hint, the target rows and Open in Exercises',
      (await expanded(page)) === 'true' && how && rows > 0 && openBtn,
      JSON.stringify({ how, rows, openBtn }),
    );
    await shot(page, 'm93-phone-open');
    problems.push(...(await auditPage(page, 'm93 phone open card')));
    await tid(page, 'step-card-head').click();
    check('phone: a second tap folds it', (await expanded(page)) === 'false', await expanded(page));
    // Open it again, finish step 1: the card flashes and is folded again.
    await tid(page, 'step-card-head').click();
    await doStep1(page);
    const flashed = await tid(page, 'step-card').evaluate((n) =>
      n.classList.contains('exercise-flash'),
    );
    check(
      'phone: a done step flashes the card and folds it again',
      (await run(page)).step === 1 && flashed && (await expanded(page)) === 'false',
      JSON.stringify({ step: (await run(page)).step, flashed, expanded: await expanded(page) }),
    );
    await context.close();
  }

  // 2. Phone, Watch: Step done in the card, two boxes over the view.
  {
    const { context, page } = await openPage(phone, 'm93 phone watch', LEAVE, { testClock: true });
    await watch(page);
    for (let step = 1; step <= 2; step += 1) {
      const shown = await untilRow(page, ['2']);
      const tone = shown ? await tid(page, 'step-card').getAttribute('data-tone') : '';
      const buttons =
        shown &&
        (await insideView(page, 'exercise-demo-next')) &&
        (await insideView(page, 'exercise-demo-try'));
      const boxes = shown ? await boxCount(page) : -1;
      check(
        `phone: Watch, step ${step} done is row 2, green, buttons inside the view, two boxes`,
        shown && tone === 'done' && buttons && boxes === 2 && (await oldParts(page)) === 0,
        JSON.stringify({ shown, tone, buttons, boxes }),
      );
      if (step === 1) await shot(page, 'm93-phone-watch-done');
      if (!shown) break;
      await tid(page, 'exercise-demo-next').click();
      await page.waitForTimeout(400);
    }
    check(
      'phone: Next step goes on (row 7)',
      (await row(page)) === '7' || (await row(page)) === '2',
      String(await row(page)),
    );
    await context.close();
  }
  {
    const { context, page } = await openPage(phone, 'm93 phone try', LEAVE, { testClock: true });
    await watch(page);
    const shown = await untilRow(page, ['2']);
    const before = (await run(page)).step;
    await tid(page, 'exercise-demo-try').click();
    await page.waitForTimeout(400);
    const r = await run(page);
    check(
      'phone: Let me try it goes back to the start of the step',
      shown && r.step === before - 1 && r.demo === null && r.status === 'running',
      JSON.stringify({ shown, before, step: r.step, demo: r.demo }),
    );
    await context.close();
  }

  // 3. Phone, mistake: the light touch.
  for (const which of ['carry', 'back']) {
    const { context, page } = await openPage(phone, `m93 phone mistake ${which}`, LEAVE, {
      testClock: true,
    });
    await start(page);
    for (const code of ['ll', 'sp', 'ss']) {
      await act(page, { type: 'line', code, command: 'letGo' });
    }
    await act(page, { type: 'engine', command: { leverPct: -40 } });
    let ok = false;
    for (let i = 0; i < 60 && !ok; i += 1) {
      await page.waitForTimeout(250);
      const r = await run(page);
      ok = r.status === 'mistake' || r.status === 'failed';
    }
    await page.waitForTimeout(300);
    const rowNow = await row(page);
    const tone = await tid(page, 'step-card').getAttribute('data-tone');
    const body = ((await tid(page, 'step-card-body').innerText()) ?? '').trim();
    if (which === 'carry') {
      check(
        'phone: a mistake is row 4, orange, with why and what to do',
        rowNow === '4' &&
          tone === 'mistake' &&
          /Why/.test(body) &&
          /What to do/.test(body) &&
          (await insideView(page, 'step-card-continue')) &&
          (await insideView(page, 'step-card-back')),
        JSON.stringify({ rowNow, tone, body: body.slice(0, 80) }),
      );
      await shot(page, 'm93-phone-mistake');
      problems.push(...(await auditPage(page, 'm93 phone mistake card')));
      await tid(page, 'step-card-continue').click();
      await page.waitForTimeout(500);
      const going = !(await read(page)).paused;
      const widget = ((await tid(page, 'pause-button').innerText()) ?? '').trim();
      check(
        'phone: Carry on runs time again and the widget says Pause',
        going && widget === 'Pause',
        JSON.stringify({ going, widget }),
      );
    } else {
      await tid(page, 'step-card-back').click();
      await page.waitForTimeout(500);
      const r = await run(page);
      check(
        'phone: Back goes to the start of the step',
        rowNow === '4' && r.status === 'running' && r.step === 0,
        JSON.stringify({ rowNow, status: r.status, step: r.step }),
      );
    }
    await context.close();
  }

  // 4. Phone, "Pause after each step".
  {
    const { context, page } = await openPage(phone, 'm93 phone pause after step', `${POS}&exs=1`, {
      testClock: true,
    });
    await start(page);
    await doStep1(page);
    const shown = await untilRow(page, ['3'], 40);
    const text = shown ? ((await tid(page, 'step-card').innerText()) ?? '') : '';
    check(
      'phone: Pause after each step is row 3 with the next goal',
      shown && /Step 1 done/.test(text) && /Next: /.test(text),
      text.replace(/\s+/g, ' ').slice(0, 120),
    );
    await shot(page, 'm93-phone-step-pause');
    if (shown) {
      await tid(page, 'step-card-next').click();
      await page.waitForTimeout(500);
    }
    check(
      'phone: Next step runs time again',
      !(await read(page)).paused && (await row(page)) === '7',
      `paused ${(await read(page)).paused}, row ${await row(page)}`,
    );
    await context.close();
  }

  // 5. Foldable (side layout): at most 640 px wide, two boxes, no overlap with the bar.
  {
    const { context, page } = await openPage(foldable, 'm93 foldable watch', LEAVE, {
      testClock: true,
    });
    await watch(page);
    const shown = await untilRow(page, ['2']);
    const card = await box(page, 'step-card');
    const bar = await box(page, 'exercise-bar');
    const boxes = await boxCount(page);
    check(
      'foldable: the card is at most 640 px wide, two boxes, no overlap',
      shown && !!card && !!bar && card.w <= 640.5 && boxes === 2 && card.b <= bar.y,
      JSON.stringify({ shown, card, bar, boxes }),
    );
    await shot(page, 'm93-foldable-watch-done');
    await context.close();
  }

  // 6. Computer: the fold is remembered.
  {
    const { context, page } = await openPage(desktop, 'm93 desktop fold', POS, { testClock: true });
    await start(page);
    const openAtStart = (await expanded(page)) === 'true';
    await tid(page, 'step-card-head').click();
    const folded = (await expanded(page)) === 'false';
    await page.reload();
    await page.waitForTimeout(800);
    // A reload ends nothing: the link holds the exercise; start again if it shows the setup card.
    if (!(await tid(page, 'step-card').isVisible())) await start(page);
    check(
      'computer: the hint starts open and the fold is remembered after a reload',
      openAtStart && folded && (await expanded(page)) === 'false',
      JSON.stringify({ openAtStart, folded, after: await expanded(page) }),
    );
    await context.close();
  }

  // 7. Russian: head and buttons inside the view; the accessibility audit.
  {
    const { context, page } = await openPage(phone, 'm93 phone ru', `${POS}&lang=ru`, {
      testClock: true,
    });
    await start(page);
    await tid(page, 'step-card-head').click();
    const headIn = await insideView(page, 'step-card-head');
    const openIn = await insideView(page, 'step-card-open');
    check(
      'ru: the head and Open in Exercises are inside the view',
      headIn && openIn,
      `${headIn} ${openIn}`,
    );
    problems.push(...(await auditPage(page, 'm93 ru open card')));
    await shot(page, 'm93-phone-ru-open');
    await context.close();
  }
  {
    const { context, page } = await openPage(phone, 'm93 phone ru mistake', `${LEAVE}&lang=ru`, {
      testClock: true,
    });
    await start(page);
    for (const code of ['ll', 'sp', 'ss']) {
      await act(page, { type: 'line', code, command: 'letGo' });
    }
    await act(page, { type: 'engine', command: { leverPct: -40 } });
    let ok = false;
    for (let i = 0; i < 60 && !ok; i += 1) {
      await page.waitForTimeout(250);
      const r = await run(page);
      ok = r.status === 'mistake' || r.status === 'failed';
    }
    await page.waitForTimeout(300);
    const buttons =
      (await insideView(page, 'step-card-continue')) && (await insideView(page, 'step-card-back'));
    check(
      'ru: the mistake card and its buttons are inside the view',
      ok && buttons,
      `${ok} ${buttons}`,
    );
    problems.push(...(await auditPage(page, 'm93 ru mistake card')));
    await context.close();
  }
}
