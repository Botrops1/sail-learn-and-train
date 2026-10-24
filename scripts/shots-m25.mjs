// M25 (settings menu and camera chip): scenes and live checks for scripts/shots.mjs
// (PHASE5_SPEC 6.8). Labels contain "m25", so openPage adds nothing: the app opens as it does
// without a link (Sailing, Coastal waves, the clock chip shown).
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { closeSettings, openSettings, setCamera, waitForLink } from './ui.mjs';

/** Phone size (CI) and wider: the settings dialog and the open camera menu. */
export const M25_SCENES = [
  { name: 'settings-open', query: '?wd=60&ws=12', settings: true },
  { name: 'camera-menu-open', query: '?wd=60&ws=12', click: ['camera-chip'] },
];

export async function liveM25Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M25 ${what}: ${detail}`);
    console.log(`live M25 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone, foldable, desktop] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const chipLabel = (page) => page.getByTestId('camera-chip').locator('.chip-label').innerText();
  const focusedTestId = (page) =>
    page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? null);
  const link = (page) => page.evaluate(() => window.location.search);
  /** True if waitForLink finds the link (it throws, and the check fails with the link, if not). */
  const linkHas = async (what, page, has, hasNot = []) => {
    try {
      const found = await waitForLink(page, has, hasNot);
      check(what, true, found);
    } catch (error) {
      check(what, false, error.message);
    }
  };

  // 1. No tabs (M27 replaced them by sections), no View tab.
  {
    const { context, page } = await openPage(phone, 'm25 tabs', '?wd=60&ws=12');
    const tabs = await page.getByRole('tab').count();
    check('the panel has no tabs', tabs === 0, `${tabs} tab(s)`);
    const view = await page.locator('#pane-view').count();
    check('no View pane', view === 0, `${view} element(s) #pane-view`);
    await context.close();
  }

  // 2. The camera chip and its menu.
  {
    const { context, page } = await openPage(phone, 'm25 camera chip', '?');
    await page.waitForTimeout(500);
    check('the chip reads Port', (await chipLabel(page)) === 'Port', await chipLabel(page));
    await page.getByTestId('camera-chip').click();
    const hint = await page.getByTestId('camera-menu').locator('.camera-menu-hint').innerText();
    check(
      'the menu explains port and starboard',
      hint.startsWith('Port is the left side of the boat'),
      hint,
    );
    const options = await page
      .getByTestId('camera-menu')
      .locator('[role="menuitemradio"]')
      .allInnerTexts();
    check(
      'the menu lists the seven views',
      options.join(' | ') === 'Side (port) | Side (starboard) | Top | Bow | Helm | Free | Map',
      options.join(' | '),
    );
    await shot(page, 'live-phone-m25-camera-menu');
    await page.getByTestId('camera-chip').click();
    check(
      'a second tap on the chip closes the menu',
      await page.getByTestId('camera-menu').isHidden(),
      'menu still shown',
    );
    await setCamera(page, 'top');
    await linkHas('Top → cam=top', page, ['cam=top']);
    check('the chip reads Top', (await chipLabel(page)) === 'Top', await chipLabel(page));
    await setCamera(page, 'map');
    await linkHas('Map → cam=map', page, ['cam=map']);
    check(
      'the map shows',
      await page.getByTestId('map-canvas').isVisible(),
      'map-canvas not visible',
    );
    check('the chip reads Map', (await chipLabel(page)) === 'Map', await chipLabel(page));
    await setCamera(page, 'side-port');
    await linkHas('Side (port) → back to 3D', page, [], ['cam=map']);
    check(
      '3D view again',
      await page.locator('canvas.scene-canvas').isVisible(),
      'canvas not visible',
    );
    check('the chip reads Port again', (await chipLabel(page)) === 'Port', await chipLabel(page));
    await context.close();
  }

  // 3. Dragging the 3D view switches to Free.
  {
    const { context, page } = await openPage(phone, 'm25 drag', '?lb=0');
    await page.waitForTimeout(500);
    const canvas = await page.locator('canvas.scene-canvas').boundingBox();
    const cx = canvas.x + canvas.width / 2;
    const cy = canvas.y + canvas.height / 3;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let i = 1; i <= 10; i += 1) await page.mouse.move(cx + i * 15, cy + i * 4);
    await page.mouse.up();
    await linkHas('drag → cam=free', page, ['cam=free']);
    check('the chip reads Free', (await chipLabel(page)) === 'Free', await chipLabel(page));
    await context.close();
  }

  // 4. The camera menu with the keyboard.
  {
    const { context, page } = await openPage(phone, 'm25 camera keys', '?');
    await page.waitForTimeout(500);
    await page.getByTestId('camera-chip').focus();
    await page.keyboard.press('Enter');
    check('Enter opens the menu', await page.getByTestId('camera-menu').isVisible(), 'menu hidden');
    check(
      'focus is on the checked item',
      (await focusedTestId(page)) === 'camera-option-side-port',
      String(await focusedTestId(page)),
    );
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await linkHas('ArrowDown, Enter → the next preset', page, ['cam=side-starboard']);
    check(
      'focus is back on the chip',
      (await focusedTestId(page)) === 'camera-chip',
      String(await focusedTestId(page)),
    );
    check('the menu closed', await page.getByTestId('camera-menu').isHidden(), 'menu still shown');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    check(
      'Escape closes the menu',
      await page.getByTestId('camera-menu').isHidden(),
      'menu still shown',
    );
    check(
      'Escape returns focus to the chip',
      (await focusedTestId(page)) === 'camera-chip',
      String(await focusedTestId(page)),
    );
    await context.close();
  }

  // 5. (M51: the phone's settings are a tab now, so the dialog checks run on the side layout, where the gear and the dialog stay until M52.) The settings dialog holds the old View tab's controls and About.
  {
    const { context, page } = await openPage(foldable, 'm25 settings', '?wd=60&ws=12');
    await page.waitForTimeout(500);
    await openSettings(page);
    const wanted = [
      '[data-testid="language-en"]',
      '#labels-toggle',
      '#time-bar-toggle',
      '[data-testid="clock-switch"]',
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
      if ((await page.getByTestId('settings-dialog').locator(selector).count()) === 0) {
        missing.push(selector);
      }
    }
    check(
      'the dialog has every setting and About',
      missing.length === 0,
      missing.length ? `missing ${missing.join(', ')}` : 'all there',
    );
    const cameraInside = await page
      .getByTestId('settings-dialog')
      .locator('[name="camera"]')
      .count();
    check('no camera block in the dialog', cameraInside === 0, `${cameraInside} camera radios`);
    check(
      'focus is on the close button',
      (await focusedTestId(page)) === 'settings-close',
      String(await focusedTestId(page)),
    );
    const behind = await page.evaluate(() => ({
      view: document.querySelector('.view')?.hasAttribute('inert'),
      panel: document.querySelector('.panel')?.hasAttribute('inert'),
    }));
    check('the view and the panel are inert', behind.view && behind.panel, JSON.stringify(behind));
    await shot(page, 'live-phone-m25-settings');
    await page.keyboard.press('Escape');
    await page.getByTestId('settings-dialog').waitFor({ state: 'hidden' });
    check(
      'Escape closes it and focus is on the gear',
      (await focusedTestId(page)) === 'settings-button',
      String(await focusedTestId(page)),
    );
    const after = await page.evaluate(() => ({
      view: document.querySelector('.view')?.hasAttribute('inert'),
      panel: document.querySelector('.panel')?.hasAttribute('inert'),
    }));
    check('nothing is inert after closing', !after.view && !after.panel, JSON.stringify(after));
    await context.close();
  }

  // 6. The settings work, and Escape closes only the dialog.
  {
    const { context, page } = await openPage(foldable, 'm25 settings use', '?wd=60&ws=12');
    await page.waitForTimeout(500);
    await openSettings(page);
    await page.getByText('1 %', { exact: true }).click();
    await linkHas('1 % → step=1', page, ['step=1']);
    await page.locator('#debug-toggle').check();
    await linkHas('Debug overlay → debug=1', page, ['debug=1']);
    check(
      'the debug overlay shows',
      await page.getByTestId('debug-overlay').isVisible(),
      'overlay hidden',
    );
    await page.locator('#labels-toggle').uncheck();
    await linkHas('Labels off → lb=0', page, ['lb=0']);
    await context.close();

    const selected = await openPage(foldable, 'm25 settings escape', '?wd=60&ws=12&sel=part_boom');
    await selected.page.waitForTimeout(500);
    await openSettings(selected.page);
    await selected.page.keyboard.press('Escape');
    await selected.page.getByTestId('settings-dialog').waitFor({ state: 'hidden' });
    await selected.page.waitForTimeout(600);
    check(
      'Escape with a part selected closes only the dialog',
      (await link(selected.page)).includes('sel=part_boom'),
      await link(selected.page),
    );
    await selected.context.close();

    const menu = await openPage(phone, 'm25 menu escape', '?wd=60&ws=12&sel=part_boom');
    await menu.page.waitForTimeout(500);
    await menu.page.getByTestId('camera-chip').click();
    await menu.page.keyboard.press('Escape');
    await menu.page.waitForTimeout(600);
    check(
      'Escape with a part selected closes only the camera menu',
      (await link(menu.page)).includes('sel=part_boom') &&
        (await menu.page.getByTestId('camera-menu').isHidden()),
      await link(menu.page),
    );
    await menu.context.close();
  }

  // 7. Russian.
  {
    const { context, page } = await openPage(foldable, 'm25 russian', '?lang=ru&wd=60&ws=12');
    await page.waitForTimeout(500);
    const label = await page.getByTestId('settings-button').getAttribute('aria-label');
    check('the gear is named «Настройки»', label === 'Настройки', String(label));
    await openSettings(page);
    const title = (await page.locator('#settings-title').innerText()).trim();
    check('the dialog is titled «Настройки»', title === 'Настройки', title);
    await shot(page, 'live-phone-m25-settings-ru');
    await closeSettings(page);
    await context.close();
  }

  // 8. Side layout below 1,280 px (M38: from there Settings is a section): the dialog covers the panel column only.
  {
    const { context, page } = await openPage(foldable, 'm25 side layout', '?wd=60&ws=12');
    await page.waitForTimeout(500);
    await openSettings(page);
    const dialog = await page.getByTestId('settings-dialog').boundingBox();
    const panel = await page.locator('.panel').boundingBox();
    check(
      'the dialog covers the panel column only',
      dialog.x >= panel.x - 1,
      `dialog x ${Math.round(dialog.x)}, panel x ${Math.round(panel.x)}`,
    );
    check(
      'the 3D view is still visible',
      await page.locator('canvas.scene-canvas').isVisible(),
      'canvas hidden',
    );
    await shot(page, 'live-desktop-m25-settings');
    await closeSettings(page);
    await context.close();
  }

  // 9. Accessibility audit.
  for (const viewport of [phone, desktop]) {
    const { context, page } = await openPage(viewport, `m25 a11y ${viewport.name}`, '?wd=60&ws=12');
    await page.waitForTimeout(600);
    await openSettings(page);
    const found = await auditPage(page, `m25 a11y settings ${viewport.name}`);
    check(
      `accessibility: settings (${viewport.name})`,
      found.length === 0,
      found.length ? found.join(' | ') : 'clean',
    );
    await context.close();
  }
  {
    const { context, page } = await openPage(phone, 'm25 a11y camera menu', '?wd=60&ws=12');
    await page.waitForTimeout(600);
    await page.getByTestId('camera-chip').click();
    const found = await auditPage(page, 'm25 a11y camera menu');
    check(
      'accessibility: camera menu',
      found.length === 0,
      found.length ? found.join(' | ') : 'clean',
    );
    await context.close();
  }
}
