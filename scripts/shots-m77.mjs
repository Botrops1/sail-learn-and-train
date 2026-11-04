// M77 (anchoring in the bay with a line ashore, PHASE10_SPEC 19.6): scenes and live checks for
// scripts/shots.mjs, on the test clock. Labels contain "m77". The good run is on the phone only.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { showSection } from './ui.mjs';

export const M77_SCENES = [
  {
    name: 'anchor-setup',
    query: '?m=exercise&ex=anchor-shore',
    section: 'exercises',
    sheet: 'half',
  },
  { name: 'anchor-ring', query: '?m=exercise&ex=anchor-shore&cam=top', sheet: 'peek' },
  { name: 'anchor-map', query: '?m=exercise&ex=anchor-shore&cam=map', sheet: 'peek' },
];

const DROP = [-1600, 0];
const STERN_X = -8.6; // transomX (content/boat/hanse508.json)
const BOW_X = 15.55 - 8.6; // transomX + loa
const TICK_S = 0.2;

export async function liveM77Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M77 ${what}: ${detail}`);
    console.log(`live M77 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const run = (page) => page.evaluate(() => window.__sailExercise.state());
  const read = (page) => page.evaluate(() => window.__sailExercise.read());
  const act = (page, action) => page.evaluate((a) => window.__sailExercise.dispatch(a), action);
  const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
  const finished = (r) => !r || ['done', 'failed', 'mistake'].includes(r.status);
  const waitVisible = async (page, testid, triesLeft = 20) => {
    for (let i = 0; i < triesLeft; i += 1) {
      if (await page.getByTestId(testid).isVisible()) return true;
      await page.waitForTimeout(250);
    }
    return false;
  };

  // 1. A good run (tests/harbourPilot.ts anchorPilot): back to the ring, anchor, chain, dig in,
  //    back to the shore, line ashore, tighten.
  {
    const { context, page } = await openPage(
      phone,
      'm77 anchor run',
      '?m=exercise&ex=anchor-shore&debug=1',
      { testClock: true },
    );
    await showSection(page, 'exercises');
    await page.getByTestId('exercise-start').click();
    await page.waitForTimeout(500);
    let last = null;
    let more = false;
    let lastTighten = -1;
    let windlass = 'off';
    let thruster = 0;
    let lever = 0;
    let shotChain = false;
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
    for (let i = 0; i < 2400; i += 1) {
      const r = await run(page);
      last = r;
      if (finished(r)) break;
      const t = i * TICK_S;
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
        if (now.chainOutM > 30 && !shotChain) {
          shotChain = true;
          await shot(page, 'm77-anchor-chain');
        }
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
    const text = done ? await page.getByTestId('exercise-done').innerText() : '';
    await shot(page, 'm77-anchor-done');
    check(
      'anchor good run',
      done && /Well done/i.test(text),
      `${text.slice(0, 100)} (status ${last?.status}, step ${last?.step})`,
    );
    await context.close();
  }

  // 2. Russian: the setup card has no overflow.
  {
    const { context, page } = await openPage(
      phone,
      'm77 ru',
      '?m=exercise&ex=anchor-shore&lang=ru',
      { testClock: true },
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
    problems.push(...(await auditPage(page, 'm77 setup card ru')));
    await context.close();
  }
}
