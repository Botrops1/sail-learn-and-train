// M104 (Distant land on the horizon): scenes and live checks for scripts/shots.mjs
// (PHASE_HORIZON_SPEC 1.10). Joins the m18 group (the sky's). The outline, the compass frame and
// the colours are unit tests (tests/horizonLand.test.ts); here only what needs the real 3D view.
import path from 'node:path';
import { setSheet } from './ui.mjs';

const BASE = '?wd=0&ws=12&ms=40&js=100&tb=0&clock=0&sea=flat';

/** Screenshots at every size: the land from the side, at sunset and at night. */
export const M104_SCENES = [
  { name: 'land-north', query: `${BASE}&cam=side-starboard&hdg=90` },
  { name: 'land-south', query: `${BASE}&cam=side-port&hdg=90` },
  {
    name: 'land-sunset',
    query:
      '?wd=90&ws=12&ms=40&js=100&tb=0&clock=0&sea=flat&cam=side-starboard&hdg=30&clk=202606012020',
  },
  { name: 'land-night', query: `${BASE}&cam=side-starboard&hdg=90&clk=202606012300` },
].map((scene) => ({ ...scene, waitMs: 2500, sheet: 'peek' }));

/** Mean luminance (0 … 1) of the 9 × 9 px block round a canvas point (CSS px). */
async function blockLuminance(page, x, y) {
  const canvas = await page.locator('canvas.scene-canvas').boundingBox();
  const png = await page.screenshot({
    clip: { x: canvas.x + x - 4, y: canvas.y + y - 4, width: 9, height: 9 },
  });
  const url = `data:image/png;base64,${png.toString('base64')}`;
  return page.evaluate(async (src) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    const c = document.createElement('canvas');
    c.width = image.width;
    c.height = image.height;
    const context = c.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, c.width, c.height).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    }
    return sum / (data.length / 4);
  }, url);
}

export async function liveM104Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M104 ${what}: ${detail}`);
    console.log(`live M104 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const query = (heading, night) =>
    `?wd=0&ws=0&held=1&tb=0&clock=0&mm=0&sea=flat&detail=low&debug=1&cam=helm&mf=0&jf=0&hdg=${heading}${night ? '&clk=202606012300' : ''}`;

  /** Opens the page, peeks the sheet, hides the overlays and looks level from just ahead of the bow. */
  const open = async (label, heading, night) => {
    const { context, page } = await openPage(phone, label, query(heading, night));
    await page.waitForTimeout(1500);
    await setSheet(page, 'peek');
    await page.addStyleTag({
      content:
        '.view > :not(canvas.scene-canvas), [data-testid="sheet"] { visibility: hidden !important; }',
    });
    await page.evaluate(() => window.__sailDebug.setView([10, 3, 0], [25, 3, 0], 40));
    await page.waitForTimeout(800);
    return { context, page };
  };
  const probe = (page, bearing, elevation) =>
    page.evaluate(([b, e]) => window.__sailDebug.horizonLandProbe(b, e), [bearing, elevation]);
  const luminanceAt = async (page, bearing, elevation) => {
    const p = await probe(page, bearing, elevation);
    return blockLuminance(page, p.x, p.y);
  };

  // 1. Noon, heading 15: the land is where the data says.
  let landNoon;
  {
    const { context, page } = await open('m104 land noon', 15, false);
    const state = await page.evaluate(() => window.__sailDebug.horizonLandState());
    check(
      'the land follows the camera on the sea, turned to the heading',
      Math.abs(state.position[0] - state.cameraPosition[0]) < 0.01 &&
        Math.abs(state.position[2] - state.cameraPosition[2]) < 0.01 &&
        state.position[1] === 0 &&
        Math.abs(state.rotationYDeg - 15) < 0.01 &&
        state.vertices.far === 722 &&
        state.vertices.near === 722,
      JSON.stringify(state),
    );
    const expected = [
      [15, 0.6, true, 'near'],
      [15, 3, true, 'far'],
      [15, 7, true, null],
      [125, 1.5, true, 'far'],
      [180, 0.6, true, 'near'],
      [228, 0.5, true, null],
      [228, 3, true, null],
    ];
    for (const [bearing, elevation, , hit] of expected) {
      const p = await probe(page, bearing, elevation);
      check(
        `probe ${bearing}° at ${elevation}°`,
        p.hit === hit && (bearing !== 15 || elevation === 7 || p.inside),
        `hit ${p.hit}, inside ${p.inside}, expected ${hit}`,
      );
    }
    landNoon = await luminanceAt(page, 15, 3);
    await shot(page, 'live-phone-land-noon');
    await context.close();
  }

  // 2. Noon, heading 228: open sea ahead, so the same block is sky and is paler than the land.
  {
    const { context, page } = await open('m104 gap noon', 228, false);
    const p = await probe(page, 228, 3);
    const skyNoon = await luminanceAt(page, 228, 3);
    check(
      'open sea at 228°: sky, paler than the land',
      p.inside && p.hit === null && landNoon < 0.95 * skyNoon,
      `inside ${p.inside}, hit ${p.hit}, land ${landNoon.toFixed(3)}, sky ${skyNoon.toFixed(3)}`,
    );
    await shot(page, 'live-phone-gap-noon');
    await context.close();
  }

  // 3. Night: the land is a dark shape against the sky.
  let landNight;
  {
    const { context, page } = await open('m104 land night', 15, true);
    landNight = await luminanceAt(page, 15, 3);
    await shot(page, 'live-phone-land-night');
    await context.close();
  }
  {
    const { context, page } = await open('m104 gap night', 228, true);
    const skyNight = await luminanceAt(page, 228, 3);
    check(
      'at night the land is darker than the sky',
      landNight < 0.9 * skyNight,
      `land ${landNight.toFixed(3)}, sky ${skyNight.toFixed(3)}`,
    );
    await shot(page, 'live-phone-gap-night');
    await context.close();
  }

  // 4. Learn: the entry has Show it working and no Where is it?
  {
    const { context, page } = await openPage(
      phone,
      'm104 learn',
      '?m=learn&learn=env_distant_land&sea=flat',
    );
    await page.waitForTimeout(800);
    const name = await page.getByText('Distant land', { exact: true }).first().isVisible();
    const showMe = await page.getByTestId('learn-show-me').count();
    const showOnBoat = await page.getByTestId('learn-show-on-boat').count();
    check(
      'the Learn entry: name, Show it working, no Where is it?',
      name && showMe > 0 && showOnBoat === 0,
      `name ${name}, show-me ${showMe}, show-on-boat ${showOnBoat}`,
    );
    await shot(page, 'live-phone-land-learn');
    await context.close();
  }
}
