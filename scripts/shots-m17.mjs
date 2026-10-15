// M17 (Clock and sailing area): scenes and live checks for scripts/shots.mjs (PHASE3_SPEC 9.9).
// Labels contain "m17", so the script opens them Sailing, on Coastal water and with the clock
// chip shown (the older scenes get `clock=0` so the tap sweeps do not open the clock card).
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { openSettings } from './ui.mjs';

/** Screenshots at every size. The script waits `waitMs` before each. */
export const M17_SCENES = [
  { name: 'clock-chip', query: '?wd=90&ws=12&ms=40&js=100', waitMs: 2000 },
  { name: 'clock-card', query: '?wd=90&ws=12&ms=40&js=100', click: ['clock-chip'], waitMs: 1500 },
  {
    name: 'light-low-sun',
    query: '?wd=90&ws=12&ms=40&js=100&clk=202606012010&cam=side-port&detail=low',
    waitMs: 3000,
  },
  {
    name: 'light-night',
    query: '?wd=90&ws=12&ms=40&js=100&clk=202606012300&cam=side-port&detail=low',
    waitMs: 3000,
  },
];

/**
 * The mean luminance (0 … 1) of the 3D canvas, read from a screenshot of it. Only the right-hand
 * third, between the strip and the camera buttons: water and sky, without the DOM overlays that
 * a screenshot of the canvas also contains.
 */
async function canvasLuminance(page) {
  const png = await page.locator('canvas.scene-canvas').screenshot();
  const url = `data:image/png;base64,${png.toString('base64')}`;
  return page.evaluate(async (src) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const x = Math.round(canvas.width * 0.7);
    const y = Math.round(canvas.height * 0.3);
    const { data } = context.getImageData(x, y, canvas.width - x, Math.round(canvas.height * 0.55));
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }
    return sum / (data.length / 4) / 255;
  }, url);
}

export async function liveM17Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M17 ${what}: ${detail}`);
    console.log(`live M17 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const chipText = async (page) => (await page.getByTestId('clock-chip').textContent())?.trim();
  const clkParam = (page) =>
    page.evaluate(() => new URLSearchParams(window.location.search).get('clk'));

  // The default link: noon, and the card with the date, sunrise, sunset and the light.
  {
    const { context, page } = await openPage(phone, 'm17 clock', '?wd=90&ws=12&ms=40&js=100');
    await page.waitForTimeout(1000);
    const chip = await chipText(page);
    check('the chip reads 12:00', chip === '12:00', JSON.stringify(chip));
    await page.getByTestId('clock-chip').click();
    const card = page.getByTestId('clock-card');
    const date = await page.getByTestId('clock-date').textContent();
    check('the card shows the date', date === 'Monday 1 June 2026 · 12:00', JSON.stringify(date));
    const sun = await page.getByTestId('clock-sun').textContent();
    check('sunrise and sunset', sun === 'Sunrise 05:16 · Sunset 20:28', JSON.stringify(sun));
    const text = (await card.textContent()) ?? '';
    check('the zone and the light', /CEST \(UTC\+2\)/.test(text) && /Light: Day/.test(text), text);
    // Everything of the card is reachable on a phone: the Set button lies inside the view, the
    // chip shares the strip's row (the top area stays one strip high, review of the M17 PR).
    const fit = await page.evaluate(() => {
      const view = document.querySelector('.view').getBoundingClientRect();
      const card = document.querySelector('[data-testid="clock-card"]').getBoundingClientRect();
      const set = document.querySelector('[data-testid="clock-set"]').getBoundingClientRect();
      const chipBox = document.querySelector('[data-testid="clock-chip"]').getBoundingClientRect();
      const strip = document.querySelector('.instrument-strip').getBoundingClientRect();
      return {
        setInside:
          set.bottom <= card.bottom + 1 && set.top >= card.top && set.bottom <= view.bottom + 1,
        chipOnStripRow: chipBox.top < strip.bottom && chipBox.left >= strip.right - 1,
      };
    });
    check('the Set button lies inside the view', fit.setInside, JSON.stringify(fit));
    check('the chip shares the strip row', fit.chipOnStripRow, JSON.stringify(fit));
    await shot(page, 'live-phone-clock-card');
    problems.push(...(await auditPage(page, 'm17 clock card')));
    await page.keyboard.press('Escape');
    check('Escape closes the card', !(await card.isVisible()), 'still open');
    await context.close();
  }

  // The sun is drawn: at 20:10 it is low in the west-north-west; sailing towards it (heading 290,
  // looking ahead from the helm) it lies on the canvas just above the horizon, and by night it is
  // not drawn (owner's bug report on the M17 preview: the sun's glint showed but not the sun).
  {
    const { context, page } = await openPage(
      phone,
      'm17 sun disc',
      '?wd=30&ws=12&ms=40&js=100&hdg=290&clk=202606012010&cam=helm&detail=low&debug=1',
    );
    await page.waitForTimeout(1500);
    // Looking ahead from above the stern, 2.5° up: where the sun is at 20:10.
    await page.evaluate(() => window.__sailDebug.setView([-6, 3, 0], [94, 7.4, 0], 50));
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      const overlay = document.querySelector('[data-testid="debug-overlay"]');
      if (overlay) overlay.style.display = 'none';
    });
    const spot = await page.evaluate(() => window.__sailWater.sunScreen());
    const box = await page.locator('canvas.scene-canvas').boundingBox();
    const inside =
      spot !== null && spot.x >= 0 && spot.x <= box.width && spot.y >= 0 && spot.y <= box.height;
    check('the low sun is drawn on the canvas', inside, JSON.stringify(spot));
    await shot(page, 'live-phone-sun-disc');
    await context.close();
    const night = await openPage(
      phone,
      'm17 sun disc night',
      '?wd=30&ws=12&ms=40&js=100&hdg=290&clk=202606012300&cam=helm&detail=low&debug=1',
    );
    await night.page.waitForTimeout(1500);
    const gone = await night.page.evaluate(() => window.__sailWater.sunScreen());
    check('no sun is drawn at night', gone === null, JSON.stringify(gone));
    await night.context.close();
  }

  // The clock runs with the time bar and stops with Pause.
  {
    const { context, page } = await openPage(
      phone,
      'm17 clock runs',
      '?wd=90&ws=12&ms=40&js=100&tx=16',
    );
    let reached = false;
    let text = '';
    for (let i = 0; i < 120 && !reached; i += 1) {
      text = (await chipText(page)) ?? '';
      reached = text >= '12:04' && text <= '13:00';
      if (!reached) await page.waitForTimeout(500);
    }
    check('×16 reaches 12:04', reached, JSON.stringify(text));
    await page.getByTestId('pause-button').click();
    await page.waitForTimeout(300);
    const paused = await chipText(page);
    await page.waitForTimeout(3000);
    const later = await chipText(page);
    check('Pause stops the clock', paused === later, `${paused} → ${later}`);
    await context.close();
  }

  // Set a time, Now, the default button, and the link.
  {
    const { context, page } = await openPage(phone, 'm17 clock set', '?wd=90&ws=12&ms=40&js=100');
    await page.waitForTimeout(800);
    await page.getByTestId('clock-chip').click();
    await page.getByTestId('clock-date-input').fill('2026-12-21');
    await page.getByTestId('clock-time-input').fill('12:00');
    await page.getByTestId('clock-set').click();
    await page.waitForTimeout(600);
    const sun = await page.getByTestId('clock-sun').textContent();
    check('21 December sunrise and sunset', sun === 'Sunrise 07:24 · Sunset 16:21', sun ?? '');
    check(
      'the link has clk',
      (await clkParam(page)) === '202612211200',
      String(await clkParam(page)),
    );
    await shot(page, 'live-phone-clock-december');
    await page.getByTestId('clock-now').click();
    await page.waitForTimeout(600);
    const now = await clkParam(page);
    check(
      'Now gives a valid time',
      /^\d{12}$/.test(now ?? '') && now !== '202612211200',
      String(now),
    );
    await page.getByTestId('clock-default').click();
    await page.waitForTimeout(600);
    const noon = await page.getByTestId('clock-date').textContent();
    check('Noon, 1 June is back', noon === 'Monday 1 June 2026 · 12:00', noon ?? '');
    await context.close();
  }

  // The Clock switch in the settings.
  {
    const { context, page } = await openPage(
      phone,
      'm17 clock switch',
      '?wd=90&ws=12&ms=40&js=100',
    );
    await openSettings(page);
    await page.getByTestId('clock-switch').uncheck();
    await page.waitForTimeout(600);
    check(
      'the chip disappears',
      !(await page.getByTestId('clock-chip').isVisible()),
      'still shown',
    );
    const search = await page.evaluate(() => window.location.search);
    check('the link has clock=0', /[?&]clock=0(&|$)/.test(search), search);
    await page.getByTestId('clock-switch').check();
    await page.waitForTimeout(300);
    check('the chip comes back', await page.getByTestId('clock-chip').isVisible(), 'hidden');
    await context.close();
  }

  // Night is darker than noon.
  {
    const base = '?wd=90&ws=12&ms=40&js=100&detail=low&cam=side-port';
    const day = await openPage(phone, 'm17 noon light', base);
    await day.page.waitForTimeout(2500);
    const noon = await canvasLuminance(day.page);
    await day.context.close();
    const night = await openPage(phone, 'm17 night light', `${base}&clk=202606012300`);
    await night.page.waitForTimeout(2500);
    const dark = await canvasLuminance(night.page);
    await night.context.close();
    check(
      'night is darker than noon',
      dark < 0.5 * noon,
      `noon ${noon.toFixed(3)}, night ${dark.toFixed(3)}`,
    );
  }
}
