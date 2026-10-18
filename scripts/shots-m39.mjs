// M39 (collapsible, resizable panel columns; issue #89, tracking issue #94): scenes and live checks
// for scripts/shots.mjs (PHASE5_SPEC 17). Labels contain "m39", so openPage lets the app open as it
// does without a link (Sailing, Coastal waves, every section folded). The live checks run on the
// test clock (shots.mjs passes `onTestClock`): waitForTimeout moves the app's time on.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { isWide, showSection } from './ui.mjs';

const BOAT = '?wd=60&ws=12';

export const M39_SCENES = [{ name: 'start', query: BOAT }];

const W1280 = { name: 'w1280', width: 1280, height: 800 };
const W1920 = { name: 'w1920', width: 1920, height: 1000 };

export async function liveM39Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M39 ${what}: ${detail}`);
    console.log(`live M39 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [, foldable, desktop] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  /** The widths of the view and of the two columns, px. */
  const widths = (page) =>
    page.evaluate(() => {
      const w = (selector) => document.querySelector(selector)?.getBoundingClientRect().width ?? 0;
      return {
        view: Math.round(w('.view')),
        canvas: Math.round(w('canvas.scene-canvas')),
        panel: Math.round(w('.panel')),
        first: Math.round(w('.panel-body')),
        second: Math.round(w('.panel-second')),
      };
    });
  const stored = (page) => page.evaluate(() => window.localStorage.getItem('sail-learn.columns'));
  const sectionVisible = async (page, id) => {
    const node = page.getByTestId(`section-toggle-${id}`).first();
    return (await node.count()) > 0 && (await node.isVisible());
  };
  /** The chips over the view's right border: where they are, their arrow, and whether the name is vertical. */
  const chipState = (page) =>
    page.evaluate(() =>
      [1, 2].map((n) => {
        const chip = document.querySelector(`[data-testid="column-chip-${n}"]`);
        const rect = chip.getBoundingClientRect();
        const name = chip.querySelector('.col-chip-name');
        return {
          visible: rect.width > 0 && rect.height > 0,
          right: Math.round(rect.right),
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          width: Math.round(rect.width),
          arrow: chip.querySelector('.col-chip-arrow').textContent,
          name: name.textContent,
          vertical: getComputedStyle(name).writingMode.startsWith('vertical'),
        };
      }),
    );
  const gripBox = async (page, n) => {
    const b = await page.getByTestId(`column-grip-${n}`).boundingBox();
    return b && { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const drag = async (page, n, dx) => {
    const from = await gripBox(page, n);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + dx / 2, from.y, { steps: 4 });
    await page.mouse.move(from.x + dx, from.y, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(300);
  };

  for (const viewport of [W1280, desktop, W1920]) {
    const name = viewport.name;
    const { context, page } = await openPage(viewport, `m39 wide ${name}`, `${BOAT}&sel=part_hull`);
    await page.waitForTimeout(1200);
    check(`${name}: wide layout`, await isWide(page), String(await isWide(page)));

    // The start is the layout of M38: 400 and 360 px.
    let w = await widths(page);
    check(
      `${name}: the columns start at 400 and 360 px`,
      w.panel === 760 && w.first === 400 && Math.abs(w.second - 359) <= 2,
      JSON.stringify(w),
    );
    check(
      `${name}: both grips and both chips show`,
      (await page.getByTestId('column-grip-1').isVisible()) &&
        (await page.getByTestId('column-grip-2').isVisible()) &&
        (await page.getByTestId('column-chip-1').isVisible()) &&
        (await page.getByTestId('column-chip-2').isVisible()),
      'handles',
    );
    problems.push(...(await auditPage(page, `m39 ${name} columns`)));
    if (name === 'desktop-1440x900') await shot(page, 'live-columns-start');

    // Drag: the border between the view and column 1 to the left widens column 1.
    const before = w;
    await drag(page, 1, -40);
    w = await widths(page);
    check(
      `${name}: dragging grip 1 left by 40 px widens column 1 by 40 px and narrows the view`,
      w.first === before.first + 40 && w.view === before.view - 40 && w.second === before.second,
      JSON.stringify({ before, w }),
    );
    check(
      `${name}: the camera follows (the canvas is as wide as the view)`,
      Math.abs(w.canvas - w.view) <= 1,
      JSON.stringify(w),
    );
    check(
      `${name}: the width is kept on this device, not in the link`,
      (await stored(page))?.includes('440') === true &&
        !(await page.evaluate(() => window.location.search)).includes('col'),
      String(await stored(page)),
    );
    // Far past the limits: the view keeps 480 px, a column never goes under 300 px.
    await drag(page, 1, -2000);
    w = await widths(page);
    const innerWidth = viewport.width;
    check(
      `${name}: column 1 stops at its maximum and the view keeps 480 px`,
      w.first <= 560 && w.view >= 480 && w.first >= 300 && w.first + w.second + 1 >= 600,
      JSON.stringify({ w, innerWidth }),
    );
    await drag(page, 2, 2000);
    w = await widths(page);
    check(
      `${name}: column 2 stops at its minimum`,
      w.second >= 299 && w.second <= 302,
      JSON.stringify(w),
    );
    // Double click on a grip: the default again.
    await page.getByTestId('column-grip-1').dblclick();
    await page.getByTestId('column-grip-2').dblclick();
    await page.waitForTimeout(200);
    w = await widths(page);
    check(
      `${name}: a double click resets both widths`,
      w.first === 400 && Math.abs(w.second - 359) <= 2,
      JSON.stringify(w),
    );

    // Keys on a grip.
    await page.getByTestId('column-grip-2').focus();
    await page.keyboard.press('ArrowLeft');
    w = await widths(page);
    check(
      `${name}: ArrowLeft widens column 2 by 16 px`,
      Math.abs(w.second - 375) <= 2,
      JSON.stringify(w),
    );
    await page.keyboard.press('Shift+ArrowRight');
    w = await widths(page);
    check(
      `${name}: Shift+ArrowRight narrows it by 64 px`,
      Math.abs(w.second - 311) <= 2,
      JSON.stringify(w),
    );
    await page.keyboard.press('Home');
    w = await widths(page);
    check(`${name}: Home gives the minimum`, w.second >= 299 && w.second <= 302, JSON.stringify(w));
    await page.keyboard.press('End');
    w = await widths(page);
    check(`${name}: End gives the maximum`, w.second > 300 && w.view >= 479, JSON.stringify(w));
    const now = await page.getByTestId('column-grip-2').getAttribute('aria-valuenow');
    check(`${name}: the grip says its width`, Number(now) > 300, String(now));
    await page.getByTestId('column-grip-2').dblclick();
    await context.close();
  }

  // Collapse, memory, and opening again, at 1,440 px.
  {
    const { context, page } = await openPage(desktop, 'm39 collapse', `${BOAT}&sel=part_hull`);
    await page.waitForTimeout(1200);
    const before = await widths(page);
    await page.getByTestId('column-chip-2').click();
    await page.waitForTimeout(300);
    let w = await widths(page);
    check(
      'column 2 collapses, takes no room, and the view takes it',
      w.second === 0 && w.first === 400 && w.view > before.view + 300,
      JSON.stringify({ before, w }),
    );
    check(
      'the sections of column 2 are out of reach, its chip says "Show"',
      !(await sectionVisible(page, 'conditions')) &&
        (await page.getByTestId('column-chip-2').getAttribute('aria-expanded')) === 'false' &&
        (await page.getByTestId('second-column').getAttribute('inert')) !== null,
      'collapsed',
    );
    check('the camera follows', Math.abs(w.canvas - w.view) <= 1, JSON.stringify(w));
    const chips = await chipState(page);
    check(
      'column 2 folded: both chips still show, over the right border of the view, arrows ‹ (folded) and › (open)',
      chips.length === 2 &&
        chips.every((c) => c.visible && Math.abs(c.right - w.view) <= 1 && c.vertical) &&
        chips[0].arrow === '›' &&
        chips[1].arrow === '‹',
      JSON.stringify(chips),
    );
    check(
      'the chips have vertical names and are at least 44 px wide, and do not overlap',
      chips.every((c) => c.width >= 44 && c.name.length > 0) &&
        (chips[0].bottom <= chips[1].top || chips[1].bottom <= chips[0].top),
      JSON.stringify(chips),
    );
    await shot(page, 'live-column2-collapsed');
    await page.getByTestId('column-chip-1').click();
    await page.waitForTimeout(300);
    w = await widths(page);
    check(
      'both collapsed: no panel is left, the view fills the window',
      w.panel <= 1 && w.view >= 1440 - 1 && !(await sectionVisible(page, 'ropes')),
      JSON.stringify(w),
    );
    check(
      'both chips are inside the window, at its right edge, and do not overlap',
      await page.evaluate(() => {
        const a = document.querySelector('[data-testid="column-chip-1"]').getBoundingClientRect();
        const b = document.querySelector('[data-testid="column-chip-2"]').getBoundingClientRect();
        return (
          Math.abs(a.right - window.innerWidth) <= 1 &&
          Math.abs(b.right - window.innerWidth) <= 1 &&
          (a.bottom <= b.top || b.bottom <= a.top)
        );
      }),
      'buttons',
    );
    // The part card is not hidden because the column that would show it is folded away.
    check(
      'with the columns folded the part card shows in the view',
      await page.getByTestId('info-card').first().isVisible(),
      'info-card',
    );
    await shot(page, 'live-both-collapsed');
    problems.push(...(await auditPage(page, 'm39 both collapsed')));

    // Remembered between visits.
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('canvas.scene-canvas', { state: 'attached', timeout: 30_000 });
    await page.waitForTimeout(800);
    w = await widths(page);
    check(
      'both stay collapsed after a reload',
      w.panel <= 1 && w.view >= 1440 - 1,
      JSON.stringify(w),
    );

    // A rope tapped in the view does not open a column; a call by name does (the wind box).
    await page.getByTestId('column-chip-1').click();
    await page.waitForTimeout(300);
    w = await widths(page);
    check('column 1 opens again at its old width', w.first === 400, JSON.stringify(w));
    check('Ropes is visible again', (await sectionVisible(page, 'ropes')) === true, 'ropes');
    // The part card sits over the wind box while a part is selected: close it first.
    await page.locator('.info-card .card-close').click();
    await page.getByTestId('strip-main').first().click();
    await page.waitForTimeout(500);
    w = await widths(page);
    check(
      'the wind box opens the collapsed column 2 to show Conditions',
      w.second > 300 && (await sectionVisible(page, 'conditions')),
      JSON.stringify(w),
    );
    await context.close();
  }

  // Not wide (a foldable, 820 px): no grips, no buttons, a saved collapse does not apply; going
  // wide and back keeps the picture.
  {
    const { context, page } = await openPage(foldable, 'm39 foldable', `${BOAT}`);
    await page.evaluate(() =>
      window.localStorage.setItem('sail-learn.columns', '{"w":[500,320],"c":[1,1]}'),
    );
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('canvas.scene-canvas', { state: 'attached', timeout: 30_000 });
    await page.waitForTimeout(800);
    check(
      'a window under 1,280 px has no grips and no buttons',
      !(await page.getByTestId('column-grip-1').isVisible()) &&
        !(await page.getByTestId('column-chip-1').isVisible()) &&
        !(await page.getByTestId('column-chip-2').isVisible()),
      'handles',
    );
    check(
      'the panel works there although a collapse is saved',
      (await page.getByTestId('section-toggle-ropes').isVisible()) &&
        (await page.getByTestId('section-ropes').count()) === 1,
      'ropes title',
    );
    await showSection(page, 'ropes');
    check(
      'Ropes opens',
      (await page.getByTestId('section-ropes').getAttribute('data-open')) === 'true',
      'open',
    );
    // Growing the window to wide applies the saved state (both collapsed).
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);
    let w = await widths(page);
    check('wide again: the saved collapse applies', w.panel <= 1, JSON.stringify(w));
    await page.setViewportSize({ width: 820, height: 1000 });
    await page.waitForTimeout(500);
    w = await widths(page);
    check(
      'narrow again: the panel is back and works',
      w.panel > 300 && (await page.getByTestId('section-toggle-ropes').isVisible()),
      JSON.stringify(w),
    );
    await shot(page, 'live-foldable');
    await context.close();
  }

  // The phone has none of it.
  {
    const phone = viewports[0];
    const { context, page } = await openPage(phone, 'm39 phone', BOAT);
    await page.evaluate(() =>
      window.localStorage.setItem('sail-learn.columns', '{"w":[500,320],"c":[1,1]}'),
    );
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('canvas.scene-canvas', { state: 'attached', timeout: 30_000 });
    await page.waitForTimeout(800);
    check(
      'the phone has no grips and no buttons',
      !(await page.getByTestId('column-grip-1').isVisible()) &&
        !(await page.getByTestId('column-chip-1').isVisible()),
      'handles',
    );
    check(
      'the sheet is not inert on the phone',
      (await page.getByTestId('second-column').getAttribute('inert')) === null &&
        !(await page.evaluate(() => document.querySelector('.panel-body')?.hasAttribute('inert'))),
      'inert',
    );
    await context.close();
  }
}
