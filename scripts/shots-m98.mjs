// M98 (A night at anchor, sign-off of part 10c, PHASE10_SPEC 28.6): scenes and live checks for
// scripts/shots.mjs, on the test clock (the night at ×240 takes about 186 s of its time).
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { PILOT_SPEED, setSpeed } from './exercise-drive.mjs';
import { setCamera, showSection } from './ui.mjs';

export const M98_SCENES = [
  {
    name: 'night-setup',
    query: '?m=exercise&ex=night-anchor',
    section: 'exercises',
    sheet: 'half',
  },
];

const DROP = [-1600, 0];
const STERN_X = -8.6; // transomX (content/boat/hanse508.json)
const BOW_X = 15.55 - 8.6; // transomX + loa
const TICK_S = 0.2;

export async function liveM98Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M98 ${what}: ${detail}`);
    console.log(`live M98 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  if (!phone) return;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const run = (page) => page.evaluate(() => window.__sailExercise.state());
  const read = (page) => page.evaluate(() => window.__sailExercise.read());
  const act = (page, action) => page.evaluate((a) => window.__sailExercise.dispatch(a), action);
  const text = async (page, id) => ((await page.getByTestId(id).textContent()) ?? '').trim();
  const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
  const finished = (r) => !r || ['done', 'failed', 'mistake'].includes(r.status);
  const minutes = (chip) => {
    const m = /(\d{1,2}):(\d{2})/.exec(chip);
    return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
  };
  const waitVisible = async (page, testid, triesLeft = 20) => {
    for (let i = 0; i < triesLeft; i += 1) {
      if (await page.getByTestId(testid).isVisible()) return true;
      await page.waitForTimeout(250);
    }
    return false;
  };

  // 1. The list row carries the place and the start time.
  {
    const { context, page } = await openPage(phone, 'm98 list', '?m=exercise', { testClock: true });
    await showSection(page, 'exercises');
    const meta = await text(page, 'exercise-meta-night-anchor');
    check('the list row says "Bay · starts 18:30"', meta === 'Bay · starts 18:30', meta);
    await context.close();
  }

  // 2. A good run (nightPilot's logic through window.__sailExercise): the anchoring of M77's
  //    check, then the night at ×240 (nothing to do), the done card at 07:00.
  {
    const { context, page } = await openPage(
      phone,
      'm98 night run',
      '?m=exercise&ex=night-anchor&debug=1',
      { testClock: true },
    );
    await showSection(page, 'exercises');
    await page.getByTestId('exercise-start').click();
    await page.waitForTimeout(500);
    // The anchoring goes at the pilot's time scale (exercise-drive.mjs); the night sets ×240 itself.
    await setSpeed(page, PILOT_SPEED);
    let last = null;
    let more = false;
    let lastTighten = -1;
    let windlass = 'off';
    let thruster = 0;
    let lever = 0;
    let nightShot = false;
    let nightChip = '';
    const setLever = async (pct) => {
      if (lever !== pct) await act(page, { type: 'engine', command: { leverPct: pct } });
      lever = pct;
    };
    const setWindlass = async (motion) => {
      if (windlass !== motion) await act(page, { type: 'windlass', motion });
      windlass = motion;
    };
    const setBow = async (dir) => {
      if (thruster !== dir) await act(page, { type: 'thruster', which: 'bow', dir });
      thruster = dir;
    };
    for (let i = 0; i < 4000; i += 1) {
      const r = await run(page);
      last = r;
      if (finished(r)) break;
      const t = r.elapsedS;
      if (r.step === 6) {
        // The night: nothing to do; look at the clock once a second and take the picture after
        // the squall has started (04:05 or later: 245 minutes after midnight).
        const chip = await text(page, 'clock-chip');
        const m = minutes(chip);
        if (!nightShot && m >= 245 && m < 12 * 60) {
          nightShot = true;
          nightChip = chip;
          await setCamera(page, 'top');
          await shot(page, 'live-phone-m98-night-0400');
        }
        await page.waitForTimeout(1000);
        continue;
      }
      const now = await read(page);
      const h = (now.headingDeg * Math.PI) / 180;
      const v = now.speedMps;
      const off = wrap(now.headingDeg - 90);
      const hold = off > 3 ? -1 : off < -3 ? 1 : 0;
      if (r.step === 0) {
        const bowE = now.eastM + BOW_X * Math.sin(h);
        const bowN = now.northM + BOW_X * Math.cos(h);
        const d = Math.hypot(bowE - DROP[0], bowN - DROP[1]);
        await setBow(hold);
        await setLever(d > 3 ? (v > -0.3 ? -15 : 0) : v < -0.05 ? 15 : 0);
      } else if (r.step === 1) {
        await setLever(0);
        await setWindlass('down');
      } else if (r.step === 2) {
        await setBow(hold);
        await setLever(v > -0.25 ? -15 : 0);
      } else if (r.step === 3) {
        await setWindlass('off');
        await setBow(hold);
        await setLever(-40);
      } else if (r.step === 4) {
        const sternE = now.eastM + STERN_X * Math.sin(h);
        if (!more) {
          if (sternE < -1665) {
            more = true;
            await setWindlass('off');
            await setLever(0);
            await setBow(0);
          } else {
            await setWindlass('down');
            await setBow(hold);
            await setLever(v > -0.2 ? -15 : 0);
          }
        } else if (!now.lines.includes('sl') && now.crew === null) {
          await act(page, { type: 'line', code: 'sl', command: 'take' });
        }
      } else if (t - lastTighten > 0.5) {
        lastTighten = t;
        await act(page, { type: 'line', code: 'sl', command: 'tighten' });
      }
      await page.waitForTimeout(TICK_S * 1000);
    }
    await showSection(page, 'exercises');
    const done = await waitVisible(page, 'exercise-done');
    const doneText = done ? await page.getByTestId('exercise-done').innerText() : '';
    const chip = await text(page, 'clock-chip');
    await shot(page, 'live-phone-m98-night-done');
    check(
      'good run: done card at 07:00',
      done && /Well done/i.test(doneText) && /^0?7:0\d/.test(chip.replace(/^\D+/, '')),
      `${doneText.slice(0, 80)} (status ${last?.status}, step ${last?.step}, mistake ${last?.mistake?.mistakeId ?? 'none'}, clock ${chip})`,
    );
    check(
      'the picture after the squall began was taken (04:05 or later)',
      nightShot,
      nightChip || 'never read 04:05 or later',
    );
    problems.push(...(await auditPage(page, 'm98 phone done')));
    await context.close();
  }

  // 3. The Russian setup card does not run off the screen.
  {
    const { context, page } = await openPage(
      phone,
      'm98 ru',
      '?m=exercise&ex=night-anchor&lang=ru',
      {
        testClock: true,
      },
    );
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
    await shot(page, 'live-phone-m98-ru');
    problems.push(...(await auditPage(page, 'm98 phone ru')));
    await context.close();
  }
}
