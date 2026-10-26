// M54 (sections you can move on the computer, PHASE8_SPEC 12.7): scenes and live checks for
// scripts/shots.mjs. Labels contain "m54", so openPage starts with every section folded. Every
// openPage makes a new context, so the storage starts empty (a reload keeps it).
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { closeSettings, columnSections, moveSectionBy, openSettings, setMode } from './ui.mjs';

export const M54_SCENES = [{ name: 'layout-default', query: '?cam=side-port' }];

const DEFAULT_COLUMNS = [
  ['ropes', 'sails', 'autopilot', 'engine', 'place', 'anchor', 'harbour'],
  ['conditions', 'learn'],
];

export async function liveM54Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M54 ${what}: ${detail}`);
    console.log(`live M54 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const [phone, foldable, desktop] = viewports;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const open = (viewport, what, query = '?cam=side-port') =>
    openPage(viewport, `m54 ${what}`, query);
  const stored = (page) => page.evaluate(() => window.localStorage.getItem('sail-learn.layout'));

  // 1. Default: the first-time arrangement; the grips are visible and 44 px.
  {
    const { context, page } = await open(desktop, 'default');
    const columns = await columnSections(page);
    check('default columns', same(columns, DEFAULT_COLUMNS), JSON.stringify(columns));
    const box = await page.getByTestId('section-grip-ropes').boundingBox();
    check(
      'grips are 44 px',
      Boolean(box) && Math.round(box.width) === 44 && Math.round(box.height) === 44,
      JSON.stringify(box),
    );
    for (const id of ['ropes', 'learn', 'harbour']) {
      check(`grip ${id} visible`, await page.getByTestId(`section-grip-${id}`).isVisible(), id);
    }
    await shot(page, 'live-default');
    await context.close();
  }

  // 2. Menu: Conditions to the other column; kept after a reload. 3. Modes do not move sections.
  {
    const { context, page } = await open(desktop, 'menu');
    await moveSectionBy(page, 'conditions', 'other');
    let columns = await columnSections(page);
    check(
      'menu: conditions at the end of column 1, learn alone in column 2',
      same(columns, [[...DEFAULT_COLUMNS[0], 'conditions'], ['learn']]),
      JSON.stringify(columns),
    );
    await page.reload();
    await page.getByTestId('section-grip-learn').waitFor();
    const afterReload = await columnSections(page);
    check('menu: kept after a reload', same(afterReload, columns), JSON.stringify(afterReload));

    for (const mode of ['harbour', 'learn']) {
      await setMode(page, mode);
      columns = await columnSections(page);
      check(
        `mode ${mode}: sections stay`,
        same(columns, [[...DEFAULT_COLUMNS[0], 'conditions'], ['learn']]),
        JSON.stringify(columns),
      );
    }
    await context.close();
  }

  // 4. Drag Learn by its grip onto the top of column 1.
  {
    const { context, page } = await open(desktop, 'drag');
    const grip = await page.getByTestId('section-grip-learn').boundingBox();
    const head = await page.getByTestId('section-ropes').locator('.section-head').boundingBox();
    const from = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 };
    const to = { x: head.x + head.width / 2, y: head.y + 4 };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (let i = 1; i <= 10; i += 1) {
      await page.mouse.move(
        from.x + ((to.x - from.x) * i) / 10,
        from.y + ((to.y - from.y) * i) / 10,
      );
      if (i === 5) await page.waitForTimeout(50);
    }
    const marker = await page.locator('.drop-marker').isVisible();
    const dragging = await page
      .getByTestId('section-learn')
      .evaluate((n) => n.classList.contains('is-dragging'));
    check('drag: marker shown and section dimmed', marker && dragging, `${marker} ${dragging}`);
    await shot(page, 'live-drag');
    await page.mouse.up();
    const columns = await columnSections(page);
    check(
      'drag: learn is first in column 1',
      columns[0][0] === 'learn' && columns[1].length === 1,
      JSON.stringify(columns),
    );
    check(
      'drag: no menu opened by the click that follows',
      !(await page.getByTestId('layout-menu').isVisible()),
      'menu',
    );
    check(
      'drag: kept on this device',
      (await stored(page))?.includes('learn') === true,
      String(await stored(page)),
    );

    // Escape cancels a drag.
    const g2 = await page.getByTestId('section-grip-sails').boundingBox();
    await page.mouse.move(g2.x + 20, g2.y + 20);
    await page.mouse.down();
    await page.mouse.move(g2.x + 120, g2.y + 120, { steps: 6 });
    await page.keyboard.press('Escape');
    await page.mouse.up();
    const after = await columnSections(page);
    check('drag: Escape cancels', same(after, columns), JSON.stringify(after));
    await shot(page, 'live-moved');
    await context.close();
  }

  // 5. Keys on a focused grip.
  {
    const { context, page } = await open(desktop, 'keys');
    await page.getByTestId('section-grip-sails').focus();
    await page.keyboard.press('ArrowUp');
    let columns = await columnSections(page);
    check(
      'keys: ArrowUp puts sails before ropes',
      columns[0][0] === 'sails' && columns[0][1] === 'ropes',
      JSON.stringify(columns),
    );
    await page.keyboard.press('ArrowRight');
    columns = await columnSections(page);
    check(
      'keys: ArrowRight puts sails in column 2',
      columns[1][0] === 'sails',
      JSON.stringify(columns),
    );
    const said = await page.locator('.layout-live').innerText();
    check('keys: the live region says column 2', said.includes('column 2'), said);
    const focused = await page.evaluate(
      () => document.activeElement?.getAttribute('data-testid') ?? '',
    );
    check('keys: the focus stays on the grip', focused === 'section-grip-sails', focused);
    await page.keyboard.press('ArrowRight');
    check(
      'keys: ArrowRight in column 2 does nothing',
      same(await columnSections(page), columns),
      'same',
    );
    await context.close();
  }

  // 6. Up / Down limits, and the menu stays open on a disabled item.
  {
    const { context, page } = await open(desktop, 'limits');
    await page.getByTestId('section-grip-ropes').click();
    const disabled = await page.getByTestId('layout-up').getAttribute('aria-disabled');
    check('limits: the first section cannot move up', disabled === 'true', String(disabled));
    await page.getByTestId('layout-up').click({ force: true });
    check('limits: the menu stays open', await page.getByTestId('layout-menu').isVisible(), 'open');
    check('limits: nothing moved', same(await columnSections(page), DEFAULT_COLUMNS), 'same');
    problems.push(...(await auditPage(page, 'm54 desktop grip menu')));
    await shot(page, 'live-menu');
    await page.keyboard.press('Escape');
    check(
      'limits: Escape closes it',
      !(await page.getByTestId('layout-menu').isVisible()),
      'closed',
    );
    await context.close();
  }

  // 7. Reset layout reloads with everything as at the start and the Settings open.
  {
    const { context, page } = await open(desktop, 'reset');
    await moveSectionBy(page, 'conditions', 'other');
    await openSettings(page);
    const button = page.getByTestId('layout-reset');
    await button.scrollIntoViewIfNeeded();
    await button.click();
    check(
      'reset: first tap arms it',
      (await button.getAttribute('data-armed')) === 'true',
      'armed',
    );
    await Promise.all([page.waitForNavigation(), button.click()]);
    await page.getByTestId('section-grip-learn').waitFor();
    const columns = await columnSections(page);
    check('reset: default columns', same(columns, DEFAULT_COLUMNS), JSON.stringify(columns));
    check('reset: nothing stored', (await stored(page)) === null, String(await stored(page)));
    check(
      'reset: the settings are open',
      await page.getByTestId('settings-card').isVisible(),
      'settings-card',
    );
    await context.close();
  }

  // 8. No grips and no Reset layout on a phone or the side layout.
  for (const viewport of [phone, foldable]) {
    const { context, page } = await open(viewport, `narrow ${viewport.width}`);
    const grips = await page
      .locator('.section-grip')
      .evaluateAll((nodes) => nodes.filter((n) => n.offsetParent !== null).length);
    check(`${viewport.width}: no grip is shown`, grips === 0, String(grips));
    await openSettings(page);
    check(
      `${viewport.width}: Reset layout is hidden`,
      !(await page.getByTestId('layout-reset').isVisible()),
      'hidden',
    );
    await closeSettings(page);
    await context.close();
  }
}
