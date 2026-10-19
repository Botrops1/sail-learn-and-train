// M44 (mooring lines, Med stern-to, PHASE7_SPEC 10.8): scenes and live checks for scripts/shots.mjs.
// Labels contain "m44", so openPage lets the app open as it does without a link (Sailing, default
// waves; a place link sets its own sea). The live checks run on the test clock (shots.mjs passes
// `onTestClock`): waitForTimeout moves the app's time on by exactly that long.
import path from 'node:path';
import { lineAction, setSheet, showSection, waitForLink } from './ui.mjs';

/** In front of our berth, no wind, at rest, engine in neutral. */
const BERTH = '?pl=marina&m=harbour&pe=2.8&pn=1490.4&hdg=180&ws=0';
/** The same with both stern lines and the lazy line on (the term_med_mooring Show me link). */
const TIED = '?cam=top&pl=marina&pe=2.8&pn=1490.4&hdg=180&ln=sp:2.55,ss:2.55,ll:12.33';

export const M44_SCENES = [
  { name: 'berth-lines', query: TIED, sheet: 'peek' },
  { name: 'berth-lines-side', query: `${TIED}&cam=side-port`, sheet: 'peek' },
  { name: 'lines-section', query: `${TIED}&m=harbour`, section: 'harbour', sheet: 'full' },
  {
    name: 'lines-section-ru',
    query: `${TIED}&m=harbour&lang=ru`,
    section: 'harbour',
    sheet: 'full',
  },
  { name: 'lazy-waiting', query: `${BERTH}&cam=side-port`, sheet: 'peek' },
  { name: 'lines-walking', query: `${BERTH}&cam=side-port&tx=4`, sheet: 'peek' },
];

export async function liveM44Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M44 ${what}: ${detail}`);
    console.log(`live M44 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  /** Asks `ready` every `stepMs` of app time until it says yes, at most `maxMs`. */
  const poll = async (page, ready, maxMs, stepMs = 100) => {
    for (let waited = 0; waited <= maxMs; waited += stepMs) {
      if (await ready()) return true;
      await page.waitForTimeout(stepMs);
    }
    return false;
  };
  const text = async (page, id) => ((await page.getByTestId(id).textContent()) ?? '').trim();
  const alertText = async (page) => {
    const alert = page.getByTestId('damage-alert');
    return (await alert.isVisible()) ? ((await alert.textContent()) ?? '') : '';
  };
  const heading = async (page) => {
    const link = await page.evaluate(() => window.location.search);
    return Number(new URLSearchParams(link).get('hdg'));
  };

  // 1. Stern-to: both stern lines, then the lazy line, which the crew walks to the bow.
  {
    const { context, page } = await openPage(phone, 'm44 stern-to', `${BERTH}&tx=4`, {
      testClock: true,
    });
    await lineAction(page, 'sp', 'take');
    await lineAction(page, 'ss', 'take');
    const sp = await text(page, 'line-sp-status');
    check('stern-to: the port stern line is tied', /^Tied: 2\.5 m/.test(sp), sp);
    await lineAction(page, 'll', 'take');
    const walking = await text(page, 'line-ll-status');
    check(
      'stern-to: the crew is walking the lazy line',
      /walking it to the bow/.test(walking),
      walking,
    );
    const tied = await poll(
      page,
      async () => /^Tied:/.test(await text(page, 'line-ll-status')),
      8000,
    );
    check('stern-to: the lazy line gets tied', tied, await text(page, 'line-ll-status'));
    for (let i = 0; i < 6; i += 1) {
      if (await page.getByTestId('line-ll-tighten').isDisabled()) break;
      await lineAction(page, 'll', 'tighten');
    }
    const hand = await text(page, 'line-ll-reason');
    check('stern-to: Tighten ends at hand tight', /Hand tight/.test(hand), hand);
    check(
      'stern-to: Tighten is then disabled',
      await page.getByTestId('line-ll-tighten').isDisabled(),
      'tighten',
    );
    const link = await waitForLink(page, ['ln=sp:', 'ss:', 'll:']);
    check(
      'stern-to: the link has the three lines',
      /ln=sp:2\.5\d,ss:2\.5\d,ll:12\.\d\d/.test(link),
      link,
    );
    await shot(page, 'm44-stern-to');
    await context.close();
  }

  // 2. Too far from the berth: the take buttons are off, with the reason.
  {
    const { context, page } = await openPage(phone, 'm44 far', '?pl=marina&m=harbour&ws=0', {
      testClock: true,
    });
    await showSection(page, 'harbour');
    check(
      'far: Throw it to the quay is disabled',
      await page.getByTestId('line-sp-take').isDisabled(),
      'take',
    );
    const reason = await text(page, 'line-sp-reason');
    check('far: it says to come closer', /within 4 m of your yellow berth/.test(reason), reason);
    const lazy = await text(page, 'line-ll-reason');
    check(
      'far: the lazy line wants a stern line first',
      /Tie a stern line first|within 4 m/.test(lazy),
      lazy,
    );
    await context.close();
  }

  // 3. A slack line with the engine in gear stops the engine.
  {
    const { context, page } = await openPage(phone, 'm44 fouled', `${BERTH}&tx=4`, {
      testClock: true,
    });
    await lineAction(page, 'sp', 'take');
    for (let i = 0; i < 10; i += 1) await lineAction(page, 'sp', 'ease');
    await setSheet(page, 'peek');
    for (let i = 0; i < 3; i += 1) await page.getByTestId('quick-lever-less').click();
    const fouled = await poll(
      page,
      async () => /propeller/.test((await alertText(page)) ?? ''),
      2000,
    );
    check(
      'fouled: within 2 s the alert says a line is caught in the propeller',
      fouled,
      await alertText(page),
    );
    await showSection(page, 'harbour');
    check(
      'fouled: the Harbour gear section says so and offers to clear it',
      (await page.getByTestId('prop-fouled').isVisible()) &&
        (await page.getByTestId('prop-clear').isVisible()),
      'prop-fouled',
    );
    await showSection(page, 'engine');
    const panel = page.getByTestId('engine-panel');
    check(
      'fouled: the engine panel says a line is caught and Start is off',
      (await panel.getByTestId('engine-fouled').isVisible()) &&
        (await panel.getByTestId('engine-startstop').isDisabled()),
      'engine',
    );
    await shot(page, 'm44-fouled');
    await showSection(page, 'harbour');
    await page.getByTestId('prop-clear').click();
    await showSection(page, 'engine');
    check(
      'fouled: Clear the propeller lets the engine start again',
      !(await page.getByTestId('engine-panel').getByTestId('engine-startstop').isDisabled()),
      'start',
    );
    await context.close();
  }

  // 4. The lazy line holds the bow in a crosswind; without it she swings.
  for (const [lazy, label] of [
    [true, 'with the lazy line'],
    [false, 'without the lazy line'],
  ]) {
    const ln = lazy ? 'sp:2.55,ss:2.55,ll:12.33' : 'sp:2.55,ss:2.55';
    const { context, page } = await openPage(
      phone,
      `m44 hold ${lazy}`,
      `?cam=top&pl=marina&tr=empty&m=harbour&pe=2.8&pn=1490.4&hdg=180&ln=${ln}&wd=90&ws=15&tx=16`,
      { testClock: true },
    );
    await setSheet(page, 'peek');
    await page.waitForTimeout(4000);
    await page.waitForTimeout(500);
    const swing = Math.abs((((await heading(page)) - 180 + 540) % 360) - 180);
    check(
      `hold (${label}): the bow ${lazy ? 'stays within 15°' : 'swings more than 25°'}`,
      lazy ? swing <= 15 : swing > 25,
      `${swing}° off 180`,
    );
    await shot(page, `m44-hold-${lazy ? 'lazy' : 'no-lazy'}`);
    await context.close();
  }

  // 5. Held still: the lines pull nothing, but they can still be taken.
  {
    const { context, page } = await openPage(phone, 'm44 held', `${BERTH}&held=1`, {
      testClock: true,
    });
    await lineAction(page, 'sp', 'take');
    const sp = await text(page, 'line-sp-status');
    check('held: a line can still be taken', /^Tied:/.test(sp), sp);
    await context.close();
  }
}
