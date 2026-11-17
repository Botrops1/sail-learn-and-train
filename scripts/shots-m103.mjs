// M103 (Word tours, PHASE_FEEDBACK_SPEC 10.7): live checks for scripts/shots.mjs, on the test clock.
// No scenes. A Learn entry's "Feel it" plays an exercise in Watch mode; only a browser shows the
// button, the tap and the step card that follows.
import { waitForLink } from './ui.mjs';

export const M103_SCENES = [];

const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };

export async function liveM103Checks({ openPage, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M103 ${what}: ${detail}`);
    console.log(`live M103 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const open = async (viewport, what, query) => {
    const opened = await openPage(viewport, `m103 ${what}`, `?${query}`, { testClock: true });
    await opened.page.waitForTimeout(500);
    return opened;
  };
  const cardText = async (page) =>
    (await page.getByTestId('step-card-text').count()) > 0
      ? ((await page.getByTestId('step-card-text').first().textContent()) ?? '')
      : '';
  /** The page's link once it has every part of `has`, or the link as it is (so a check fails honestly). */
  const link = async (page, has) => {
    await page.waitForTimeout(500);
    try {
      return await waitForLink(page, has);
    } catch {
      return page.evaluate(() => window.location.search + window.location.hash);
    }
  };

  // 1. Phone, touch: Header and lift, through the first stop and on to the next step.
  {
    const { context, page } = await open(PHONE, 'phone', 'learn=term_wind_shift&m=learn');
    const button = page.getByTestId('learn-feel-it');
    const bodyText = await page.locator('body').innerText();
    check(
      'phone: Feel it shows and its hint names Header and lift',
      (await button.isVisible()) && bodyText.includes('Header and lift'),
      `visible ${await button.isVisible()}`,
    );
    await button.tap();
    const now = await link(page, ['m=exercise', 'ex=wind-shift']);
    check(
      'phone: the tap loads the exercise',
      now.includes('m=exercise') && now.includes('ex=wind-shift'),
      now,
    );
    let first = '';
    for (let i = 0; i < 10 && !first.includes('Wait for the wind to shift'); i += 1) {
      await page.waitForTimeout(300);
      first = await cardText(page);
    }
    check(
      'phone: the step card shows the first goal',
      first.includes('Wait for the wind to shift'),
      first.slice(0, 80),
    );
    let stopped = false;
    for (let i = 0; i < 40 && !stopped; i += 1) {
      await page.waitForTimeout(1000);
      stopped = await page.getByTestId('exercise-demo-next').isVisible();
    }
    check('phone: Watch mode stops after the first step', stopped, `stopped ${stopped}`);
    if (stopped) {
      await page.getByTestId('exercise-demo-next').tap();
      let second = '';
      for (let i = 0; i < 5 && !second.includes('Bear away 20°'); i += 1) {
        await page.waitForTimeout(1000);
        second = await cardText(page);
      }
      check(
        'phone: Next step goes on to "Bear away 20°"',
        second.includes('Bear away 20°'),
        second.slice(0, 80),
      );
    }
    await context.close();
  }

  // 2. Computer: Weather helm.
  {
    const { context, page } = await open(
      DESKTOP,
      'weather helm',
      'learn=term_weather_helm&m=learn',
    );
    await page.getByTestId('learn-feel-it').click();
    const now = await link(page, ['ex=weather-helm']);
    check('computer: the click loads weather-helm', now.includes('ex=weather-helm'), now);
    let first = '';
    for (let i = 0; i < 10 && !first.includes('Watch the wheel as the wind rises'); i += 1) {
      await page.waitForTimeout(300);
      first = await cardText(page);
    }
    check(
      'computer: the step card shows the first goal',
      first.includes('Watch the wheel as the wind rises.'),
      first.slice(0, 80),
    );
    await context.close();
  }

  // 3. A part has no tour.
  {
    const { context, page } = await open(DESKTOP, 'no tour', 'learn=part_boom&m=learn');
    const count = await page.getByTestId('learn-feel-it').count();
    check('a part has no Feel it button', count === 0, `count ${count}`);
    await context.close();
  }
}
