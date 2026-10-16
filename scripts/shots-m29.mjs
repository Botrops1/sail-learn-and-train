// M29 (wide screens, accessibility sweep, frame figures): live checks for scripts/shots.mjs
// (PHASE5_SPEC 10.3, 10.4). Labels contain "m29", so openPage adds no `mm=0`: the app opens as
// it does without a link (Sailing, Coastal waves, the clock chip and the mini-map shown).
import { auditPage } from './a11y-audit.mjs';
import {
  closeSettings,
  openAllSections,
  openSettings,
  setMode,
  setSheet,
  showSection,
  sectionShown,
  waitForLink,
} from './ui.mjs';

const BOAT = '?wd=60&ws=12';
const MODES = ['easy', 'learn', 'realistic'];

export async function liveM29Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M29 ${what}: ${detail}`);
    console.log(`live M29 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone, foldable, desktop] = viewports;
  const landscape = viewports[3];
  const secondColumn = (page) => page.getByTestId('second-column');
  /** The ids of the sections that are direct children of a column, in DOM order. */
  const idsIn = (page, selector) =>
    page.evaluate(
      (css) =>
        [...document.querySelectorAll(`${css} > [data-section]`)].map((node) =>
          node.getAttribute('data-section'),
        ),
      selector,
    );
  const openStates = (page, selector) =>
    page.evaluate(
      (css) =>
        [...document.querySelectorAll(`${css} > [data-section]`)].map((node) =>
          node.getAttribute('data-open'),
        ),
      selector,
    );
  const isWide = (page) => page.evaluate(() => document.documentElement.dataset.wide === 'true');
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  // 1. Column 2 holds the mode's `second` sections, open, in order; the pictures of the three modes.
  for (const [mode, query, expected] of [
    ['easy', `${BOAT}`, ['conditions', 'learn']],
    ['learn', '?m=learn&learn=rope_vang', ['conditions', 'ropes']],
    ['realistic', '?mode=realistic&st=port', ['conditions', 'learn']],
  ]) {
    const { context, page } = await openPage(desktop, `m29 wide ${mode}`, query);
    await page.waitForTimeout(500);
    check(`${mode}: second column visible`, await secondColumn(page).isVisible(), 'visible');
    const ids = await idsIn(page, '[data-testid="second-column"]');
    const open = await openStates(page, '[data-testid="second-column"]');
    check(
      `${mode}: column 2 holds ${expected.join(', ')}`,
      same(ids, expected) && open.every((state) => state === 'true'),
      `${ids.join(', ')} (${open.join(', ')})`,
    );
    await page.screenshot({ path: `${outDir}/${prefix}live-wide-${mode}.png` });
    await context.close();
  }

  // 2. One pixel under the limit: one column, every section in column 1.
  {
    const { context, page } = await openPage(desktop, 'm29 narrow', BOAT);
    await page.setViewportSize({ width: 1279, height: 900 });
    await page.waitForFunction(() => !document.documentElement.dataset.wide);
    check('1279 px: second column hidden', await secondColumn(page).isHidden(), 'hidden');
    const ids = await idsIn(page, '.panel-body');
    check('1279 px: all seven sections in column 1', ids.length === 7, ids.join(', '));
    check(
      '1279 px: column 2 is empty',
      (await idsIn(page, '[data-testid="second-column"]')).length === 0,
      'empty',
    );
    await context.close();
  }

  // 3. Wide → side keeps the open states; side → wide fills column 2 again; the dial still works.
  {
    const { context, page } = await openPage(desktop, 'm29 resize', BOAT);
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.waitForFunction(() => !document.documentElement.dataset.wide);
    check('1000 px: second column hidden', await secondColumn(page).isHidden(), 'hidden');
    check(
      '1000 px: all seven sections in column 1',
      (await idsIn(page, '.panel-body')).length === 7,
      'seven',
    );
    check(
      '1000 px: Conditions keeps its open state',
      (await page.getByTestId('section-conditions').getAttribute('data-open')) === 'true',
      await page.getByTestId('section-conditions').getAttribute('data-open'),
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() => document.documentElement.dataset.wide === 'true');
    const ids = await idsIn(page, '[data-testid="second-column"]');
    check(
      '1440 px again: conditions, learn in column 2',
      same(ids, ['conditions', 'learn']),
      ids.join(', '),
    );
    const dial = page.getByTestId('wind-dial');
    await dial.scrollIntoViewIfNeeded();
    const box = await dial.boundingBox();
    await dial.click({ position: { x: box.width - 8, y: box.height / 2 } });
    const link = await waitForLink(page, ['wd=90']);
    check('the wind dial in column 2 turns the wind to east', true, link);
    await context.close();
  }

  // 4. Smaller screens never show a second column.
  for (const viewport of [foldable, landscape]) {
    const { context, page } = await openPage(viewport, `m29 narrow ${viewport.width}`, BOAT);
    await page.waitForTimeout(300);
    check(
      `${viewport.width} x ${viewport.height}: not wide, no second column`,
      !(await isWide(page)) && (await secondColumn(page).isHidden()),
      `wide ${await isWide(page)}`,
    );
    await context.close();
  }

  // 5. Every section of every mode can be reached on a wide screen.
  {
    const { context, page } = await openPage(desktop, 'm29 reach', BOAT);
    for (const mode of MODES) {
      await setMode(page, mode);
      const ids = await page.evaluate(() =>
        [...document.querySelectorAll('[data-section]')]
          .filter((node) => !node.hidden)
          .map((node) => node.getAttribute('data-section')),
      );
      const failed = [];
      for (const id of ids) {
        await showSection(page, id);
        if (!(await sectionShown(page, id))) failed.push(id);
      }
      check(
        `${mode}: every section reachable`,
        failed.length === 0 && ids.length >= 5,
        `${ids.join(', ')}${failed.length ? ` — not shown: ${failed.join(', ')}` : ''}`,
      );
    }
    await context.close();
  }

  // 6. The accessibility sweep (PHASE5_SPEC 10.4).
  const audit = async (page, label) => {
    const found = await auditPage(page, `m29 a11y ${label}`);
    check(
      `accessibility: ${label}`,
      found.length === 0,
      found.length ? found.join(' | ') : 'clean',
    );
  };
  {
    const { context, page } = await openPage(phone, 'm29 audit phone', BOAT);
    for (const mode of MODES) {
      await setMode(page, mode);
      await openAllSections(page);
      for (const height of ['peek', 'half', 'full']) {
        await setSheet(page, height);
        await audit(page, `phone ${mode} ${height}`);
      }
      await setSheet(page, 'half');
    }
    // The camera menu and the mode menu, open.
    await page.getByTestId('camera-chip').click();
    await audit(page, 'camera menu');
    await page.keyboard.press('Escape');
    await page.getByTestId('mode-chip').click();
    await audit(page, 'mode menu');
    await page.keyboard.press('Escape');
    // The mini-map (Sailing, sheet at half).
    check(
      'the mini-map is shown for its audit',
      await page.getByTestId('mini-map').isVisible(),
      'visible',
    );
    await audit(page, 'mini-map');
    await openSettings(page);
    await audit(page, 'settings dialog');
    await closeSettings(page);
    await context.close();
  }
  {
    const { context, page } = await openPage(phone, 'm29 audit russian', `${BOAT}&lang=ru`);
    await setSheet(page, 'half');
    await openAllSections(page);
    await audit(page, 'phone Russian easy half');
    await context.close();
  }
  {
    const { context, page } = await openPage(desktop, 'm29 audit wide', BOAT);
    for (const mode of MODES) {
      await setMode(page, mode);
      await openAllSections(page);
      await audit(page, `wide ${mode}`);
    }
    await openSettings(page);
    await audit(page, 'wide settings dialog');
    await closeSettings(page);
    await context.close();
  }

  // 7. Frame times (reported only; the owner checks the phone). PHASE5_SPEC 7.9 check 11.
  {
    const { context, page } = await openPage(
      phone,
      'm29 frames',
      '?debug=1&wd=60&ws=20&wm=gusty&detail=low',
    );
    for (const height of ['peek', 'half']) {
      await setSheet(page, height);
      await page.waitForTimeout(3000);
      const overlay = (await page.getByTestId('debug-overlay').innerText()).replace(/\s+/g, ' ');
      console.log(`live M29 frame figures at ${height} (reported only): ${overlay.slice(0, 160)}`);
    }
    await context.close();
  }
}
