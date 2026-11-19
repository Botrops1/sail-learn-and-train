// M106 (Sailing with the gennaker, PHASE_RIGGING_SPEC 8.7): scenes and live checks for
// scripts/shots.mjs. Joins the m26 group, on the test clock. The bands, the forces and the
// gybe's route are unit tests (tests/physicsTruthsRigging.test.ts, tests/gennaker.test.ts); here
// only what needs the real 3D view and a finger.
import { showSection } from './ui.mjs';

const S = '?wd=120&ws=12&ms=60&jf=0&gn=4&gx=p&gs=25&gu=100&ap=wind&apt=120&sea=flat';

/** Screenshots at every size: the sail set on the camera's side, from the helm, and on a run. */
export const M106_SCENES = [
  { name: 'set', query: `${S}&cam=side-port` },
  { name: 'helm', query: `${S}&cam=helm` },
  {
    name: 'run',
    query: '?wd=180&ws=12&ms=100&jf=0&gn=4&gx=p&gu=100&gs=80&sea=flat&cam=top',
  },
].map((scene) => ({ ...scene, waitMs: 2500, sheet: 'peek' }));

export async function liveM106Checks({ openPage, viewports, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M106 ${what}: ${detail}`);
    console.log(`live M106 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const startedAt = Date.now();
  const open = async (label, query) => {
    const opened = await openPage(phone, `m106 ${label}`, `${query}&debug=1`, {
      testClock: true,
    });
    await opened.page.waitForTimeout(800);
    return opened;
  };
  const trim = (page) => page.getByTestId('gennaker-trim').getAttribute('data-state');
  const speedKn = async (page) =>
    parseFloat((await page.getByTestId('strip-speed').textContent()) ?? '0');
  /** Waits app time (in 500 ms steps) until the trim state is `state`; returns the seconds waited, or null. */
  const waitForTrim = async (page, state, withinS) => {
    for (let waited = 0; waited <= withinS; waited += 0.5) {
      if ((await trim(page)) === state) return waited;
      await page.waitForTimeout(500);
    }
    return null;
  };
  /** Taps a stepper button of a row until the link has `part` (at most `max` taps). */
  const tapUntil = async (page, button, part, max) => {
    for (let i = 0; i < max; i += 1) {
      const link = await page.evaluate(() => window.location.search);
      if (link.includes(part)) return true;
      await button.tap();
      await page.waitForTimeout(350);
    }
    return (await page.evaluate(() => window.location.search)).includes(part);
  };

  // 1. Sock down: "In its sock"; pull it up with + and the sail fills and the boat speeds up.
  {
    const { context, page } = await open('sock', S.replace('&gu=100', ''));
    await showSection(page, 'sails');
    check(
      'sock: down, the trim reads In its sock',
      (await trim(page)) === 'snuffed',
      String(await trim(page)),
    );
    const before = await speedKn(page);
    const plus = page.getByTestId('gennaker-sock-row').locator('.step-button').last();
    const got = await tapUntil(page, plus, 'gu=100', 24);
    check('sock: + (touch) brings the link to gu=100', got, 'never');
    const filled = await waitForTrim(page, 'good', 10);
    check(
      'sock: within 10 s the trim reads Drawing well',
      filled !== null,
      String(await trim(page)),
    );
    let faster = false;
    let now = before;
    for (let s = 0; s < 30 && !faster; s += 1) {
      await page.waitForTimeout(1000);
      now = await speedKn(page);
      faster = now >= before + 1;
    }
    check('sock: within 30 s the speed is 1 kn higher', faster, `${before} → ${now} kn`);
    await context.close();
  }

  // 2. Gybe without turning: the crossing, then backed on the windward side, then back again.
  {
    const { context, page } = await open('gybe', S);
    await showSection(page, 'sails');
    const gybe = page.getByTestId('gennaker-gybe');
    await gybe.tap();
    await page.waitForTimeout(500);
    check(
      'gybe: the trim reads the crossing',
      (await trim(page)) === 'crossing',
      String(await trim(page)),
    );
    const backed = await waitForTrim(page, 'backed', 7);
    check('gybe: after the crossing the sail is backed', backed !== null, String(await trim(page)));
    await gybe.tap();
    const good = await waitForTrim(page, 'good', 15);
    check(
      'gybe: tapping again fills it again within 15 s',
      good !== null,
      String(await trim(page)),
    );
    await context.close();
  }

  // 3. Sheet + until gs=100: the front edge curls.
  {
    const { context, page } = await open('sheet', S);
    await showSection(page, 'sails');
    const plus = page.getByTestId('gennaker-sheet-row').locator('.step-button').last();
    const got = await tapUntil(page, plus, 'gs=100', 24);
    check('sheet: + (touch) brings the link to gs=100', got, 'never');
    const luffing = await waitForTrim(page, 'luffing', 10);
    check(
      'sheet: eased all the way, the trim reads luffing',
      luffing !== null,
      String(await trim(page)),
    );
    await context.close();
  }

  // 4. The sail is drawn when set and not when the sock is down; the Ropes list shows the two controls from stage 4.
  {
    const { context, page } = await open('drawn', S);
    const visible = (id) => page.evaluate((part) => window.__sailDebug.partVisible(part), id);
    check(
      'drawn: the sail is visible with the sock up',
      await visible('sail_gennaker'),
      'not visible',
    );
    await showSection(page, 'ropes');
    const row = (id) => page.locator(`.rope-item[data-select="${id}"]`);
    const shown = async (id) => (await row(id).count()) > 0 && (await row(id).first().isVisible());
    check(
      'drawn: the sheet and the sock line are listed at stage 4',
      (await shown('rope_gennaker_sheet_port')) && (await shown('rope_gennaker_sock_line')),
      'missing',
    );
    await context.close();
    const down = await open('drawn-down', S.replace('&gu=100', ''));
    check(
      'drawn: the sail is not visible with the sock down',
      !(await down.page.evaluate(() => window.__sailDebug.partVisible('sail_gennaker'))),
      'visible',
    );
    await down.context.close();
  }
  console.log(`live M106 time (reported only): ${Math.round((Date.now() - startedAt) / 1000)} s`);
}
