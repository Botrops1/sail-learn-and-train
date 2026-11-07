// M79 (the step bar, PHASE10_PHONE_SPEC 6.8): live checks for scripts/shots.mjs, on the test
// clock. Labels contain "m79". The scenes of 6.6a item 16 are screenshots taken during the runs.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { setSheet, showSection } from './ui.mjs';

export const M79_SCENES = [];

/** Points of sail: seconds allowed per step (PHASE10_PHONE_SPEC 8.6). */
const POS_LIMITS_S = [10, 21, 20, 22, 25];
/** Leaving the berth: seconds allowed per step (8.7). */
const LEAVE_LIMITS_S = [5, 5, 45, 34];
const TICK_MS = 250;

export async function liveM79Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M79 ${what}: ${detail}`);
    console.log(`live M79 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const wide = { name: 'wide-1440x900', width: 1440, height: 900 };
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const run = (page) => page.evaluate(() => window.__sailExercise.state());
  const read = (page) => page.evaluate(() => window.__sailExercise.read());
  const act = (page, action) => page.evaluate((a) => window.__sailExercise.dispatch(a), action);
  const tid = (page, id) => page.getByTestId(id);

  const start = async (page) => {
    await showSection(page, 'exercises');
    await tid(page, 'exercise-start').click();
    await page.waitForTimeout(500);
  };
  /** Taps a bar button `n` times. */
  const tap = async (page, id, n = 1) => {
    for (let i = 0; i < n; i += 1) await tid(page, id).click();
  };
  /** Taps − / + on a control row until the control reads `target`. */
  const setControl = async (page, id, target) => {
    for (let guard = 0; guard < 120; guard += 1) {
      const value = (await read(page)).controls[id];
      if (Math.round(value) === target) return;
      await tid(page, `bar-${id}-${value > target ? 'less' : 'more'}`).click();
    }
    throw new Error(`setControl: ${id} never reached ${target}`);
  };
  /** Waits (app time) until the run is past `step`, or gone wrong; returns the run. */
  const untilPast = async (page, step, limitS) => {
    let r = await run(page);
    const from = r.elapsedS;
    while (r.step <= step && r.status === 'running' && r.elapsedS - from < limitS + 5) {
      await page.waitForTimeout(TICK_MS);
      r = await run(page);
    }
    return { r, tookS: r.elapsedS - from };
  };
  const doneCard = async (page) => {
    await showSection(page, 'exercises');
    for (let i = 0; i < 20; i += 1) {
      if (await tid(page, 'exercise-done').isVisible())
        return tid(page, 'exercise-done').innerText();
      await page.waitForTimeout(TICK_MS);
    }
    return '';
  };

  // 1. Points of sail by taps only.
  {
    const { context, page } = await openPage(
      phone,
      'm79 points of sail by taps',
      '?m=exercise&ex=points-of-sail&step=1&debug=1',
      { testClock: true },
    );
    await start(page);
    const port = (n) => tap(page, 'bar-ap-port', n);
    const script = [
      async () => setControl(page, 'ctl_mainsheet', 12),
      async () => {
        await port(2);
        await setControl(page, 'ctl_mainsheet', 25);
      },
      async () => {
        await port(3);
        await setControl(page, 'ctl_mainsheet', 50);
        await setControl(page, 'ctl_jib_sheet', 100);
      },
      async () => {
        await port(4);
        await setControl(page, 'ctl_mainsheet', 100);
      },
      async () => port(3),
    ];
    const took = [];
    let ok = true;
    for (let step = 0; step < script.length; step += 1) {
      if ((await run(page)).step !== step) {
        ok = false;
        break;
      }
      await script[step]();
      if (step === 1) await shot(page, 'm79-phone-pos-step2');
      const { r, tookS } = await untilPast(page, step, POS_LIMITS_S[step]);
      took.push(Math.round(tookS * 10) / 10);
      if (r.step <= step || tookS > POS_LIMITS_S[step]) ok = false;
      if (r.status !== 'running' && r.status !== 'done') ok = false;
    }
    const text = await doneCard(page);
    check(
      'points of sail by taps only',
      ok && /Well done/i.test(text),
      `steps took ${JSON.stringify(took)} s (limits ${JSON.stringify(POS_LIMITS_S)}); ${text.slice(0, 60)}`,
    );
    await context.close();
  }

  // 2. Leaving the berth by taps only.
  {
    const { context, page } = await openPage(
      phone,
      'm79 leave berth by taps',
      '?m=exercise&ex=leave-berth&step=1&debug=1',
      { testClock: true },
    );
    await start(page);
    const took = [];
    let ok = true;
    const next = async (step) => {
      const { r, tookS } = await untilPast(page, step, LEAVE_LIMITS_S[step]);
      took.push(Math.round(tookS * 10) / 10);
      if (r.step <= step || tookS > LEAVE_LIMITS_S[step]) ok = false;
      if (r.status !== 'running' && r.status !== 'done') ok = false;
    };
    await shot(page, 'm79-phone-leave-step1');
    await tap(page, 'line-ll-letGo-bar');
    await next(0);
    await tap(page, 'line-sp-letGo-bar');
    await tap(page, 'line-ss-letGo-bar');
    await next(1);
    await tap(page, 'bar-lever-ahead', 3);
    await next(2);
    await shot(page, 'm79-phone-leave-step4');
    // Neutral, then bow to starboard and stern to port (two joysticks at once) until about 270°.
    await tap(page, 'bar-lever-astern', 3);
    const bow = tid(page, 'thruster-bow-bar-starboard');
    const stern = tid(page, 'thruster-stern-bar-port');
    const press = (node, type) => node.dispatchEvent(type, { button: 0, pointerId: 1 });
    await press(bow, 'pointerdown');
    await press(stern, 'pointerdown');
    let heading = (await read(page)).headingDeg;
    for (let i = 0; i < 400 && !(heading >= 255 && heading <= 285); i += 1) {
      await page.waitForTimeout(TICK_MS);
      heading = (await read(page)).headingDeg;
    }
    await press(bow, 'pointerup');
    await press(stern, 'pointerup');
    if (!(heading >= 255 && heading <= 285)) ok = false;
    await tap(page, 'bar-lever-ahead', 3);
    await next(3);
    const text = await doneCard(page);
    check(
      'leaving the berth by taps only',
      ok && /Well done/i.test(text),
      `steps took ${JSON.stringify(took)} s (limits ${JSON.stringify(LEAVE_LIMITS_S)}); heading ${Math.round(heading)}; ${text.slice(0, 60)}`,
    );
    await context.close();
  }

  // 3. Layout: the bar inside the view, clear of the chip row, the mini-map and the sheet; at half
  //    sheet it is hidden and it comes back at peek.
  {
    const { context, page } = await openPage(
      phone,
      'm79 layout',
      '?m=exercise&ex=anchor-shore&debug=1',
      { testClock: true },
    );
    await start(page);
    await page.waitForTimeout(500);
    const boxes = () =>
      page.evaluate(() => {
        const rect = (selector) => {
          const node = document.querySelector(selector);
          if (!node || node.hidden || node.offsetParent === null) return null;
          const r = node.getBoundingClientRect();
          return r.width > 0 && r.height > 0
            ? { l: r.left, t: r.top, r: r.right, b: r.bottom }
            : null;
        };
        return {
          bar: rect('[data-testid="exercise-bar"]'),
          chips: rect('[data-testid="view-bottom"]'),
          mini: rect('[data-testid="mini-map"]'),
          sheet: rect('[data-testid="sheet"]'),
          vw: window.innerWidth,
          vh: window.innerHeight,
          scroll:
            document.documentElement.scrollHeight > window.innerHeight + 1 ||
            document.documentElement.scrollWidth > window.innerWidth + 1,
        };
      });
    const overlap = (a, b) => a && b && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
    const peek = await boxes();
    const inside =
      peek.bar &&
      peek.bar.l >= 0 &&
      peek.bar.t >= 0 &&
      peek.bar.r <= peek.vw &&
      peek.bar.b <= peek.vh;
    check(
      'bar fits the view and clears the chip row, the mini-map and the sheet',
      Boolean(
        inside &&
        !overlap(peek.bar, peek.chips) &&
        !overlap(peek.bar, peek.mini) &&
        !overlap(peek.bar, peek.sheet) &&
        !peek.scroll,
      ),
      JSON.stringify(peek),
    );
    await shot(page, 'm79-phone-anchor-step1');
    await setSheet(page, 'half');
    await page.waitForTimeout(300);
    const half = await boxes();
    await setSheet(page, 'peek');
    await page.waitForTimeout(300);
    const back = await boxes();
    check(
      'bar hides at half sheet and returns at peek',
      half.bar === null && back.bar !== null,
      `half ${JSON.stringify(half.bar)}, peek ${JSON.stringify(back.bar)}`,
    );
    problems.push(...(await auditPage(page, 'm79 phone bar')));
    await context.close();
  }

  // 4. Realistic ropes: one placeholder row that opens the Ropes section.
  {
    const { context, page } = await openPage(
      phone,
      'm79 realistic placeholder',
      '?m=exercise&ex=points-of-sail&mode=realistic&step=1&debug=1',
      { testClock: true },
    );
    await start(page);
    const shown = await tid(page, 'bar-row-ropes').isVisible();
    await tid(page, 'bar-ropes-stations').click();
    await page.waitForTimeout(300);
    const open = await page.evaluate(() =>
      document.querySelector('[data-testid="section-ropes"]')?.getAttribute('data-open'),
    );
    check(
      'Realistic placeholder row',
      shown && open === 'true',
      `row ${shown}, ropes open ${open}`,
    );
    await context.close();
  }

  // 5. Keys on a computer.
  {
    const { context, page } = await openPage(
      wide,
      'm79 keys',
      '?m=exercise&ex=points-of-sail&step=1&debug=1',
      { testClock: true },
    );
    await start(page);
    await page.evaluate(() => document.activeElement?.blur());
    await shot(page, 'm79-wide-pos-step1');
    const before = (await read(page)).controls.ctl_mainsheet;
    await page.keyboard.press('1');
    for (let i = 0; i < 4; i += 1) await page.keyboard.press('ArrowLeft');
    const after = (await read(page)).controls.ctl_mainsheet;
    const hasKeys = await tid(page, 'bar-keys').isVisible();
    check(
      'keys: 1 then ← × 4 haul the main sheet in 4 steps',
      Math.round(before - after) === 4 && hasKeys,
      `${before} → ${after}, keys hint ${hasKeys}`,
    );
    await context.close();

    const leave = await openPage(
      wide,
      'm79 keys leave berth',
      '?m=exercise&ex=leave-berth&step=1&debug=1',
      { testClock: true },
    );
    await start(leave.page);
    await leave.page.evaluate(() => document.activeElement?.blur());
    await shot(leave.page, 'm79-wide-leave-step1');
    const lines = (await read(leave.page)).lines;
    await leave.page.keyboard.press('Space');
    await leave.page.waitForTimeout(300);
    const lines2 = (await read(leave.page)).lines;
    check(
      'keys: Space lets go the lazy line',
      lines.includes('ll') && !lines2.includes('ll'),
      `${lines} → ${lines2}`,
    );
    problems.push(...(await auditPage(leave.page, 'm79 wide bar')));
    await leave.context.close();
  }

  // 5b. The side-by-side layout (a tablet, a small laptop): the bar fits and clears the chip row
  //     and the mini-map.
  {
    const side = viewports[1];
    const { context, page } = await openPage(
      side,
      'm79 side layout',
      '?m=exercise&ex=leave-berth&step=1&debug=1',
      { testClock: true },
    );
    await start(page);
    await shot(page, 'm79-side-leave-step1');
    const fit = await page.evaluate(() => {
      const box = (selector) => {
        const node = document.querySelector(selector);
        if (!node || node.hidden || node.offsetParent === null) return null;
        const r = node.getBoundingClientRect();
        return { l: r.left, t: r.top, r: r.right, b: r.bottom };
      };
      const bar = box('[data-testid="exercise-bar"]');
      const others = ['[data-testid="view-bottom"]', '[data-testid="mini-map"]'].map(box);
      const hits = (a, b) => a && b && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
      const view = box('[data-testid="exercise-bar"]') && box('.view');
      const node = document.querySelector('[data-testid="exercise-bar"]');
      return {
        bar,
        view,
        overlaps: others.some((o) => hits(bar, o)),
        overflow: [...node.querySelectorAll('*')].some((n) => n.scrollWidth > n.clientWidth + 1),
        scroll: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    });
    const inside =
      fit.bar &&
      fit.view &&
      fit.bar.l >= fit.view.l &&
      fit.bar.r <= fit.view.r &&
      fit.bar.b <= fit.view.b;
    check(
      'side layout: the bar fits the view and clears the chip row and the mini-map',
      Boolean(inside && !fit.overlaps && !fit.overflow && !fit.scroll),
      JSON.stringify(fit),
    );
    await context.close();
  }

  // 5c. A computer (owner, PR 168): the bar does not push the chip row and the mini-map up. They
  //     stay where they were before Start; on a big screen the bar stands in the same bottom row.
  for (const size of [
    { name: 'wide-1440x900', width: 1440, height: 900, row: false },
    { name: 'big-2200x1000', width: 2200, height: 1000, row: true },
  ]) {
    const { context, page } = await openPage(
      size,
      `m79 bottom row ${size.name}`,
      '?m=exercise&ex=points-of-sail&step=1&debug=1',
      { testClock: true },
    );
    const bottoms = () =>
      page.evaluate(() => {
        const rect = (node) => {
          if (!node || node.hidden || node.offsetParent === null) return null;
          const r = node.getBoundingClientRect();
          return {
            l: Math.round(r.left),
            t: Math.round(r.top),
            r: Math.round(r.right),
            b: Math.round(r.bottom),
          };
        };
        const chips = [...document.querySelectorAll('.view-bottom > *')].map(rect).filter(Boolean);
        return {
          mini: rect(document.querySelector('[data-testid="mini-map"]')),
          chipTop: chips.length ? Math.min(...chips.map((c) => c.t)) : null,
          chipLeft: chips.length ? Math.min(...chips.map((c) => c.l)) : null,
          bar: rect(document.querySelector('[data-testid="exercise-bar"]')),
          place: document.querySelector('[data-testid="exercise-stack"]')?.dataset.place,
        };
      });
    const before = await bottoms();
    await start(page);
    await page.waitForTimeout(500);
    const after = await bottoms();
    const sameRow =
      JSON.stringify(before.mini) === JSON.stringify(after.mini) &&
      before.chipTop === after.chipTop;
    const hits = (a, b) => a && b && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
    const clear =
      after.bar &&
      !hits(after.bar, after.mini) &&
      !(after.chipLeft !== null && after.bar.r > after.chipLeft && after.bar.b > after.chipTop);
    const placed = size.row
      ? after.place === 'row' && after.bar && after.bar.b > after.chipTop
      : after.place === 'above';
    check(
      `computer ${size.name}: the chip row and the mini-map stay at the bottom`,
      Boolean(sameRow && clear && placed),
      `before ${JSON.stringify(before)}, after ${JSON.stringify(after)}`,
    );
    await shot(page, `m79-${size.name}-bottom-row`);
    await context.close();
  }

  // 6. All controls opens the step's section; the Russian bar fits.
  {
    const { context, page } = await openPage(
      phone,
      'm79 all controls',
      '?m=exercise&ex=points-of-sail&step=1&debug=1',
      { testClock: true },
    );
    await start(page);
    await tid(page, 'exercise-bar-all').click();
    await page.waitForTimeout(400);
    const open = await page.evaluate(() =>
      document.querySelector('[data-testid="section-ropes"]')?.getAttribute('data-open'),
    );
    const hidden = await tid(page, 'exercise-bar').isHidden();
    await setSheet(page, 'peek');
    await page.waitForTimeout(300);
    const back = await tid(page, 'exercise-bar').isVisible();
    check(
      'All controls opens the section; the bar comes back at peek',
      open === 'true' && hidden && back,
      `ropes open ${open}, bar hidden ${hidden}, back ${back}`,
    );
    await context.close();
  }
  {
    const { context, page } = await openPage(
      phone,
      'm79 russian',
      '?m=exercise&ex=leave-berth&lang=ru&step=1&debug=1',
      { testClock: true },
    );
    await start(page);
    const fits = () =>
      page.evaluate(() => {
        const bar = document.querySelector('[data-testid="exercise-bar"]');
        const wide = [...bar.querySelectorAll('*')].filter(
          (n) => n.scrollWidth > n.clientWidth + 1,
        );
        return {
          page: document.documentElement.scrollWidth > window.innerWidth + 1,
          wide: wide.map((n) => `${n.tagName}.${n.className}`),
        };
      });
    const first = await fits();
    // The widest step: engine, thrusters and the wheel (step 4), reached with the learner's own actions.
    for (const code of ['ll', 'sp', 'ss'])
      await act(page, { type: 'line', code, command: 'letGo' });
    await act(page, { type: 'engine', command: { leverPct: 15 } });
    let r = await run(page);
    for (let i = 0; i < 400 && r.step < 3 && r.status === 'running'; i += 1) {
      await page.waitForTimeout(TICK_MS);
      r = await run(page);
    }
    const last = await fits();
    await shot(page, 'm79-phone-leave-step4-ru');
    check(
      'Russian bar fits (leave berth, first and fourth step)',
      !first.page &&
        first.wide.length === 0 &&
        !last.page &&
        last.wide.length === 0 &&
        r.step === 3,
      `first ${JSON.stringify(first)}, step ${r.step}: ${JSON.stringify(last)}`,
    );
    await context.close();
  }
}
