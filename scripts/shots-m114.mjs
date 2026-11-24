// M114 (Dinghy sailing, PHASE_DINGHY_SPEC 8.8): scenes and live checks for scripts/shots.mjs.
// Joins the m8 group, on the test clock. What the dinghy's weight, board and outhaul do is unit
// tested (tests/physicsTruthsDinghy.test.ts); here only the Balance section on a phone and a
// finger tap on it.
import { showSection, waitForLink } from './ui.mjs';

const D = '?boat=dinghy&wd=90&ws=16&ms=55&oh=100&sea=flat';

/** Screenshots at every size: the Balance section, and the centreboard drawn up in its case. */
export const M114_SCENES = [
  { name: 'balance', query: `${D}&sp=side&held=1&cam=side-port`, section: 'dinghy' },
  { name: 'board-up', query: `${D}&cb=0&held=1&cam=side-port`, section: 'dinghy' },
].map((scene) => ({ ...scene, waitMs: 2500, sheet: 'half' }));

export async function liveM114Checks({ openPage, viewports, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M114 ${what}: ${detail}`);
    console.log(`live M114 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const read = (page) => page.evaluate(() => window.__sailExercise.read());
  const open = async (label, query) => {
    const opened = await openPage(phone, `m114 ${label}`, query, { testClock: true });
    await opened.page.waitForSelector('canvas.scene-canvas', { state: 'attached' });
    await opened.page.waitForTimeout(800);
    return opened;
  };

  // 1 and 2. Sailing on the side in a breeze: Lean out holds her up; Sit in lets her go over.
  {
    const { context, page } = await open('sit', `${D}&sp=side&debug=1`);
    await showSection(page, 'dinghy');
    const buttons = ['sit-in', 'sit-side', 'sit-out'];
    const heights = [];
    for (const id of buttons) heights.push((await page.getByTestId(id).boundingBox())?.height ?? 0);
    check(
      'the three seat buttons are at least 44 px tall',
      heights.every((h) => h >= 44),
      JSON.stringify(heights),
    );
    check(
      'on the side: "Sit on the side" is pressed',
      (await page.getByTestId('sit-side').getAttribute('aria-pressed')) === 'true',
      '',
    );
    await page.getByTestId('sit-out').tap();
    const link = await waitForLink(page, ['sp=out']).catch(() => 'no sp=out');
    await page.waitForTimeout(5000);
    const out = await read(page);
    check(
      'Lean out: the link has sp=out and she is flatter than on the side',
      link.includes('sp=out') && out.heelDeg > -3,
      JSON.stringify({ link, heel: out.heelDeg, sit: out.dinghy.sit }),
    );
    await page.getByTestId('sit-in').tap();
    // The roll takes a few seconds to reach the clamp (test time, so the same on every machine).
    let inn = await read(page);
    for (let i = 0; i < 20 && inn.heelDeg > -49; i += 1) {
      await page.waitForTimeout(1000);
      inn = await read(page);
    }
    const alert = await page.getByTestId('overpowered-label').isVisible();
    check(
      'Sit in: she heels over (clamped) and the "lean out" warning shows',
      inn.heelDeg <= -49 && alert,
      JSON.stringify({ heel: inn.heelDeg, alert }),
    );
    await context.close();
  }

  // 3. The centreboard stepper: five taps of − raise it from 100 to 75 %.
  {
    const { context, page } = await open('board', '?boat=dinghy&ws=8&debug=1');
    await showSection(page, 'dinghy');
    for (let i = 0; i < 5; i += 1) await page.getByTestId('dinghy-board-minus').tap();
    const link = await waitForLink(page, ['cb=75']).catch(() => 'no cb=75');
    const value = (await page.getByTestId('dinghy-board-value').innerText()).trim();
    check(
      'five taps on − give "Down 75 %" and cb=75',
      value === 'Down 75 %' && link.includes('cb=75'),
      JSON.stringify({ value, link }),
    );
    await context.close();
  }
}
