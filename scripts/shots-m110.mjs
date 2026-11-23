// M110 (Main traveller picture, PHASE_RIGGING_SPEC 12.6): scenes and live checks for
// scripts/shots.mjs. Joins the m36 group, on the test clock, on the phone, in English. The car's
// angles, the sheet's length and the link are unit tests (tests/pictures.test.ts,
// tests/physicsTruthsRigging.test.ts); here only the real page: the German mainsheet is replaced
// by a traveller, the slider moves the car and the boom follows, and Close picture puts it back.
import { waitForLink } from './ui.mjs';

const SHOW_ME = '?pic=traveller&tv=-60&wd=60&ws=10&ms=30&jf=0&held=1&sea=flat&cam=top';

/** Screenshots at every size: the traveller as its show-me link opens it. */
export const M110_SCENES = [{ name: 'traveller', query: SHOW_ME }].map((scene) => ({
  ...scene,
  waitMs: 2500,
  sheet: 'peek',
}));

export async function liveM110Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M110 ${what}: ${detail}`);
    console.log(`live M110 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const visible = (page, id) => page.evaluate((part) => window.__sailDebug.partVisible(part), id);
  const boomZ = async (page) => {
    const box = await page.evaluate(() => window.__sailDebug.partBox('part_boom'));
    return box === null ? null : (box.min[2] + box.max[2]) / 2;
  };
  const link = async (page, has, hasNot = []) => {
    try {
      return await waitForLink(page, has, hasNot);
    } catch {
      return page.evaluate(() => window.location.search + window.location.hash);
    }
  };

  const { context, page } = await openPage(phone, 'm110 traveller', `${SHOW_ME}&debug=1`, {
    testClock: true,
  });
  await page.waitForTimeout(2500);
  const banner = page.getByTestId('picture-banner');
  const slider = page.getByTestId('traveller-car');
  check(
    'the banner and the slider are visible',
    (await banner.isVisible()) && (await slider.isVisible()),
    `banner ${await banner.isVisible()}, slider ${await slider.isVisible()}`,
  );
  const sliderBox = await slider.boundingBox();
  check(
    'the slider is at least 44 px tall and shows the link’s −60',
    (sliderBox?.height ?? 0) >= 44 && (await slider.inputValue()) === '-60',
    `height ${sliderBox?.height}, value ${await slider.inputValue()}`,
  );
  check(
    'the German mainsheet and its deck blocks are hidden, the traveller drawn',
    !(await visible(page, 'rope_mainsheet')) &&
      !(await visible(page, 'fit_mainsheet_deck_blocks')) &&
      (await visible(page, 'part_traveller_car')) &&
      (await visible(page, 'part_traveller_track')) &&
      (await visible(page, 'rope_traveller_mainsheet')) &&
      (await visible(page, 'fit_mainsheet_boom_blocks')),
    'a part has the wrong visibility',
  );
  const port = await boomZ(page);
  check('the car to port: the boom is out to port', port !== null && port < 0, `boom z ${port}`);
  await page.screenshot({ path: `${outDir}/${prefix}m110-phone-traveller-live.png` });

  // The slider moves the car; the boom follows and the link carries the car.
  await slider.evaluate((input) => {
    input.value = '60';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const moved = await link(page, ['tv=60']);
  await page.waitForTimeout(800);
  const starboard = await boomZ(page);
  check('the slider at 60 puts tv=60 in the link', moved.includes('tv=60'), moved);
  check(
    'the slider at 60: the boom swings out to starboard',
    starboard !== null && starboard > 0,
    `boom z ${starboard}`,
  );

  // Closing the picture takes pic and tv out of the link and brings the mainsheet back.
  await page.getByTestId('picture-close').tap();
  const closed = await link(page, [], ['pic=', 'tv=']);
  await page.waitForTimeout(800);
  check(
    'Close picture takes pic and tv out of the link',
    !closed.includes('pic=') && !closed.includes('tv='),
    closed,
  );
  check(
    'after closing the German mainsheet is drawn again and the traveller is gone',
    (await visible(page, 'rope_mainsheet')) &&
      (await visible(page, 'fit_mainsheet_deck_blocks')) &&
      !(await visible(page, 'part_traveller_car')),
    'wrong visibility',
  );
  await context.close();

  // Learn: the traveller's entry has no "Where is it?" and its Show it working opens the picture.
  {
    const { context: learn, page: learnPage } = await openPage(
      phone,
      'm110 learn',
      '?m=learn&learn=part_traveller_track&debug=1',
      { testClock: true },
    );
    await learnPage.waitForTimeout(800);
    check(
      'part_traveller_track: no "Where is it?" button (the part is only in the picture)',
      (await learnPage.getByTestId('learn-show-on-boat').count()) === 0,
      `count ${await learnPage.getByTestId('learn-show-on-boat').count()}`,
    );
    await learnPage.getByTestId('learn-show-me').tap();
    const shown = await link(learnPage, ['pic=traveller']);
    await learnPage.waitForTimeout(2000);
    check(
      'part_traveller_track: Show it working puts pic=traveller and tv=-60 in the link',
      shown.includes('pic=traveller') && shown.includes('tv=-60'),
      shown,
    );
    check(
      'part_traveller_track: the car is drawn',
      await visible(learnPage, 'part_traveller_car'),
      'not visible',
    );
    await learn.close();
  }
}
