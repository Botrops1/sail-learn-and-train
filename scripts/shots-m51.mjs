// M51 (phone tabs, PHASE8_SPEC 9.9): scenes and live checks for scripts/shots.mjs. Labels contain
// "m51", so openPage starts with every section folded and adds no `held=1`, `sea`, `clock` or `mm`.
// The live checks run on the phone and on the test clock.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { findClipped } from './shots-m23.mjs';
import { dragHandle, setSheet, showSection, showTab, tabNow, waitForLink } from './ui.mjs';

const SIDE = '?cam=side-port';

/** The `tab` field runs showTab (a no-op at the wider sizes, where there are no tabs). */
export const M51_SCENES = [
  { name: 'tabs-peek', query: SIDE, sheet: 'peek' },
  { name: 'tabs-controls', query: `${SIDE}&sel=rope_vang` },
  { name: 'tabs-mode', query: SIDE, tab: 'mode' },
  { name: 'tabs-conditions', query: SIDE, tab: 'conditions' },
  { name: 'tabs-learn', query: SIDE, tab: 'learn' },
  { name: 'tabs-settings', query: SIDE, tab: 'settings' },
  { name: 'tabs-ru', query: `${SIDE}&lang=ru` },
  { name: 'tabs-ru-realistic', query: `${SIDE}&lang=ru&mode=realistic` },
];

export async function liveM51Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M51 ${what}: ${detail}`);
    console.log(`live M51 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const sheetAt = (page) => page.getByTestId('sheet').getAttribute('data-sheet');
  const dataOpen = (page, id) => page.getByTestId(`section-${id}`).getAttribute('data-open');
  const displayed = (page, id) =>
    page.getByTestId(`section-${id}`).evaluate((node) => node.offsetParent !== null);
  const tabText = async (page, tab) =>
    (await page.getByTestId(`panel-tab-${tab}`).innerText()).trim();
  /** Waits for the sheet to stop moving (a tab can raise it). */
  const settled = (page) =>
    page.waitForFunction(
      () =>
        document.querySelector('[data-testid="sheet"]')?.getAttribute('data-sheet-moving') ===
        'false',
    );

  // 1. Five tabs.
  {
    const { context, page } = await openPage(phone, 'm51 five tabs', SIDE);
    const tabs = ['mode', 'controls', 'conditions', 'learn', 'settings'];
    const small = [];
    for (const tab of tabs) {
      const box = await page.getByTestId(`panel-tab-${tab}`).boundingBox();
      if (!box || box.height < 44) small.push(`${tab} ${box ? box.height : 'hidden'}`);
    }
    check(
      'the five tabs are visible and at least 44 px high',
      small.length === 0,
      small.join() || 'ok',
    );
    check('Controls is selected', (await tabNow(page)) === 'controls', String(await tabNow(page)));
    check(
      'the Mode tab reads "Easy"',
      (await tabText(page, 'mode')) === 'Easy',
      await tabText(page, 'mode'),
    );
    check(
      'the mode chip and the gear are gone from the chip row',
      (await page.getByTestId('mode-chip').isHidden()) &&
        (await page.getByTestId('settings-button').isHidden()),
      'visible',
    );
    check(
      'the Attention button and the camera chip stay',
      (await page.getByTestId('alert-chip').isVisible()) &&
        (await page.getByTestId('camera-chip').isVisible()),
      'hidden',
    );
    await shot(page, 'live-phone-m51-tabs');
    await context.close();
  }

  // 2. Peek height, 3. a tab at peek raises the sheet.
  {
    const { context, page } = await openPage(phone, 'm51 peek', SIDE);
    await setSheet(page, 'peek');
    const box = await page.getByTestId('sheet').boundingBox();
    check('peek is 128 px high', !!box && Math.abs(box.height - 128) <= 2, String(box?.height));
    check(
      'at peek the tabs and the quick row show, the panel body does not',
      (await page.getByTestId('panel-tab-controls').isVisible()) &&
        (await page.locator('.quick-row').isVisible()) &&
        !(await page.locator('.panel-body').isVisible()),
      'wrong',
    );
    await page.getByTestId('panel-tab-conditions').click();
    await settled(page);
    check(
      'a tab at peek raises the sheet to half',
      (await sheetAt(page)) === 'half',
      await sheetAt(page),
    );
    check(
      'Conditions is open and shown, Ropes is not displayed',
      (await dataOpen(page, 'conditions')) === 'true' &&
        (await displayed(page, 'conditions')) &&
        !(await displayed(page, 'ropes')),
      'wrong',
    );
    await context.close();
  }

  // 4. Controls remembers the section that was open.
  {
    const { context, page } = await openPage(phone, 'm51 remembers', SIDE);
    await showSection(page, 'ropes');
    await showTab(page, 'conditions');
    await showTab(page, 'controls');
    check(
      'Ropes is open again',
      (await dataOpen(page, 'ropes')) === 'true',
      String(await dataOpen(page, 'ropes')),
    );
    await context.close();
  }

  // 5. The Mode tab.
  {
    const { context, page } = await openPage(phone, 'm51 mode tab', SIDE);
    await showTab(page, 'mode');
    await page.getByTestId('mode-choice-learn').click();
    // The link is written 300 ms (app time) after a change.
    await page.waitForTimeout(400);
    const link = await waitForLink(page, ['m=learn']);
    check('Learn: the link has m=learn', link.includes('m=learn'), link);
    check(
      'Learn: the Learn tab is selected',
      (await tabNow(page)) === 'learn',
      String(await tabNow(page)),
    );
    check(
      'Learn: the Mode tab reads "Learn"',
      (await tabText(page, 'mode')) === 'Learn',
      await tabText(page, 'mode'),
    );
    await showTab(page, 'mode');
    await page.getByTestId('mode-choice-easy').click();
    check(
      'Easy: Controls is selected',
      (await tabNow(page)) === 'controls',
      String(await tabNow(page)),
    );
    await showTab(page, 'mode');
    await page.getByTestId('mode-choice-harbour').click();
    await settled(page);
    check(
      'Harbour: Controls opens with the Engine first',
      (await tabNow(page)) === 'controls' && (await dataOpen(page, 'engine')) === 'true',
      `${await tabNow(page)} ${await dataOpen(page, 'engine')}`,
    );
    await context.close();
  }

  // 6. The Settings tab, and Russian comes back to it.
  {
    const { context, page } = await openPage(phone, 'm51 settings tab', SIDE);
    await showTab(page, 'settings');
    check(
      'the settings are inside the Settings section',
      await page.getByTestId('section-settings').getByTestId('settings-content').isVisible(),
      'hidden',
    );
    await shot(page, 'live-phone-m51-settings');
    await page.locator('label.segment', { has: page.getByTestId('language-ru') }).click();
    await page.waitForURL(/lang=ru/);
    await page.getByTestId('panel-tab-settings').waitFor();
    check(
      'after the reload the Settings tab is selected',
      (await tabNow(page)) === 'settings' &&
        (await page.getByTestId('settings-content').isVisible()),
      String(await tabNow(page)),
    );
    await context.close();
  }

  // 7. Links.
  {
    let opened = await openPage(phone, 'm51 link learn', '?m=learn&learn=rope_vang');
    check(
      '?m=learn&learn=rope_vang opens the Learn tab with the entry',
      (await tabNow(opened.page)) === 'learn' &&
        (await opened.page.getByTestId('learn-name').isVisible()),
      String(await tabNow(opened.page)),
    );
    await opened.context.close();

    opened = await openPage(phone, 'm51 link rope', '?sel=rope_vang');
    check(
      '?sel=rope_vang opens Controls with Ropes open',
      (await tabNow(opened.page)) === 'controls' &&
        (await dataOpen(opened.page, 'ropes')) === 'true',
      `${await tabNow(opened.page)} ${await dataOpen(opened.page, 'ropes')}`,
    );
    await opened.context.close();

    // The Attention card's "?" (the fender reminder, as the M36 check makes it) opens the Learn tab.
    opened = await openPage(phone, 'm51 link alert', '?wd=60&ws=12&held=1&fd=1');
    await showSection(opened.page, 'conditions');
    await opened.page.locator('label:has([data-testid="boat-mode-sailing"])').click();
    await opened.page.waitForTimeout(500);
    await opened.page.getByTestId('alert-chip').click();
    await opened.page.getByTestId('alert-item').first().getByTestId('alert-learn').click();
    await opened.page.waitForTimeout(500);
    check(
      "the Attention card's ? opens the Learn tab",
      (await tabNow(opened.page)) === 'learn',
      String(await tabNow(opened.page)),
    );
    await opened.context.close();
  }

  // 8. Dragging from the tabs row moves the sheet; a tap on a tab does not.
  {
    const { context, page } = await openPage(phone, 'm51 drag', SIDE);
    await setSheet(page, 'half');
    await page.getByTestId('panel-tab-controls').click();
    await settled(page);
    check(
      'a tap on a tab leaves the sheet at half',
      (await sheetAt(page)) === 'half',
      await sheetAt(page),
    );
    await dragHandle(page, -200, 8, 30, 'panel-tab-controls');
    check(
      'a drag from the tabs row raises the sheet to full',
      (await sheetAt(page)) === 'full',
      await sheetAt(page),
    );
    check(
      'the drag did not change the tab',
      (await tabNow(page)) === 'controls',
      String(await tabNow(page)),
    );
    await context.close();
  }

  // 9. Keyboard.
  {
    const { context, page } = await openPage(phone, 'm51 keys', SIDE);
    await page.getByTestId('panel-tab-controls').focus();
    await page.keyboard.press('ArrowRight');
    const focusedTab = () =>
      page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? null);
    check(
      'ArrowRight: Conditions selected and focused',
      (await tabNow(page)) === 'conditions' && (await focusedTab()) === 'panel-tab-conditions',
      `${await tabNow(page)} ${await focusedTab()}`,
    );
    await page.keyboard.press('End');
    check(
      'End: Settings selected and focused',
      (await tabNow(page)) === 'settings' && (await focusedTab()) === 'panel-tab-settings',
      `${await tabNow(page)} ${await focusedTab()}`,
    );
    await context.close();
  }

  // 10. Conditions stays open on its tab.
  {
    const { context, page } = await openPage(phone, 'm51 conditions', SIDE);
    await showTab(page, 'conditions');
    await page.getByTestId('section-toggle-conditions').click();
    check(
      'a tap on the Conditions title leaves it open',
      (await dataOpen(page, 'conditions')) === 'true',
      String(await dataOpen(page, 'conditions')),
    );
    await context.close();
  }

  // 11. Russian and Realistic: the tab row fits.
  {
    const { context, page } = await openPage(phone, 'm51 ru', `${SIDE}&lang=ru&mode=realistic`);
    const row = await page.locator('.panel-tabs').boundingBox();
    const beyond = await page.evaluate(
      (width) =>
        [...document.querySelectorAll('.panel-tab')].filter(
          (node) => node.getBoundingClientRect().right > width + 0.5,
        ).length,
      phone.width,
    );
    check(
      'the tab row is inside the screen and the page does not scroll sideways',
      !!row &&
        row.x + row.width <= phone.width + 0.5 &&
        beyond === 0 &&
        (await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)),
      JSON.stringify(row),
    );
    const clipped = (await findClipped(page)).filter((line) => line.includes('panel-tab'));
    check(
      'nothing in the tab row is clipped',
      clipped.length === 0,
      clipped.join(' | ') || 'clean',
    );
    await shot(page, 'live-phone-m51-ru');
    await context.close();
  }

  // 12. Accessibility with each tab selected.
  {
    const { context, page } = await openPage(phone, 'm51 a11y', SIDE);
    await setSheet(page, 'half');
    for (const tab of ['mode', 'controls', 'conditions', 'learn', 'settings']) {
      await showTab(page, tab);
      problems.push(...(await auditPage(page, `m51 ${tab} tab`)));
    }
    await context.close();
  }
}
