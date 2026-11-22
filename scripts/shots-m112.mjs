// M112 (The captain walks): live checks for scripts/shots.mjs (PHASE_PEOPLE_SPEC 8.7). Joins the
// m17 group, on the test clock. The route, the facing and the refusals are unit tests
// (tests/people.test.ts, tests/realistic.test.ts); here only the real page: the walk in the 3D
// view, the panel's line and the taps. No scenes: a scene cannot wait in the middle of a walk.
import path from 'node:path';
import { showSection, waitForLink } from './ui.mjs';

export const M112_SCENES = [];

/** The autopilot holds the wind at 60° over starboard, so the windward side is starboard throughout. */
const W = '?mode=realistic&st=port&wd=60&ws=10&ms=40&js=60&ap=wind&apt=60&sea=flat&cam=top&debug=1';

export async function liveM112Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M112 ${what}: ${detail}`);
    console.log(`live M112 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const captain = (page) => page.evaluate(() => window.__sailDebug.captain());
  const near = (a, b) => Math.abs(a - b) <= 0.01;
  const tapStation = (page, station) =>
    page.locator(`.station-button[data-station="${station}"]`).tap();

  // 1. Port to the Bow at x4: along the starboard (windward) side deck, then he stands there.
  {
    const { context, page } = await openPage(phone, 'm112 walk', `${W}&tx=4`, {
      testClock: true,
    });
    await page.waitForTimeout(800);
    await showSection(page, 'ropes');
    await tapStation(page, 'bow');
    await page.waitForTimeout(100);
    const status = page.getByTestId('walk-status');
    const text = (await status.isVisible()) ? ((await status.textContent()) ?? '') : '';
    let c = await captain(page);
    check(
      'the walk starts: "Walking to Bow", pose walk',
      text.includes('Bow') && c?.pose === 'walk',
      JSON.stringify({ text, c }),
    );
    await page.waitForTimeout(2500);
    c = await captain(page);
    check(
      'after 10 s: on the starboard side deck, abaft the mast',
      c !== null && c.x > -3.0 && c.x < -0.6 && c.z > 1.5,
      JSON.stringify(c),
    );
    await shot(page, 'm112-walking');
    let over = false;
    for (let i = 0; i < 16 && !over; i += 1) {
      over = !(await status.isVisible());
      if (!over) await page.waitForTimeout(250);
    }
    c = await captain(page);
    const link = await waitForLink(page, ['st=bow']);
    check(
      'the walk ends: he stands at the bow, the line is gone',
      over && c !== null && near(c.x, 4.85) && c.pose === 'stand',
      JSON.stringify({ over, c, link }),
    );
    await context.close();
  }

  // 2. Refused while walking, and working a line once he has arrived.
  {
    const { context, page } = await openPage(phone, 'm112 refused', W, { testClock: true });
    await page.waitForTimeout(800);
    await showSection(page, 'ropes');
    await tapStation(page, 'starboard');
    await page.waitForTimeout(100);
    // The first tap on the line end selects it; it stays selected, so the second round only works the clutch.
    await page.locator('[data-station="starboard"] [data-key="a5"]').tap();
    const workClutch = () => page.getByTestId('act-clutch').tap();
    await workClutch();
    const notice = await page
      .locator('.station-wrap[data-station="starboard"] .station-notice')
      .innerText();
    const link = await page.evaluate(() => window.location.search);
    check(
      'a gesture while walking: "Still walking", no clutch opened',
      notice === 'Still walking: wait until you get there.' && !link.includes('co=a5'),
      JSON.stringify({ notice, link }),
    );
    await page.waitForTimeout(3500);
    await workClutch();
    // The address bar follows 300 ms of app time after the rope moves: poll on the test clock.
    let opened = '';
    for (let i = 0; i < 40 && !opened.includes('co=a5'); i += 1) {
      await page.waitForTimeout(250);
      opened = await page.evaluate(() => window.location.search);
    }
    const after = await page
      .locator('.station-wrap[data-station="starboard"] .station-notice')
      .innerText();
    const state = await page.evaluate(() => ({
      walking: !document.querySelector('[data-testid="walk-status"]').hidden,
      link: window.location.search,
    }));
    check(
      'after he has arrived the clutch opens',
      opened.includes('co=a5'),
      JSON.stringify({ opened, after, state }),
    );
    await shot(page, 'm112-live-arrived');
    await context.close();
  }

  // 3. Turned back: tap Port a few seconds into the walk to the Bow.
  {
    const { context, page } = await openPage(phone, 'm112 back', `${W}&tx=4`, {
      testClock: true,
    });
    await page.waitForTimeout(800);
    await showSection(page, 'ropes');
    await tapStation(page, 'bow');
    await page.waitForTimeout(750);
    await tapStation(page, 'port');
    await page.waitForTimeout(100);
    let c = await captain(page);
    const stillWalking = c?.pose === 'walk';
    let over = false;
    for (let i = 0; i < 8 && !over; i += 1) {
      over = !(await page.getByTestId('walk-status').isVisible());
      if (!over) await page.waitForTimeout(250);
    }
    c = await captain(page);
    check(
      'turned back: still walking at once, then at the port winch',
      stillWalking && over && c !== null && near(c.x, -7.75) && near(c.z, -1.08),
      JSON.stringify({ stillWalking, over, c }),
    );
    await context.close();
  }
}
