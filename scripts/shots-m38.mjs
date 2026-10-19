// M38 (right column: Mode, Settings, corners; issues #90, #91, #92, #93, tracking issue #94): scenes
// and live checks for scripts/shots.mjs (PHASE5_SPEC 16). Labels contain "m38", so openPage lets
// the app open as it does without a link (Sailing, Coastal waves, the clock chip shown, the
// mini-map shown, every section folded). The live checks run on the test clock (shots.mjs passes
// `onTestClock`): waitForTimeout moves the app's time on.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { closeSettings, isWide, openSettings, setMode, showSection } from './ui.mjs';

const BOAT = '?wd=60&ws=12';

export const M38_SCENES = [
  { name: 'start', query: BOAT },
  { name: 'part-card', query: `${BOAT}&sel=part_hull` },
];

/** The windows of the done-when list (issue #92): a small, a usual and a large computer window. */
const W1280 = { name: 'w1280', width: 1280, height: 800 };
const W1920 = { name: 'w1920', width: 1920, height: 1000 };

export async function liveM38Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M38 ${what}: ${detail}`);
    console.log(`live M38 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone, foldable, desktop] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const box = async (page, id) => {
    const node = page.getByTestId(id).first();
    if ((await node.count()) === 0 || !(await node.isVisible())) return null;
    const b = await node.boundingBox();
    return b && { x: b.x, y: b.y, w: b.width, h: b.height };
  };
  const overlap = (a, b) =>
    !!a && !!b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const search = (page) => page.evaluate(() => window.location.search);
  /** The section ids of one column, top to bottom. */
  const column = (page, selector) =>
    page.evaluate(
      (sel) =>
        [...document.querySelectorAll(`${sel} > [data-section]`)]
          .filter((node) => !node.hidden)
          .map((node) => node.getAttribute('data-section')),
      selector,
    );
  const visible = async (page, id) => {
    const node = page.getByTestId(id).first();
    return (await node.count()) > 0 && (await node.isVisible());
  };

  // Computer windows (issues #91, #92, #93): Mode first, Settings last, no mode chip and no gear,
  // the View button bottom-right and the mini-map bottom-left, nothing overlapping.
  for (const viewport of [W1280, desktop, W1920]) {
    const name = viewport.name;
    const { context, page } = await openPage(viewport, `m38 wide ${name}`, `${BOAT}&sel=part_hull`);
    await page.waitForTimeout(1500);
    check(`${name}: wide layout`, await isWide(page), String(await isWide(page)));
    const first = await column(page, '.panel-body');
    const second = await column(page, '[data-testid="second-column"]');
    check(
      `${name}: Easy, column 1 starts with Mode and ends with Settings`,
      first.join() === 'mode,ropes,sails,autopilot,engine,place,harbour,settings' &&
        second.join() === 'conditions,learn',
      JSON.stringify({ first, second }),
    );
    check(
      `${name}: the mode chip and the gear are gone`,
      !(await visible(page, 'mode-chip')) && !(await visible(page, 'settings-button')),
      'chips',
    );
    check(
      `${name}: no Rope colours section`,
      (await page.getByTestId('section-legend').count()) === 0 &&
        (await page.getByTestId('rope-legend').count()) === 0,
      'legend',
    );
    const title = await page.getByTestId('section-toggle-mode').innerText();
    check(`${name}: the Mode section names the mode`, title.includes('Mode: Easy'), title);

    // The corners.
    const view = await box(page, 'view-top'); // only to know the view's left edge
    const viewBox = await page.locator('.view').first().boundingBox();
    const mini = await box(page, 'mini-map');
    const camera = await box(page, 'camera-chip');
    const card = await box(page, 'info-card');
    const attention = await box(page, 'alert-centre');
    check(
      `${name}: the mini-map is in the bottom-left corner`,
      !!mini &&
        mini.x - viewBox.x <= 12 &&
        viewBox.y + viewBox.height - (mini.y + mini.h) <= 12 &&
        viewBox.y + viewBox.height - (mini.y + mini.h) >= 4,
      JSON.stringify({ mini, viewBox }),
    );
    check(
      `${name}: the View button is in the bottom-right corner`,
      !!camera &&
        viewBox.x + viewBox.width - (camera.x + camera.w) <= 12 &&
        viewBox.y + viewBox.height - (camera.y + camera.h) <= 12,
      JSON.stringify({ camera, viewBox }),
    );
    check(
      `${name}: nothing overlaps the corners`,
      !overlap(mini, camera) &&
        !overlap(mini, card) &&
        !overlap(mini, attention) &&
        !overlap(camera, card) &&
        !overlap(camera, attention) &&
        !!card,
      JSON.stringify({ mini, camera, card, attention, view }),
    );
    // The View menu opens above its chip and stays inside the view.
    await page.getByTestId('camera-chip').click();
    const menu = await box(page, 'camera-menu');
    check(
      `${name}: the View menu opens inside the view, above the button`,
      !!menu &&
        menu.x >= viewBox.x &&
        menu.x + menu.w <= viewBox.x + viewBox.width &&
        menu.y + menu.h <= camera.y,
      JSON.stringify({ menu, camera }),
    );
    await page.keyboard.press('Escape');
    // The full map and back: the Close chip takes the corner.
    await page.getByTestId('mini-map').click();
    await page.waitForTimeout(500);
    const close = await box(page, 'map-close');
    const cameraOnMap = await box(page, 'camera-chip');
    check(
      `${name}: on the map the Close chip sits beside the View button, bottom-right`,
      !!close &&
        !!cameraOnMap &&
        !overlap(close, cameraOnMap) &&
        close.x < cameraOnMap.x &&
        viewBox.x + viewBox.width - (cameraOnMap.x + cameraOnMap.w) <= 12,
      JSON.stringify({ close, cameraOnMap }),
    );
    await page.getByTestId('map-close').click();
    await page.waitForTimeout(300);
    check(`${name}: Close brings the mini-map back`, await visible(page, 'mini-map'), 'mini-map');
    if (name === 'desktop-1440x900') await shot(page, 'live-wide-corners');
    await context.close();
  }

  // The Mode section works as the chip did (issue #91), at 1,440 px.
  {
    const { context, page } = await openPage(desktop, 'm38 mode section', `${BOAT}&ms=40&vg=70`);
    await showSection(page, 'mode');
    const choices = await page.locator('[data-testid^="mode-choice-"]').count();
    const names = await page.locator('.mode-choice .mode-option-name').allInnerTexts();
    const hints = await page.locator('.mode-choice .mode-option-hint').allInnerTexts();
    check(
      'the Mode section lists Learn, Easy, Realistic and Harbour, each with a description',
      choices === 4 &&
        names.join() === 'Learn,Easy,Realistic,Harbour' &&
        hints.every((hint) => hint.length > 30),
      JSON.stringify({ names, hints }),
    );
    check(
      'Easy is the checked one',
      (await page.getByTestId('mode-choice-easy').getAttribute('aria-checked')) === 'true',
      'aria-checked',
    );
    await shot(page, 'live-wide-mode-open');
    await setMode(page, 'realistic');
    await page.waitForTimeout(300);
    let link = await search(page);
    check(
      'Realistic: the link says so, the ropes keep their values, the Mode section stays open',
      link.includes('mode=realistic') &&
        link.includes('ms=40') &&
        link.includes('vg=70') &&
        (await page.getByTestId('section-mode').getAttribute('data-open')) === 'true' &&
        (await page.getByTestId('section-toggle-mode').innerText()).includes('Mode: Realistic') &&
        (await page.getByTestId('mode-choice-realistic').getAttribute('aria-checked')) === 'true',
      link,
    );
    await setMode(page, 'learn');
    await page.waitForTimeout(300);
    link = await search(page);
    const learnColumn = await column(page, '.panel-body');
    check(
      'Learn: the link has m=learn, Mode is still first, Settings last',
      link.includes('m=learn') && learnColumn[0] === 'mode' && learnColumn.at(-1) === 'settings',
      `${link} ${learnColumn.join()}`,
    );
    await setMode(page, 'easy');
    await page.waitForTimeout(300);
    link = await search(page);
    check(
      'back to Easy: the link has no m=learn and the values are kept',
      !link.includes('m=learn') && link.includes('ms=40'),
      link,
    );
    // Keyboard: arrow keys move between the choices.
    await page.getByTestId('mode-choice-easy').focus();
    await page.keyboard.press('ArrowDown');
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-mode'));
    check('the arrow keys move between the modes', focused === 'realistic', String(focused));
    problems.push(...(await auditPage(page, 'm38 mode section open')));
    await context.close();
  }

  // The Settings section (issue #93), at 1,440 px.
  {
    const { context, page } = await openPage(
      desktop,
      'm38 settings section',
      `${BOAT}&held=1&fd=1&lb=1`,
    );
    await openSettings(page);
    const wanted = [
      '[data-testid="language-en"]',
      '#labels-toggle',
      '#time-bar-toggle',
      '[data-testid="clock-switch"]',
      '#mini-map-toggle',
      'input[name="step"]',
      'input[name="detail"]',
      '[data-testid="share-button"]',
      '[data-testid="reset-button"]',
      '#debug-toggle',
      '[data-testid="disclaimer"]',
      '[data-testid="build-version"]',
    ];
    const missing = [];
    for (const selector of wanted) {
      if ((await page.getByTestId('section-settings').locator(selector).count()) === 0) {
        missing.push(selector);
      }
    }
    check(
      'the Settings section has every setting and About',
      missing.length === 0,
      missing.length ? `missing ${missing.join(', ')}` : 'all there',
    );
    check(
      'no Rope colour legend setting',
      (await page.locator('#legend-toggle').count()) === 0,
      'legend-toggle',
    );
    check(
      'no dialog over the page, nothing inert',
      !(await visible(page, 'settings-dialog')) &&
        (await page.evaluate(() => document.querySelectorAll('[inert]').length)) === 0,
      'dialog',
    );
    await shot(page, 'live-wide-settings-open');
    problems.push(...(await auditPage(page, 'm38 settings section open')));
    // A setting works as in the dialog.
    await page.locator('label[for="labels-toggle"]').click();
    await page.waitForTimeout(300);
    let link = await search(page);
    check('Labels in 3D off: the link says lb=0', link.includes('lb=0'), link);
    // Share keeps its status line.
    await page.getByTestId('share-button').click();
    await page.waitForTimeout(300);
    const status = await page.locator('.action-status').first().innerText();
    check('Share gives its message', status.length > 0, status);
    // Reset asks twice and empties the Attention history.
    await showSection(page, 'conditions');
    await page.locator('label:has([data-testid="boat-mode-sailing"])').click();
    await page.waitForTimeout(500);
    // The Attention card is open on a computer, so the list shows the entry (no badge).
    const itemsBefore = await page.getByTestId('alert-item').count();
    check(
      'a message is in the Attention history before Reset',
      itemsBefore === 1,
      String(itemsBefore),
    );
    await openSettings(page);
    await page.getByTestId('reset-button').click();
    check(
      'Reset asks for a second tap',
      (await page.getByTestId('reset-button').getAttribute('data-armed')) === 'true',
      'armed',
    );
    await page.getByTestId('reset-button').click();
    await page.waitForTimeout(500);
    link = await search(page);
    const itemsLeft = await page.getByTestId('alert-item').count();
    check(
      'Reset puts the settings back and the Attention history is empty',
      !link.includes('lb=0') && itemsLeft === 0 && !(await visible(page, 'alert-badge')),
      `${link} items ${itemsLeft}`,
    );
    // Folding the section.
    await closeSettings(page);
    check(
      'the Settings section folds',
      !(await visible(page, 'settings-content')),
      'settings-content',
    );
    await context.close();
  }

  // A new language reloads the page and the Settings section is open afterwards.
  {
    const { context, page } = await openPage(desktop, 'm38 settings language', BOAT);
    await openSettings(page);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.locator('label:has([data-testid="language-ru"])').click(),
    ]);
    await page.waitForSelector('canvas.scene-canvas', { state: 'attached' });
    const openAfter = await page.getByTestId('section-settings').getAttribute('data-open');
    const heading = await page.getByTestId('section-toggle-settings').innerText();
    check(
      'Russian: the page reloaded and the Settings section is open, in Russian',
      openAfter === 'true' &&
        heading.includes('Настройки') &&
        (await search(page)).includes('lang=ru'),
      `${openAfter} ${heading}`,
    );
    const modeTitle = await page.getByTestId('section-toggle-mode').innerText();
    check('Russian: the Mode section names the mode', modeTitle.includes('Режим'), modeTitle);
    problems.push(...(await auditPage(page, 'm38 settings Russian')));
    await shot(page, 'live-wide-settings-ru');
    await context.close();
  }

  // Not wide (a foldable, 820 px): the chip, the gear and the dialog work as before M38; going
  // wide and back moves the settings between the dialog and the section.
  {
    const { context, page } = await openPage(foldable, 'm38 narrow', BOAT);
    check(
      'a window below 1,280 px keeps the mode chip and the gear',
      (await visible(page, 'mode-chip')) && (await visible(page, 'settings-button')),
      'chips',
    );
    check(
      'no Mode and no Settings section there',
      (await page.getByTestId('section-mode').isHidden()) &&
        (await page.getByTestId('section-settings').isHidden()),
      'sections',
    );
    await openSettings(page);
    check(
      'the gear opens the dialog with the settings in it',
      (await visible(page, 'settings-dialog')) &&
        (await page.getByTestId('settings-dialog').locator('#labels-toggle').count()) === 1,
      'dialog',
    );
    await closeSettings(page);
    await setMode(page, 'realistic');
    await page.waitForTimeout(300);
    check('the chip changes the mode', (await search(page)).includes('mode=realistic'), 'mode');
    // Wide: the content moves into the section; the dialog is closed.
    await openSettings(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() => document.documentElement.dataset.wide === 'true');
    await page.waitForTimeout(300);
    check(
      'turning wide closes the dialog and the section holds the settings',
      !(await visible(page, 'settings-dialog')) &&
        (await page.getByTestId('section-settings').locator('#labels-toggle').count()) === 1,
      'wide',
    );
    await openSettings(page);
    check('the section opens', await visible(page, 'settings-content'), 'section');
    await page.setViewportSize({ width: 820, height: 1000 });
    await page.waitForFunction(() => document.documentElement.dataset.wide !== 'true');
    await page.waitForTimeout(300);
    await openSettings(page);
    check(
      'turning narrow again: the gear opens the dialog with the settings',
      (await page.getByTestId('settings-dialog').locator('#labels-toggle').count()) === 1,
      'narrow',
    );
    await closeSettings(page);
    await context.close();
  }

  // Phone (issues #91, #93): the chip and the gear stay; the chip's menu has a line for each mode;
  // no Mode, Settings or Rope colours section; the bottom row is as before.
  {
    const { context, page } = await openPage(phone, 'm38 phone', BOAT);
    const mode = await box(page, 'mode-chip');
    const camera = await box(page, 'camera-chip');
    const gear = await box(page, 'settings-button');
    check(
      'phone: the mode chip, the View button and the gear are in the row, in that order',
      !!mode && !!camera && !!gear && mode.x < camera.x && camera.x < gear.x,
      JSON.stringify({ mode, camera, gear }),
    );
    const ids = await page.evaluate(() =>
      [...document.querySelectorAll('[data-section]')]
        .filter((node) => !node.hidden)
        .map((node) => node.getAttribute('data-section')),
    );
    check(
      'phone: no Mode, Settings or Rope colours section',
      ids.join() === 'ropes,sails,autopilot,engine,conditions,learn,place,harbour',
      ids.join(),
    );
    await page.getByTestId('mode-chip').click();
    const hints = await page.locator('.chip-menu .mode-option-hint:visible').allInnerTexts();
    check(
      'phone: the chip menu has a line under each mode',
      hints.length === 4 && hints.every((hint) => hint.length > 10),
      JSON.stringify(hints),
    );
    await shot(page, 'live-phone-mode-menu');
    await page.keyboard.press('Escape');
    const mini = await box(page, 'mini-map');
    check(
      'phone: the mini-map keeps its place at the right, above the chip row',
      !!mini && !!camera && mini.x + mini.w > 390 - 20 && mini.y + mini.h <= camera.y,
      JSON.stringify({ mini, camera }),
    );
    await context.close();
  }

  // Old links: lg=0 (the removed Rope colours setting) opens the same picture, with no error.
  {
    const { context, page } = await openPage(desktop, 'm38 old link', `${BOAT}&lg=0`);
    const ids = await column(page, '.panel-body');
    check(
      'an old link with lg=0 opens normally and the link no longer carries lg',
      ids[0] === 'mode' && !(await search(page)).includes('lg='),
      `${ids.join()} ${await search(page)}`,
    );
    await context.close();
  }

  // The Ropes section shows every rope's colour (issue #90): each row has a swatch with a stroke,
  // and the red "fighting" colour is explained.
  {
    const { context, page } = await openPage(desktop, 'm38 rope colours', BOAT);
    await showSection(page, 'ropes');
    const rows = await page.locator('.rope-list .rope-item').count();
    const strokes = await page.evaluate(() =>
      [...document.querySelectorAll('.rope-list .rope-item .rope-item-swatch line')].map((node) =>
        node.getAttribute('stroke'),
      ),
    );
    const staticRows = await page
      .locator('.rope-list .rope-item')
      .evaluateAll(
        (nodes) => nodes.filter((node) => !node.querySelector('.rope-item-swatch line')).length,
      );
    check(
      'the Ropes list shows a colour for every rope (the wheel has none)',
      rows >= 9 && strokes.length >= rows - 1 && staticRows <= 1 && new Set(strokes).size >= 4,
      JSON.stringify({
        rows,
        strokes: strokes.length,
        distinct: new Set(strokes).size,
        staticRows,
      }),
    );
    const fighting = await page.getByText('Red: this rope pulls against another one').count();
    check(
      'the red "fighting" colour is explained in the Ropes section',
      fighting > 0,
      String(fighting),
    );
    await shot(page, 'live-wide-ropes-colours');
    await context.close();
  }
}
