// M91 (Music, PHASE_AUDIO_SPEC 10.6): live checks for scripts/shots.mjs.
// Labels start with "m91-". No scenes. The page runs on the test clock (`onTestClock`): the music's
// clock is the sum of the frames' real seconds, so it moves with `waitForTimeout`.
import { closeSettings, openSettings, soundOn, soundProbe } from './ui.mjs';

export async function liveM91Checks({ openPage, viewports, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M91 ${what}: ${detail}`);
    console.log(`live M91 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const musicEvents = (events) => events.filter((e) => /^(chord|note):/.test(e));

  const { context, page } = await openPage(phone, 'm91-music', '?ws=10&cam=map');
  await soundOn(page);
  for (let i = 0; i < 12; i += 1) await page.waitForTimeout(1000);
  const heard = musicEvents((await soundProbe(page)).events);
  check(
    'chords and notes play within 12 s of app time',
    heard.some((e) => e.startsWith('chord:')) && heard.some((e) => e.startsWith('note:')),
    `heard ${heard.join(' ')}`,
  );

  // Music off in Settings: nothing more is played, the wind goes on.
  await openSettings(page);
  await page.locator('[data-testid="sound-music"]').uncheck();
  await closeSettings(page);
  await page.waitForTimeout(500);
  const before = (await soundProbe(page)).events;
  for (let i = 0; i < 10; i += 1) await page.waitForTimeout(1000);
  const after = await soundProbe(page);
  const same =
    musicEvents(before).length === musicEvents(after.events).length &&
    before.at(-1) === after.events.at(-1);
  check(
    'Music off stops the music for good',
    same,
    `before ${musicEvents(before).length} after ${musicEvents(after.events).length}`,
  );
  check(
    'the wind goes on with Music off',
    (after.targets?.voices.wind.gain ?? 0) > 0 && after.targets?.groups.music === 0,
    `wind ${after.targets?.voices.wind.gain} music group ${after.targets?.groups.music}`,
  );
  await context.close();
}
