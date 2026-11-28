// M29 (wide screens, accessibility sweep, frame figures): live checks for scripts/shots.mjs
// (PHASE5_SPEC 10.3, 10.4). Labels contain "m29", so openPage adds no `mm=0`: the app opens as
// it does without a link (Sailing, Coastal waves, the clock chip and the mini-map shown).
import { auditPage } from './a11y-audit.mjs';
import {
  closeSettings,
  eachSection,
  openSettings,
  setMode,
  setSheet,
  showSection,
  sectionShown,
  showTab,
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
  const layoutNow = (page) =>
    page.evaluate(() => ({
      layout: document.documentElement.dataset.layout,
      size: document.documentElement.dataset.console ?? null,
    }));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  // 1. On the console Conditions and Learn are in drawers (M119), the same in every mode; the pictures of
  // the three modes. Learn's entry (a link) opens its section in the Learn drawer.
  for (const [mode, query] of [
    ['easy', `${BOAT}`],
    ['learn', '?m=learn&learn=rope_vang'],
    ['realistic', '?mode=realistic&st=port'],
  ]) {
    const { context, page } = await openPage(desktop, `m29 wide ${mode}`, query);
    await page.waitForTimeout(500);
    const reached = [];
    for (const id of ['conditions', 'learn']) {
      await showSection(page, id);
      if (await sectionShown(page, id)) reached.push(id);
    }
    check(
      `${mode}: Conditions and Learn reach their drawers`,
      same(reached, ['conditions', 'learn']),
      reached.join(', '),
    );
    await page.screenshot({ path: `${outDir}/${prefix}live-wide-${mode}.png` });
    await context.close();
  }

  // 2. One pixel under the wide limit: the narrow console, the same sections.
  {
    const { context, page } = await openPage(desktop, 'm29 narrow', BOAT);
    await page.setViewportSize({ width: 1279, height: 900 });
    await page.waitForFunction(() => document.documentElement.dataset.console === 'narrow');
    const now = await layoutNow(page);
    check(
      '1279 px: the console is narrow',
      now.layout === 'console' && now.size === 'narrow',
      JSON.stringify(now),
    );
    await context.close();
  }

  // 3. Wide -> narrow keeps the drawer; narrow -> wide too; the dial still works in its drawer.
  {
    const { context, page } = await openPage(desktop, 'm29 resize', BOAT);
    await showSection(page, 'conditions');
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.waitForFunction(() => document.documentElement.dataset.console === 'narrow');
    check('1000 px: Conditions is still shown', await sectionShown(page, 'conditions'), 'shown');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() => document.documentElement.dataset.console === 'wide');
    check(
      '1440 px again: Conditions is still shown',
      await sectionShown(page, 'conditions'),
      'shown',
    );
    const dial = page.getByTestId('wind-dial');
    await dial.scrollIntoViewIfNeeded();
    const box = await dial.boundingBox();
    await dial.click({ position: { x: box.width - 8, y: box.height / 2 } });
    const link = await waitForLink(page, ['wd=90']);
    check('the wind dial in its drawer turns the wind to east', true, link);
    await context.close();
  }

  // 4. Smaller screens: the foldable is a narrow console, the landscape phone is stacked.
  for (const viewport of [foldable, landscape]) {
    const { context, page } = await openPage(viewport, `m29 narrow ${viewport.width}`, BOAT);
    await page.waitForTimeout(300);
    const now = await layoutNow(page);
    const expected = viewport === foldable ? 'console' : 'stacked';
    check(
      `${viewport.width} x ${viewport.height}: ${expected}, not wide`,
      now.layout === expected && now.size !== 'wide',
      JSON.stringify(now),
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
      for (const height of ['peek', 'half', 'full']) {
        await setSheet(page, height);
        await audit(page, `phone ${mode} ${height}, all folded`);
      }
      await setSheet(page, 'half');
      await eachSection(page, (id) => audit(page, `phone ${mode} ${id} open`));
    }
    // The camera menu and the mode menu, open.
    await page.getByTestId('camera-chip').click();
    await audit(page, 'camera menu');
    await page.keyboard.press('Escape');
    // M51: the mode list is the Mode tab on a phone.
    await showTab(page, 'mode');
    await audit(page, 'mode menu');
    await showTab(page, 'controls');
    // The mini-map (Sailing, sheet at half: the sections above raised it to full).
    await setSheet(page, 'half');
    check(
      'the mini-map is shown for its audit',
      await page.getByTestId('mini-map').isVisible(),
      'visible',
    );
    await audit(page, 'mini-map');
    await openSettings(page);
    await audit(page, 'settings card');
    await closeSettings(page);
    await context.close();
  }
  {
    const { context, page } = await openPage(phone, 'm29 audit russian', `${BOAT}&lang=ru`);
    await setSheet(page, 'half');
    await eachSection(page, (id) => audit(page, `phone Russian easy ${id} open`));
    await context.close();
  }
  {
    const { context, page } = await openPage(desktop, 'm29 audit wide', BOAT);
    for (const mode of MODES) {
      await setMode(page, mode);
      await audit(page, `wide ${mode}, all folded`);
      await eachSection(page, (id) => audit(page, `wide ${mode} ${id} open`));
    }
    await openSettings(page);
    await audit(page, 'wide settings card');
    await closeSettings(page);
    await context.close();
  }
}
