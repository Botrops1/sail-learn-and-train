// M97 (scripted wind and "A bura is coming", PHASE10_SPEC 27.6): scenes and live checks for
// scripts/shots.mjs, on the test clock (the checks depend on app time).
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { exerciseLine, showSection } from './ui.mjs';

export const M97_SCENES = [
  { name: 'bura-setup', query: '?m=exercise&ex=bura', section: 'exercises', sheet: 'half' },
];

export async function liveM97Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M97 ${what}: ${detail}`);
    console.log(`live M97 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  if (!phone) return;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const run = (page) => page.evaluate(() => window.__sailExercise.state());
  const read = (page) => page.evaluate(() => window.__sailExercise.read());
  const act = (page, action) => page.evaluate((a) => window.__sailExercise.dispatch(a), action);
  const controls = (page, values) => act(page, { type: 'setControls', values });

  // 1. A good run (buraPilot's logic, one decision per 0.2 app seconds): done, no mistake card.
  {
    const { context, page } = await openPage(phone, 'm97 good run', '?m=exercise&ex=bura&debug=1', {
      testClock: true,
    });
    await showSection(page, 'exercises');
    await page.getByTestId('exercise-start').click();
    await page.waitForTimeout(200);
    let shotTaken = false;
    let gustLine = '';
    let maxHeel = 0;
    let maxMean = 0;
    let status = 'running';
    for (let i = 0; i < 4000 && status === 'running'; i += 1) {
      const r = await run(page);
      status = r.status;
      if (status !== 'running') break;
      const now = await read(page);
      maxHeel = Math.max(maxHeel, Math.abs(now.heelDeg ?? 0));
      maxMean = Math.max(maxMean, now.controls.ctl_wind_speed);
      if (r.step === 0) {
        const values =
          r.elapsedS - (r.stepStartS ?? 0) < 1
            ? { ctl_jib_sheet: 100 }
            : { ctl_jib_sheet: 100, ctl_jib_furl: 0 };
        await controls(page, values);
      } else if (r.step === 1) {
        await controls(page, { ctl_main_furl: 45 });
      } else {
        const want = now.twsKn > 1.1 * now.controls.ctl_wind_speed ? 70 : 45;
        if (Math.round(now.controls.ctl_mainsheet) !== want) {
          await controls(page, { ctl_mainsheet: want });
        }
        // The picture of a gust: the first time the wind is 10 % over a bura's mean.
        if (
          !shotTaken &&
          now.controls.ctl_wind_speed > 17 &&
          now.twsKn > 1.1 * now.controls.ctl_wind_speed
        ) {
          gustLine = (await exerciseLine(page)) ?? 'no line';
          await shot(page, 'live-phone-m97-bura-gust');
          shotTaken = true;
        }
      }
      await page.waitForTimeout(200);
    }
    const end = await run(page);
    const mistakes = await page.locator('[data-testid="exercise-mistake"]').count();
    check(
      'good run: done, no mistake card',
      end.status === 'done' && mistakes === 0,
      JSON.stringify({ status: end.status, step: end.step, mistakes, maxHeel, maxMean }),
    );
    check('a gust was met, with the step card on step 3', gustLine.startsWith('3/3 ·'), gustLine);
    check('the bura reached the table (18 kn)', maxMean >= 17.9, `mean ${maxMean.toFixed(2)} kn`);
    check('she stayed upright', maxHeel <= 15, `heel ${maxHeel.toFixed(1)}°`);
    await showSection(page, 'exercises');
    await shot(page, 'live-phone-m97-bura-done');
    problems.push(...(await auditPage(page, 'm97 phone done')));
    await context.close();
  }

  // 2. The Russian setup card does not run off the screen.
  {
    const { context, page } = await openPage(phone, 'm97 ru', '?m=exercise&ex=bura&lang=ru', {
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
    await shot(page, 'live-phone-m97-ru');
    problems.push(...(await auditPage(page, 'm97 phone ru')));
    await context.close();
  }
}
