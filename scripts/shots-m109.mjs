// M109 (Spinnaker and code 0 pictures, PHASE_RIGGING_SPEC 11.8): scenes and live checks for
// scripts/shots.mjs. Joins the m101 group, on the test clock, on the phone, in English. The pole's
// angle, the corners and the link are unit tests (tests/pictures.test.ts, tests/physicsTruthsRigging.test.ts);
// here only the real page: Show it working shows the picture, the card does not cover the sail,
// and Close picture takes it away.
import { waitForLink } from './ui.mjs';

/** Screenshots at every size: the two pictures, as the show-me links open them. */
export const M109_SCENES = [
  {
    name: 'spinnaker',
    query: '?pic=spinnaker&wd=150&ws=12&ms=100&jf=0&held=1&sea=flat&cam=side-starboard',
  },
  {
    name: 'code0',
    query: '?pic=code0&wd=70&ws=10&ms=40&jf=0&held=1&sea=flat&cam=side-port',
  },
].map((scene) => ({ ...scene, waitMs: 2500, sheet: 'peek' }));

export async function liveM109Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M109 ${what}: ${detail}`);
    console.log(`live M109 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const visible = (page, id) => page.evaluate((part) => window.__sailDebug.partVisible(part), id);
  const link = async (page, has, hasNot = []) => {
    try {
      return await waitForLink(page, has, hasNot);
    } catch {
      return page.evaluate(() => window.location.search + window.location.hash);
    }
  };

  for (const [entry, pic, sail, others] of [
    [
      'sail_spinnaker',
      'spinnaker',
      'sail_spinnaker',
      ['part_spinnaker_pole', 'rope_spinnaker_guy'],
    ],
    [
      'sail_code_zero',
      'code0',
      'sail_code_zero',
      ['part_code_zero_furler', 'rope_code_zero_sheet'],
    ],
  ]) {
    const { context, page } = await openPage(
      phone,
      `m109 ${pic}`,
      `?m=learn&learn=${entry}&debug=1`,
      { testClock: true },
    );
    await page.waitForTimeout(800);
    check(
      `${entry}: no "Where is it?" button (the part is only in the picture)`,
      (await page.getByTestId('learn-show-on-boat').count()) === 0,
      `count ${await page.getByTestId('learn-show-on-boat').count()}`,
    );
    check(
      `${entry}: before Show it working no picture and no banner`,
      !(await visible(page, sail)) && !(await page.getByTestId('picture-banner').isVisible()),
      'a picture shows already',
    );
    await page.getByTestId('learn-show-me').tap();
    const shown = await link(page, [`pic=${pic}`]);
    await page.waitForTimeout(2500);
    check(
      `${entry}: Show it working puts pic=${pic} in the link`,
      shown.includes(`pic=${pic}`),
      shown,
    );
    const banner = page.getByTestId('picture-banner');
    check(`${entry}: the banner is visible`, await banner.isVisible(), 'hidden');
    check(
      `${entry}: the sail and its parts are drawn`,
      (await visible(page, sail)) &&
        (await visible(page, others[0])) &&
        (await visible(page, others[1])),
      'a part is not visible',
    );
    check(
      `${entry}: the gennaker's sock is hidden`,
      !(await visible(page, 'part_gennaker_sock')),
      'visible',
    );
    // The card must not cover the sail: the sail's middle point is outside the banner's box.
    const point = await page.evaluate((id) => window.__sailDebug.partPoint(id, 0.5), sail);
    const canvas = await page.locator('canvas').first().boundingBox();
    const box = await banner.boundingBox();
    const inside =
      point !== null &&
      canvas !== null &&
      box !== null &&
      canvas.x + point.x >= box.x &&
      canvas.x + point.x <= box.x + box.width &&
      canvas.y + point.y >= box.y &&
      canvas.y + point.y <= box.y + box.height;
    check(
      `${entry}: the banner does not cover the sail`,
      point !== null && !inside,
      `sail point ${JSON.stringify(point)}, banner ${JSON.stringify(box)}`,
    );
    const closeBox = await page.getByTestId('picture-close').boundingBox();
    check(
      `${entry}: Close picture is at least 44 px tall`,
      (closeBox?.height ?? 0) >= 44,
      `height ${closeBox?.height}`,
    );
    await page.screenshot({ path: `${outDir}/${prefix}m109-phone-${pic}-live.png` });
    await page.getByTestId('picture-close').tap();
    const closed = await link(page, [], ['pic=']);
    await page.waitForTimeout(500);
    check(`${entry}: Close picture takes pic out of the link`, !closed.includes('pic='), closed);
    check(
      `${entry}: after closing the banner is hidden and the picture is gone`,
      !(await banner.isVisible()) && !(await visible(page, sail)),
      'still showing',
    );
    await context.close();
  }

  // The guy's entry shows the same picture as the spinnaker's.
  {
    const { context, page } = await openPage(
      phone,
      'm109 guy',
      '?m=learn&learn=rope_spinnaker_guy&debug=1',
      { testClock: true },
    );
    await page.waitForTimeout(800);
    await page.getByTestId('learn-show-me').tap();
    const shown = await link(page, ['pic=spinnaker']);
    await page.waitForTimeout(2000);
    check(
      'rope_spinnaker_guy: Show it working shows the spinnaker',
      shown.includes('pic=spinnaker'),
      shown,
    );
    check(
      'rope_spinnaker_guy: the guy is drawn',
      await visible(page, 'rope_spinnaker_guy'),
      'not visible',
    );
    await context.close();
  }

  // A tapped part of the picture opens the part card, and the banner steps aside for it.
  {
    const { context, page } = await openPage(
      phone,
      'm109 part card',
      '?pic=spinnaker&wd=150&ws=12&ms=100&jf=0&held=1&sea=flat&cam=side-starboard&sel=sail_spinnaker&debug=1',
      { testClock: true },
    );
    await page.waitForTimeout(1500);
    check(
      'a selected part of the picture: the part card shows and the banner steps aside',
      (await page.getByTestId('info-card').isVisible()) &&
        !(await page.getByTestId('picture-banner').isVisible()),
      `card ${await page.getByTestId('info-card').isVisible()}, banner ${await page.getByTestId('picture-banner').isVisible()}`,
    );
    await context.close();
  }
}
