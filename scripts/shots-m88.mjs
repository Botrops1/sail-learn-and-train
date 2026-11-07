// M88 (Sails, engine and bumps, PHASE_AUDIO_SPEC 7.5): live checks for scripts/shots.mjs.
// Labels start with "m88-". No scenes. The pages run on the test clock (`onTestClock`), as the M87
// wind and Pause checks do: the probe's targets and events are read after `waitForTimeout`.
import path from 'node:path';
import { closeSettings, openSettings, setSheet, showSection, soundOn, soundProbe } from './ui.mjs';

export async function liveM88Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M88 ${what}: ${detail}`);
    console.log(`live M88 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  /** Asks `ready` every `stepMs` of app time until it says yes, at most `maxMs`. */
  const poll = async (page, ready, maxMs, stepMs = 100) => {
    for (let waited = 0; waited <= maxMs; waited += stepMs) {
      if (await ready()) return true;
      await page.waitForTimeout(stepMs);
    }
    return false;
  };
  const voices = async (page) => (await soundProbe(page)).targets?.voices;

  // 1. A luffing main flaps; a well-trimmed one rushes softly (prototype: ms 100 luffs, ms 40 is good).
  {
    const { context, page } = await openPage(phone, 'm88-flap', '?v=1&wd=90&ws=15&ms=100&mf=100');
    await soundOn(page);
    await page.waitForTimeout(2000);
    const v = await voices(page);
    check('luffing main flaps', v && v.flapMain.gain > 0, JSON.stringify(v?.flapMain));
    check('luffing main has no rush', v && v.fullMain.gain === 0, JSON.stringify(v?.fullMain));
    await context.close();
  }
  {
    const { context, page } = await openPage(phone, 'm88-full', '?v=1&wd=90&ws=15&ms=40&mf=100');
    await soundOn(page);
    await page.waitForTimeout(2000);
    const v = await voices(page);
    check(
      'good main rushes, no flap',
      v && v.flapMain.gain === 0 && v.fullMain.gain > 0,
      `${v?.flapMain.gain} / ${v?.fullMain.gain}`,
    );
    await context.close();
  }

  // 2. The engine: the start sound, then the pitch follows the lever.
  {
    const { context, page } = await openPage(phone, 'm88-engine-start', '?v=1&ws=0');
    await soundOn(page);
    await showSection(page, 'engine');
    await page.locator('[data-section="engine"]').getByTestId('engine-startstop').click();
    const heard = await poll(
      page,
      async () => (await soundProbe(page)).events.includes('engineStart'),
      2000,
    );
    check('engine start is heard', heard, JSON.stringify((await soundProbe(page)).events));
    await context.close();
  }
  {
    const hz = {};
    for (const lv of [0, 60]) {
      const { context, page } = await openPage(
        phone,
        `m88-engine-${lv}`,
        `?v=1&ws=0&eng=1&lv=${lv}`,
      );
      await soundOn(page);
      await page.waitForTimeout(2000);
      hz[lv] = (await voices(page))?.engine;
      await context.close();
    }
    check(
      'engine pitch rises with the lever',
      hz[0] && hz[60] && hz[60].hz > hz[0].hz && hz[60].gain > hz[0].gain,
      `${JSON.stringify(hz[0])} -> ${JSON.stringify(hz[60])}`,
    );
  }

  // 3. A bump: the M43 run into the quay gives a contact thump.
  {
    const { context, page } = await openPage(
      phone,
      'm88-contact',
      '?v=1&pl=marina&m=harbour&ws=0&cam=top&tx=16',
    );
    await soundOn(page);
    await setSheet(page, 'peek');
    for (let i = 0; i < 6; i += 1) await page.getByTestId('quick-lever-more').click();
    const heard = await poll(
      page,
      async () => (await soundProbe(page)).events.some((name) => name.startsWith('contact:')),
      15_000,
    );
    check('bump is heard', heard, JSON.stringify((await soundProbe(page)).events));
    await context.close();
  }

  // 4. Settings → Sound looks as before.
  {
    const { context, page } = await openPage(phone, 'm88-sound-phone', '?v=1');
    await openSettings(page);
    await page.getByTestId('sound-setting').waitFor({ state: 'visible' });
    await shot(page, 'm88-sound-phone');
    await closeSettings(page);
    await context.close();
  }
}
