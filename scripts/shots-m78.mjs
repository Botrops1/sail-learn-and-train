// M78 (stern-to on your own anchor, PHASE10_SPEC 20.6): scenes and live checks for
// scripts/shots.mjs, on the test clock. Labels contain "m78". The good run is on the phone only.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { PILOT_SPEED, setSpeed } from './exercise-drive.mjs';
import { showSection } from './ui.mjs';

export const M78_SCENES = [
  {
    name: 'stern-anchor-setup',
    query: '?m=exercise&ex=stern-to-anchor',
    section: 'exercises',
    sheet: 'half',
  },
  { name: 'stern-anchor-ring', query: '?m=exercise&ex=stern-to-anchor&cam=top', sheet: 'peek' },
];

const DROP_NORTH_M = 1442;
const BERTH_EAST_M = 2.75; // our berth's middle (medium layout)
const QUAY_FACE_NORTH_M = 1500;
const TRANSOM_X = -8.6; // transomX (content/boat/hanse508.json)
const BOW_X = 15.55 - 8.6; // transomX + loa
const CHAIN_DEPTH_M = 6.8; // 5 m of water + the bow roller's 1.8 m
const TICK_S = 0.2;
const HARBOUR_IDS = [
  'leave-berth',
  'enter-berth',
  'turn-own-length',
  'mooring-buoy',
  'anchor-shore',
  'stern-to-anchor',
];

export async function liveM78Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M78 ${what}: ${detail}`);
    console.log(`live M78 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
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

  // 1. A good run (tests/harbourPilot.ts sternAnchorPilot): forward to the ring across the
  //    fairway, anchor, back into the berth paying out chain, stern lines, take in chain.
  {
    const { context, page } = await openPage(
      phone,
      'm78 stern anchor run',
      '?m=exercise&ex=stern-to-anchor&debug=1',
      { testClock: true },
    );
    await showSection(page, 'exercises');
    await page.getByTestId('exercise-start').click();
    await page.waitForTimeout(500);
    // The pilot decides once per tick; the run goes at the pilot's time scale (exercise-drive.mjs).
    await setSpeed(page, PILOT_SPEED);
    let last = null;
    let phase = 0;
    let windlass = 'off';
    let lever = 0;
    const th = { bow: 0, stern: 0 };
    let shotChain = false;
    const setLever = async (pct) => {
      if (lever !== pct) await act(page, { type: 'engine', command: { leverPct: pct } });
      lever = pct;
    };
    const setWindlass = async (motion) => {
      if (windlass !== motion) await act(page, { type: 'windlass', motion });
      windlass = motion;
    };
    const setThr = async (which, dir) => {
      if (th[which] !== dir) await act(page, { type: 'thruster', which, dir });
      th[which] = dir;
    };
    for (let i = 0; i < 2400; i += 1) {
      const r = await run(page);
      last = r;
      if (finished(r)) break;
      const now = await read(page);
      const h = (now.headingDeg * Math.PI) / 180;
      const v = now.speedMps;
      const bowE = now.eastM + BOW_X * Math.sin(h);
      const bowN = now.northM + BOW_X * Math.cos(h);
      const sternE = now.eastM + TRANSOM_X * Math.sin(h);
      const sternN = now.northM + TRANSOM_X * Math.cos(h);
      const gap = QUAY_FACE_NORTH_M - sternN;
      const keep = async () => {
        const e = sternE - BERTH_EAST_M;
        const off = wrap(now.headingDeg - 180);
        await setThr('stern', e > 0.3 ? 1 : e < -0.3 ? -1 : 0);
        await setThr('bow', off > 3 ? -1 : off < -3 ? 1 : 0);
      };
      if (r.step === 0) {
        const d = Math.hypot(bowE - BERTH_EAST_M, bowN - DROP_NORTH_M);
        await keep();
        await setLever(d > 3 ? (v < 0.3 ? 15 : 0) : v > 0.05 ? -15 : 0);
      } else if (r.step === 1) {
        await keep();
        await setLever(0);
        await setWindlass('down');
      } else if (r.step === 2) {
        await keep();
        if (phase === 0) {
          const far = Math.hypot(bowE - now.anchorEastM, bowN - now.anchorNorthM);
          await setWindlass(now.chainOutM < Math.hypot(far, CHAIN_DEPTH_M) + 4 ? 'down' : 'off');
          const want = gap > 10 ? -0.4 : gap > 5 ? -0.25 : -0.12;
          await setLever(v > want ? -15 : v < want - 0.15 ? 15 : 0);
          if (gap < 2.6) {
            phase = 1;
            await setWindlass('off');
          }
        } else {
          await setLever(v < -0.03 ? 15 : 0);
        }
        if (now.chainOutM > 20 && !shotChain) {
          shotChain = true;
          await shot(page, 'm78-stern-anchor-chain');
        }
      } else if (r.step === 3) {
        await keep();
        await setLever(0);
        if (!now.lines.includes('sp'))
          await act(page, { type: 'line', code: 'sp', command: 'take' });
        if (!now.lines.includes('ss'))
          await act(page, { type: 'line', code: 'ss', command: 'take' });
      } else if (now.anchorPhase !== 'set' && !now.anchorCutOut) {
        await keep();
        await setWindlass('up');
      } else {
        await setWindlass('off');
        await setThr('bow', 0);
        await setThr('stern', 0);
      }
      await page.waitForTimeout(TICK_S * 1000);
    }
    await showSection(page, 'exercises');
    const done = await waitVisible(page, 'exercise-done');
    const text = done ? await page.getByTestId('exercise-done').innerText() : '';
    await shot(page, 'm78-stern-anchor-done');
    check(
      'stern anchor good run',
      done && /Well done/i.test(text),
      `${text.slice(0, 100)} (status ${last?.status}, step ${last?.step})`,
    );
    await context.close();
  }

  // 2. The list shows the Harbour and anchor group with its six exercises; the setup cards of all
  //    six are readable in Russian without overflow; the list passes the accessibility audit.
  {
    const { context, page } = await openPage(phone, 'm78 list', '?m=exercise', {
      testClock: true,
    });
    await showSection(page, 'exercises');
    const body = await page.getByTestId('exercise-panel').innerText();
    const ids = await page
      .locator('[data-testid^="exercise-item-"]')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-testid')));
    const missing = HARBOUR_IDS.filter((id) => !ids.includes(`exercise-item-${id}`));
    check(
      'harbour group lists six exercises',
      /Harbour and anchor/.test(body) && missing.length === 0,
      `missing ${JSON.stringify(missing)}`,
    );
    problems.push(...(await auditPage(page, 'm78 list')));
    await context.close();
  }
  for (const id of HARBOUR_IDS) {
    const { context, page } = await openPage(phone, 'm78 ru', `?m=exercise&ex=${id}&lang=ru`, {
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
      `Russian setup card ${id} fits`,
      !overflow.page && !overflow.box,
      JSON.stringify(overflow),
    );
    await context.close();
  }
}
