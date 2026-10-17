// M36 (notification centre, issue #80): scenes and live checks for scripts/shots.mjs
// (PHASE5_SPEC 14). Labels contain "m36", so openPage lets the app open as it does without a
// link (Sailing, Coastal waves, the clock chip shown, every section folded); only the mini-map is
// hidden.
// The live checks run on the test clock (shots.mjs passes `onTestClock`): waitForTimeout moves the app's time on.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { showSection } from './ui.mjs';

const BOAT = '?wd=60&ws=12';

export const M36_SCENES = [
  { name: 'start', query: BOAT },
  // Held still with the fenders out: the reminder starts when she sails, so the list is empty.
  { name: 'fenders-held', query: `${BOAT}&held=1&fd=1` },
];

export async function liveM36Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M36 ${what}: ${detail}`);
    console.log(`live M36 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone, foldable, desktop, landscape] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const box = (page, id) => page.getByTestId(id).boundingBox();
  const items = (page) => page.getByTestId('alert-item');
  const kinds = (page) =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="alert-item"]')].map((n) =>
        n.getAttribute('data-kind'),
      ),
    );
  const cardOpen = (page) => page.getByTestId('alert-centre').isVisible();
  /** The app's time passes (test clock) until the entry shows in the list; false after `ms`. */
  const waitForKind = async (page, kind, ms) => {
    for (let spent = 0; spent < ms; spent += 250) {
      if ((await kinds(page)).includes(kind)) return true;
      await page.waitForTimeout(250);
    }
    return false;
  };

  // Phone: only the Attention button at the start, next to the clock chip, inside the screen.
  {
    const { context, page } = await openPage(phone, 'm36 phone start', BOAT);
    const chip = await box(page, 'alert-chip');
    const clock = await box(page, 'clock-chip');
    check(
      'the Attention button is high enough to tap',
      !!chip && chip.height >= 44,
      `${chip?.height}`,
    );
    check(
      'the Attention button is in the screen and clear of the clock chip',
      !!chip &&
        !!clock &&
        chip.x >= 0 &&
        clock.x + clock.width <= phone.width &&
        chip.x + chip.width <= clock.x + 1,
      JSON.stringify({ chip, clock }),
    );
    check('the card is folded', !(await cardOpen(page)), 'alert-centre');
    check(
      'no badge before anything happened',
      await page.getByTestId('alert-badge').isHidden(),
      'badge',
    );
    check(
      'the page does not scroll sideways',
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      'scrollWidth',
    );
    await shot(page, 'live-phone-start');
    await page.getByTestId('alert-chip').click();
    check(
      'a tap opens the empty history',
      (await cardOpen(page)) && (await page.getByTestId('alert-empty').isVisible()),
      'empty',
    );
    await shot(page, 'live-phone-empty');
    await page.keyboard.press('Escape');
    check('Escape folds it again', !(await cardOpen(page)), 'alert-centre');
    await context.close();
  }

  // Phone: the fender reminder is written, counted, listed, and its "?" opens the Learn entry.
  {
    const { context, page } = await openPage(phone, 'm36 phone fenders', `${BOAT}&held=1&fd=1`, {
      testClock: true,
    });
    await showSection(page, 'conditions');
    await page.locator('label:has([data-testid="boat-mode-sailing"])').click();
    await page.waitForTimeout(500);
    const badge = page.getByTestId('alert-badge');
    check(
      'the badge counts 1 new alert',
      (await badge.isVisible()) && (await badge.innerText()) === '1',
      'badge',
    );
    await page.getByTestId('alert-chip').click();
    check(
      'the list has the fender reminder',
      JSON.stringify(await kinds(page)) === '["fendersOut"]',
      JSON.stringify(await kinds(page)),
    );
    check('the badge goes when the list is open', await badge.isHidden(), 'badge');
    const text = await items(page).first().innerText();
    check(
      'the reminder says what to do',
      text.includes('Bring the fenders in before you sail.'),
      text,
    );
    const learn = items(page).first().getByTestId('alert-learn');
    const learnBox = await learn.boundingBox();
    check(
      'the ? button is high enough to tap',
      !!learnBox && learnBox.height >= 44 && learnBox.width >= 44,
      JSON.stringify(learnBox),
    );
    await shot(page, 'live-phone-fenders');
    problems.push(...(await auditPage(page, 'm36 alert history')));
    await learn.click();
    await page.waitForTimeout(500);
    check('the card folds to show the Learn section', !(await cardOpen(page)), 'alert-centre');
    const name = await page.getByTestId('learn-name').innerText();
    check('the ? opens the Fender entry', name === 'Fender', name);
    await shot(page, 'live-phone-learn');
    await context.close();
  }

  // Phone: an accidental gybe is kept after its short messages are gone.
  {
    const { context, page } = await openPage(
      phone,
      'm36 phone gybe',
      '?wd=175&ws=20&ms=100&js=100&tx=0.5&cam=top',
    );
    await showSection(page, 'autopilot');
    const turn = page.locator('[data-section="autopilot"]').getByTestId('autopilot-turn--10');
    await turn.click();
    await turn.click();
    await page.getByTestId('alert-chip').click();
    const found = await waitForKind(page, 'gybe', 90_000);
    check('the gybe is in the history', found, JSON.stringify(await kinds(page)));
    if (found) {
      const text = await items(page).first().innerText();
      check('it keeps the report', text.includes('Accidental gybe!') && /kN/.test(text), text);
      const danger = await page.locator('[data-testid="alert-item"].is-danger').count();
      check('an accidental gybe is marked as a danger', danger >= 1, `${danger}`);
      await shot(page, 'live-phone-gybe');
      // The short report over the view goes away after 8 s; the history keeps it.
      await page.waitForTimeout(20_000);
      check(
        'the live report is gone and the history still has the gybe',
        (await page.getByTestId('gybe-report').isHidden()) && (await kinds(page)).includes('gybe'),
        JSON.stringify(await kinds(page)),
      );
    }
    await context.close();
  }

  // A wide window (computer): open at the start as a small overlay under the top row, at the
  // left; the − button folds it into the Attention button. Narrower side-by-side windows (the
  // foldable, the phone held sideways) start folded.
  for (const [viewport, name, wide] of [
    [desktop, 'desktop', true],
    [foldable, 'foldable', false],
    [landscape, 'landscape', false],
  ]) {
    const { context, page } = await openPage(viewport, `m36 ${name}`, BOAT);
    check(
      `${name}: the history starts ${wide ? 'open' : 'folded'}`,
      (await cardOpen(page)) === wide,
      'alert-centre',
    );
    if (!wide) await page.getByTestId('alert-chip').click();
    check(`${name}: the history is open now`, await cardOpen(page), 'alert-centre');
    const card = await box(page, 'alert-centre');
    const strip = await box(page, 'view-top');
    check(
      `${name}: the card is inside the view, under the top row`,
      !!card &&
        !!strip &&
        card.y >= strip.y + strip.height &&
        card.x >= 0 &&
        card.x + card.width <= viewport.width &&
        card.y + card.height <= viewport.height,
      JSON.stringify({ card, strip }),
    );
    await shot(page, `live-${name}-open`);
    await page.getByTestId('alert-fold').click();
    check(
      `${name}: the − button folds it to the Attention button`,
      !(await cardOpen(page)),
      'alert-centre',
    );
    await page.getByTestId('alert-chip').click();
    check(`${name}: the button opens it again`, await cardOpen(page), 'alert-centre');
    await page.getByTestId('alert-fold').click();
    await shot(page, `live-${name}-folded`);
    problems.push(...(await auditPage(page, `m36 ${name}`)));
    await context.close();
  }

  // Russian: the button and the empty text are translated and fit.
  {
    const { context, page } = await openPage(phone, 'm36 russian', `${BOAT}&lang=ru`, {
      testClock: true,
    });
    await page.getByTestId('alert-chip').click();
    const label = (await page.getByTestId('alert-chip').getAttribute('aria-label')) ?? '';
    check('the Russian button says Внимание', label.includes('Внимание'), label);
    await shot(page, 'live-phone-ru');
    await context.close();
  }
}
