// M55 (Status section, PHASE8_SPEC 13.7): scenes and live checks for scripts/shots.mjs. Labels
// contain "m55": every section starts folded and the app opens as it does without a link. The live
// checks run on the test clock (shots.mjs passes `onTestClock`): waitForTimeout moves the app's
// time on by exactly that long.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { showSection } from './ui.mjs';

/** The M43 bump: in front of our berth, a strong west wind pushes her onto the yacht to the east. */
const BUMP = '?pl=marina&tr=busy&m=harbour&pe=2.8&pn=1490.4&hdg=180&wd=-90&ws=20&cam=top&tx=4';
/** Realistic ropes at Starboard: the jib sheet on the winch with two turns, its clutch open, 24 kn: it slips (PT-16). */
const SLIPPING =
  '?mode=realistic&wd=90&ws=24&js=30&st=starboard&co=a5&wsb=a5.2.h&sel=rope_jib_sheet&cam=top';

export const M55_SCENES = [
  { name: 'status-section', query: BUMP, waitMs: 9000, section: 'status', sheet: 'full' },
];

export async function liveM55Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M55 ${what}: ${detail}`);
    console.log(`live M55 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone, , desktop] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  /** Asks `ready` every `stepMs` of app time until it says yes, at most `maxMs`. */
  const poll = async (page, ready, maxMs, stepMs = 100) => {
    for (let waited = 0; waited <= maxMs; waited += stepMs) {
      if (await ready()) return true;
      await page.waitForTimeout(stepMs);
    }
    return false;
  };
  const texts = (page, testId) => page.getByTestId(testId).allTextContents();
  const count = (page, selector) => page.locator(selector).count();
  /** Opens the bump link and waits until the damage is in the history. */
  const bump = async (viewport, label) => {
    const opened = await openPage(viewport, label, BUMP, { testClock: true });
    const { page } = opened;
    const shown = await poll(
      page,
      async () => (await count(page, '[data-testid="status-alert-item"][data-kind="contact"]')) > 0,
      30_000,
    );
    return { ...opened, shown };
  };

  // 1. The four blocks.
  {
    const { context, page } = await openPage(phone, 'm55 sections', '?cam=side-port', {
      testClock: true,
    });
    await showSection(page, 'status');
    const titles = await page
      .locator('[data-testid="section-status"] h3.section-title')
      .allTextContents();
    check('four blocks', titles.join() === 'Sails,Gear,Damage,What happened', titles.join());
    check(
      'both sails are in good shape shows',
      await page.getByTestId('status-sails-good').isVisible(),
      'visible',
    );
    const anchor = (await page.getByTestId('status-anchor').textContent()) ?? '';
    check('the anchor line', anchor === 'Anchor: in the bow roller.', anchor);
    const propeller = (await page.getByTestId('status-propeller').textContent()) ?? '';
    check('the propeller line', propeller === 'Propeller: clear.', propeller);
    const fenders = (await page.getByTestId('status-fenders').textContent()) ?? '';
    check('the fenders line', fenders === 'Fenders in the locker.', fenders);
    check(
      'the Attention card has no filter row',
      (await count(page, '[data-testid="status-filter"]')) === 1,
      'only the Status list has one',
    );
    await shot(page, 'live-phone-m55-status');
    await context.close();
  }

  // 2. The sails moved here.
  {
    const { context, page } = await openPage(phone, 'm55 sails', '?cam=side-port&ws=0&debug=1', {
      testClock: true,
    });
    await page.evaluate(() => window.__sailDebug.setDamage(0.9, 0));
    await page.waitForTimeout(800);
    await showSection(page, 'status');
    const inStatus = await count(
      page,
      '[data-testid="section-status"] [data-testid="trim-wear-main"]',
    );
    const inSails = await count(
      page,
      '[data-testid="section-sails"] [data-testid="trim-wear-main"]',
    );
    check(
      'the wear row is in Status, not in Sails',
      inStatus === 1 && inSails === 0,
      `${inStatus} ${inSails}`,
    );
    check(
      'the good-shape line is hidden while a sail is worn',
      await page.getByTestId('status-sails-good').isHidden(),
      'hidden',
    );
    await page.evaluate(() => window.__sailDebug.setDamage(1, 0));
    await page.waitForTimeout(800);
    const repair = page.getByTestId('repair-sails');
    check('Repair shows in Status when torn', await repair.isVisible(), 'visible');
    check(
      'Repair is inside Status',
      (await count(page, '[data-testid="section-status"] [data-testid="repair-sails"]')) === 1,
      '1',
    );
    await repair.click();
    await page.waitForTimeout(500);
    check(
      'Repair clears the wear',
      (await page.getByTestId('status-sails-good').isVisible()) && (await repair.isHidden()),
      'good again',
    );
    await context.close();
  }

  // 3, 4, 5. A bump into a moored yacht: Status holds the damage list, the history has the entry,
  // the filter works, the Attention card shows the same entries.
  {
    const { context, page, shown } = await bump(phone, 'm55 damage');
    check('the bump is in the history', shown, String(shown));
    await showSection(page, 'status');
    const rows = await count(page, '[data-testid="section-status"] .damage-list li.damage-item');
    check('the damage list in Status has a row', rows >= 1, String(rows));
    check(
      'Place has no damage list',
      (await count(page, '[data-testid="section-place"] [data-testid="damage-list"]')) === 0,
      '0',
    );
    const tags = await texts(page, 'status-alert-tag');
    check('the history has a Damage tag', tags.includes('Damage'), tags.join());

    // 4. The filter.
    const all = await count(page, '[data-testid="status-alert-item"]');
    await page.getByTestId('status-filter-damage').click();
    const damageTags = await texts(page, 'status-alert-tag');
    check(
      'the Damage filter shows only Damage rows',
      damageTags.length >= 1 && damageTags.every((tag) => tag === 'Damage'),
      damageTags.join(),
    );
    check(
      'the Damage filter is pressed',
      (await page.getByTestId('status-filter-damage').getAttribute('aria-pressed')) === 'true' &&
        (await page.getByTestId('status-filter-all').getAttribute('aria-pressed')) === 'false',
      'pressed',
    );
    await page.getByTestId('status-filter-sail').click();
    const none = await page.getByTestId('status-alert-empty').textContent();
    check(
      'a tag with nothing says so',
      (await count(page, '[data-testid="status-alert-item"]')) === 0 &&
        none === 'Nothing with this tag yet.',
      String(none),
    );
    await page.getByTestId('status-filter-damage').click();
    await page.getByTestId('status-filter-all').scrollIntoViewIfNeeded();
    await shot(page, 'live-phone-m55-filter-damage');
    await page.getByTestId('status-filter-all').click();
    const back = await count(page, '[data-testid="status-alert-item"]');
    check('All brings the rest back', back === all, `${back} of ${all}`);

    // 5. The Attention card has the same entries with their tag chips.
    await page.getByTestId('alert-chip').click();
    await page.waitForTimeout(300);
    const cardItems = await count(page, '[data-testid="alert-item"]');
    const cardTags = await texts(page, 'alert-tag');
    check('the Attention card lists the same entries', cardItems === all, `${cardItems} of ${all}`);
    check('the card rows carry tag chips', cardTags.includes('Damage'), cardTags.join());
    await shot(page, 'live-phone-m55-card');
    // 7. The audit with Status open (the card closed again).
    await page.getByTestId('alert-close').click();
    await showSection(page, 'status');
    problems.push(...(await auditPage(page, 'm55 phone status')));
    await context.close();
  }

  // 6. A rope warning in Realistic mode.
  {
    const { context, page } = await openPage(phone, 'm55 slipping', SLIPPING, { testClock: true });
    const rows = '[data-testid="status-alert-item"][data-kind="ropeSlipping"]';
    const seen = await poll(page, async () => (await count(page, rows)) > 0, 8000);
    check('the slipping rope is in the history', seen, String(seen));
    const row = page.locator(rows).first();
    const text = (await row.locator('.alert-text').textContent()) ?? '';
    check(
      'it names the rope and the cure',
      /^.+: slipping on the winch drum\. Add a turn\.$/.test(text),
      text,
    );
    const tag = (await row.locator('[data-testid="status-alert-tag"]').textContent()) ?? '';
    check('it is tagged Rope', tag === 'Rope', tag);
    await page.waitForTimeout(5000);
    const after = await count(page, rows);
    check('five seconds later still one row', after === 1, String(after));
    await context.close();
  }

  // 7. The audit on a computer, Status open, with entries in it.
  {
    const { context, page, shown } = await bump(desktop, 'm55 desktop');
    check('desktop: the bump is in the history', shown, String(shown));
    await showSection(page, 'status');
    const box = await page.getByTestId('status-filter-damage').boundingBox();
    check(
      'the filter buttons are 44 px high',
      Boolean(box) && Math.round(box.height) >= 44,
      JSON.stringify(box),
    );
    await shot(page, 'live-desktop-m55-status');
    problems.push(...(await auditPage(page, 'm55 desktop status')));
    await context.close();
  }
}
