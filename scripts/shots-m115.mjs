// M115 (The sailor in the dinghy, PHASE_DINGHY_SPEC 9.7): scenes and live checks for
// scripts/shots.mjs. Joins the m73 group, on the test clock. Where the sailor sits, the facing and
// the hands are unit tests (tests/people.test.ts); here only what needs the real 3D view, a tack
// by steering and a finger tap on the camera chip.
import { waitForLink } from './ui.mjs';

/** The wind over starboard (the sailor on starboard); `E` over port (the sailor on port). */
const D = '?boat=dinghy&wd=60&ws=12&ms=40&held=1&sea=flat';
const E = '?boat=dinghy&wd=-60&ws=12&ms=40&held=1&sea=flat';

/** Screenshots at every size: the three seats on both sides and the view from the seat. */
export const M115_SCENES = [
  { name: 'sit-in', query: `${D}&sp=in&cam=side-starboard` },
  { name: 'sit-side', query: `${D}&sp=side&cam=side-starboard` },
  { name: 'lean-out', query: `${D}&sp=out&cam=side-port` },
  { name: 'lean-out-port', query: `${E}&sp=out&cam=side-starboard` },
  { name: 'sailor-view', query: `${D}&sp=side&cam=helm` },
].map((scene) => ({ ...scene, waitMs: 2500, sheet: 'peek' }));

export async function liveM115Checks({ openPage, viewports, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M115 ${what}: ${detail}`);
    console.log(`live M115 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const captain = (page) => page.evaluate(() => window.__sailDebug.captain());
  const near = (a, b) => Math.abs(a - b) <= 0.01;

  // 1. On the side deck: sitting, the pelvis on the starboard side deck, in view.
  {
    const { context, page } = await openPage(phone, 'm115 seat', `${D}&sp=side&debug=1`, {
      testClock: true,
    });
    await page.waitForSelector('canvas.scene-canvas', { state: 'attached' });
    await page.waitForTimeout(1500);
    const c = await captain(page);
    check(
      'on the side deck: sitting, hip at z 0.6, in view',
      c !== null && c.pose === 'sit' && c.hip !== null && near(c.hip[2], 0.6) && c.hidden === false,
      JSON.stringify(c),
    );
    await context.close();
  }

  // 2. A tack by steering: close-hauled, the tiller held to starboard turns her through the wind;
  // the boom crosses and the sailor crosses to the other side (the sheet at 15: at 30 the sailor
  // on the side deck tips the slow boat over to windward before the start, see the spec's 9.10).
  {
    const { context, page } = await openPage(
      phone,
      'm115 tack',
      '?boat=dinghy&wd=0&ws=10&hdg=315&ms=15&sp=side&rd=30&sea=flat&debug=1',
      { testClock: true },
    );
    await page.waitForSelector('canvas.scene-canvas', { state: 'attached' });
    await page.waitForTimeout(500);
    let c = await captain(page);
    const before = c?.hip?.[2] ?? 0;
    let crossed = false;
    for (let i = 0; i < 40 && !crossed; i += 1) {
      await page.waitForTimeout(500);
      c = await captain(page);
      crossed = (c?.hip?.[2] ?? 1) < 0;
    }
    await page.waitForTimeout(2000);
    c = await captain(page);
    check(
      'a tack by steering: the sailor starts on starboard and ends on port',
      near(before, 0.6) && crossed && c !== null && c.hip !== null && near(c.hip[2], -0.6),
      JSON.stringify({ before, crossed, hip: c?.hip }),
    );
    await context.close();
  }

  // 3. The camera menu: Sailor in the Helm's place; a finger tap on it opens the view from the
  // seat, where the sailor is not drawn.
  {
    const { context, page } = await openPage(phone, 'm115 camera', `${D}&sp=side&debug=1`, {
      testClock: true,
    });
    await page.waitForSelector('canvas.scene-canvas', { state: 'attached' });
    await page.waitForTimeout(800);
    await page.getByTestId('camera-chip').tap();
    const texts = await page
      .locator('[data-testid^="camera-option-"]')
      .evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').trim()));
    await page.getByTestId('camera-option-helm').tap();
    const link = await waitForLink(page, ['cam=helm']).catch(() => 'no cam=helm');
    await page.waitForTimeout(1200);
    const c = await captain(page);
    check(
      'the camera menu has Sailor and no Helm; Sailor hides the sailor and writes cam=helm',
      texts.includes('Sailor') &&
        !texts.includes('Helm') &&
        c !== null &&
        c.hidden === true &&
        link.includes('cam=helm'),
      JSON.stringify({ texts, hidden: c?.hidden, link }),
    );
    await context.close();
  }
}
