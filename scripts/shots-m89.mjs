// M89 (Winches, ropes, anchor and thrusters, PHASE_AUDIO_SPEC 8.5): live checks for scripts/shots.mjs.
// Labels start with "m89-". No scenes. The pages run on the test clock (`onTestClock`): the probe's
// targets and events are read after `waitForTimeout`.
import { touchTools } from './shots-m4b.mjs';
import { holdThruster, holdWindlass, setCamera, setSheet, soundOn, soundProbe } from './ui.mjs';

const drawing = (station) => `[data-testid="station-drawing-${station}"]`;

/** Scrolls the panel so the part is in its middle, then lets it settle (copied from shots-m4c.mjs, not exported there). */
async function centreOn(page, selector) {
  await page
    .locator(selector)
    .first()
    .evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(300);
}

/** A finger on the screen: down, up (CDP touch events; copied from shots-m4c.mjs). */
function finger(cdp) {
  const send = (type, x, y) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }],
    });
  return {
    down: (p) => send('touchStart', p.x, p.y),
    up: (p) => send('touchEnd', p.x, p.y),
  };
}

export async function liveM89Checks({ openPage, viewports, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M89 ${what}: ${detail}`);
    console.log(`live M89 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const voices = async (page) => (await soundProbe(page)).targets?.voices;

  // 1. Winch: holding the starboard winch's button hums (or the motor cuts out); letting go is silent.
  {
    const { context, page } = await openPage(
      phone,
      'm89-winch',
      '?v=1&mode=realistic&wd=90&ws=20&js=30&st=starboard&wsb=a5.4.t&sel=rope_jib_sheet&cam=helm',
    );
    // As M4c opens its phone winch checks: the sheet at full and the camera on the map, so the drum and the button fit.
    await setSheet(page, 'full');
    await setCamera(page, 'map');
    await soundOn(page);
    await page.waitForTimeout(600);
    const cdp = await context.newCDPSession(page);
    const t = touchTools(cdp, page);
    const f = finger(cdp);
    await centreOn(page, `${drawing('starboard')} .real-drum`);
    const button = await t.where(`${drawing('starboard')} .real-button-disc`);
    await f.down(button);
    await page.waitForTimeout(700);
    const held = await soundProbe(page);
    const humming = held.targets?.voices.winchMotor.gain > 0;
    const cutOut = held.events.includes('cutOut');
    check(
      'holding the winch button hums or cuts out',
      humming || cutOut,
      `${JSON.stringify(held.targets?.voices.winchMotor)} events ${JSON.stringify(held.events)}`,
    );
    await f.up(button);
    await page.waitForTimeout(500);
    const after = await voices(page);
    check(
      'the winch is silent after letting go',
      after?.winchMotor.gain === 0,
      JSON.stringify(after?.winchMotor),
    );
    await context.close();
  }

  // 2. Easy ropes: the + and − of a sheet run a short winch sound.
  {
    const { context, page } = await openPage(
      phone,
      'm89-easy',
      '?v=1&wd=90&ws=12&ms=40&sel=rope_mainsheet',
    );
    await soundOn(page);
    await setSheet(page, 'peek');
    let rate = 0;
    let gain = 0;
    for (let i = 0; i < 5; i += 1) {
      await page.getByRole('button', { name: 'More: Main sheet', exact: true }).click();
      // Read after each 50 ms of app time for 200 ms: the sheet moves only for a moment after a press.
      for (let step = 0; step < 4; step += 1) {
        await page.waitForTimeout(50);
        const v = await voices(page);
        rate = Math.max(rate, v?.winchClicks.rate ?? 0);
        gain = Math.max(gain, v?.winchMotor.gain ?? 0);
      }
    }
    check(
      'Easy: a sheet moved gives winch clicks',
      rate > 0 && gain > 0,
      `rate ${rate}, motor gain ${gain}`,
    );
    // The sheet takes a few seconds to arrive; once it has, the winches are silent.
    let still = await voices(page);
    for (let waited = 0; waited < 10_000; waited += 250) {
      if (still?.winchClicks.rate === 0 && still?.winchMotor.gain < 0.01) break;
      await page.waitForTimeout(250);
      still = await voices(page);
    }
    check(
      'Easy: still sheets are silent',
      still?.winchClicks.rate === 0 &&
        still?.winchClicks.gain === 0 &&
        still?.winchMotor.gain < 0.01,
      JSON.stringify([still?.winchClicks, still?.winchMotor]),
    );
    await context.close();
  }

  // 3. Anchor: letting go gives the clank (the windlass and chain levels are in the unit tests).
  {
    const { context, page } = await openPage(
      phone,
      'm89-anchor',
      '?v=1&pl=bay&m=harbour&pe=-1640.0&pn=0.0&hdg=270&wd=-90&ws=10&tx=4',
    );
    await soundOn(page);
    await holdWindlass(page, 'down', 2000);
    const { events } = await soundProbe(page);
    check('the anchor going down clanks', events.includes('anchorDown'), JSON.stringify(events));
    await context.close();
  }

  // 4. Thrusters: the bow thruster hums while held and is silent after.
  {
    const { context, page } = await openPage(
      phone,
      'm89-thruster',
      '?v=1&m=harbour&wd=0&ws=0&mf=0&jf=0&js=100&bs=0&ap=off&eng=1&lv=0&cam=top&tx=4',
    );
    await soundOn(page);
    let during = null;
    await holdThruster(page, 'bow', -1, 1000, 'section', async () => {
      during = await voices(page);
    });
    check(
      'the bow thruster hums while held',
      during?.thrusterBow.gain > 0,
      JSON.stringify(during?.thrusterBow),
    );
    await page.waitForTimeout(500);
    const after = await voices(page);
    check(
      'the bow thruster is silent after',
      after?.thrusterBow.gain === 0,
      JSON.stringify(after?.thrusterBow),
    );
    await context.close();
  }
}
