// M37 (top row of the 3D view, issues #86, #87, #88): scenes and live checks for scripts/shots.mjs
// (PHASE5_SPEC 15). Labels contain "m37", so openPage lets the app open as it does without a link
// (Sailing, Coastal waves, the clock chip shown, every section folded); only the mini-map is hidden.
// The live checks run on the test clock (shots.mjs passes `onTestClock`): waitForTimeout moves the app's time on.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { showSection } from './ui.mjs';

const BOAT = '?wd=60&ws=12';
/** The link of the owner's report (issue #86): big numbers, ×16, the autopilot on. */
const BIG =
  '?v=1&ms=100&js=100&vg=50&tl=100&mf=100&jf=100&rd=5&wd=175&ws=20&cam=top&step=5&detail=high&hdg=359&bs=7.2&ap=hdg&apt=0&tx=16&clk=202606011206';

export const M37_SCENES = [
  { name: 'start', query: `${BOAT}&tx=16` },
  { name: 'big', query: BIG },
  { name: 'held', query: `${BOAT}&held=1` },
  { name: 'folded', query: `${BOAT}&tx=16`, click: ['time-fold'] },
];

/** The windows of the done-when list (issue #87): a small, a usual and a large computer window. */
const W1280 = { name: 'w1280', width: 1280, height: 800 };
const W1920 = { name: 'w1920', width: 1920, height: 1000 };

export async function liveM37Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M37 ${what}: ${detail}`);
    console.log(`live M37 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone, foldable, desktop] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  /** The boxes of the top row, in CSS px, rounded. */
  const boxes = (page) =>
    page.evaluate(() => {
      const r = (id) => {
        const node = document.querySelector(`[data-testid="${id}"]`);
        if (!node || node.getClientRects().length === 0) return null;
        const b = node.getBoundingClientRect();
        return {
          x: Math.round(b.x),
          y: Math.round(b.y),
          w: Math.round(b.width),
          h: Math.round(b.height),
        };
      };
      return {
        top: r('view-top'),
        strip: r('instrument-strip'),
        bar: r('time-bar'),
        clock: r('clock-chip'),
        alert: r('alert-chip'),
        fold: r('time-fold'),
        foldSpeed: r('time-fold-speed'),
        fastest: r('time-fastest'),
      };
    });
  const same = (list, key, field) => new Set(list.map((b) => b[key]?.[field])).size === 1;

  // Computer windows: the strip keeps its size while the numbers change, the bar sits beside it
  // and keeps its size through Pause / Resume and every speed, the chips sit under the bar.
  for (const viewport of [W1280, desktop, W1920]) {
    const name = viewport.name;
    const { context, page } = await openPage(
      viewport,
      `m37 ${name}`,
      `${BOAT}&tx=16&bs=0&ap=hdg&apt=0`,
    );
    const samples = [];
    for (let i = 0; i < 8; i += 1) {
      await page.waitForTimeout(2000);
      samples.push(await boxes(page));
    }
    const first = samples[0];
    check(
      `${name}: the wind box keeps its width and height while the numbers change`,
      same(samples, 'strip', 'w') && same(samples, 'strip', 'h'),
      JSON.stringify(samples.map((b) => b.strip)),
    );
    check(
      `${name}: the time bar does not move`,
      same(samples, 'bar', 'x') && same(samples, 'bar', 'y') && same(samples, 'bar', 'w'),
      JSON.stringify(samples.map((b) => b.bar)),
    );
    check(
      `${name}: the time bar is beside the wind box, on the same row`,
      !!first.strip &&
        !!first.bar &&
        first.bar.x >= first.strip.x + first.strip.w &&
        first.bar.y < first.strip.y + first.strip.h,
      JSON.stringify(first),
    );
    check(
      `${name}: the bar is inside the view`,
      !!first.bar && !!first.top && first.bar.x + first.bar.w <= first.top.x + first.top.w,
      JSON.stringify(first),
    );
    check(
      `${name}: the clock and Attention chips are under the bar`,
      !!first.clock &&
        !!first.alert &&
        !!first.bar &&
        first.clock.y >= first.bar.y + first.bar.h &&
        first.alert.y >= first.bar.y + first.bar.h &&
        first.clock.x + first.clock.w <= first.bar.x + first.bar.w + 1 &&
        first.alert.x + first.alert.w <= first.bar.x + first.bar.w + 1,
      JSON.stringify(first),
    );
    // Jump buttons: left out only in a window about 1,280 px wide, where they would not fit.
    const jumpShown = first.fastest !== null;
    check(
      `${name}: the jump buttons are ${name === 'w1280' ? 'left out' : 'shown'}`,
      jumpShown === (name !== 'w1280'),
      String(jumpShown),
    );
    check(
      `${name}: no ×16 badge in the wind box`,
      (await page.getByTestId('strip-time').count()) === 0,
      'strip-time',
    );
    // Pause says Resume; every speed from ×16 down to ×¼: the bar keeps its size and its row.
    const bars = [first.bar];
    await page.getByTestId('pause-button').click();
    bars.push((await boxes(page)).bar);
    check(
      `${name}: Resume has the width of Pause`,
      (await page.getByTestId('pause-button').innerText()) === 'Resume' &&
        same(
          bars.map((bar) => ({ bar })),
          'bar',
          'w',
        ),
      JSON.stringify(bars),
    );
    await page.getByTestId('pause-button').click();
    const scales = [];
    for (let i = 0; i < 7; i += 1) {
      const b = await boxes(page);
      scales.push({
        scale: await page.getByTestId('time-status').innerText(),
        bar: b.bar,
        beside: !!b.strip && !!b.bar && b.bar.y < b.strip.y + b.strip.h,
      });
      if (i < 6) await page.getByTestId('time-slower').click();
    }
    check(
      `${name}: every speed step keeps the bar's size and row`,
      scales.length === 7 &&
        scales.every((s) => s.beside) &&
        new Set(scales.map((s) => `${s.bar.x},${s.bar.y},${s.bar.w}`)).size === 1 &&
        scales.map((s) => s.scale).join(' ') === '×16 ×8 ×4 ×2 ×1 ×½ ×¼',
      JSON.stringify(scales),
    );
    await shot(page, `live-${name}-open`);
    // Folded: the speed shows under the word Time; the chips stay under the bar.
    await page.getByTestId('time-fold').click();
    const folded = await boxes(page);
    const speedText = await page.getByTestId('time-fold-speed').innerText();
    check(
      `${name}: folded, the speed shows under "Time"`,
      !!folded.fold &&
        !!folded.foldSpeed &&
        speedText === '×¼' &&
        folded.foldSpeed.y >= folded.fold.y + 14 &&
        folded.foldSpeed.y + folded.foldSpeed.h <= folded.fold.y + folded.fold.h,
      JSON.stringify({ speedText, fold: folded.fold, speed: folded.foldSpeed }),
    );
    check(
      `${name}: folded, the chips are still under the bar, and no jump`,
      !!folded.bar &&
        !!folded.clock &&
        folded.clock.y >= folded.bar.y + folded.bar.h &&
        same([first, folded], 'strip', 'w'),
      JSON.stringify(folded),
    );
    await shot(page, `live-${name}-folded`);
    // Back to open for the audit.
    await page.getByTestId('time-fold').click();
    if (name === 'desktop-1440x900') problems.push(...(await auditPage(page, 'm37 top row')));
    await context.close();
  }

  // The same width for every set of numbers while sailing (separate pages: calm, wind autopilot,
  // big values). Held still has no heel and no autopilot, so its box is narrower (as it was); on a
  // phone that keeps the Pause chip beside it, so the top area stays one strip high.
  for (const viewport of [desktop, phone]) {
    const widths = [];
    for (const [label, query] of [
      ['calm', `${BOAT}&ap=off`],
      ['big', BIG],
      ['wind-autopilot', '?wd=130&ws=25&ap=wind&apt=150&bs=12.4&hdg=359'],
      ['held', `${BOAT}&held=1`],
    ]) {
      const { context, page } = await openPage(
        viewport,
        `m37 width ${viewport.name} ${label}`,
        query,
      );
      await page.waitForTimeout(1000);
      const b = await boxes(page);
      widths.push({ label, w: b.strip?.w, h: b.strip?.h, view: b.top?.w });
      await context.close();
    }
    const sailing = widths.filter((w) => w.label !== 'held');
    const held = widths.find((w) => w.label === 'held');
    check(
      `${viewport.name}: the wind box has one width and height while sailing`,
      new Set(sailing.map((w) => w.w)).size === 1 && new Set(sailing.map((w) => w.h)).size === 1,
      JSON.stringify(widths),
    );
    check(
      `${viewport.name}: Held still has a narrower box`,
      !!held && held.w < sailing[0].w,
      JSON.stringify(widths),
    );
  }

  // Phone: the box keeps its width, never wider than the view, and the top row stays as it was.
  {
    const { context, page } = await openPage(phone, 'm37 phone', `${BOAT}&tx=16&bs=0&ap=hdg&apt=0`);
    const samples = [];
    for (let i = 0; i < 6; i += 1) {
      await page.waitForTimeout(2000);
      samples.push(await boxes(page));
    }
    check(
      'phone: the wind box keeps its size',
      same(samples, 'strip', 'w') && same(samples, 'strip', 'h'),
      JSON.stringify(samples.map((b) => b.strip)),
    );
    const b = samples[0];
    check(
      'phone: the box fits the screen',
      !!b.strip && b.strip.x + b.strip.w <= phone.width,
      JSON.stringify(b.strip),
    );
    check(
      'phone: the time bar is under the wind box and the clock chip beside it, as before',
      !!b.bar &&
        !!b.strip &&
        !!b.clock &&
        b.bar.y >= b.strip.y + b.strip.h - 1 &&
        b.clock.y < b.strip.y + b.strip.h,
      JSON.stringify(b),
    );
    check(
      'phone: the top area is not taller than before (two lines and the bar)',
      !!b.top && b.top.h <= 120,
      JSON.stringify(b.top),
    );
    check(
      'phone: the page does not scroll sideways',
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      'scrollWidth',
    );
    await shot(page, 'live-phone-open');
    await page.getByTestId('time-fold').click();
    const folded = await boxes(page);
    check(
      'phone: folded, the speed shows under "Time"',
      (await page.getByTestId('time-fold-speed').innerText()) === '×16' &&
        !!folded.fold &&
        !!folded.foldSpeed &&
        folded.foldSpeed.y >= folded.fold.y + 14,
      JSON.stringify(folded),
    );
    await shot(page, 'live-phone-folded');
    await context.close();
  }

  // Phone, Held still, no clock chip: the Pause chip stays beside the box, as before (the top area
  // is one strip high; with the clock chip shown it wraps under the box, as it did before M37).
  {
    const { context, page } = await openPage(
      phone,
      'm37 phone held',
      `${BOAT}&held=1&ms=60&js=60&clock=0`,
    );
    await page.waitForTimeout(1000);
    const b = await boxes(page);
    check(
      'phone, Held still: Pause is beside the box and the top area is one strip high',
      !!b.top && !!b.strip && !!b.bar && b.bar.y < b.strip.y + b.strip.h && b.top.h <= 70,
      JSON.stringify(b),
    );
    check(
      'phone, Held still: no stray "Time" button',
      (await page.getByTestId('time-fold').count()) === 0 ||
        !(await page.getByTestId('time-fold').isVisible()),
      'hidden',
    );
    await context.close();
  }

  // A narrow side-by-side window (the foldable): too narrow for both, so the bar is under the box
  // and stays there while the numbers change (decided by the width, not by the numbers).
  {
    const { context, page } = await openPage(
      foldable,
      'm37 foldable',
      `${BOAT}&tx=16&bs=0&ap=hdg&apt=0`,
    );
    const samples = [];
    for (let i = 0; i < 5; i += 1) {
      await page.waitForTimeout(2000);
      samples.push(await boxes(page));
    }
    const b = samples[0];
    check(
      'foldable: the bar and the chips keep their place',
      same(samples, 'bar', 'x') && same(samples, 'bar', 'y') && same(samples, 'alert', 'y'),
      JSON.stringify(samples.map((s) => [s.bar, s.alert])),
    );
    check(
      'foldable: the bar is inside the view',
      !!b.bar && !!b.top && b.bar.x >= b.top.x && b.bar.x + b.bar.w <= b.top.x + b.top.w,
      JSON.stringify(b),
    );
    await shot(page, 'live-foldable');
    await context.close();
  }

  // The worn-sail badge opens the sail's Learn entry. Real flogging (sheets eased in 24 kn from
  // ahead, ×16) wears a sail out; the same message is then in the Attention list.
  {
    const { context, page } = await openPage(
      phone,
      'm37 worn sail',
      '?wd=30&ws=24&ms=100&js=100&mf=100&jf=100&tx=16&ap=off&hdg=0&debug=1',
    );
    await page.waitForTimeout(1000);
    check(
      'no worn-sail badge on new sails',
      await page.getByTestId('strip-sail').isHidden(),
      'hidden',
    );
    let worn = false;
    for (let spent = 0; spent < 240_000 && !worn; spent += 500) {
      await page.waitForTimeout(500);
      worn = await page.getByTestId('strip-sail').isVisible();
    }
    check('flogging wears a sail out and the badge shows', worn, String(worn));
    if (worn) {
      await shot(page, 'live-phone-worn-badge');
      await page.getByTestId('strip-sail').click();
      await page.waitForTimeout(500);
      const name = await page.getByTestId('learn-name').innerText();
      check(
        'a tap on the badge opens the sail in Learn',
        (await page.getByTestId('section-learn').getAttribute('data-open')) === 'true' &&
          (name === 'Mainsail' || name === 'Self-tacking jib'),
        name,
      );
      await page.getByTestId('alert-chip').click();
      const items = await page.evaluate(() =>
        [...document.querySelectorAll('[data-testid="alert-item"]')].map((n) => ({
          kind: n.getAttribute('data-kind'),
          text: n.textContent,
          learn: n.querySelector('[data-testid="alert-learn"]')?.getAttribute('data-learn'),
        })),
      );
      check(
        'the Attention list has the worn-sail message with its sail',
        items.length >= 1 &&
          items.every(
            (item) =>
              item.kind === 'sailWorn' &&
              ((item.text.includes('mainsail') && item.learn === 'sail_main') ||
                (item.text.includes('jib') && item.learn === 'sail_jib')),
          ),
        JSON.stringify(items),
      );
      await shot(page, 'live-phone-worn-history');
      await page.getByTestId('alert-learn').first().click();
      await page.waitForTimeout(500);
      const entry = await page.getByTestId('learn-name').innerText();
      check(
        'the "?" opens the same Learn entry as the badge',
        entry === name,
        `${entry} / ${name}`,
      );
      // Wearing on does not write the message again (once per event).
      const before = items.length;
      await page.waitForTimeout(10_000);
      await page.getByTestId('alert-chip').click();
      const after = await page.getByTestId('alert-item').count();
      check('worse wear does not repeat the message', after === before, `${before} -> ${after}`);
    }
    // Both sails worn, the jib the worse: the badge opens the jib (a state set through the debug hook).
    await page.evaluate(() => window.__sailDebug.setDamage(0.6, 0.7));
    await page.waitForTimeout(500);
    await page.getByTestId('strip-sail').click();
    await page.waitForTimeout(500);
    check(
      'with the jib worse, the badge opens the jib entry',
      (await page.getByTestId('learn-name').innerText()) === 'Self-tacking jib',
      await page.getByTestId('learn-name').innerText(),
    );
    await context.close();
  }

  // The GUST badge opens its Learn entry (a computer window, the Learn section in the second column).
  {
    const { context, page } = await openPage(
      desktop,
      'm37 gust',
      '?wd=90&ws=12&ms=40&js=100&wm=gusty&seed=7&wg=60&tx=16&cam=side-port',
    );
    let seen = false;
    for (let i = 0; i < 400 && !seen; i += 1) {
      await page.waitForTimeout(100);
      seen = await page.getByTestId('strip-gust').isVisible();
    }
    check('GUST badge shows', seen, String(seen));
    if (seen) {
      await page.getByTestId('strip-gust').click();
      await page.waitForTimeout(500);
      check(
        'a tap on GUST opens the Gust entry in Learn',
        (await page.getByTestId('learn-name').innerText()) === 'Gust',
        await page.getByTestId('learn-name').innerText(),
      );
    }
    await context.close();
  }

  // The engine badge opens its Learn entry; the strip's own tap still opens Conditions.
  {
    const { context, page } = await openPage(phone, 'm37 engine', `${BOAT}&eng=1&lv=40`);
    await page.waitForTimeout(1000);
    check('the engine badge shows', await page.getByTestId('strip-engine').isVisible(), 'visible');
    await page.getByTestId('strip-engine').click();
    await page.waitForTimeout(500);
    check(
      'a tap on the engine badge opens its Learn entry',
      (await page.getByTestId('section-learn').getAttribute('data-open')) === 'true' &&
        (await page.getByTestId('learn-name').innerText()) !== '',
      await page.getByTestId('learn-name').innerText(),
    );
    await showSection(page, 'ropes');
    await page.getByTestId('strip-main').click();
    await page.waitForTimeout(500);
    check(
      'a tap on the numbers opens Conditions',
      (await page.getByTestId('section-conditions').getAttribute('data-open')) === 'true',
      'conditions',
    );
    await context.close();
  }
}
