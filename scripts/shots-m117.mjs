// M117 (Learn for the dinghy, PHASE_DINGHY_SPEC 11.5): scenes and live checks for scripts/shots.mjs.
// Joins the m23 group. Labels contain "m117", so openPage adds held=1, sea=flat and clock=0 to
// queries without them. The filter and the per-boat reads are unit tests (tests/glossary.test.ts);
// here what a phone shows: the search, the entry names, the entries that are not on the boat.
import { setMode, showSection } from './ui.mjs';

/** Every size: the Kicker (the Hanse's Vang, written for the dinghy) and the new Capsize entry. */
export const M117_SCENES = [
  { name: 'kicker', query: '?boat=dinghy&learn=rope_vang', waitMs: 800 },
  { name: 'capsize', query: '?boat=dinghy&learn=term_capsize', waitMs: 800 },
];

export async function liveM117Checks({ openPage, viewports, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M117 ${what}: ${detail}`);
    console.log(`live M117 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const name = async (page) => (await page.getByTestId('learn-name').innerText()).trim();
  const hitIds = (page) =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-testid^="learn-hit-"]')].map((node) =>
        node.getAttribute('data-testid').slice('learn-hit-'.length),
      ),
    );

  // 1. The dinghy's search: no winch; the tiller and its extension.
  {
    const { context, page } = await openPage(phone, 'm117 search', '?boat=dinghy');
    await setMode(page, 'learn');
    await showSection(page, 'learn');
    await page.waitForTimeout(300);
    await page.getByTestId('learn-search').fill('winch');
    await page.waitForTimeout(200);
    const winch = await hitIds(page);
    check(
      'dinghy: search "winch" finds nothing',
      winch.length === 0 && (await page.getByTestId('learn-no-match').count()) === 1,
      JSON.stringify(winch),
    );
    await page.getByTestId('learn-search').fill('tiller');
    await page.waitForTimeout(200);
    const tiller = await hitIds(page);
    check(
      'dinghy: search "tiller" finds Tiller and Tiller extension',
      tiller.length === 2 &&
        tiller.includes('part_tiller') &&
        tiller.includes('part_tiller_extension'),
      JSON.stringify(tiller),
    );
    await page.getByTestId('learn-search').fill('');
    await page.waitForTimeout(200);
    const listed = await page.evaluate(() => ({
      gennaker: document.querySelectorAll('[data-testid="learn-entry-sail_gennaker"]').length,
      winch: document.querySelectorAll('[data-testid="learn-entry-fit_winch"]').length,
      tiller: document.querySelectorAll('[data-testid="learn-entry-part_tiller"]').length,
      hiking: document.querySelectorAll('[data-testid="learn-entry-term_hiking"]').length,
    }));
    check(
      'dinghy: the list has the tiller and Leaning out, not the gennaker or the winch',
      listed.tiller === 1 && listed.hiking === 1 && listed.gennaker === 0 && listed.winch === 0,
      JSON.stringify(listed),
    );
    await context.close();
  }

  // 2. The Kicker on the dinghy, and what it says.
  {
    const { context, page } = await openPage(phone, 'm117 kicker', '?boat=dinghy&learn=rope_vang');
    await page.waitForTimeout(500);
    const title = await name(page);
    const what = await page.getByTestId('learn-what').innerText();
    const onBoat = await page.getByTestId('learn-on-this-boat').count();
    const note = await page.getByTestId('learn-boat-note').count();
    check(
      'dinghy: ?learn=rope_vang is called Kicker, with no Hanse text and no "written for" note',
      title === 'Kicker' && what.includes('bottom of the mast') && onBoat === 0 && note === 0,
      JSON.stringify({ title, onBoat, note }),
    );
    await context.close();
  }

  // 3. The Hanse's Vang, as before.
  {
    const { context, page } = await openPage(phone, 'm117 hanse', '?learn=rope_vang');
    await page.waitForTimeout(500);
    const title = await name(page);
    const onBoat = await page.getByTestId('learn-on-this-boat').count();
    check(
      'Hanse: ?learn=rope_vang is still called Vang and still has its "On this boat" text',
      title === 'Vang' && onBoat === 1,
      JSON.stringify({ title, onBoat }),
    );
    await context.close();
  }

  // 4. The new entries, an id that is not on the boat, and Show it working on the dinghy.
  {
    const { context, page } = await openPage(phone, 'm117 new', '?boat=dinghy&learn=term_capsize');
    await page.waitForTimeout(500);
    const title = await name(page);
    const what = await page.getByTestId('learn-what').innerText();
    const showMe = await page.getByTestId('learn-show-me').count();
    check(
      'dinghy: Capsize says what to do and has a Show it working button',
      title === 'Capsize' && what.includes('centreboard') && showMe === 1,
      JSON.stringify({ title, showMe }),
    );
    await context.close();
    const away = await openPage(phone, 'm117 away', '?boat=dinghy&learn=fit_winch');
    await away.page.waitForTimeout(500);
    const entries = await away.page.getByTestId('learn-entry').count();
    const groups = await away.page.getByTestId('learn-groups').count();
    check(
      'dinghy: ?learn=fit_winch (not on the boat) opens the list, not an entry',
      entries === 0 && groups === 1,
      JSON.stringify({ entries, groups }),
    );
    await away.context.close();
  }
}
