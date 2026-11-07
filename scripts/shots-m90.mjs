// M90 (Marina and birds, PHASE_AUDIO_SPEC 9.5): live checks for scripts/shots.mjs.
// Labels start with "m90-". No scenes. The pages run on the test clock (`onTestClock`): the probe's
// targets and events are read after `waitForTimeout`.
import { soundOn, soundProbe } from './ui.mjs';

export async function liveM90Checks({ openPage, viewports, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M90 ${what}: ${detail}`);
    console.log(`live M90 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const voices = async (page) => (await soundProbe(page)).targets?.voices;

  // 1. Marina, busy, 10 kn: the halyards tap and the water laps; within 90 s of app time a gull or a small bird calls.
  {
    const { context, page } = await openPage(
      phone,
      'm90-marina',
      '?pl=marina&tr=busy&m=harbour&ws=10&cam=map',
    );
    await soundOn(page);
    await page.waitForTimeout(500);
    const v = await voices(page);
    check(
      'the marina has halyards and lapping',
      v?.halyards.rate > 0 && v?.lapping.gain > 0,
      `halyards ${JSON.stringify(v?.halyards)} lapping ${JSON.stringify(v?.lapping)}`,
    );
    let heard = null;
    for (let i = 0; i < 90 && !heard; i += 1) {
      await page.waitForTimeout(1000);
      const { events } = await soundProbe(page);
      heard = events.find((e) => e === 'gull' || e === 'chirp') ?? null;
    }
    check('a gull or a small bird calls in the marina', heard !== null, `heard ${heard}`);
    await context.close();
  }

  // 2. Open water at noon: no halyards, but a distant gull is possible.
  {
    const { context, page } = await openPage(phone, 'm90-open', '?ws=10&cam=map');
    await soundOn(page);
    await page.waitForTimeout(500);
    const v = await voices(page);
    check(
      'open water has no halyards but gulls',
      v?.halyards.rate === 0 && v?.gulls.rate > 0,
      `halyards ${JSON.stringify(v?.halyards)} gulls ${JSON.stringify(v?.gulls)}`,
    );
    await context.close();
  }

  // 3. The marina at 01:00 local on 2 June: no birds, the halyards go on.
  {
    const { context, page } = await openPage(
      phone,
      'm90-night',
      '?pl=marina&tr=busy&m=harbour&ws=10&clk=202606020100&cam=map',
    );
    await soundOn(page);
    await page.waitForTimeout(500);
    const v = await voices(page);
    check(
      'at night there are no birds, the halyards go on',
      v?.gulls.rate === 0 && v?.smallBirds.rate === 0 && v?.halyards.rate > 0,
      `gulls ${v?.gulls.rate} smallBirds ${v?.smallBirds.rate} halyards ${v?.halyards.rate}`,
    );
    await context.close();
  }
}
