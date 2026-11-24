// M116 (Capsize and righting, PHASE_DINGHY_SPEC 10.7): scenes and live checks for scripts/shots.mjs.
// Joins the m101 group, on the test clock. The rules (when she goes over, what the commands do,
// the drift, the link) are unit tests (tests/physicsTruthsDinghy.test.ts); here the card and a
// finger tap on its two steps, and what a phone shows while she is over.
import { showSection, waitForLink } from './ui.mjs';

/** The dinghy over on its starboard side, 12 kn abeam; the board down (`cb=0` for up). */
const C = '?boat=dinghy&wd=90&ws=12&cap=s&held=1&sea=flat';

/** Screenshots at every size: lying over with the sailor in the water, and with the board up. */
export const M116_SCENES = [
  { name: 'over', query: `${C}&cam=side-starboard` },
  { name: 'board-up', query: `${C}&cb=0&cam=side-starboard` },
].map((scene) => ({ ...scene, waitMs: 2500, sheet: 'half' }));

export async function liveM116Checks({ openPage, viewports, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M116 ${what}: ${detail}`);
    console.log(`live M116 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const read = (page) => page.evaluate(() => window.__sailExercise.read());
  const link = (page) => page.evaluate(() => window.location.search);
  const open = async (label, query) => {
    const opened = await openPage(phone, `m116 ${label}`, query, { testClock: true });
    await opened.page.waitForSelector('canvas.scene-canvas', { state: 'attached' });
    await opened.page.waitForTimeout(800);
    return opened;
  };
  const free = '?boat=dinghy&wd=90&ws=12&cap=s&sea=flat&debug=1';

  // 1. Right her: Swim round, wait, Stand on the board; she comes up and the card goes.
  {
    const { context, page } = await open('right', free);
    const card = page.getByTestId('capsize-card');
    const shown = await card.isVisible();
    const standBefore = await page.getByTestId('capsize-stand').isDisabled();
    await page.getByTestId('capsize-swim').tap();
    await page.waitForTimeout(4100);
    const standReady = await page.getByTestId('capsize-stand').isEnabled();
    await page.getByTestId('capsize-stand').tap();
    await page.waitForTimeout(3100);
    const end = await read(page);
    // The link is written a moment after the state changes.
    const url = await waitForLink(page, [], ['cap=']).catch(() => link(page));
    check(
      'the card shows, Stand waits for the swim, two taps right her: card gone, heel within 2, no cap in the link',
      shown &&
        standBefore &&
        standReady &&
        !(await card.isVisible()) &&
        Math.abs(end.heelDeg) <= 2 &&
        !url.includes('cap='),
      JSON.stringify({ shown, standBefore, standReady, heel: end.heelDeg, url }),
    );
    await context.close();
  }

  // 2. The board up: after the swim the board line and its button show; Push it down, then Stand.
  {
    const { context, page } = await open('board', `${free}&cb=0`);
    await page.getByTestId('capsize-swim').tap();
    await page.waitForTimeout(4100);
    const line = await page.getByTestId('capsize-board-line').isVisible();
    const standBlocked = await page.getByTestId('capsize-stand').isDisabled();
    await page.getByTestId('capsize-board').tap();
    await page.getByTestId('capsize-stand').tap();
    await page.waitForTimeout(200);
    const end = await read(page);
    check(
      'board up: the line and button show, Stand waits, then pushing the board down lets her right',
      line &&
        standBlocked &&
        end.dinghy.boardPct === 100 &&
        end.dinghy.capsize.phase === 'righting',
      JSON.stringify({ line, standBlocked, dinghy: end.dinghy }),
    );
    await context.close();
  }

  // 3. A breeze with the sheet held: within 10 s she goes over and "Capsized!" is in the alert list.
  {
    const { context, page } = await open(
      'goes over',
      '?boat=dinghy&wd=90&ws=16&ms=55&sp=in&debug=1',
    );
    let phase = 'upright';
    for (let i = 0; i < 20 && phase === 'upright'; i += 1) {
      await page.waitForTimeout(500);
      phase = (await read(page)).dinghy.capsize.phase;
    }
    await page.getByTestId('alert-chip').tap();
    await page.waitForTimeout(300);
    const texts = await page
      .locator('[data-testid="alert-item"]')
      .evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').trim()));
    check(
      'she goes over within 10 s and the alert list says Capsized',
      phase !== 'upright' && texts.some((text) => text.includes('Capsized!')),
      JSON.stringify({ phase, texts }),
    );
    await context.close();
  }

  // 4. Locked: with her over, the seat and outhaul buttons and the tiller are greyed with "Right
  // the boat first"; the centreboard stepper is not.
  {
    const { context, page } = await open('locked', free);
    await showSection(page, 'dinghy');
    const seat = await page.getByTestId('sit-out').isDisabled();
    const outhaul = await page.getByTestId('dinghy-outhaul-plus').isDisabled();
    const board = await page.getByTestId('dinghy-board-minus').isEnabled();
    const line = await page.getByTestId('section-dinghy').getByTestId('capsize-locked').isVisible();
    await showSection(page, 'autopilot');
    const tiller = await page.getByTestId('section-autopilot').locator('input[type=range]').first();
    const tillerOff = await tiller.isDisabled();
    check(
      'locked: the seat, outhaul and tiller are greyed with the line; the board stepper works',
      seat && outhaul && board && line && tillerOff,
      JSON.stringify({ seat, outhaul, board, line, tillerOff }),
    );
    await context.close();
  }
}
