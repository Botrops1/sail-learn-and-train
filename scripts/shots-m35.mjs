// M35 (folded sections, one open at a time): scenes and live checks for scripts/shots.mjs
// (PHASE5_SPEC 11). Labels contain "m35", so openPage adds nothing: the app opens as it does
// without a link (Sailing, Coastal waves, the clock chip shown).
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { sectionIds, setMode, setSheet, showSection } from './ui.mjs';

const BOAT = '?wd=60&ws=12';

export const M35_SCENES = [
  { name: 'all-folded', query: BOAT },
  { name: 'ropes-open', query: BOAT, section: 'ropes' },
  { name: 'sails-open', query: BOAT, section: 'sails' },
  { name: 'realistic-all-folded', query: '?mode=realistic&st=port' },
];

export async function liveM35Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M35 ${what}: ${detail}`);
    console.log(`live M35 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone, , desktop, landscape] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const dataOpen = (page, id) => page.getByTestId(`section-${id}`).getAttribute('data-open');
  /** The ids of the sections that are open now. */
  const openIds = (page) =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-section][data-open="true"]')]
        .filter((node) => !node.hidden)
        .map((node) => node.getAttribute('data-section')),
    );
  /** The top and bottom of each shown section's header, by id. */
  const headBoxes = (page) =>
    page.evaluate(() =>
      Object.fromEntries(
        [...document.querySelectorAll('[data-section]')]
          .filter((node) => !node.hidden)
          .map((node) => {
            const box = node.querySelector('.section-toggle').getBoundingClientRect();
            return [node.getAttribute('data-section'), { top: box.top, bottom: box.bottom }];
          }),
      ),
    );
  /** The box of the column that holds the section. */
  const columnBox = (page, id) =>
    page.getByTestId(`section-${id}`).evaluate((node) => {
      const box = node.parentElement.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom };
    });

  // 1. A phone opens with every section folded, every header on screen, thin.
  {
    const { context, page } = await openPage(phone, 'm35 start', BOAT);
    await page.waitForTimeout(500);
    const ids = await sectionIds(page);
    const open = await openIds(page);
    check('no section is open at the start', open.length === 0, open.join() || 'none');
    check('Ropes says data-open false', (await dataOpen(page, 'ropes')) === 'false', '');
    const heads = await headBoxes(page);
    const column = await columnBox(page, 'ropes');
    const inside = ids.every(
      (id) => heads[id].top >= column.top - 1 && heads[id].bottom <= column.bottom + 1,
    );
    check('every header is inside the panel', inside, JSON.stringify(heads));
    const height = heads[ids[0]].bottom - heads[ids[0]].top;
    check('phone headers are thin (34 px)', height >= 33 && height <= 36, String(height));
    await shot(page, 'live-phone-m35-folded');
    await context.close();
  }

  // 2. Opening a section folds the others; the headers above stay put and the ones below sit at
  // the bottom of the panel; tapping the open header folds it.
  {
    const { context, page } = await openPage(phone, 'm35 accordion', BOAT);
    await page.waitForTimeout(500);
    await showSection(page, 'ropes');
    check('Ropes is the only open section', (await openIds(page)).join() === 'ropes', '');
    const sheetHeight = await page.getByTestId('sheet').getAttribute('data-sheet');
    check('a tapped title raises the sheet from half to full', sheetHeight === 'full', sheetHeight);
    await showSection(page, 'conditions');
    const open = await openIds(page);
    check('opening Conditions folds Ropes', open.join() === 'conditions', open.join());
    const heads = await headBoxes(page);
    const ids = await sectionIds(page);
    const index = ids.indexOf('conditions');
    const above = ids.slice(0, index + 1);
    const column = await columnBox(page, 'conditions');
    check(
      'the headers above and the open one are stacked at the top of the panel',
      Math.abs(heads[above[0]].top - column.top) < 2 &&
        above.slice(1).every((id, i) => Math.abs(heads[id].top - heads[above[i]].bottom) < 2),
      JSON.stringify(heads),
    );
    const last = heads[ids[ids.length - 1]];
    check(
      'the last header sits at the bottom of the panel',
      Math.abs(last.bottom - column.bottom) < 2,
      `${last.bottom} vs ${column.bottom}`,
    );
    // The open body scrolls on its own: the headers do not move.
    const body = page.locator('#section-body-conditions');
    await body.evaluate((node) => {
      node.scrollTop = 40;
    });
    const scrolled = await headBoxes(page);
    check(
      'scrolling the body leaves the headers alone',
      ids.every((id) => Math.abs(scrolled[id].top - heads[id].top) < 1),
      JSON.stringify(scrolled),
    );
    await shot(page, 'live-phone-m35-conditions');
    await page.getByTestId('section-toggle-conditions').click();
    check('tapping the open header folds it', (await openIds(page)).length === 0, '');
    await context.close();
  }

  // 3. A new mode folds everything again.
  {
    const { context, page } = await openPage(phone, 'm35 mode', BOAT);
    await page.waitForTimeout(500);
    await showSection(page, 'sails');
    await setMode(page, 'realistic');
    const open = await openIds(page);
    check('choosing a mode folds every section', open.length === 0, open.join() || 'none');
    await context.close();
  }

  // 4. A link that names something opens the section that shows it.
  {
    let opened = await openPage(phone, 'm35 link rope', '?sel=rope_mainsheet&wd=60&ws=12');
    await opened.page.waitForTimeout(500);
    let open = await openIds(opened.page);
    check('a selected rope opens Ropes', open.join() === 'ropes', open.join() || 'none');
    await opened.context.close();

    opened = await openPage(phone, 'm35 link learn', '?learn=term_north&held=1');
    await opened.page.waitForTimeout(500);
    open = await openIds(opened.page);
    check('a Learn entry opens Learn', open.join() === 'learn', open.join() || 'none');
    await opened.context.close();
  }

  // 5. The phone held sideways: thin headers, all on screen, no page scroll.
  {
    const { context, page } = await openPage(landscape, 'm35 landscape', BOAT);
    await page.waitForTimeout(500);
    await showSection(page, 'ropes');
    const heads = await headBoxes(page);
    const ids = await sectionIds(page);
    const height = heads[ids[0]].bottom - heads[ids[0]].top;
    check('sideways: headers are thin (34 px)', height >= 33 && height <= 36, String(height));
    const column = await columnBox(page, 'ropes');
    check(
      'sideways: the last header is inside the panel',
      heads[ids[ids.length - 1]].bottom <= column.bottom + 1,
      JSON.stringify(heads[ids[ids.length - 1]]),
    );
    await shot(page, 'live-landscape-m35-ropes');
    await context.close();
  }

  // 6. A computer: normal (44 px) headers; the two columns fold on their own.
  {
    const { context, page } = await openPage(desktop, 'm35 wide', BOAT);
    await page.waitForTimeout(500);
    const ids = await sectionIds(page);
    const heads = await headBoxes(page);
    const height = heads[ids[0]].bottom - heads[ids[0]].top;
    check('wide: headers are 44 px', height >= 43 && height <= 46, String(height));
    await showSection(page, 'ropes');
    await showSection(page, 'conditions');
    const open = await openIds(page);
    check('wide: one open section per column', open.join() === 'ropes,conditions', open.join());
    await showSection(page, 'learn');
    check(
      'wide: Learn replaces Conditions, Ropes stays',
      (await openIds(page)).join() === 'ropes,learn',
      (await openIds(page)).join(),
    );
    await shot(page, 'live-desktop-m35-two-columns');
    await context.close();
  }

  // 7. Resizing keeps the open section and one open per column.
  {
    const { context, page } = await openPage(desktop, 'm35 resize', BOAT);
    await page.waitForTimeout(500);
    await showSection(page, 'ropes');
    await showSection(page, 'conditions');
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.waitForFunction(() => !document.documentElement.dataset.wide);
    const open = await openIds(page);
    check(
      'wide → side: only the latest opened section stays open',
      open.join() === 'conditions',
      open.join(),
    );
    await context.close();
  }

  // 8. Accessibility with everything folded and with one open.
  {
    const { context, page } = await openPage(phone, 'm35 a11y', BOAT);
    await page.waitForTimeout(500);
    await setSheet(page, 'half');
    problems.push(...(await auditPage(page, 'm35 phone, all folded')));
    await showSection(page, 'ropes');
    problems.push(...(await auditPage(page, 'm35 phone, Ropes open')));
    await context.close();
  }
}
