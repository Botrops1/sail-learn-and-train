// M43 (contact, damage report and fenders, PHASE7_SPEC 9.9): scenes and live checks for
// scripts/shots.mjs. Labels contain "m43", so openPage lets the app open as it does without a link
// (Sailing, default waves; a place link sets its own sea). The live checks run on the test clock
// (shots.mjs passes `onTestClock`): waitForTimeout moves the app's time on by exactly that long.
import path from 'node:path';
import { setSheet, showSection } from './ui.mjs';

/** In front of our berth with a strong west wind: it pushes her onto the yacht to the east (berth 13). */
const BUMP = '?pl=marina&tr=busy&m=harbour&pe=2.8&pn=1490.4&hdg=180&wd=-90&ws=20&cam=top';

export const M43_SCENES = [
  { name: 'damage-alert', query: `${BUMP}&tx=4`, waitMs: 3000, sheet: 'peek' },
  { name: 'damage-list', query: `${BUMP}&tx=4`, waitMs: 4000, section: 'place', sheet: 'full' },
  {
    name: 'damage-list-ru',
    query: `${BUMP}&tx=4&lang=ru`,
    waitMs: 4000,
    section: 'place',
    sheet: 'full',
  },
  { name: 'harbour-gear', query: '?pl=marina&m=harbour&fd=1', section: 'harbour', sheet: 'half' },
];

export async function liveM43Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M43 ${what}: ${detail}`);
    console.log(`live M43 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
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
  const alertText = async (page) => {
    const alert = page.getByTestId('damage-alert');
    return (await alert.isVisible()) ? ((await alert.textContent()) ?? '') : '';
  };

  // 1. Bump the wall: the boat motors east along the fairway into the wall (part of the quay).
  {
    const { context, page } = await openPage(
      phone,
      'm43 bump',
      '?pl=marina&m=harbour&ws=0&cam=top&tx=16',
      { testClock: true },
    );
    for (let i = 0; i < 6; i += 1) await page.getByTestId('quick-lever-more').click();
    const shown = await poll(page, async () => (await alertText(page)) !== '', 15_000);
    check('bump: the damage alert shows', shown, String(shown));
    const text = await alertText(page);
    check('bump: it names the quay and where on our hull', /Quay, at our bow/.test(text), text);
    await shot(page, 'm43-bump');
    await showSection(page, 'place');
    const items = await page.getByTestId('damage-list').locator('li.damage-item').allTextContents();
    check(
      'bump: the damage list names the quay',
      items.length >= 1 && items.some((item) => item.includes('Quay')),
      JSON.stringify(items),
    );
    await page.getByTestId('damage-clear').click();
    const none = await page.getByTestId('damage-none').isVisible();
    check('bump: Clear empties the list', none, String(none));
    await context.close();
  }

  // 2. The fenders in the Harbour gear section: the link gets fd=1 and the status counts nine.
  {
    const { context, page } = await openPage(phone, 'm43 fenders', '?pl=marina&m=harbour&ws=0', {
      testClock: true,
    });
    await showSection(page, 'harbour');
    const status = page.getByTestId('fenders-status');
    check(
      'fenders: in the locker at first',
      /in the locker/.test((await status.textContent()) ?? ''),
      (await status.textContent()) ?? '',
    );
    await page.locator('label.segment', { has: page.getByTestId('fenders-out') }).click();
    await page.waitForTimeout(300);
    const link = await page.evaluate(() => window.location.search);
    check('fenders: the link has fd=1', link.includes('fd=1'), link);
    const text = (await status.textContent())?.trim() ?? '';
    check('fenders: the status counts nine', text === 'Fenders over the side: 9.', text);
    await context.close();
  }

  // 3. Fenders left out while motoring at about 8 knots are torn off after 30 s.
  {
    const { context, page } = await openPage(phone, 'm43 lost', '?ws=0&eng=1&lv=66&fd=1&tx=16', {
      testClock: true,
    });
    const shown = await poll(page, async () => /torn off/.test(await alertText(page)), 6000);
    const text = await alertText(page);
    check('lost: the alert says a fender was torn off', shown, text);
    await showSection(page, 'harbour');
    const status = (await page.getByTestId('fenders-status').textContent()) ?? '';
    check(
      'lost: the status counts the lost one',
      /Fenders over the side: 8\./.test(status) && /Lost while sailing: 1\./.test(status),
      status,
    );
    await context.close();
  }

  // 4. The same bump with the fenders out: "the fender took it"; without them: a bump.
  for (const [fenders, expected, label] of [
    [false, /Moored yacht, at our port side, .*a bump/, 'bare hull'],
    [true, /Moored yacht, at our port side, .*the fender took it/, 'fenders out'],
  ]) {
    const { context, page } = await openPage(
      phone,
      `m43 yacht ${label}`,
      `${BUMP}&tx=4${fenders ? '&fd=1' : ''}`,
      { testClock: true },
    );
    const shown = await poll(page, async () => (await alertText(page)) !== '', 8000);
    const text = await alertText(page);
    check(
      `yacht (${label}): the report says what was hit and how bad`,
      shown && expected.test(text),
      text,
    );
    if (fenders) await shot(page, 'm43-fender-took-it');
    await context.close();
  }

  // 5. Held still: nothing touches anything.
  {
    const { context, page } = await openPage(
      phone,
      'm43 held',
      '?pl=marina&m=harbour&ws=0&eng=1&lv=60&cam=top&tx=16&held=1',
      { testClock: true },
    );
    await setSheet(page, 'peek');
    await page.waitForTimeout(2000);
    const text = await alertText(page);
    check('held: no contact while held still', text === '', text);
    await context.close();
  }
}
