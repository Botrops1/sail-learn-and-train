// M119 (Console shell, PHASE_CONSOLE_SPEC 7.12): scenes and live checks for scripts/shots.mjs, group
// m119, on the test clock, in English. The layout rule and the place table are unit tests
// (tests/layoutMode.test.ts, tests/modes.test.ts, tests/consoleLayout.test.ts); here only the real
// page: the console and its band, the menu and the drawer, the boat's framing above the band, the
// resize between layouts, a finger on a tablet and the phone as before.
import { auditPage } from './a11y-audit.mjs';
import { setMode, showSection, waitForLink } from './ui.mjs';

const E = '?wd=60&ws=12&ms=40&held=1&sea=flat';
const DESKTOP = 'desktop-1440x900';
const FOLDABLE = 'foldable-820x1000';

/** Screenshots at the desktop and foldable sizes only (the phone is unchanged). */
export const M119_SCENES = [
  { name: 'console-easy', query: E },
  { name: 'console-realistic', query: `${E}&mode=realistic` },
  { name: 'console-drawer', query: E, click: ['menu-lines'] },
].map((scene) => ({ ...scene, waitMs: 2500, viewports: [DESKTOP, FOLDABLE] }));

export async function liveM119Checks({ openPage, viewports, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M119 ${what}: ${detail}`);
    console.log(`live M119 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone, foldable, desktop] = viewports;
  const tablet = { name: 'tablet-1024x768', width: 1024, height: 768 };
  const landscape = { name: 'phone-landscape-844x390', width: 844, height: 390 };
  const tid = (page, id) => page.getByTestId(id);
  const visible = (page, id) => tid(page, id).isVisible();
  const count = (page, id) => tid(page, id).count();
  const drawerNow = (page) =>
    page.evaluate(
      () => document.querySelector('[data-testid="drawer"]:not([hidden])')?.dataset.drawer ?? null,
    );

  // 1. The console at 1440 × 900: layout, band, blocks, and the old arrangement gone.
  {
    const { context, page } = await openPage(desktop, 'm119 console', E, { testClock: true });
    await page.waitForTimeout(500);
    const facts = await page.evaluate(() => {
      const root = document.documentElement.dataset;
      const consoleBox = document.querySelector('[data-testid="console"]')?.getBoundingClientRect();
      const view = document.querySelector('.view, [data-testid="view"]')?.getBoundingClientRect();
      const has = (block, inner) =>
        !!document.querySelector(`[data-testid="console-block-${block}"] [data-testid="${inner}"]`);
      return {
        layout: root.layout,
        size: root.console,
        wide: 'wide' in root,
        bottom: consoleBox?.bottom,
        height: consoleBox?.height,
        viewWidth: view?.width,
        windowH: window.innerHeight,
        wheel: has('wheel', 'autopilot-heading'),
        engine: has('engine', 'engine-startstop'),
        trim: [...document.querySelectorAll('[data-testid^="console-block-"]')].some((node) =>
          node.querySelector('[data-testid="trim-row-main"]'),
        ),
      };
    });
    const sheetHidden = !(await visible(page, 'sheet').catch(() => false));
    const gone = [
      'second-column',
      'layout-menu',
      'column-chip-1',
      'column-grip-1',
      'section-grip-ropes',
    ];
    let leftover = 0;
    for (const id of gone) leftover += await count(page, id);
    check(
      'the console: layout, wide, band 240 px at the bottom, blocks filled, sheet and old controls gone',
      facts.layout === 'console' &&
        facts.size === 'wide' &&
        !facts.wide &&
        Math.abs(facts.bottom - facts.windowH) <= 1 &&
        Math.round(facts.height) === 240 &&
        sheetHidden &&
        facts.viewWidth === 1440 &&
        facts.wheel &&
        facts.engine &&
        facts.trim &&
        leftover === 0,
      JSON.stringify({ ...facts, sheetHidden, leftover }),
    );
    await context.close();
  }

  // 2. The menu and the drawer: order, open, switch, Escape, status, close.
  {
    const { context, page } = await openPage(desktop, 'm119 menu', E, { testClock: true });
    await page.waitForTimeout(500);
    const items = await page
      .locator('[data-testid^="menu-"]:visible')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-testid')));
    await tid(page, 'menu-lines').click();
    await tid(page, 'drawer').waitFor({ state: 'visible' });
    const lines = await drawerNow(page);
    const ropesInside = await page
      .locator('[data-testid="drawer-body"] [data-testid="ropes-easy"]')
      .count();
    await tid(page, 'menu-learn').click();
    const learn = await drawerNow(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const afterEscape = await drawerNow(page);
    await tid(page, 'menu-status').click();
    const status = await drawerNow(page);
    await tid(page, 'drawer-close').click();
    await page.waitForTimeout(300);
    const afterClose = await drawerNow(page);
    check(
      'the menu: six items in order; Lines, Learn, Escape, Status, close',
      items.join() ===
        'menu-learn,menu-lines,menu-harbour,menu-conditions,menu-place,menu-status' &&
        lines === 'lines' &&
        ropesInside > 0 &&
        learn === 'learn' &&
        afterEscape === null &&
        status === 'status' &&
        afterClose === null,
      JSON.stringify({ items, lines, ropesInside, learn, afterEscape, status, afterClose }),
    );
    await context.close();
  }

  // 3. showSection: a drawer section opens its drawer; a block section leaves the drawer alone.
  {
    const { context, page } = await openPage(desktop, 'm119 showSection', E, { testClock: true });
    await page.waitForTimeout(500);
    await showSection(page, 'ropes');
    const first = await drawerNow(page);
    await showSection(page, 'engine');
    const second = await drawerNow(page);
    check(
      'showSection: ropes opens Lines; engine (a block) leaves the drawer as it was',
      first === 'lines' && second === 'lines',
      JSON.stringify({ first, second }),
    );
    await context.close();
  }

  // 4. Framing: the boat's masthead and bow sit above the console and the chip row.
  {
    const { context, page } = await openPage(desktop, 'm119 framing', `${E}&debug=1`, {
      testClock: true,
    });
    await page.waitForTimeout(2500);
    const facts = await page.evaluate(() => {
      const canvas = document.querySelector('canvas').getBoundingClientRect();
      const top = (id) =>
        document.querySelector(`[data-testid="${id}"]`)?.getBoundingClientRect().top;
      const limit = Math.min(top('console'), top('view-bottom'));
      const a = window.__sailDebug.project(0, -2.4, 0);
      const b = window.__sailDebug.project(-7.85, 2.2, 0);
      return { limit, a: canvas.top + a.y, b: canvas.top + b.y };
    });
    check(
      'framing: the boat is above the console and the chip row',
      facts.a < facts.limit && facts.b < facts.limit,
      JSON.stringify(facts),
    );
    await context.close();
  }

  // 5. Exercise mode opens the Exercises drawer.
  {
    const { context, page } = await openPage(desktop, 'm119 exercise', E, { testClock: true });
    await page.waitForTimeout(500);
    await setMode(page, 'exercise');
    await page.waitForTimeout(400);
    const now = await drawerNow(page);
    check('Exercise mode opens the Exercises drawer', now === 'exercises', String(now));
    await context.close();
  }

  // 6. One page through the sizes.
  {
    const { context, page } = await openPage(desktop, 'm119 resize', E, { testClock: true });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    const state = () =>
      page.evaluate(() => ({
        layout: document.documentElement.dataset.layout,
        size: document.documentElement.dataset.console ?? null,
      }));
    const steps = [];
    await page.waitForTimeout(400);
    steps.push(await state());
    await page.setViewportSize({ width: foldable.width, height: foldable.height });
    await page.waitForTimeout(500);
    steps.push(await state());
    await page.setViewportSize({ width: landscape.width, height: landscape.height });
    await page.waitForTimeout(500);
    steps.push(await state());
    await page.setViewportSize({ width: desktop.width, height: desktop.height });
    await page.waitForTimeout(500);
    steps.push(await state());
    const drawerClosed = (await drawerNow(page)) === null;
    check(
      'resize: console, narrow console, stacked, console again; drawer closed; no errors',
      steps[0].layout === 'console' &&
        steps[0].size === 'wide' &&
        steps[1].layout === 'console' &&
        steps[1].size === 'narrow' &&
        steps[2].layout === 'stacked' &&
        steps[3].layout === 'console' &&
        drawerClosed &&
        errors.length === 0,
      JSON.stringify({ steps, drawerClosed, errors }),
    );
    await context.close();
  }

  // 7. A finger on a tablet: the menu and the autopilot's heading button.
  {
    const { context, page } = await openPage(tablet, 'm119 tablet', E, {
      testClock: true,
      touch: true,
    });
    await page.waitForTimeout(500);
    await tid(page, 'menu-learn').tap();
    await tid(page, 'drawer').waitFor({ state: 'visible' });
    const opened = await drawerNow(page);
    await tid(page, 'drawer-close').tap();
    await tid(page, 'autopilot-heading').tap();
    const linked = await waitForLink(page, ['ap=']).then(
      () => true,
      () => false,
    );
    check(
      'a tablet tap opens the Learn drawer and turns the autopilot on',
      opened === 'learn' && linked,
      JSON.stringify({ opened, linked }),
    );
    await context.close();
  }

  // 8. The phone: no console, no menu; sheet and tabs.
  {
    const { context, page } = await openPage(phone, 'm119 phone', E, { testClock: true });
    await page.waitForTimeout(500);
    const facts = {
      layout: await page.evaluate(() => document.documentElement.dataset.layout),
      console: await visible(page, 'console'),
      menu: await visible(page, 'console-menu'),
      sheet: await visible(page, 'sheet'),
      tabs: await page.locator('[data-testid^="panel-tab-"]').count(),
    };
    await tid(page, 'panel-tab-controls').click();
    const tab = await page
      .locator('[data-testid="panel-tab-controls"]')
      .getAttribute('aria-selected');
    check(
      'the phone keeps the sheet and tabs; no console, no menu',
      facts.layout === 'stacked' &&
        !facts.console &&
        !facts.menu &&
        facts.sheet &&
        facts.tabs === 5 &&
        tab === 'true',
      JSON.stringify({ ...facts, tab }),
    );
    await context.close();
  }

  // 9. Accessibility of the console with the Lines drawer open.
  {
    const { context, page } = await openPage(desktop, 'm119 a11y', E, { testClock: true });
    await page.waitForTimeout(500);
    await tid(page, 'menu-lines').click();
    await tid(page, 'drawer').waitFor({ state: 'visible' });
    problems.push(...(await auditPage(page, 'm119 a11y console')));
    await context.close();
  }

  // 10. The dinghy: its own section in the engine block; no harbour, no place.
  {
    const { context, page } = await openPage(
      desktop,
      'm119 dinghy',
      '?boat=dinghy&wd=60&ws=8&ms=40&held=1&sea=flat',
      { testClock: true },
    );
    await page.waitForTimeout(500);
    const inside = await page
      .locator('[data-testid="console-block-engine"] [data-testid="section-dinghy"]')
      .count();
    const harbour = await visible(page, 'menu-harbour');
    const place = await visible(page, 'menu-place');
    check(
      'the dinghy: section-dinghy in the engine block; no harbour or place item',
      inside > 0 && !harbour && !place,
      JSON.stringify({ inside, harbour, place }),
    );
    await context.close();
  }
}
