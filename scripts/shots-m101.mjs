// M101 (Keyboard, PHASE_FEEDBACK_SPEC 8.7): live checks for scripts/shots.mjs, on the test clock.
// No scenes. Keys are pressed after one click on the 3D canvas, so the focus is not on a button.
import { openSettings, waitForLink } from './ui.mjs';

export const M101_SCENES = [];

const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };
// `ap=off` makes the arrows steer the wheel (a link without `ap` holds the heading).
const BASE = 'ms=30&js=30&rd=0&ap=off&sea=flat&lb=0';

export async function liveM101Checks({ openPage, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M101 ${what}: ${detail}`);
    console.log(`live M101 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const open = async (viewport, what, query) => {
    const opened = await openPage(viewport, `m101 ${what}`, `?${query}`, { testClock: true });
    await opened.page.waitForTimeout(500);
    return opened;
  };
  const clickCanvas = async (page) => {
    const box = await page.locator('canvas.scene-canvas').boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  };
  const press = async (page, key, times = 1) => {
    for (let i = 0; i < times; i += 1) await page.keyboard.press(key);
  };
  /**
   * The link once it has every part of `has` and none of `hasNot`; after 3 s, the link as it is (so
   * a check fails honestly). The link is written 300 ms of app time after a change, and on the test
   * clock only `waitForTimeout` moves app time: so move it first (waitForLink alone polls in real
   * time and, on a slow machine, gives up before the link is written).
   */
  const link = async (page, has, hasNot = []) => {
    await page.waitForTimeout(500);
    try {
      return await waitForLink(page, has, hasNot);
    } catch {
      return page.evaluate(() => window.location.search + window.location.hash);
    }
  };

  // ---- Computer ----
  {
    const { context, page } = await open(DESKTOP, 'keys', BASE);
    await clickCanvas(page);

    // 1. Arrows steer.
    await press(page, 'ArrowRight', 3);
    const turned = await link(page, ['rd=15']);
    check('→ three times: the wheel is at 15', turned.includes('rd=15'), turned);
    await press(page, 'ArrowLeft', 3);

    // 2. Sheet keys.
    await press(page, 'KeyW', 2);
    await press(page, 'KeyS');
    await press(page, 'KeyR');
    await press(page, 'KeyF', 2);
    const now = await link(page, ['ms=25', 'js=35']);
    check('W W S: main 25; R F F: jib 35', now.includes('ms=25') && now.includes('js=35'), now);

    // 5. Key list.
    await clickCanvas(page);
    await press(page, 'KeyH');
    const help = page.getByTestId('key-help');
    await help.waitFor({ state: 'visible' });
    const rows = await page.locator('[data-testid="key-help"] dt').count();
    check('H opens the key list with 8 rows', rows === 8, `${rows} rows`);
    await press(page, 'Escape');
    await help.waitFor({ state: 'hidden' });
    check('Escape closes it', !(await help.isVisible()), 'hidden');
    await press(page, 'Shift+Slash');
    const byQuestion = await help
      .waitFor({ state: 'visible', timeout: 1500 })
      .then(() => true)
      .catch(() => false);
    check('? opens it', byQuestion, byQuestion ? 'visible' : 'not shown');
    await page.getByTestId('key-help-backdrop').click({ position: { x: 2, y: 2 } });
    await help.waitFor({ state: 'hidden' });
    check('a tap beside the card closes it', !(await help.isVisible()), 'hidden');

    // 6. Settings row.
    await openSettings(page);
    await page.getByTestId('settings-keys').click();
    await help.waitFor({ state: 'visible' });
    check('Settings → Show the keys opens the list', await help.isVisible(), 'visible');
    await page.getByTestId('key-help-close').click();
    await help.waitFor({ state: 'hidden' });
    await context.close();
  }

  // 3. Autopilot, on a fresh page: the boat has not turned, so the course it holds is 0.
  {
    const { context, page } = await open(DESKTOP, 'autopilot', BASE);
    await clickCanvas(page);
    // The clock stands still between presses, so the boat has not turned.
    await press(page, 'KeyP');
    await press(page, 'ArrowLeft', 5);
    let now = await link(page, ['apt=355'], ['ap=off']);
    check('P: the autopilot holds the heading', !now.includes('ap=off'), now);
    check('← five times with the autopilot on: its course is 355', now.includes('apt=355'), now);
    await press(page, 'KeyP');
    now = await link(page, ['ap=off']);
    check('P again: the autopilot is off', now.includes('ap=off'), now);
    await context.close();
  }

  // 4. Typing does not trigger keys.
  {
    const { context, page } = await open(DESKTOP, 'typing', `${BASE}&m=learn`);
    await page.getByTestId('learn-search').click();
    await page.keyboard.type('wsrfhp');
    const typed = await page.getByTestId('learn-search').inputValue();
    const now = await link(page, ['ms=30', 'js=30']);
    check(
      'typing in the Learn search moves nothing and opens no list',
      typed === 'wsrfhp' &&
        now.includes('ms=30') &&
        now.includes('js=30') &&
        !(await page
          .getByTestId('key-help')
          .isVisible()
          .catch(() => false)),
      `typed "${typed}", ${now}`,
    );
    await context.close();
  }

  // 7. No steering in an exercise.
  {
    const { context, page } = await open(DESKTOP, 'exercise', 'm=exercise&ex=points-of-sail');
    await page.getByTestId('exercise-start').click();
    await page.waitForTimeout(500);
    await clickCanvas(page);
    const before = await page.evaluate(() => window.location.search);
    await press(page, 'ArrowRight');
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => window.location.search);
    const pick = (q, key) => new URLSearchParams(q).get(key);
    check(
      'in an exercise → does not steer',
      pick(before, 'rd') === pick(after, 'rd') && pick(before, 'apt') === pick(after, 'apt'),
      `${before} → ${after}`,
    );
    await context.close();
  }

  // ---- Phone ----
  {
    const { context, page } = await open(PHONE, 'phone', 'sea=flat');
    await openSettings(page);
    const shown = await page.getByTestId('settings-keys-field').isVisible();
    check('the phone has no Keyboard row in Settings', !shown, shown ? 'visible' : 'hidden');
    await context.close();
  }
}
