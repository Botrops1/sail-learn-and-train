// M96 (a step's speed-up, a start time, "The afternoon maestral", PHASE10_SPEC 26.7): scenes and
// live checks for scripts/shots.mjs, on the test clock (the checks depend on app time).
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { showSection } from './ui.mjs';

export const M96_SCENES = [
  { name: 'maestral-setup', query: '?m=exercise&ex=maestral', section: 'exercises', sheet: 'half' },
  {
    name: 'exercise-list-meta',
    query: '?m=exercise',
    section: 'exercises',
    sheet: 'half',
    scrollTo: '[data-testid="exercise-item-maestral"]',
  },
];

export async function liveM96Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M96 ${what}: ${detail}`);
    console.log(`live M96 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const tid = (page, id) => page.getByTestId(id);
  const text = async (page, id) => ((await tid(page, id).textContent()) ?? '').trim();
  const run = (page) => page.evaluate(() => window.__sailExercise.state());
  const minutes = (chip) => {
    const m = /(\d{1,2}):(\d{2})/.exec(chip);
    return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
  };

  // 1. The list: every row shows its place; the maestral also its start time.
  {
    const { context, page } = await openPage(phone, 'm96 list', '?m=exercise', {
      testClock: true,
    });
    await showSection(page, 'exercises');
    const maestral = await text(page, 'exercise-meta-maestral');
    const anchor = await text(page, 'exercise-meta-anchor-shore');
    const leave = await text(page, 'exercise-meta-leave-berth');
    check(
      'the list tags the places and the start time',
      maestral === 'Open water · starts 12:20' && anchor === 'Bay' && leave === 'Marina',
      JSON.stringify({ maestral, anchor, leave }),
    );
    await tid(page, 'exercise-item-maestral').scrollIntoViewIfNeeded();
    await shot(page, 'live-phone-m96-list');
    problems.push(...(await auditPage(page, 'm96 phone list')));
    await context.close();
  }

  // 2. The setup card says when it starts; Start runs ×16; 100 s later the wait step is over.
  {
    const { context, page } = await openPage(
      phone,
      'm96 maestral',
      '?m=exercise&ex=maestral&debug=1',
      {
        testClock: true,
      },
    );
    await showSection(page, 'exercises');
    const starts = await text(page, 'exercise-setup-start');
    check('the setup card says "Starts at 12:20"', /Starts at 12:20/.test(starts), starts);
    await tid(page, 'exercise-start').click();
    await tid(page, 'time-open').click();
    const status = await text(page, 'time-status');
    check('Start runs time at ×16', status === '×16', status);
    await page.waitForTimeout(100000);
    const r = await run(page);
    check(
      'after 100 s the wait step is over (the step card is on step 2)',
      r.step === 1 && r.status === 'running',
      `step ${r.step} ${r.status}`,
    );
    const after = await text(page, 'time-status');
    check('the speed is back to ×1 for the sail steps', after === '×1', after);
    await shot(page, 'live-phone-m96-step2');
    await context.close();
  }

  // 3. Watch: the demo plays the wait step at ×16 (the clock moves at least 6 minutes in 30 s).
  {
    const { context, page } = await openPage(phone, 'm96 watch', '?m=exercise&ex=maestral', {
      testClock: true,
    });
    await showSection(page, 'exercises');
    const before = minutes(await text(page, 'clock-chip'));
    await tid(page, 'exercise-watch').click();
    await page.waitForTimeout(30000);
    const moved = minutes(await text(page, 'clock-chip')) - before;
    check('Watch runs the wait step at ×16: 6 minutes or more in 30 s', moved >= 6, `${moved} min`);
    await shot(page, 'live-phone-m96-watch');
    await context.close();
  }

  // 4. The Russian setup card does not run off the screen.
  {
    const { context, page } = await openPage(phone, 'm96 ru', '?m=exercise&ex=maestral&lang=ru', {
      testClock: true,
    });
    await showSection(page, 'exercises');
    const overflow = await page.evaluate(() => {
      const box = document.querySelector('[data-testid="exercise-setup"]');
      return {
        page: document.documentElement.scrollWidth > window.innerWidth + 1,
        box: box ? box.scrollWidth > box.clientWidth + 1 : true,
      };
    });
    check(
      'Russian setup card has no overflow',
      !overflow.page && !overflow.box,
      JSON.stringify(overflow),
    );
    await shot(page, 'live-phone-m96-ru');
    problems.push(...(await auditPage(page, 'm96 phone ru')));
    await context.close();
  }
}
