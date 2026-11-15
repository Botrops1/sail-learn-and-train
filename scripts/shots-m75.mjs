// M75 (entering the berth stern-to, PHASE10_SPEC 17.7): scenes and live checks for
// scripts/shots.mjs, on the test clock. Labels contain "m75". The good run is on the phone only.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { PILOT_SPEED, setSpeed } from './exercise-drive.mjs';
import { setCamera, showSection } from './ui.mjs';

export const M75_SCENES = [
  {
    name: 'enter-setup',
    query: '?m=exercise&ex=enter-berth',
    section: 'exercises',
    sheet: 'half',
  },
  {
    // The busy marina's bow lines (every moored yacht's thin rod, drawn at every level).
    name: 'enter-hard-lines',
    query: '?m=exercise&ex=enter-berth&exl=hard&cam=top',
    sheet: 'peek',
  },
];

// The boat's middle to the transom, and our berth's middle at the Normal level (medium layout).
const TRANSOM_X = -8.6;
const BERTH_EAST_M = 2.75;
const QUAY_FACE_NORTH_M = 1500;

export async function liveM75Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M75 ${what}: ${detail}`);
    console.log(`live M75 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const run = (page) => page.evaluate(() => window.__sailExercise.state());
  const read = (page) => page.evaluate(() => window.__sailExercise.read());
  const act = (page, action) => page.evaluate((a) => window.__sailExercise.dispatch(a), action);
  const lever = async (page, now, pct) => {
    if (now.leverPct !== pct) await act(page, { type: 'engine', command: { leverPct: pct } });
  };
  const thruster = async (page, now, which, dir) => {
    if (now.thrusters[which] !== dir) await act(page, { type: 'thruster', which, dir });
  };
  const waitVisible = async (page, testid, triesLeft = 20) => {
    for (let i = 0; i < triesLeft; i += 1) {
      if (await page.getByTestId(testid).isVisible()) return true;
      await page.waitForTimeout(250);
    }
    return false;
  };
  const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
  const sternOf = (now) => {
    const h = (now.headingDeg * Math.PI) / 180;
    return [now.eastM + TRANSOM_X * Math.sin(h), now.northM + TRANSOM_X * Math.cos(h)];
  };
  const H = (now) => ((now.headingDeg % 360) + 360) % 360;

  // The pilot of tests/harbourPilot.ts enterPilot, one decision per call. `state.phase` is kept
  // between calls; returns once per app tick.
  const pilotTick = async (page, state, now, { skipFenders = false, c = BERTH_EAST_M } = {}) => {
    const [sternE, sternN] = sternOf(now);
    const gap = QUAY_FACE_NORTH_M - sternN;
    const v = now.speedMps;
    const keep = async (lat = true) => {
      const e = sternE - c;
      const h = H(now) - 180;
      await thruster(page, now, 'stern', lat ? (e > 0.3 ? 1 : e < -0.3 ? -1 : 0) : 0);
      await thruster(page, now, 'bow', h > 2 ? -1 : h < -2 ? 1 : 0);
    };
    switch (state.phase) {
      case 0:
        if (!skipFenders) await act(page, { type: 'setFenders', out: true });
        await lever(page, now, 15);
        state.phase = 1;
        break;
      case 1:
        if (now.eastM > c - 18) {
          await lever(page, now, -30);
          state.phase = 2;
        }
        break;
      case 2:
        if (v < 0.1) {
          await lever(page, now, 0);
          await act(page, { type: 'thruster', which: 'bow', dir: 1 });
          await act(page, { type: 'thruster', which: 'stern', dir: -1 });
          state.phase = 3;
        }
        break;
      case 3:
        if (Math.abs(wrap(H(now) - 180)) < 5) {
          await act(page, { type: 'thruster', which: 'bow', dir: 0 });
          await act(page, { type: 'thruster', which: 'stern', dir: 0 });
          state.phase = 4;
        }
        break;
      case 4: {
        const want = gap > 10 ? -0.6 : gap > 5 ? -0.3 : -0.12;
        await keep();
        await lever(page, now, v > want ? -15 : v < want - 0.15 ? 15 : 0);
        if (gap < 2.6) state.phase = 5;
        break;
      }
      case 5:
        await keep();
        await lever(page, now, v < -0.03 ? 15 : 0);
        if (Math.abs(v) < 0.03 && now.leverPct === 0) state.phase = 6;
        break;
      case 6:
        await keep();
        if (!now.lines.includes('sp'))
          await act(page, { type: 'line', code: 'sp', command: 'take' });
        if (!now.lines.includes('ss'))
          await act(page, { type: 'line', code: 'ss', command: 'take' });
        if (now.lines.includes('sp') && now.lines.includes('ss')) {
          await act(page, { type: 'line', code: 'll', command: 'take' });
          state.phase = 7;
        }
        break;
      case 7:
        await keep(false);
        if (now.lines.includes('ll')) {
          await act(page, { type: 'thruster', which: 'bow', dir: 0 });
          state.phase = 8;
        }
        break;
      default:
        await act(page, { type: 'line', code: 'll', command: 'tighten' });
    }
  };

  // 1. A good run at Normal (phone only), driven like enterPilot('normal') through the app's actions.
  {
    const { context, page } = await openPage(
      phone,
      'm75 good run',
      '?m=exercise&ex=enter-berth&exl=normal&debug=1',
      { testClock: true },
    );
    await showSection(page, 'exercises');
    await page.getByTestId('exercise-start').click();
    await page.waitForTimeout(500);
    await setSpeed(page, PILOT_SPEED);
    const state = { phase: 0 };
    let shownBerth = false;
    let last = null;
    for (let i = 0; i < 1500; i += 1) {
      const r = await run(page);
      last = r;
      if (r.status === 'done' || r.status === 'mistake' || r.status === 'failed') break;
      const now = await read(page);
      if (r.step === 1 && !shownBerth) {
        shownBerth = true;
        await setCamera(page, 'top');
        await page.waitForTimeout(300);
        await shot(page, 'm75-enter-reverse');
        await setCamera(page, 'map');
        await page.waitForTimeout(300);
        await shot(page, 'm75-enter-map');
        await setCamera(page, 'helm');
      }
      await pilotTick(page, state, now);
      // Each tick moves the app 0.2 s (× the pilot's scale); Hard-to-miss limits are in tests/harbourExercises.test.ts.
      await page.waitForTimeout(200);
    }
    await showSection(page, 'exercises');
    const done = await waitVisible(page, 'exercise-done');
    const text = done ? await page.getByTestId('exercise-done').innerText() : '';
    await shot(page, 'm75-enter-done');
    check(
      'good run',
      done && /Well done/i.test(text),
      `${text.slice(0, 120)} (status ${last?.status}, step ${last?.step})`,
    );
    await context.close();
  }

  // 2. Fenders in: skip the fenders and back towards the berth: the card "Fenders still in".
  {
    const { context, page } = await openPage(
      phone,
      'm75 fenders in',
      '?m=exercise&ex=enter-berth&exl=normal&debug=1',
      { testClock: true },
    );
    await showSection(page, 'exercises');
    await page.getByTestId('exercise-start').click();
    await page.waitForTimeout(500);
    await setSpeed(page, PILOT_SPEED);
    const state = { phase: 0 };
    for (let i = 0; i < 1100; i += 1) {
      const r = await run(page);
      if (r.status === 'mistake' || r.status === 'failed' || r.status === 'done') {
        break;
      }
      const now = await read(page);
      // Skipping the fenders keeps the coach on step 0, but the boat still goes through the pilot.
      await pilotTick(page, state, now, { skipFenders: true });
      await page.waitForTimeout(200);
    }
    await showSection(page, 'exercises');
    await waitVisible(page, 'exercise-mistake');
    const text = await page
      .getByTestId('exercise-mistake')
      .innerText()
      .catch(() => '');
    await shot(page, 'm75-enter-fenders-in');
    check('fenders in', /fenders in the locker/.test(text), text.slice(0, 120));
    await context.close();
  }

  // 3. Russian: the setup card has no overflow.
  {
    const { context, page } = await openPage(
      phone,
      'm75 ru',
      '?m=exercise&ex=enter-berth&lang=ru',
      {
        testClock: true,
      },
    );
    await showSection(page, 'exercises');
    const overflow = await page.evaluate(() =>
      Math.max(
        0,
        ...[...document.querySelectorAll('.panel-scroll, .section-body')].map(
          (n) => n.scrollWidth - n.clientWidth,
        ),
      ),
    );
    check('Russian setup card fits', overflow <= 0, `overflow ${overflow}`);
    problems.push(...(await auditPage(page, 'm75 setup card ru')));
    await context.close();
  }
}
