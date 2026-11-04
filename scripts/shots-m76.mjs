// M76 (turning in her own length; picking up a mooring buoy, PHASE10_SPEC 18.7): scenes and live
// checks for scripts/shots.mjs, on the test clock. Labels contain "m76". The runs are phone only.
import path from 'node:path';
import { showSection } from './ui.mjs';

export const M76_SCENES = [
  {
    name: 'turn-setup',
    query: '?m=exercise&ex=turn-own-length',
    section: 'exercises',
    sheet: 'half',
  },
  { name: 'turn-circle', query: '?m=exercise&ex=turn-own-length&cam=top', sheet: 'peek' },
  { name: 'buoy-setup', query: '?m=exercise&ex=mooring-buoy', section: 'exercises', sheet: 'half' },
  { name: 'buoy-ring', query: '?m=exercise&ex=mooring-buoy&cam=helm', sheet: 'peek' },
];

// The boat's origin to the stem end: transomX + loa (content/boat/hanse508.json).
const BOW_X = 6.95;
const BUOY = [-1450, 0];
const TICK_S = 0.2;

export async function liveM76Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M76 ${what}: ${detail}`);
    console.log(`live M76 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
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
  const finished = (r) => !r || ['done', 'failed', 'mistake'].includes(r.status);
  const startRun = async (label, query) => {
    const opened = await openPage(phone, label, query, { testClock: true });
    await showSection(opened.page, 'exercises');
    await opened.page.getByTestId('exercise-start').click();
    await opened.page.waitForTimeout(500);
    return opened;
  };

  // 1. A good turn (tests/harbourPilot.ts turnPilot): bursts with the wheel hard over, then the thrusters.
  {
    const { context, page } = await startRun('m76 turn', '?m=exercise&ex=turn-own-length&debug=1');
    let last = null;
    let stepStart = 0;
    let step = -1;
    let ruddered = -1;
    for (let i = 0; i < 1000; i += 1) {
      const r = await run(page);
      last = r;
      if (finished(r)) break;
      const t = i * TICK_S;
      if (r.step !== step) {
        step = r.step;
        stepStart = t;
      }
      const now = await read(page);
      const want = r.step === 0 ? 35 : 0;
      if (ruddered !== want) {
        await act(page, { type: 'setControls', values: { ctl_rudder: want } });
        ruddered = want;
      }
      if (r.step === 0) {
        const k = (t - stepStart) % 15;
        await lever(page, now, k < 2 ? 60 : k < 7 ? 0 : k < 11 && now.speedMps > -0.3 ? -60 : 0);
      } else {
        const off = Math.abs(wrap(now.headingDeg - 270)) > 5;
        await lever(page, now, 0);
        await thruster(page, now, 'bow', off ? 1 : 0);
        await thruster(page, now, 'stern', off ? -1 : 0);
      }
      if (i === 120) await shot(page, 'm76-turn-bursts');
      await page.waitForTimeout(TICK_S * 1000);
    }
    await showSection(page, 'exercises');
    const done = await waitVisible(page, 'exercise-done');
    const text = done ? await page.getByTestId('exercise-done').innerText() : '';
    await shot(page, 'm76-turn-done');
    check(
      'turn good run',
      done && /Well done/i.test(text),
      `${text.slice(0, 100)} (status ${last?.status}, step ${last?.step})`,
    );
    await context.close();
  }

  // 2. A good buoy (buoyPilot): creep at the middle buoy into the wind, pick it up, lie, let go, back away.
  {
    const { context, page } = await startRun('m76 buoy', '?m=exercise&ex=mooring-buoy&debug=1');
    let last = null;
    let shotRing = false;
    for (let i = 0; i < 1500; i += 1) {
      const r = await run(page);
      last = r;
      if (finished(r)) break;
      const now = await read(page);
      const h = (now.headingDeg * Math.PI) / 180;
      const bowE = now.eastM + BOW_X * Math.sin(h);
      const bowN = now.northM + BOW_X * Math.cos(h);
      if (r.step === 0) {
        const d = Math.hypot(BUOY[0] - bowE, BUOY[1] - bowN);
        const want = d > 30 ? 1.0 : d > 8 ? 0.5 : 0.15;
        const brg = (Math.atan2(BUOY[0] - now.eastM, BUOY[1] - now.northM) * 180) / Math.PI;
        const rudder = Math.max(-20, Math.min(20, 2 * wrap(brg - now.headingDeg)));
        await act(page, { type: 'setControls', values: { ctl_rudder: rudder } });
        await lever(
          page,
          now,
          now.speedMps < want - 0.05 ? 15 : now.speedMps > want + 0.1 ? -15 : 0,
        );
        if (d < 12 && !shotRing) {
          shotRing = true;
          await shot(page, 'm76-buoy-close');
        }
      } else if (r.step === 1) {
        await lever(page, now, 0);
        await act(page, { type: 'setControls', values: { ctl_rudder: 0 } });
        if (!now.lines.includes('bl'))
          await act(page, { type: 'line', code: 'bl', command: 'take' });
      } else if (r.step === 3) {
        await act(page, { type: 'line', code: 'bl', command: 'letGo' });
      } else if (r.step === 4) {
        await lever(page, now, -15);
      }
      await page.waitForTimeout(TICK_S * 1000);
    }
    await showSection(page, 'exercises');
    const done = await waitVisible(page, 'exercise-done');
    const text = done ? await page.getByTestId('exercise-done').innerText() : '';
    await shot(page, 'm76-buoy-done');
    check(
      'buoy good run',
      done && /Well done/i.test(text),
      `${text.slice(0, 100)} (status ${last?.status}, step ${last?.step})`,
    );
    await context.close();
  }

  // 3. Out of the circle: ten seconds of two thirds ahead after Start gives the card.
  {
    const { context, page } = await startRun(
      'm76 left circle',
      '?m=exercise&ex=turn-own-length&debug=1',
    );
    await act(page, { type: 'engine', command: { leverPct: 60 } });
    for (let i = 0; i < 50; i += 1) {
      const r = await run(page);
      if (finished(r)) break;
      await page.waitForTimeout(TICK_S * 1000);
    }
    await showSection(page, 'exercises');
    await waitVisible(page, 'exercise-mistake');
    const text = await page
      .getByTestId('exercise-mistake')
      .innerText()
      .catch(() => '');
    await shot(page, 'm76-turn-left-circle');
    check('left the circle', /Out of the circle/.test(text), text.slice(0, 100));
    await context.close();
  }
}
