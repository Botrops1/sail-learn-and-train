// M40 (slow-speed handling, PHASE7_SPEC 6.8): scenes and live checks for scripts/shots.mjs. Labels
// contain "m40", so openPage lets the app open as it does without a link (Sailing, default waves).
// The live checks run on the test clock (shots.mjs passes `onTestClock`): waitForTimeout moves the
// app's time on, so "3 s" is 3 s of app time on every machine.
import path from 'node:path';

/** Sails away (rolled in, jib sheet tight so it stays furled), autopilot off, seen from above. */
const AWAY = 'mf=0&jf=0&js=100&bs=0&ap=off&cam=top';

export const M40_SCENES = [
  { name: 'drift-beam', query: `?wd=90&ws=15&${AWAY}&tx=16`, waitMs: 4000 },
  { name: 'bow-off', query: `?wd=45&ws=15&${AWAY}&tx=16`, waitMs: 4000 },
  { name: 'prop-walk', query: `?wd=0&ws=0&${AWAY}&eng=1&lv=-50&tx=4`, waitMs: 4000 },
];

export async function liveM40Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M40 ${what}: ${detail}`);
    console.log(`live M40 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  /** The "Low speed" row of the debug overlay: sway in knots (+ to starboard). */
  const swayKn = async (page) => {
    const text = await page.getByTestId('debug-overlay').textContent();
    const match = /sway (-?\d+\.\d) kn/.exec(text ?? '');
    return match ? Number(match[1]) : Number.NaN;
  };

  // 1. A side wind slides her to port and turns the bow to port.
  {
    const { context, page } = await openPage(
      phone,
      'm40 drift',
      `?wd=90&ws=15&${AWAY}&tx=16&debug=1`,
      { testClock: true },
    );
    await page.waitForTimeout(3000);
    const sway = await swayKn(page);
    check('drift: the sway is to port (negative)', sway < 0, String(sway));
    const heading = parseFloat(await page.getByTestId('strip-heading').textContent());
    check(
      'drift: the heading is between 330° and 359°',
      heading >= 330 && heading <= 359,
      String(heading),
    );
    await shot(page, 'm40-drift-debug');
    await context.close();
  }

  // 2. Sailing is unchanged: with way on there is no sway.
  {
    const { context, page } = await openPage(
      phone,
      'm40 sailing unchanged',
      '?wd=90&ws=15&ms=30&js=30&ap=off&debug=1',
      { testClock: true },
    );
    await page.waitForTimeout(5000);
    const sway = await swayKn(page);
    check('sailing unchanged: the sway is 0.0 kn', Math.abs(sway) < 0.05, String(sway));
    await context.close();
  }
}
