// M72 (what pushes the boom across in a gybe, PHASE10_SPEC 14.7): one scene and two live checks for
// scripts/shots.mjs, on the test clock (the swing is timed in app seconds). Labels contain "m72".
import path from 'node:path';
import { showSection } from './ui.mjs';

const GYBING_ACCIDENTAL =
  '?v=1&ms=85&js=50&vg=50&tl=100&mf=100&jf=100&rd=0&wd=0&ws=12&cam=side-port&m=exercise&step=5&detail=high&hdg=171&bs=4.8&ap=wind&apt=-171&sea=flat&clk=202606011202&ex=gybing&exw=3&mode=easy';

export const M72_SCENES = [
  {
    name: 'gybing-accidental-step',
    query: GYBING_ACCIDENTAL,
    section: 'exercises',
    sheet: 'half',
  },
];

export async function liveM72Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M72 ${what}: ${detail}`);
    console.log(`live M72 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const read = (page) => page.evaluate(() => window.__sailExercise.read());
  const act = (page, action) => page.evaluate((a) => window.__sailExercise.dispatch(a), action);
  const open = (page) => showSection(page, 'exercises');
  const howText = async (page) => {
    await open(page);
    await page.getByTestId('exercise-how').click();
    const text = await page.getByTestId('exercise-how-text').innerText();
    await page.getByTestId('exercise-open').click();
    return text;
  };

  // 1. The boom starts across slowly and speeds up (PT-60): boat held, main right out, wind from
  //    170° (the boom is by the lee on port), then the wind goes to 195° (-165).
  {
    const { context, page } = await openPage(
      phone,
      'm72 swing',
      '?wd=170&ws=15&ms=100&js=100&held=1&sea=flat&cam=top&debug=1',
      { testClock: true },
    );
    await page.waitForTimeout(1500);
    const start = (await read(page)).boomDeg;
    await act(page, { type: 'setControls', values: { ctl_wind_dir: -165 } });
    const samples = [];
    let shotTaken = false;
    for (let n = 1; n <= 60; n += 1) {
      await page.waitForTimeout(100);
      const now = await read(page);
      samples.push({ t: n * 0.1, boomDeg: now.boomDeg, gybing: now.gybing });
      if (!shotTaken && now.boomDeg >= 0) {
        shotTaken = true;
        await shot(page, 'm72-swing-mid');
      }
    }
    const firstAt = (deg) => samples.find((s) => s.boomDeg >= deg)?.t;
    const toLine = firstAt(-15);
    const toEnd = firstAt(65);
    const share = toLine !== undefined && toEnd ? toLine / toEnd : 0;
    const lowest = Math.min(...samples.map((s) => s.boomDeg));
    const reportVisible = await page
      .getByTestId('gybe-report')
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(
        () => true,
        () => false,
      );
    const reportText = reportVisible ? await page.getByTestId('gybe-report').innerText() : '';
    check(
      'swing',
      start < -65 &&
        samples.some((s) => s.gybing) &&
        toEnd !== undefined &&
        toEnd <= 4 &&
        lowest >= start - 3 &&
        share >= 0.55 &&
        reportVisible &&
        reportText.startsWith('Accidental gybe!'),
      `start ${start.toFixed(1)}°, line at ${toLine}s, end at ${toEnd}s (share ${share.toFixed(2)}), ` +
        `lowest ${lowest.toFixed(1)}°, gybing seen ${samples.some((s) => s.gybing)}, report "${reportText.slice(0, 20)}"`,
    );
    await context.close();
  }

  // 2. The accidental step explains it (English and Russian).
  for (const [lang, word] of [
    ['en', 'line of the wind'],
    ['ru', 'линию ветра'],
  ]) {
    const query =
      lang === 'ru' ? `${GYBING_ACCIDENTAL}&lang=ru&debug=1` : `${GYBING_ACCIDENTAL}&debug=1`;
    const { context, page } = await openPage(phone, `m72 texts ${lang}`, query, {
      testClock: true,
    });
    // A waypoint link opens at the exercise's setup card: tap Start, then How?.
    await open(page);
    await page.getByTestId('exercise-start').click();
    await page.waitForTimeout(500);
    const text = await howText(page);
    check(
      `texts ${lang}`,
      text.includes(word),
      `How? text ${text.includes(word) ? 'has' : 'lacks'} "${word}"`,
    );
    await context.close();
  }
}
