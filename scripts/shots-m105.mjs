// M105 (Gennaker rigged, PHASE_RIGGING_SPEC 7.9): scenes and live checks for scripts/shots.mjs.
// Joins the m8 group, on the test clock. The route of the sheets and the drawing table are unit
// tests (tests/gennaker.test.ts); here only what needs the real 3D view and a finger.
import { openSettings, showSection, waitForLink } from './ui.mjs';

const B = '?wd=120&ws=10&ms=60&jf=0&held=1&sea=flat';

/** Screenshots at every size: the bag at the bow, the sheets from above, the hoisted sock. */
export const M105_SCENES = [
  { name: 'bag', query: `${B}&gn=1&cam=bow` },
  { name: 'sheets', query: `${B}&gn=2&cam=top` },
  { name: 'hoisted', query: `${B}&gn=4&cam=side-port` },
].map((scene) => ({ ...scene, waitMs: 2500, sheet: 'peek' }));

export async function liveM105Checks({ openPage, viewports, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M105 ${what}: ${detail}`);
    console.log(`live M105 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const open = async (label, extra) => {
    const opened = await openPage(phone, `m105 ${label}`, `${B}&cam=side-port&debug=1${extra}`, {
      testClock: true,
    });
    await opened.page.waitForTimeout(800);
    return opened;
  };
  const visible = (page, id) => page.evaluate((part) => window.__sailDebug.partVisible(part), id);
  /** The page's link once it has every part of `has` and none of `hasNot`, or the link as it is (so a check fails honestly). */
  const link = async (page, has, hasNot = []) => {
    try {
      return await waitForLink(page, has, hasNot);
    } catch {
      return page.evaluate(() => window.location.search + window.location.hash);
    }
  };

  // 1 and 2. Settings: Rigged puts the sock up; Stowed takes everything away.
  {
    const { context, page } = await open('settings', '');
    await openSettings(page);
    await page.getByTestId('gennaker-rigged').tap();
    const rigged = await link(page, ['gn=4']);
    await page.waitForTimeout(300);
    check('Rigged: the link has gn=4', rigged.includes('gn=4'), rigged);
    check('Rigged: the sock is drawn', await visible(page, 'part_gennaker_sock'), 'not visible');
    const pressed = await page.getByTestId('gennaker-rigged').getAttribute('aria-pressed');
    check('Rigged: the button shows pressed', pressed === 'true', String(pressed));
    await page.getByTestId('gennaker-stowed').tap();
    const stowed = await link(page, [], ['gn=']);
    await page.waitForTimeout(300);
    check('Stowed: gn leaves the link', !stowed.includes('gn='), stowed);
    check(
      'Stowed: the sock is gone',
      !(await visible(page, 'part_gennaker_sock')),
      'still visible',
    );
    await context.close();
  }

  // 3. The Sails section: step 1 ticked; Next twice reaches gn=3; Undo gives gn=2.
  {
    const { context, page } = await open('steps', '&gn=1');
    await showSection(page, 'sails');
    const first = page.getByTestId('gennaker-step-1');
    check(
      'steps: step 1 is ticked, step 2 is not',
      (await first.getAttribute('data-done')) === 'true' &&
        (await page.getByTestId('gennaker-step-2').getAttribute('data-done')) === 'false',
      String(await page.getByTestId('gennaker-steps').innerText()),
    );
    const next = page.getByTestId('gennaker-next');
    const box = await next.boundingBox();
    check(
      'steps: the buttons are at least 44 px tall',
      (box?.height ?? 0) >= 44,
      String(box?.height),
    );
    await next.tap();
    await next.tap();
    const three = await link(page, ['gn=3']);
    check(
      'steps: Next twice gives gn=3 (and a side)',
      three.includes('gn=3') && three.includes('gx=p'),
      three,
    );
    await page.getByTestId('gennaker-back').tap();
    const two = await link(page, ['gn=2']);
    await page.waitForTimeout(300);
    check('steps: Undo once gives gn=2', two.includes('gn=2'), two);
    check(
      'steps: the sheet blocks are drawn at gn=2',
      await visible(page, 'fit_gennaker_block'),
      'not visible',
    );
    await context.close();
  }

  // 4. The Ropes list: the sheets are listed at gn=2, the sock line is not.
  {
    const { context, page } = await open('ropes list', '&gn=2');
    await showSection(page, 'ropes');
    const row = (id) => page.locator(`.rope-item[data-select="${id}"]`);
    const shown = async (id) => (await row(id).count()) > 0 && (await row(id).first().isVisible());
    check(
      'ropes list: both sheets are listed',
      (await shown('rope_gennaker_sheet_port')) && (await shown('rope_gennaker_sheet_starboard')),
      'a sheet is missing',
    );
    check('ropes list: the sock line is not', !(await shown('rope_gennaker_sock_line')), 'listed');
    await context.close();
  }
}
