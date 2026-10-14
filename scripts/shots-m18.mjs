// M18 (Sky through the day): scenes and live checks for scripts/shots.mjs (PHASE3_SPEC 10.7).
// Labels contain "m18", so the script opens them Sailing and on Coastal water. The clock chip is
// switched off in the scene queries (`clock=0`) so it does not cover the sky.
import path from 'node:path';

const BASE = '?wd=90&ws=12&ms=40&js=100&tb=0&clock=0';
const TIMES = [
  ['noon', ''],
  ['low-sun', '&clk=202606012005'],
  ['sunset', '&clk=202606012028'],
  ['twilight', '&clk=202606012050'],
  ['night', '&clk=202606012300'],
  ['sunrise', '&clk=202606010530'],
];

/** Screenshots at every size: each time of day from the side and from the helm. */
export const M18_SCENES = TIMES.flatMap(([time, clk]) =>
  [
    ['side', 'side-starboard'],
    ['helm', 'helm'],
  ].map(([short, cam]) => ({
    name: `sky-${time}-${short}`,
    query: `${BASE}${clk}&cam=${cam}`,
    waitMs: 2500,
  })),
);

/**
 * Luminance statistics of a screenshot of the 3D canvas (8-bit sRGB values,
 * (0.2126 R + 0.7152 G + 0.0722 B) / 255, 0 … 1). The DOM overlays that lie on top of the canvas
 * are hidden first, so only the 3D picture is measured. `square` is the mean of the 60 × 60 px
 * square at the centre; `bright` counts the pixels brighter than `mean + 0.3`.
 */
async function canvasStats(page) {
  await page.addStyleTag({
    content: '.view > :not(canvas.scene-canvas) { visibility: hidden !important; }',
  });
  const png = await page.locator('canvas.scene-canvas').screenshot();
  const url = `data:image/png;base64,${png.toString('base64')}`;
  return page.evaluate(async (src) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    const luminance = (data, i) =>
      (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    const all = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let sum = 0;
    for (let i = 0; i < all.length; i += 4) sum += luminance(all, i);
    const mean = sum / (all.length / 4);
    let bright = 0;
    for (let i = 0; i < all.length; i += 4) if (luminance(all, i) > mean + 0.3) bright += 1;
    const half = 30;
    const cx = Math.round(canvas.width / 2);
    const cy = Math.round(canvas.height / 2);
    const middle = context.getImageData(cx - half, cy - half, 2 * half, 2 * half).data;
    let middleSum = 0;
    for (let i = 0; i < middle.length; i += 4) middleSum += luminance(middle, i);
    return { mean, bright, square: middleSum / (middle.length / 4) };
  }, url);
}

export async function liveM18Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M18 ${what}: ${detail}`);
    console.log(`live M18 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });

  // The sky alone, noon against night: much darker, with stars.
  {
    const sky = '?wd=90&ws=0&held=1&tb=0&clock=0&detail=low&debug=1';
    const stats = {};
    for (const [name, clk] of [
      ['noon', ''],
      ['night', '&clk=202606012300'],
    ]) {
      const { context, page } = await openPage(phone, `m18 sky only ${name}`, `${sky}${clk}`);
      await page.waitForTimeout(1500);
      await page.evaluate(() => window.__sailDebug.setView([-40, 2, 0], [-120, 40, 0]));
      await page.waitForTimeout(1000);
      stats[name] = await canvasStats(page);
      await shot(page, `live-phone-sky-only-${name}`);
      await context.close();
    }
    check(
      'the night sky is darker than a quarter of noon',
      stats.night.mean < 0.25 * stats.noon.mean,
      `noon ${stats.noon.mean.toFixed(3)}, night ${stats.night.mean.toFixed(3)}`,
    );
    check(
      'stars: at least 10 pixels brighter than the night mean + 0.3',
      stats.night.bright >= 10,
      `${stats.night.bright} pixels`,
    );
  }

  // The boat is readable at night at both details.
  for (const detail of ['low', 'high']) {
    const { context, page } = await openPage(
      phone,
      `m18 boat at night ${detail}`,
      `?wd=90&ws=12&ms=40&js=100&held=1&tb=0&clock=0&clk=202606012300&cam=side-starboard&detail=${detail}`,
    );
    await page.waitForTimeout(3000);
    const { square } = await canvasStats(page);
    check(`the boat at night, ${detail} detail, is readable`, square > 0.08, square.toFixed(3));
    await shot(page, `live-phone-boat-night-${detail}`);
    await context.close();
  }

  // The sun sets at 20:28: its height is within a degree of the horizon.
  {
    const { context, page } = await openPage(
      phone,
      'm18 sunset',
      '?wd=90&ws=12&ms=40&js=100&clk=202606012028&debug=1',
    );
    await page.waitForTimeout(1500);
    const text = (await page.getByTestId('debug-overlay').textContent()) ?? '';
    const elevation = Number((/elev (-?[\d.]+)/.exec(text) ?? [])[1]);
    check(
      'the sun is at the horizon at 20:28',
      Number.isFinite(elevation) && elevation >= -1 && elevation <= 1,
      String(elevation),
    );
    await context.close();
  }
}
