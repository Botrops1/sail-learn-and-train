// M87 (Sound on, wind and waves, PHASE_AUDIO_SPEC 6.8): live checks for scripts/shots.mjs.
// Labels start with "m87-". No scenes. Pages that need app time (wind, Pause) run on the test
// clock; the others run on the real clock (`openPlain`), because the audio context does.
import path from 'node:path';
import { closeSettings, openSettings, soundOn, soundProbe } from './ui.mjs';

export async function liveM87Checks({ openPage, openPlain, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M87 ${what}: ${detail}`);
    console.log(`live M87 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const wide = viewports[2];
  const tid = (page, id) => page.getByTestId(id);
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const box = (page, id) => tid(page, id).boundingBox();
  const stored = (page) => page.evaluate(() => localStorage.getItem('sail-learn.sound'));
  /** Polls (app time or real time, whichever the page has) until the probe says `want`. */
  const waitContext = async (page, want) => {
    for (let i = 0; i < 40; i += 1) {
      if ((await soundProbe(page)).context === want) return true;
      await page.waitForTimeout(100);
    }
    return false;
  };
  const waitTargets = async (page) => {
    for (let i = 0; i < 40; i += 1) {
      const probe = await soundProbe(page);
      if (probe.targets !== null) return probe.targets;
      await page.waitForTimeout(100);
    }
    return null;
  };

  // 1. Phone: the Sound block sits right after Language, Sound is off, no context, no chip.
  {
    const { context, page } = await openPlain(phone, 'm87-settings-phone', '?v=1');
    await openSettings(page);
    await tid(page, 'sound-setting').waitFor({ state: 'visible' });
    const after = await page.evaluate(
      () =>
        document
          .querySelector('[data-testid="sound-setting"]')
          ?.previousElementSibling?.getAttribute('data-testid') ?? null,
    );
    check('phone Sound block follows Language', after === 'language-setting', String(after));
    check('phone switch is off', !(await tid(page, 'sound-switch').isChecked()), 'unchecked');
    check('phone no context before a tap', (await soundProbe(page)).context === 'none', 'none');
    check('phone no speaker chip', !(await tid(page, 'sound-chip').isVisible()), 'hidden');
    await shot(page, 'm87-settings-phone');
    // A tap on a fresh page (Sound never switched on) must not start anything or store anything.
    await closeSettings(page);
    await page.mouse.click(phone.width / 2, 150);
    await page.waitForTimeout(300);
    check('phone a tap does not start sound', (await soundProbe(page)).context === 'none', 'none');
    check(
      'phone nothing stored by a tap',
      (await stored(page)) === null,
      String(await stored(page)),
    );
    await context.close();
  }

  // 2. Switching Sound on starts the context and stores the setting.
  {
    const { context, page } = await openPlain(phone, 'm87-switch-on', '?v=1');
    await openSettings(page);
    await tid(page, 'sound-switch').check();
    check('switch on: context runs', await waitContext(page, 'running'), 'running within 4 s');
    check('switch on: targets appear', (await waitTargets(page)) !== null, 'first running frame');
    check(
      'switch on: stored',
      (await stored(page))?.includes('"on":true') === true,
      String(await stored(page)),
    );
    // The volume slider is stored and shows its value.
    await tid(page, 'sound-volume').fill('40');
    const value = (await tid(page, 'sound-volume-value').textContent())?.trim();
    check('volume value text', value === '40 %', String(value));
    await closeSettings(page);
    await context.close();
  }

  // 3. The wind sound follows the wind (test clock).
  {
    const levels = {};
    for (const ws of [5, 25]) {
      const { context, page } = await openPage(phone, `m87-wind-${ws}`, `?v=1&ws=${ws}`);
      await soundOn(page);
      await page.waitForTimeout(1000);
      const targets = await waitTargets(page);
      levels[ws] = targets?.voices;
      await context.close();
    }
    check(
      'wind louder at 25 kn',
      levels[5] && levels[25] && levels[25].wind.gain > levels[5].wind.gain,
      `${levels[5]?.wind.gain} -> ${levels[25]?.wind.gain}`,
    );
    check(
      'whistle only in strong wind',
      levels[5] && levels[25] && levels[5].whistle.gain === 0 && levels[25].whistle.gain > 0,
      `${levels[5]?.whistle.gain} -> ${levels[25]?.whistle.gain}`,
    );
  }

  // 4. Pause: the boat group is 0 and the surroundings are half (test clock).
  {
    const { context, page } = await openPage(phone, 'm87-pause', '?v=1&ws=15');
    await soundOn(page);
    await page.waitForTimeout(500);
    const before = (await waitTargets(page))?.groups;
    await tid(page, 'pause-button').click();
    await page.waitForTimeout(500);
    const after = (await soundProbe(page)).targets?.groups;
    check(
      'pause: boat 0, surroundings half',
      before &&
        after &&
        after.boat === 0 &&
        Math.abs(after.surroundings - before.surroundings / 2) < 0.001,
      `${JSON.stringify(before)} -> ${JSON.stringify(after)}`,
    );
    await context.close();
  }

  // 5. A hidden page suspends the context; coming back resumes it.
  {
    const { context, page } = await openPlain(phone, 'm87-hidden', '?v=1&ws=15');
    await soundOn(page);
    const setVisibility = (state) =>
      page.evaluate((value) => {
        Object.defineProperty(document, 'visibilityState', { value, configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      }, state);
    await setVisibility('hidden');
    check('hidden: suspended', await waitContext(page, 'suspended'), 'suspended');
    await setVisibility('visible');
    check('visible: running again', await waitContext(page, 'running'), 'running');
    await context.close();
  }

  // 6. Remembered: after a reload there is no context until a tap anywhere.
  {
    const { context, page } = await openPlain(phone, 'm87-remembered', '?v=1&ws=15');
    await soundOn(page);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('canvas.scene-canvas', { state: 'attached', timeout: 30_000 });
    check('reload: no context yet', (await soundProbe(page)).context === 'none', 'none');
    await page.mouse.click(phone.width / 2, 150);
    check('reload: a tap starts it', await waitContext(page, 'running'), 'running');
    // A finger touching down does not count as a tap for the browser; the finger lifting does
    // (M87 review). After another reload, a lone `pointerup` or `touchend` must start the sound.
    for (const type of ['pointerup', 'touchend']) {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForSelector('canvas.scene-canvas', { state: 'attached', timeout: 30_000 });
      await page.evaluate(
        (name) => document.body.dispatchEvent(new Event(name, { bubbles: true })),
        type,
      );
      check(`reload: a lone ${type} starts it`, await waitContext(page, 'running'), 'running');
    }
    await context.close();
  }

  // 7. A computer: the speaker chip before the gear, no overlap, and it follows Settings.
  for (const vp of [wide, { name: 'desktop-1024x768', width: 1024, height: 768, layout: 'side' }]) {
    const { context, page } = await openPlain(vp, `m87-chip-${vp.width}`, '?v=1&ws=15');
    const chip = tid(page, 'sound-chip');
    await chip.waitFor({ state: 'visible' });
    const [c, gear, camera] = [
      await box(page, 'sound-chip'),
      await box(page, 'settings-button'),
      await box(page, 'camera-chip'),
    ];
    const next = await page.evaluate(
      () =>
        document
          .querySelector('[data-testid="sound-chip"]')
          ?.nextElementSibling?.getAttribute('data-testid') ?? null,
    );
    check(`${vp.width} chip directly before the gear`, next === 'settings-button', String(next));
    check(
      `${vp.width} no overlap`,
      c && gear && camera && c.x + c.width <= gear.x && camera.x + camera.width <= c.x,
      JSON.stringify({ camera, c, gear }),
    );
    check(
      `${vp.width} off at first`,
      (await chip.getAttribute('aria-pressed')) === 'false',
      'aria-pressed=false',
    );
    await chip.click();
    check(
      `${vp.width} tap: pressed`,
      (await chip.getAttribute('aria-pressed')) === 'true',
      'aria-pressed=true',
    );
    check(`${vp.width} tap: context runs`, await waitContext(page, 'running'), 'running');
    if (vp === wide) await shot(page, 'm87-chip-wide');
    await openSettings(page);
    check(
      `${vp.width} Settings switch follows`,
      await tid(page, 'sound-switch').isChecked(),
      'checked',
    );
    await context.close();
  }

  // 8. Russian: the Sound block shows with real texts.
  {
    const { context, page } = await openPlain(phone, 'm87-ru', '?v=1&lang=ru');
    await openSettings(page);
    const text = (await tid(page, 'sound-setting').textContent()) ?? '';
    check(
      'ru: block shows',
      text.includes('Звук') && /громкость/i.test(text),
      text.slice(0, 60),
    );
    check('ru: no raw keys', !/sound\.[a-z]/i.test(text), text.slice(0, 60));
    await context.close();
  }
}
