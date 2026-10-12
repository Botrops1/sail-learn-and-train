// M8 (heel, forces and weather helm): scenes and live checks for scripts/shots.mjs.
// The boat leans, the strip says how far, the alerts, the rope loads in kN, the round-up.
// Their labels contain "m8" so the script opens them Sailing (older scenes are held still).
import path from 'node:path';

/** Screenshots at every size. The script waits `waitMs` before each (the alert shows after 2 s). */
export const M8_SCENES = [
  { name: 'heeled-bow', query: '?wd=45&ws=20&ms=15&js=0&cam=bow', waitMs: 4500 },
  { name: 'heeled-side-port', query: '?wd=45&ws=20&ms=15&js=0&cam=side-port', waitMs: 4500 },
  { name: 'heeled-helm', query: '?wd=45&ws=20&ms=15&js=0&cam=helm', waitMs: 4500 },
  { name: 'upright-bow', query: '?wd=45&ws=20&ms=15&js=0&cam=bow&held=1', waitMs: 2000 },
  {
    name: 'load',
    query: '?wd=90&ws=12&ms=40&js=100&sel=rope_mainsheet&cam=side-port',
    centre: '.rope-strip [data-part-id="rope_mainsheet"] .control-meta',
    waitMs: 3000,
  },
  {
    name: 'load-jib',
    query: '?wd=90&ws=12&ms=40&js=100&sel=rope_jib_sheet&cam=side-port',
    centre: '.rope-strip [data-part-id="rope_jib_sheet"] .control-meta',
    waitMs: 3000,
  },
  {
    name: 'load-realistic',
    query:
      '?mode=realistic&wd=90&ws=20&js=30&st=starboard&wsb=a5.3.t&sel=rope_jib_sheet&cam=side-starboard',
    centre: '.ropes-realistic .real-status',
    waitMs: 3000,
  },
  {
    name: 'debug',
    query: '?wd=45&ws=20&ms=15&js=0&cam=bow&debug=1',
    waitMs: 4500,
  },
];

const text = (page, id) => page.getByTestId(id).innerText();

export async function liveM8Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M8 ${what}: ${detail}`);
    console.log(`live M8 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const heelOf = async (page) => {
    const match = /Heel (\d+)° ([PS])/.exec(await text(page, 'strip-heel'));
    return match ? { deg: Number(match[1]), side: match[2] } : null;
  };
  const setSlider = (page, selector, value) =>
    page.locator(selector).evaluate((input, v) => {
      input.value = String(v);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);

  // Heel: leaning to port (wind from starboard), 25–36°, and the alert after 2 s.
  {
    const { context, page } = await openPage(
      phone,
      'm8 heel',
      '?wd=45&ws=20&ms=15&js=0&cam=bow&debug=1',
    );
    await page.waitForTimeout(4500);
    const heel = await heelOf(page);
    check(
      'heel to port, 25–36°',
      heel !== null && heel.side === 'P' && heel.deg >= 25 && heel.deg <= 36,
      JSON.stringify(heel),
    );
    check(
      '"Heeling a lot" alert',
      await page.getByTestId('overpowered-label').isVisible(),
      'visible',
    );
    await shot(page, 'live-phone-heeled');
    // Easing the main sheet to 60 reduces the heel (PT-25).
    await page.locator('[data-select="rope_mainsheet"]').click();
    await setSlider(page, '#control-ctl_mainsheet', 60);
    await page.waitForTimeout(6000);
    const eased = await heelOf(page);
    check(
      'main sheet 60 heels less',
      eased === null || eased.deg < heel.deg,
      JSON.stringify(eased),
    );
    await context.close();
  }

  // Held still: upright, no heel on the strip.
  {
    const { context, page } = await openPage(
      phone,
      'm8 held',
      '?wd=45&ws=20&ms=15&js=0&held=1&cam=bow',
    );
    await page.waitForTimeout(1500);
    check('held: no heel shown', (await heelOf(page)) === null, await text(page, 'strip-heel'));
    await context.close();
  }

  // Round-up: wind up to 28 kn with the main sheeted hard; she turns into the wind by herself.
  for (const [main, expectRoundUp] of [
    [15, true],
    [50, false],
  ]) {
    const { context, page } = await openPage(
      phone,
      `m8 round-up ms${main}`,
      `?wd=50&ws=18&ms=${main}&js=20&cam=bow`,
    );
    await page.waitForTimeout(3000);
    await page.getByRole('tab', { name: 'Wind' }).click();
    await setSlider(page, '#wind-speed', 28);
    let seen = false;
    for (let i = 0; i < 60 && !seen; i += 1) {
      await page.waitForTimeout(500);
      seen = await page.getByTestId('round-up-label').isVisible();
      if (seen) await shot(page, 'live-phone-round-up');
    }
    check(
      `main ${main}: round-up alert ${expectRoundUp ? 'shows' : 'stays away'}`,
      seen === expectRoundUp,
      String(seen),
    );
    await page.waitForTimeout(1500);
    await context.close();
  }

  // Loads: the strip shows kN and kg for the sheets.
  {
    const { context, page } = await openPage(
      phone,
      'm8 load',
      '?wd=90&ws=12&ms=40&js=100&sel=rope_mainsheet',
    );
    await page.waitForTimeout(2500);
    const meta = await page
      .locator('.rope-strip [data-part-id="rope_mainsheet"] .control-meta')
      .innerText();
    check(
      'main sheet load line',
      /Load \d+\.\d kN \(about \d+ kg\)/.test(meta),
      meta.replace(/\n/g, ' | '),
    );
    await context.close();
  }
}
