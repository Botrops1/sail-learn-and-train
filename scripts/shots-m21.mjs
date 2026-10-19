// M21 (Glossary and search): scenes and live checks for scripts/shots.mjs (PHASE4_SPEC 7.7).
// Labels contain "m21", so openPage adds held=1, sea=flat and clock=0 to queries without them.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { setMode, showSection } from './ui.mjs';

/** Every size: the groups, the search for "vang", an entry with its Back button, the danger zone's scene after the gybe. */
export const M21_SCENES = [
  { name: 'learn-groups', query: '?wd=90&ws=12', section: 'learn', waitMs: 800 },
  {
    name: 'learn-search-vang',
    query: '?wd=90&ws=12',
    section: 'learn',
    type: { testId: 'learn-search', text: 'vang' },
    waitMs: 800,
  },
  { name: 'learn-winch', query: '?learn=fit_winch', waitMs: 800 },
  {
    // She gybes at about 6.5 s: the red sweep should show.
    name: 'learn-danger-zone',
    query: '?learn=env_boom_danger_zone',
    click: ['learn-show-me'],
    waitMs: 8000,
  },
];

export async function liveM21Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M21 ${what}: ${detail}`);
    console.log(`live M21 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
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
  const learnName = (page) => page.getByTestId('learn-name').innerText();
  const groupCount = (page) => page.locator('[data-testid="learn-groups"] > details').count();

  // 1. The groups; open one, open an entry, come back.
  {
    const { context, page } = await openPage(phone, 'm21 groups', '?wd=90&ws=12');
    await setMode(page, 'learn');
    await setMode(page, 'learn');
    await showSection(page, 'learn');
    await page.waitForTimeout(500);
    check('eleven groups', (await groupCount(page)) === 11, String(await groupCount(page)));
    const summary = page.locator('[data-testid="learn-group-ropes"] > summary');
    check('the first group is Ropes (9)', (await summary.innerText()) === 'Ropes (9)', '');
    await summary.click();
    await page.getByTestId('learn-entry-rope_vang').click();
    check('the entry opens', (await learnName(page)) === 'Vang', await learnName(page));
    check('the address bar has learn=rope_vang', await has(page, 'learn=rope_vang'), 'missing');
    await page.getByTestId('learn-back').click();
    check('Back to the list shows the groups', (await groupCount(page)) === 11, 'no groups');
    const open = await page.locator('[data-testid="learn-groups"] > details[open]').count();
    check('the groups are closed again', open === 0, String(open));
    check('learn= leaves the address bar', await hasNot(page, 'learn='), 'learn= still there');
    await shot(page, 'live-phone-m21-groups');
    await context.close();
  }

  // 2. Search by another name; no match; the text stays when an entry is opened.
  {
    const { context, page } = await openPage(phone, 'm21 search', '?wd=90&ws=12');
    await setMode(page, 'learn');
    await setMode(page, 'learn');
    await showSection(page, 'learn');
    const search = page.getByTestId('learn-search');
    await search.fill('kicker');
    const hit = page.getByTestId('learn-hit-rope_vang');
    const text = await hit.innerText();
    check('kicker finds the Vang', text.includes('Vang') && text.includes('also: kicker'), text);
    await shot(page, 'live-phone-m21-search-kicker');
    await hit.click();
    check('the hit opens the Vang', (await learnName(page)) === 'Vang', await learnName(page));
    check('the search text stays', (await search.inputValue()) === 'kicker', 'lost');
    await page.getByTestId('learn-back').click();
    check(
      'Back shows the results again',
      (await page.getByTestId('learn-hit-rope_vang').count()) === 1,
      'no results',
    );
    await page.getByTestId('learn-hit-rope_vang').click();
    // Typing with an entry open leaves the entry and shows the results.
    await search.fill('kickerxx');
    const none = await page.getByTestId('learn-results').innerText();
    check('kickerxx finds nothing', none.includes('Nothing found.'), none);
    await search.fill('   ');
    check('spaces alone show the groups', (await groupCount(page)) === 11, 'no groups');
    await context.close();
  }

  // 3. A word printed on the boat.
  {
    const { context, page } = await openPage(phone, 'm21 genoa', '?wd=90&ws=12');
    await setMode(page, 'learn');
    await setMode(page, 'learn');
    await showSection(page, 'learn');
    await page.getByTestId('learn-search').fill('Genoa');
    const text = await page.getByTestId('learn-hit-rope_jib_sheet').innerText();
    check('Genoa finds the jib sheet', text.includes('also: Genoa sheet'), text);
    await context.close();
  }

  // 4. Show me and Back.
  {
    const { context, page } = await openPage(phone, 'm21 winch handle', '?learn=part_winch_handle');
    await page.waitForTimeout(500);
    await page.getByTestId('learn-show-me').click();
    check('Show me opens Realistic mode', await has(page, 'mode=realistic'), 'no mode=realistic');
    await shot(page, 'live-phone-m21-winch-handle');
    await page.goBack();
    check('Back leaves Realistic mode', await hasNot(page, 'mode=realistic'), 'still realistic');
    await context.close();
  }

  // 5. Accessibility: the groups, one group open, the results.
  {
    const { context, page } = await openPage(phone, 'm21 a11y', '?wd=90&ws=12');
    await setMode(page, 'learn');
    await setMode(page, 'learn');
    await showSection(page, 'learn');
    await page.waitForTimeout(500);
    const clean = (what, found) =>
      check(
        `accessibility: ${what}`,
        found.length === 0,
        found.length ? found.join(' | ') : 'clean',
      );
    clean('the groups', await auditPage(page, 'm21 a11y groups'));
    await page.locator('[data-testid="learn-group-cockpit"] > summary').click();
    clean('one group open', await auditPage(page, 'm21 a11y group open'));
    await page.getByTestId('learn-search').fill('mast');
    clean('search results', await auditPage(page, 'm21 a11y results'));
    await page.getByTestId('learn-search').fill('zzzz');
    clean('no result', await auditPage(page, 'm21 a11y no result'));
    await context.close();
  }
}
