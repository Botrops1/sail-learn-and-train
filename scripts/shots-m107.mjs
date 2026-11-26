// M107 (Gennaker sheets on the winches, PHASE_RIGGING_SPEC 9.6): scenes and live checks for
// scripts/shots.mjs. Joins the m33 group, on the test clock. The rules (no clutch, holds on the
// winch, runs out off it, the lazy sheet moves nothing, the links) are unit tests
// (tests/realistic.test.ts); here only what needs the real drawing and a finger.
import { touchTools, line } from './shots-m4b.mjs';
import { setSheet, showSection } from './ui.mjs';

const BASE = 'wd=120&ws=12&ms=60&jf=0&gn=4&gx=p&gu=100&gs=25&ap=wind&apt=120&sea=flat&cam=helm';
const PORT = `?mode=realistic&st=port&${BASE}`;
const STBD = `?mode=realistic&st=starboard&${BASE}`;

/** Screenshots at every size: the two stations with the sheet's own position and no clutch. */
export const M107_SCENES = [
  { name: 'port', query: PORT, scrollTo: '[data-testid="station-drawing-port"]' },
  {
    name: 'starboard-on-winch',
    query: `${STBD}&wp=g1.3.t&wsb=g2.2.h`,
    scrollTo: '[data-testid="station-drawing-starboard"]',
  },
].map((scene) => ({ ...scene, waitMs: 1500 }));

const drawing = (station) => `[data-testid="station-drawing-${station}"]`;
const knob = (station, key) => `${drawing(station)} [data-drag="tail:${key}"]`;
const drum = (station) => `${drawing(station)} .real-drum`;
const jaw = (station) => `${drawing(station)} .real-jaw`;
const handKnob = (station) => `${drawing(station)} [data-drag="hand"]`;
const winchButton = (station) => `${drawing(station)} .real-button-disc`;

/** Points on a circle round (x, y), turns > 0 clockwise on screen, starting at the top. */
function circle(x, y, radius, turns) {
  const steps = Math.ceil(24 * Math.abs(turns)) + 2;
  const sign = turns > 0 ? 1 : -1;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = -Math.PI / 2 + sign * (i / steps) * Math.abs(turns) * 2 * Math.PI;
    return { x: x + radius * Math.cos(a), y: y + radius * Math.sin(a) };
  });
}

export async function liveM107Checks({ openPage, viewports, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M107 ${what}: ${detail}`);
    console.log(`live M107 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const open = async (label, query) => {
    const opened = await openPage(phone, `m107 ${label}`, `${query}&debug=1`, {
      testClock: true,
    });
    await opened.page.waitForTimeout(800);
    await setSheet(opened.page, 'full');
    return opened;
  };
  const param = async (page, name) =>
    new URLSearchParams(await page.evaluate(() => window.location.search)).get(name);
  const trim = (page) => page.getByTestId('gennaker-trim').getAttribute('data-state');
  /** Waits app time (in 500 ms steps) until the trim state is `state`; the seconds waited, or null. */
  const waitForTrim = async (page, state, withinS) => {
    for (let waited = 0; waited <= withinS; waited += 0.5) {
      if ((await trim(page)) === state) return waited;
      await page.waitForTimeout(500);
    }
    return null;
  };
  const ready = (page, station) =>
    page.locator(`${drawing(station)} .real-drum`).scrollIntoViewIfNeeded();
  /** Tail onto the winch, three turns, into the self-tailer: the gestures of the M4b checks. */
  const wrapAndJaw = async (page, t, station, key, turns) => {
    await ready(page, station);
    let p = await t.where(knob(station, key));
    let d = await t.where(drum(station));
    await t.swipe(line(p, d, 12));
    await page.waitForTimeout(700);
    await ready(page, station);
    d = await t.where(drum(station));
    await t.swipe(circle(d.x, d.y, d.box.width / 2 + 10, turns));
    await page.waitForTimeout(700);
    await page.locator(handKnob(station)).scrollIntoViewIfNeeded();
    p = await t.where(handKnob(station));
    const j = await t.where(jaw(station));
    await t.swipe(line(p, j, 10));
    await page.waitForTimeout(700);
  };

  // 1. An older link (no gennaker) shows the stations exactly as before: no sheet position.
  {
    const { context, page } = await open('older link', '?mode=realistic&st=port&wd=120&ws=12');
    check(
      'older link: no gennaker sheet at the Port station',
      (await page.locator(knob('port', 'g1')).count()) === 0,
      String(await page.locator(knob('port', 'g1')).count()),
    );
    await context.close();
  }

  // 2. The Port station: the sheet has a tail and no clutch; off the winch it runs out and the
  //    sail flaps; on the winch (three turns, self-tailer) and hauled with the button it fills.
  {
    const { context, page } = await open('port', PORT);
    const t = touchTools(await context.newCDPSession(page), page);
    check(
      'port: the gennaker sheet has a tail',
      (await page.locator(knob('port', 'g1')).count()) === 1,
      String(await page.locator(knob('port', 'g1')).count()),
    );
    check(
      'port: it has no clutch lever',
      (await page.locator(`${drawing('port')} [data-key="g1"] .real-lever`).count()) === 0 &&
        (await page.locator(`${drawing('port')} [data-drag="clutch:g1"]`).count()) === 0,
      'lever and clutch drag absent',
    );
    // The sheet's position is a keyboard button too (the clutches have always been one).
    const lead = page.locator(`${drawing('port')} .real-lead`);
    check(
      'port: the sheet position is a labelled button the keyboard reaches',
      (await lead.getAttribute('role')) === 'button' &&
        (await lead.getAttribute('tabindex')) === '0' &&
        ((await lead.getAttribute('aria-label')) ?? '').length > 0,
      `${await lead.getAttribute('role')} ${await lead.getAttribute('tabindex')}`,
    );
    await lead.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    check(
      'port: Enter on the sheet position selects it',
      ((await lead.getAttribute('class')) ?? '').includes('is-selected') &&
        (await lead.getAttribute('aria-pressed')) === 'true',
      `${await lead.getAttribute('class')} ${await lead.getAttribute('aria-pressed')}`,
    );
    await showSection(page, 'sails');
    const sheetRow = await page.getByTestId('gennaker-sheet-row').isVisible();
    const sheetLine = await page.getByTestId('gennaker-sheet-winch').isVisible();
    check(
      'Sails block: the sheet stepper is replaced by the winch line',
      !sheetRow && sheetLine,
      `${sheetRow} ${sheetLine}`,
    );
    await showSection(page, 'ropes');
    const ranOut = await waitForTrim(page, 'luffing', 5);
    check(
      'port: off the winch the sheet runs out and the sail luffs',
      ranOut !== null,
      `after ${ranOut} s of app time, gs ${await param(page, 'gs')}`,
    );
    await setSheet(page, 'full');
    await wrapAndJaw(page, t, 'port', 'g1', 3);
    check(
      'port: sheet on the winch, three turns, in the self-tailer',
      (await param(page, 'wp')) === 'g1.3.t',
      String(await param(page, 'wp')),
    );
    const before = Number(await param(page, 'gs'));
    let good = null;
    for (let i = 0; i < 12 && good === null; i += 1) {
      await ready(page, 'port');
      const b = await t.where(winchButton('port'));
      await t.swipe([b, b], { hold: 1000 });
      await page.waitForTimeout(300);
      if ((await trim(page)) === 'good') good = i + 1;
    }
    check(
      'port: cranked with the button the sheet comes in and the trim reads Drawing well',
      good !== null && Number(await param(page, 'gs')) < before,
      `gs ${before} → ${await param(page, 'gs')}, trim ${await trim(page)}, after ${good} holds`,
    );
    await context.close();
  }

  // 3. The Starboard station: the same sheet position is the lazy one. Wrapped and cranked
  //    there it changes nothing (the working sheet is held on the Port winch).
  {
    const { context, page } = await open('starboard', `${STBD}&wp=g1.3.t`);
    const t = touchTools(await context.newCDPSession(page), page);
    check(
      'starboard: the lazy sheet has a tail',
      (await page.locator(knob('starboard', 'g2')).count()) === 1,
      String(await page.locator(knob('starboard', 'g2')).count()),
    );
    await wrapAndJaw(page, t, 'starboard', 'g2', 3);
    const before = await param(page, 'gs');
    await ready(page, 'starboard');
    const b = await t.where(winchButton('starboard'));
    await t.swipe([b, b], { hold: 2000 });
    await page.waitForTimeout(700);
    check(
      'starboard: the lazy sheet on its winch, cranked: nothing changes',
      (await param(page, 'wsb')) === 'g2.3.t' && (await param(page, 'gs')) === before,
      `wsb ${await param(page, 'wsb')}, gs ${before} → ${await param(page, 'gs')}`,
    );
    await context.close();
  }
}
