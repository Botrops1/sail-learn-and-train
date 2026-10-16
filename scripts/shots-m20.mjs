// M20 (Entries and the Learn tab): scenes and live checks for scripts/shots.mjs (PHASE4_SPEC 6.9).
// Labels contain "m20", so openPage adds held=1, sea=flat and clock=0 to queries without them.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { sectionShown, setMode } from './ui.mjs';

/** Every size: the Learn tab with an entry open, and the card with its More button. */
export const M20_SCENES = [
  { name: 'learn-vang', query: '?learn=rope_vang&sel=rope_vang', waitMs: 800 },
  { name: 'learn-mainsail', query: '?learn=sail_main', waitMs: 800 },
  { name: 'card-more', query: '?sel=sail_main', waitMs: 800 },
];

const ROPES_STRIP_LEARN = '.rope-strip > :not([hidden]) [data-testid="strip-learn"]';
const ROPES_STRIP_FOLD = '.rope-strip > :not([hidden]) details.strip-more > summary';

export async function liveM20Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M20 ${what}: ${detail}`);
    console.log(`live M20 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone, , desktop] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });

  /** The address bar is written 300 ms after a change: poll up to 1 s. */
  const wait = async (page, test, text) => {
    try {
      await page.waitForFunction(test, text, { timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  };
  const has = (page, text) => wait(page, (value) => location.search.includes(value), text);
  const hasNot = (page, text) => wait(page, (value) => !location.search.includes(value), text);
  const learnName = (page) => page.getByTestId('learn-name').innerText();
  const learnOpen = async (page) => await sectionShown(page, 'learn');

  // 1. More on the card opens the entry.
  {
    const { context, page } = await openPage(phone, 'm20 card more', '?sel=sail_main');
    await page.waitForTimeout(500);
    await page.getByTestId('card-more').click();
    check('More on the card opens the Learn tab', await learnOpen(page), 'Learn tab not selected');
    check(
      'the entry is the Mainsail',
      (await learnName(page)) === 'Mainsail',
      await learnName(page),
    );
    check('the address bar has learn=sail_main', await has(page, 'learn=sail_main'), 'missing');
    await shot(page, 'live-phone-m20-card-more-opened');
    // More again on the entry that is already open (owner, PR #54): Learn opens all the same.
    await setMode(page, 'easy');
    await page.getByTestId('card-more').click();
    check('More on the open entry opens the Learn tab again', await learnOpen(page), 'stayed');
    await context.close();
  }

  // 2. A rope's entry, Show me and Back.
  {
    const { context, page } = await openPage(phone, 'm20 show me', '?learn=rope_vang');
    await page.waitForTimeout(500);
    check('the Learn tab is open', await learnOpen(page), 'Learn tab not selected');
    const alternatives = await page.getByTestId('learn-alternatives').innerText();
    check('other names', alternatives.includes('kicker (British)'), alternatives);
    const label = await page.getByTestId('learn-boat-label').innerText();
    check('the word on the boat', label.includes('“Vang”'), label);
    const status = await page.getByTestId('learn-fact-status').innerText();
    check('how sure we are', status === 'Seen on the reference boat (photo).', status);
    await page.getByTestId('learn-show-me').click();
    check('Show me writes the scene', await has(page, 'vg=100'), 'no vg=100');
    check('Show me keeps the entry open', await has(page, 'learn=rope_vang'), 'no learn=rope_vang');
    await shot(page, 'live-phone-m20-show-me');
    await page.goBack();
    check('Back leaves the scene', await hasNot(page, 'vg=100'), 'vg=100 still in the address bar');
    check('Back keeps the entry', await has(page, 'learn=rope_vang'), 'learn lost');
    check('Back shows the entry', (await learnName(page)) === 'Vang', await learnName(page));
    const after = await page.getByTestId('learn-status').innerText();
    check('Back clears "Showing it…"', after.trim() === '', after);
    // Show me tapped twice: one Back still returns (owner, PR #54).
    await page.getByTestId('learn-show-me').click();
    await has(page, 'vg=100');
    await page.waitForTimeout(400);
    await page.getByTestId('learn-show-me').click();
    await page.waitForTimeout(400);
    await page.goBack();
    check(
      'Show me twice: one Back leaves the scene',
      await hasNot(page, 'vg=100'),
      'still the scene',
    );
    await context.close();
  }

  // 3. From the Ropes strip, and Try it.
  {
    const { context, page } = await openPage(phone, 'm20 strip', '?sel=rope_vang');
    await page.waitForTimeout(500);
    await page.locator(ROPES_STRIP_FOLD).click();
    await page.locator(ROPES_STRIP_LEARN).click();
    check('the strip opens the Learn tab', await learnOpen(page), 'Learn tab not selected');
    check('the entry is the Vang', (await learnName(page)) === 'Vang', await learnName(page));
    await page.getByTestId('learn-try-rope_vang').click();
    // The strip's button on the entry that is already open (review finding 1). The fold is
    // still open from before.
    await page.locator('.rope-strip > :not([hidden]) details.strip-more').evaluate((fold) => {
      fold.open = true;
    });
    await page.locator(ROPES_STRIP_LEARN).click();
    check('the strip opens Learn on the open entry', await learnOpen(page), 'stayed on Ropes');
    await page.getByTestId('learn-try-rope_vang').click();
    const ropes = await sectionShown(page, 'ropes');
    check('Try it opens the Ropes tab', ropes, 'Ropes tab not selected');
    check('Try it selects the vang', await has(page, 'sel=rope_vang'), 'no sel=rope_vang');
    await context.close();
  }

  // 4. Show on the boat keeps the Learn tab; See also.
  {
    const { context, page } = await openPage(phone, 'm20 show on boat', '?learn=rope_vang');
    await page.waitForTimeout(500);
    await page.getByTestId('learn-show-on-boat').click();
    check(
      'Show on the boat selects the rope',
      await has(page, 'sel=rope_vang'),
      'no sel=rope_vang',
    );
    check('the Learn tab stays open', await learnOpen(page), 'switched away from Learn');
    await page.getByTestId('learn-related-part_boom').click();
    check('See also opens the Boom', (await learnName(page)) === 'Boom', await learnName(page));
    await page.getByTestId('learn-show-on-boat').click();
    check(
      'Show on the boat selects the boom',
      await has(page, 'sel=part_boom'),
      'no sel=part_boom',
    );
    await context.close();
  }

  // 5. Realistic mode's strip.
  {
    const { context, page } = await openPage(
      phone,
      'm20 realistic',
      '?sel=rope_mainsheet&mode=realistic',
    );
    await page.waitForTimeout(500);
    await page.locator('[data-testid="real-strip"] details.strip-more > summary').click();
    await page.getByTestId('real-learn').click();
    check(
      'the Realistic strip opens the Learn tab',
      await learnOpen(page),
      'Learn tab not selected',
    );
    check(
      'the entry is the Mainsheet',
      (await learnName(page)) === 'Mainsheet',
      await learnName(page),
    );
    check(
      'the address bar has learn=rope_mainsheet',
      await has(page, 'learn=rope_mainsheet'),
      'missing',
    );
    await context.close();
  }

  // 6. Side by side: the card has More.
  {
    const { context, page } = await openPage(desktop, 'm20 desktop card', '?sel=sail_jib');
    await page.waitForTimeout(500);
    await page.getByTestId('card-more').click();
    check('desktop: the Learn tab opens', await learnOpen(page), 'Learn tab not selected');
    check(
      'desktop: the entry is the Self-tacking jib',
      (await learnName(page)) === 'Self-tacking jib',
      await learnName(page),
    );
    await shot(page, 'live-desktop-m20-learn-jib');
    await context.close();
  }

  // 7. Accessibility with an entry open.
  {
    const { context, page } = await openPage(phone, 'm20 a11y', '?learn=rope_vang');
    await page.waitForTimeout(800);
    const found = await auditPage(page, 'm20 a11y learn tab');
    check(
      'accessibility: the Learn tab',
      found.length === 0,
      found.length ? found.join(' | ') : 'clean',
    );
    await context.close();
  }
}
