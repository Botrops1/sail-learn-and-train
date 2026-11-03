// M74 (the harbour coach and Leaving the berth, PHASE10_SPEC 16.8): scenes and live checks for
// scripts/shots.mjs, on the test clock. Labels contain "m74". The good run is on the phone only.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { setCamera, showSection } from './ui.mjs';

export const M74_SCENES = [
  {
    name: 'leave-setup',
    query: '?m=exercise&ex=leave-berth',
    section: 'exercises',
    sheet: 'half',
  },
  {
    name: 'leave-setup-hard',
    query: '?m=exercise&ex=leave-berth&exl=hard',
    section: 'exercises',
    sheet: 'half',
  },
];

export async function liveM74Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M74 ${what}: ${detail}`);
    console.log(`live M74 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const run = (page) => page.evaluate(() => window.__sailExercise.state());
  const read = (page) => page.evaluate(() => window.__sailExercise.read());
  const act = (page, action) => page.evaluate((a) => window.__sailExercise.dispatch(a), action);
  const open = (page) => showSection(page, 'exercises');
  const waitVisible = async (page, testid, triesLeft = 20) => {
    for (let i = 0; i < triesLeft; i += 1) {
      if (await page.getByTestId(testid).isVisible()) return true;
      await page.waitForTimeout(250);
    }
    return false;
  };
  const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

  // 1. The Level row: a tap on Hard loads the Hard start.
  {
    const { context, page } = await openPage(
      phone,
      'm74 level',
      '?m=exercise&ex=leave-berth&debug=1',
      {
        testClock: true,
      },
    );
    await open(page);
    const easyPressed = await page.getByTestId('exercise-level-easy').getAttribute('aria-pressed');
    await page.getByTestId('exercise-level-hard').click();
    await page.waitForTimeout(500);
    await open(page);
    const hardPressed = await page.getByTestId('exercise-level-hard').getAttribute('aria-pressed');
    const url = page.url();
    const now = await read(page);
    check(
      'level hard',
      easyPressed === 'true' && hardPressed === 'true' && /exl=hard/.test(url) && now.twsKn === 14,
      `easy ${easyPressed}, hard ${hardPressed}, tws ${now.twsKn}, ${url.slice(-40)}`,
    );
    problems.push(...(await auditPage(page, 'm74 setup card (Level row)')));
    await context.close();
  }

  // 2. A good run at Easy, driven like tests/harbourPilot.ts leavePilot('easy').
  {
    const { context, page } = await openPage(
      phone,
      'm74 good run',
      '?m=exercise&ex=leave-berth&debug=1',
      { testClock: true },
    );
    await open(page);
    await page.getByTestId('exercise-start').click();
    await page.waitForTimeout(500);
    let turned = false;
    let shownOutline = false;
    for (let i = 0; i < 400; i += 1) {
      const r = await run(page);
      if (r.status === 'done') break;
      const now = await read(page);
      if (r.step === 0) await act(page, { type: 'line', code: 'll', command: 'letGo' });
      else if (r.step === 1) {
        await act(page, { type: 'line', code: 'sp', command: 'letGo' });
        await act(page, { type: 'line', code: 'ss', command: 'letGo' });
      } else if (r.step === 2) {
        await act(page, { type: 'engine', command: { leverPct: 15 } });
        if (!shownOutline) {
          shownOutline = true;
          await setCamera(page, 'top');
          await page.waitForTimeout(300);
          await shot(page, 'm74-leave-target');
          await setCamera(page, 'map');
          await page.waitForTimeout(300);
          await shot(page, 'm74-leave-map');
          await setCamera(page, 'helm');
        }
      } else if (r.step === 3) {
        if (!turned && Math.abs(wrap(now.headingDeg - 270)) > 10) {
          await act(page, { type: 'engine', command: { leverPct: 0 } });
          await act(page, { type: 'setControls', values: { ctl_rudder: 30 } });
          await act(page, { type: 'thruster', which: 'bow', dir: 1 });
          await act(page, { type: 'thruster', which: 'stern', dir: -1 });
        } else {
          turned = true;
          await act(page, { type: 'engine', command: { leverPct: 15 } });
          await act(page, { type: 'setControls', values: { ctl_rudder: 0 } });
          await act(page, { type: 'thruster', which: 'bow', dir: 0 });
          await act(page, { type: 'thruster', which: 'stern', dir: 0 });
        }
      }
      if (r.status === 'mistake') break;
      await page.waitForTimeout(250);
    }
    await open(page);
    const done = await waitVisible(page, 'exercise-done');
    let text = done ? await page.getByTestId('exercise-done').innerText() : '';
    const toggle = page.getByTestId('debrief-actions-toggle');
    if (await toggle.isVisible().catch(() => false)) await toggle.click();
    text += await page
      .getByTestId('exercise-debrief')
      .innerText()
      .catch(() => '');
    await shot(page, 'm74-leave-done');
    check(
      'good run',
      done && /Well done/i.test(text) && /Lazy line \(to the bow\): Let go/.test(text),
      text.slice(0, 160),
    );
    await context.close();
  }

  // 3. A touch: backing into the quay with the transom, where no fender hangs.
  {
    const { context, page } = await openPage(
      phone,
      'm74 touch',
      '?m=exercise&ex=leave-berth&exl=normal&debug=1',
      { testClock: true },
    );
    await open(page);
    await page.getByTestId('exercise-start').click();
    await page.waitForTimeout(500);
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
    await open(page);
    await waitVisible(page, 'exercise-mistake');
    const text =
      (await page
        .getByTestId('exercise-mistake')
        .innerText()
        .catch(() => '')) ?? '';
    await shot(page, 'm74-leave-touch');
    check(
      'touch',
      /touched another boat or the quay|hit another boat or the quay/.test(text),
      text.slice(0, 120),
    );
    await context.close();
  }
}
