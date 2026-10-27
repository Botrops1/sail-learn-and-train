// M59 (leftovers, polish and sign-off, PHASE8_SPEC 17.5): live checks for scripts/shots.mjs. Labels
// contain "m59", so openPage starts with every section folded. The checks that depend on app time
// (the windlass keys, the fenders hint) run on the test clock (shots.mjs passes `onTestClock`);
// the frame times are read on the real clock (`realClockPage`) and only reported.
import { auditPage } from './a11y-audit.mjs';
import { openSettings, setSheet, showSection, showTab } from './ui.mjs';

export const M59_SCENES = [];

/** The M46 "Swinging" link of WORKFLOW with the map: the anchor lies 30 m from the bow. */
const SWINGING =
  '?wd=90&ws=15&cam=map&pl=bay&pe=-1640.0&pn=0.0&hdg=180&an=34.0&ax=-1610.0,-6.9&as=1&m=harbour&debug=1';
/** M46's "let go" start: head to the west wind, at rest, the anchor still in the roller. */
const LET_GO = '?pl=bay&m=harbour&pe=-1640.0&pn=0.0&hdg=270&wd=-90&ws=10&tx=4';
/** The stern 18 m from our berth's rings, backing in at 0.5 m/s with the fenders in the locker. */
const BACKING = '?pl=marina&m=harbour&pe=2.8&pn=1473.4&hdg=180&ws=0&bs=-0.5&tx=4';

export async function liveM59Checks({ openPage, realClockPage, viewports, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M59 ${what}: ${detail}`);
    console.log(`live M59 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone, , desktop] = viewports;
  const chain = (page) =>
    page.evaluate(() => {
      const match = /[?&]an=(-?\d+(?:\.\d+)?)/.exec(window.location.search);
      return match ? Number(match[1]) : Number.NaN;
    });

  // 1. The anchor sign is the last thing the map draws.
  {
    const { context, page } = await openPage(phone, 'm59 anchor on top', SWINGING);
    await page.waitForFunction(() => window.__sailMap?.drawOrder().length > 0, null, {
      timeout: 15_000,
    });
    const order = await page.evaluate(() => window.__sailMap.drawOrder());
    check(
      'the anchor sign is drawn last on the map',
      order.at(-1) === 'anchorMark' && order.includes('apparent') && order.includes('labels'),
      order.join(' > '),
    );
    await context.close();
  }

  // 2. The arrow keys work either windlass button: down pays the chain out, up brings it in.
  {
    const { context, page } = await openPage(phone, 'm59 windlass keys', LET_GO, {
      testClock: true,
    });
    await showSection(page, 'anchor');
    const button = page.getByTestId('windlass-down');
    await button.scrollIntoViewIfNeeded();
    await button.focus();
    await page.keyboard.down('ArrowDown');
    await page.waitForTimeout(2000);
    await page.keyboard.up('ArrowDown');
    await page.waitForTimeout(600);
    const out = await chain(page);
    check('ArrowDown held pays the chain out', out >= 3.0, `an=${out}`);
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(1000);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(600);
    const back = await chain(page);
    check('ArrowUp held brings it in', out - back >= 1.0, `an=${out} -> ${back}`);
    // Letting go stops the chain.
    await page.waitForTimeout(1000);
    const still = await chain(page);
    check(
      'letting go the key stops the windlass',
      Math.abs(still - back) < 0.05,
      `${back} -> ${still}`,
    );
    await context.close();
  }

  // 3. Backing in with the fenders in the locker: the hint shows, and the "!" list has it.
  {
    const { context, page } = await openPage(phone, 'm59 fenders hint', BACKING, {
      testClock: true,
    });
    await showSection(page, 'harbour');
    const hint = page.getByTestId('fenders-in-hint');
    check(
      'the hint is hidden while the stern is far from the rings',
      !(await hint.isVisible()),
      '18 m',
    );
    let shown = false;
    for (let waited = 0; waited <= 30_000 && !shown; waited += 500) {
      shown = await hint.isVisible();
      if (!shown) await page.waitForTimeout(500);
    }
    check(
      'the hint shows once the stern is within 15 m',
      shown,
      shown ? await hint.innerText() : 'never',
    );
    await setSheet(page, 'peek');
    await page.getByTestId('alert-chip').click();
    await page.waitForTimeout(400);
    const tags = await page
      .getByTestId('alert-item')
      .filter({ hasText: 'Put the fenders out' })
      .getByTestId('alert-tag')
      .allInnerTexts();
    check(
      'the "!" list has the entry, tagged Gear',
      tags.includes('Gear'),
      tags.join() || 'no entry',
    );
    await context.close();
  }

  // 4. The Phase 8 accessibility sweep.
  {
    const { context, page } = await openPage(phone, 'm59 a11y phone', '?cam=side-port');
    await setSheet(page, 'half');
    for (const tab of ['mode', 'controls', 'conditions', 'learn', 'settings']) {
      await showTab(page, tab);
      problems.push(...(await auditPage(page, `m59 tab ${tab}`)));
    }
    await showSection(page, 'status');
    await page.getByTestId('status-filter-damage').click();
    problems.push(...(await auditPage(page, 'm59 status damage filter')));
    await openSettings(page);
    await page.getByTestId('boat-field').scrollIntoViewIfNeeded();
    problems.push(...(await auditPage(page, 'm59 settings boat')));
    await page.getByTestId('setup-save').scrollIntoViewIfNeeded();
    problems.push(...(await auditPage(page, 'm59 settings your setup')));
    await context.close();
  }
  {
    const { context, page } = await openPage(desktop, 'm59 a11y desktop', '?cam=side-port');
    await page.waitForTimeout(500);
    await page.getByTestId('mode-chip').click();
    await page.getByTestId('mode-card').waitFor({ state: 'visible' });
    problems.push(...(await auditPage(page, 'm59 card mode')));
    await page.keyboard.press('Escape');
    await page.getByTestId('mode-card').waitFor({ state: 'hidden' });
    await page.getByTestId('settings-button').click();
    await page.getByTestId('settings-card').waitFor({ state: 'visible' });
    problems.push(...(await auditPage(page, 'm59 card settings')));
    await page.keyboard.press('Escape');
    await page.getByTestId('settings-card').waitFor({ state: 'hidden' });
    await page.getByTestId('section-grip-sails').click();
    problems.push(...(await auditPage(page, 'm59 grip menu')));
    await context.close();
  }

  // 5. Frame times, reported only (headless drawing is slow, about 15 fps: no threshold).
  for (const [name, query, open] of [
    ['learn winch', '?m=learn&learn=fit_winch&debug=1', 'learn-show-on-boat'],
    [
      'busy marina',
      '?pl=marina&ml=tight&tr=busy&m=harbour&detail=high&cam=side-port&debug=1',
      null,
    ],
  ]) {
    const { context, page } = await realClockPage(desktop, `m59 frames ${name}`, query);
    if (open) {
      await showSection(page, 'learn');
      await page.getByTestId(open).click();
    }
    await page.waitForTimeout(5000);
    const text = (await page.getByTestId('debug-overlay').textContent()) ?? '';
    const match = /Slowest\s*(\d+) ms/.exec(text);
    console.log(
      `live M59 frame time (${name}): slowest ${match ? match[1] : '?'} ms (report only)`,
    );
    await context.close();
  }
}
