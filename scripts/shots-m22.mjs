// M22 (Sailing words, directions and winds): scenes and live checks for scripts/shots.mjs
// (PHASE4_SPEC 8.6). Labels contain "m22", so openPage adds held=1, sea=flat and clock=0 to
// queries without them.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';

/** Every size: a side word (with an old alternative name), a compass word, the gybe entry. */
export const M22_SCENES = [
  { name: 'learn-port', query: '?learn=term_port', waitMs: 800 },
  { name: 'learn-north', query: '?learn=term_north', waitMs: 800 },
  { name: 'learn-gybe', query: '?learn=term_gybe', waitMs: 800 },
];

export async function liveM22Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M22 ${what}: ${detail}`);
    console.log(`live M22 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });

  /** The address bar is written 300 ms after a change: poll up to 1 s. */
  const wait = async (page, test, text) => {
    try {
      await page.waitForFunction(test, text, { timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  };
  const has = (page, text) => wait(page, (value) => location.search.includes(value), text);
  const hasNot = (page, text) => wait(page, (value) => !location.search.includes(value), text);

  // 1. The group "Directions and sides (14)": 14 buttons.
  {
    const { context, page } = await openPage(phone, 'm22 directions', '?wd=90&ws=12');
    await page.locator('#tab-learn').click();
    await page.waitForTimeout(500);
    const summary = page.locator('[data-testid="learn-group-directions"] > summary');
    check(
      'the group is "Directions and sides (14)"',
      (await summary.innerText()) === 'Directions and sides (14)',
      await summary.innerText(),
    );
    await summary.click();
    const buttons = await page
      .locator('[data-testid="learn-group-directions"] button.learn-list-button')
      .count();
    check('14 buttons in the group', buttons === 14, String(buttons));
    await shot(page, 'live-phone-m22-directions');
    await context.close();
  }

  // 2. Search "force": the Beaufort scale, found through its other name.
  {
    const { context, page } = await openPage(phone, 'm22 force', '?wd=90&ws=12');
    await page.locator('#tab-learn').click();
    await page.getByTestId('learn-search').fill('force');
    const text = await page.getByTestId('learn-hit-term_beaufort').innerText();
    check('force finds the Beaufort scale', text.includes('also: force'), text);
    await page.getByTestId('learn-search').fill('jibe');
    const gybe = await page.getByTestId('learn-hit-term_gybe').innerText();
    check('jibe finds the Gybe', gybe.includes('also: jibe'), gybe);
    await context.close();
  }

  // 3. Show me on "Heel": ws=20 in the address bar, Back removes it.
  {
    const { context, page } = await openPage(phone, 'm22 heel', '?learn=term_heel');
    await page.waitForTimeout(500);
    check('no ws=20 before', await hasNot(page, 'ws=20'), 'ws=20 there already');
    await page.getByTestId('learn-show-me').click();
    check('Show me puts ws=20 in the address bar', await has(page, 'ws=20'), 'no ws=20');
    await shot(page, 'live-phone-m22-heel');
    await page.goBack();
    check('Back removes ws=20', await hasNot(page, 'ws=20'), 'ws=20 still there');
    await context.close();
  }

  // 4. Accessibility of a Learn entry made only of the new kind of text.
  {
    const { context, page } = await openPage(phone, 'm22 a11y', '?learn=term_north');
    await page.waitForTimeout(500);
    const found = await auditPage(page, 'm22 a11y north');
    check(
      'accessibility: the North entry',
      found.length === 0,
      found.length ? found.join(' | ') : 'clean',
    );
    await context.close();
  }
}
