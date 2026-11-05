// M80 (a clear exercise screen, PHASE10_PHONE_SPEC 7.8): live checks for scripts/shots.mjs, on the
// test clock. Labels contain "m80".
import path from 'node:path';
import { setSheet, showSection } from './ui.mjs';

export const M80_SCENES = [];

export async function liveM80Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M80 ${what}: ${detail}`);
    console.log(`live M80 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const wide = { name: 'wide-1440x900', width: 1440, height: 900 };
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const run = (page) => page.evaluate(() => window.__sailExercise.state());
  const act = (page, action) => page.evaluate((a) => window.__sailExercise.dispatch(a), action);
  const tid = (page, id) => page.getByTestId(id);
  const area = (page) => page.evaluate(() => window.__sailCamera.freeArea());
  const box = (page) => page.evaluate(() => window.__sailCamera.boatBox());
  const labelsShown = (page) => page.locator('.label3d-shown').count();
  const fold = async (page, id) => (await tid(page, id).getAttribute('aria-expanded')) === 'true';
  const fold1 = (page) => localStorageValue(page, 'sail-learn.timeBarFolded');
  const localStorageValue = (page, key) => page.evaluate((k) => localStorage.getItem(k), key);

  const start = async (page) => {
    await showSection(page, 'exercises');
    await tid(page, 'exercise-start').click();
    await page.waitForTimeout(500);
  };
  /** Does the boat's box sit in the middle of the free area (7.8 check 1)? */
  const centred = async (page, what) => {
    const a = await area(page);
    const b = await box(page);
    const height = a.bottom - a.top;
    const centreOff = Math.abs((b.top + b.bottom) / 2 - (a.top + a.bottom) / 2);
    // The boat must also clear the real lower edge of the top area (strip, bar, step line, hint).
    const edge = await page.evaluate(() => {
      const top = document.querySelector('[data-testid="view-top"]').getBoundingClientRect();
      const view = document.querySelector('.view').getBoundingClientRect();
      return top.bottom - view.top;
    });
    const ok =
      centreOff <= 0.15 * height &&
      b.top >= a.top - 8 &&
      b.bottom <= a.bottom + 8 &&
      b.top >= edge - 2;
    check(
      `${what}: boat centred in the free area`,
      ok,
      `free ${Math.round(a.top)}–${Math.round(a.bottom)}, boat ${Math.round(b.top)}–${Math.round(b.bottom)}, top area ends ${Math.round(edge)}, off ${Math.round(centreOff)} px`,
    );
  };
  const near = (a, b, tol) => Math.abs(a - b) <= tol;

  // 1 to 3. Phone, Points of sail.
  {
    const { context, page } = await openPage(
      phone,
      'm80 phone points of sail',
      '?m=exercise&ex=points-of-sail&step=1&debug=1',
      { testClock: true },
    );
    await start(page);
    await page.waitForTimeout(600);
    check(
      'the hint is folded at the start',
      !(await fold(page, 'exercise-coach-toggle')),
      `aria-expanded ${await tid(page, 'exercise-coach-toggle').getAttribute('aria-expanded')}`,
    );
    check(
      'the time bar is folded at the start',
      !(await fold(page, 'time-fold')),
      `aria-expanded ${await tid(page, 'time-fold').getAttribute('aria-expanded')}`,
    );
    check('no 3D label shows', (await labelsShown(page)) === 0, `${await labelsShown(page)} shown`);
    await centred(page, 'phone, peek');
    await shot(page, 'm80-phone-start');

    // 2. The hint opens softly.
    const before = await area(page);
    await tid(page, 'exercise-coach-toggle').click();
    const samples = [];
    for (let i = 0; i < 12; i += 1) {
      await page.waitForTimeout(50);
      samples.push((await area(page)).top.toFixed(0));
    }
    console.log(`m80 samples: ${samples.join(' ')}`);
    const mid = { top: Number(samples[1]) };
    const after = await area(page);
    check(
      'the hint opens softly',
      mid.top > before.top + 0.5 && mid.top < after.top - 0.5 && after.top > before.top,
      `top ${before.top.toFixed(1)} → ${mid.top.toFixed(1)} (100 ms) → ${after.top.toFixed(1)} (600 ms)`,
    );
    await centred(page, 'phone, hint open');
    await shot(page, 'm80-phone-hint-open');
    await tid(page, 'exercise-coach-toggle').click();
    await page.waitForTimeout(600);

    const peek = await area(page);
    await setSheet(page, 'half');
    await page.waitForTimeout(100);
    const sMid = await area(page);
    await page.waitForTimeout(500);
    const half = await area(page);
    check(
      'the sheet snap moves the framing softly',
      half.bottom < peek.bottom - 1 && sMid.bottom <= peek.bottom && sMid.bottom >= half.bottom,
      `bottom ${peek.bottom.toFixed(1)} → ${sMid.bottom.toFixed(1)} → ${half.bottom.toFixed(1)}`,
    );
    await centred(page, 'phone, half sheet');
    await shot(page, 'm80-phone-half');
    await setSheet(page, 'peek');
    await page.waitForTimeout(700);
    const back = await area(page);
    check(
      'back to peek',
      near(back.bottom, peek.bottom, 1),
      `bottom ${back.bottom.toFixed(1)} (was ${peek.bottom.toFixed(1)})`,
    );

    // 3. The next step folds the hint again; the time bar stays as the learner left it.
    const savedBefore = await fold1(page);
    await tid(page, 'exercise-coach-toggle').click();
    await tid(page, 'time-fold').click();
    check(
      'the time bar opens by a tap',
      await fold(page, 'time-fold'),
      'aria-expanded after the tap',
    );
    await act(page, { type: 'setControls', values: { ctl_mainsheet: 12 } });
    for (let i = 0; i < 80 && (await run(page)).step === 0; i += 1) await page.waitForTimeout(250);
    check('step 1 is done', (await run(page)).step === 1, `step ${(await run(page)).step}`);
    check(
      'the next step folds the hint again',
      !(await fold(page, 'exercise-coach-toggle')),
      'aria-expanded after the step change',
    );
    check(
      'the time bar stays open during the run',
      await fold(page, 'time-fold'),
      'aria-expanded after the step change',
    );
    await act(page, { type: 'exercise', command: 'stop' });
    await showSection(page, 'exercises');
    await tid(page, 'exercise-item-points-of-sail').click();
    await start(page);
    check(
      'the next Start shows the time bar folded',
      !(await fold(page, 'time-fold')),
      'aria-expanded after a new Start',
    );
    check(
      'the saved fold is untouched',
      (await fold1(page)) === savedBefore,
      `${savedBefore} → ${await fold1(page)}`,
    );
    await context.close();
  }

  // 4. Wide.
  {
    const { context, page } = await openPage(
      wide,
      'm80 wide points of sail',
      '?m=exercise&ex=points-of-sail&step=1&debug=1',
      { testClock: true },
    );
    await start(page);
    await page.waitForTimeout(800);
    check(
      'wide: the hint is open',
      await fold(page, 'exercise-coach-toggle'),
      `aria-expanded ${await tid(page, 'exercise-coach-toggle').getAttribute('aria-expanded')}`,
    );
    check(
      'wide: no 3D label shows',
      (await labelsShown(page)) === 0,
      `${await labelsShown(page)} shown`,
    );
    await centred(page, 'wide');
    await shot(page, 'm80-wide-start');
    await context.close();
  }
}
