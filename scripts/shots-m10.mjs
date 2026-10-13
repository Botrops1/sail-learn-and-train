// M10 (wind modes): scenes and live checks for scripts/shots.mjs.
// The Wind tab's mode buttons, size slider and time speed-up, the thin "wind now" arrow on the
// dial, the GUST and ×16 badges, and a building and a dying wind. Their labels contain "m10" so
// the script opens them Sailing (older scenes are held still).
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';

/** Screenshots at every size. The script waits `waitMs` before each. */
export const M10_SCENES = [
  {
    name: 'wind-tab-gusty',
    query: '?wd=90&ws=12&ms=40&js=100&wm=gusty&seed=7&cam=side-port',
    tab: 'Wind',
    centre: '[data-testid="wind-modes"]',
    waitMs: 3000,
  },
  {
    name: 'wind-tab-shifty-dial',
    query: '?wd=90&ws=12&ms=40&js=100&wm=shifty&wg=30&seed=7&tx=16&ap=wind&cam=side-port',
    tab: 'Wind',
    centre: '[data-testid="wind-dial"]',
    waitMs: 2500,
  },
  { name: 'time-bar', query: '?wd=60&ws=12&ms=20&js=25&tx=4&cam=side-port', waitMs: 2500 },
  {
    name: 'time-bar-folded',
    query: '?wd=60&ws=12&ms=20&js=25&tx=4&cam=side-port',
    click: ['time-fold'],
    waitMs: 2500,
  },
  { name: 'time-bar-slow', query: '?wd=60&ws=12&ms=20&js=25&tx=0.25&cam=top', waitMs: 2500 },
  { name: 'time-bar-map', query: '?wd=60&ws=12&ms=20&js=25&tx=2&cam=map&debug=1', waitMs: 3000 },
  { name: 'time-bar-held', query: '?wd=60&ws=12&held=1&cam=side-port', waitMs: 1500 },
  {
    name: 'building-x16',
    query: '?wd=60&ws=10&ms=20&js=25&wm=build&wg=12&tx=16&cam=bow',
    waitMs: 20_000,
  },
  {
    name: 'dying-x16',
    query: '?wd=60&ws=14&ms=20&js=25&wm=die&wg=10&tx=16&cam=side-port',
    waitMs: 36_000,
  },
];

const text = async (page, id) => (await page.getByTestId(id).textContent()) ?? '';

export async function liveM10Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M10 ${what}: ${detail}`);
    console.log(`live M10 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  /** The link; the address bar follows the state at most every 300 ms, so wait a little for it. */
  const search = async (page, pattern) => {
    let current = await page.evaluate(() => window.location.search);
    for (let i = 0; pattern && !pattern.test(current) && i < 30; i += 1) {
      await page.waitForTimeout(100);
      current = await page.evaluate(() => window.location.search);
    }
    return current;
  };
  /** "True 90° S · 12 kn" → 12. */
  const trueKn = async (page) => Number(/· (\d+) kn/.exec(await text(page, 'strip-true'))?.[1]);

  // Gusts: sped up, the GUST badge shows and goes again; speed and heel rise in the gust.
  {
    const { context, page } = await openPage(
      phone,
      'm10 gust',
      '?wd=90&ws=12&ms=40&js=100&wm=gusty&seed=7&wg=60&tx=16&cam=side-port',
    );
    let seen = false;
    for (let i = 0; i < 400 && !seen; i += 1) {
      await page.waitForTimeout(100);
      seen = await page.getByTestId('strip-gust').isVisible();
    }
    check('GUST badge shows (×16)', seen, String(seen));
    if (seen) await shot(page, 'live-phone-gust');
    check(
      '×16 badge shows',
      (await text(page, 'strip-time')) === '×16',
      await text(page, 'strip-time'),
    );
    let gone = false;
    for (let i = 0; i < 400 && !gone; i += 1) {
      await page.waitForTimeout(100);
      gone = !(await page.getByTestId('strip-gust').isVisible());
    }
    check('GUST badge goes again', gone, String(gone));
    await context.close();
  }

  // Building: sped up, the wind rises from 10 to 22 kn.
  {
    const { context, page } = await openPage(
      phone,
      'm10 building',
      '?wd=60&ws=10&ms=20&js=25&wm=build&wg=12&tx=16&cam=bow',
    );
    const start = await trueKn(page);
    check('building: starts at 10 kn', start >= 10 && start <= 11, String(start));
    let end = start;
    for (let i = 0; i < 100 && end < 22; i += 1) {
      await page.waitForTimeout(500);
      end = await trueKn(page);
    }
    check('building: rises to 22 kn within 50 s', end === 22, String(end));
    check('building: no GUST badge', !(await page.getByTestId('strip-gust').isVisible()), 'hidden');
    await shot(page, 'live-phone-building');
    await context.close();
  }

  // Dying: the wind falls to 4 kn.
  {
    const { context, page } = await openPage(
      phone,
      'm10 dying',
      '?wd=60&ws=14&ms=20&js=25&wm=die&wg=10&tx=16&cam=side-port',
    );
    let end = await trueKn(page);
    for (let i = 0; i < 100 && end > 4; i += 1) {
      await page.waitForTimeout(500);
      end = await trueKn(page);
    }
    check('dying: falls to 4 kn within 50 s', end === 4, String(end));
    await context.close();
  }

  // The Wind tab: five modes, size slider, New pattern, ×1 / ×4 / ×16, thin arrow, link.
  {
    const { context, page } = await openPage(
      phone,
      'm10 wind tab',
      '?wd=90&ws=12&ms=40&js=100&cam=side-port',
    );
    await page.getByRole('tab', { name: 'Wind' }).click();
    check(
      'steady: no size slider',
      !(await page.getByTestId('wind-size-field').isVisible()),
      'hidden',
    );
    check(
      'steady: no thin arrow text',
      !(await page.getByTestId('wind-now').isVisible()),
      'hidden',
    );
    await page.getByTestId('wind-modes').scrollIntoViewIfNeeded();
    await page.getByText('Gusty', { exact: true }).click();
    check(
      'gusty: size slider shows',
      await page.getByTestId('wind-size-field').isVisible(),
      'visible',
    );
    check(
      'gusty: "Gust strength 30 %"',
      (await page.locator('label[for="wind-size"]').textContent()) === 'Gust strength 30 %',
      (await page.locator('label[for="wind-size"]').textContent()) ?? '',
    );
    check(
      'gusty: thin arrow text shows',
      await page.getByTestId('wind-now').isVisible(),
      'visible',
    );
    await page.waitForTimeout(500);
    check(
      'link has wm=gusty',
      (await search(page, /wm=gusty/)).includes('wm=gusty'),
      await search(page),
    );
    await page.getByTestId('wind-size').evaluate((input) => {
      input.value = '45';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(500);
    check('link has wg=45', (await search(page, /wg=45/)).includes('wg=45'), await search(page));
    await page.getByTestId('wind-new-pattern').click();
    await page.waitForTimeout(500);
    check(
      'New pattern writes a seed',
      /seed=\d+/.test(await search(page, /seed=\d+/)),
      await search(page),
    );
    await page.getByText('Shifty', { exact: true }).click();
    check(
      'shifty: "Shift size 15°"',
      (await page.locator('label[for="wind-size"]').textContent()) === 'Shift size 15°',
      (await page.locator('label[for="wind-size"]').textContent()) ?? '',
    );
    await page.getByText('Building', { exact: true }).click();
    check(
      'building: "Change 10 kn over 10 min"',
      (await page.locator('label[for="wind-size"]').textContent()) === 'Change 10 kn over 10 min',
      (await page.locator('label[for="wind-size"]').textContent()) ?? '',
    );
    await shot(page, 'live-phone-wind-tab-building');
    problems.push(...(await auditPage(page, 'm10 wind tab')));
    check(
      'the Wind tab no longer has time buttons',
      (await page.getByTestId('time-scale').count()) === 0,
      'none',
    );
    await page.getByText('Steady', { exact: true }).click();
    await page.waitForTimeout(500);
    check(
      'steady leaves the link clean',
      !/wm=|seed=|wg=|tx=/.test(await search(page, /^(?!.*(wm=|seed=|wg=|tx=))/)),
      await search(page),
    );
    await context.close();
  }

  // The time bar (issue #25).
  {
    const { context, page } = await openPage(
      phone,
      'm10 time bar',
      '?wd=60&ws=12&ms=20&js=25&cam=side-port',
    );
    const status = () => text(page, 'time-status');
    const visible = (id) => page.getByTestId(id).isVisible();
    await page.waitForTimeout(800);
    check(
      'time bar: Time ×1 and the buttons show',
      (await status()) === '×1' && (await visible('time-fastest')),
      await status(),
    );
    // It fits the view and does not cover the strip.
    const boxes = await page.evaluate(() => {
      const box = (id) => document.querySelector(`[data-testid="${id}"]`)?.getBoundingClientRect();
      const view = document.querySelector('.view').getBoundingClientRect();
      const bar = box('time-bar');
      const strip = box('instrument-strip');
      return {
        inside: bar.left >= view.left && bar.right <= view.right,
        overlap: !(
          bar.bottom <= strip.top ||
          bar.top >= strip.bottom ||
          bar.right <= strip.left ||
          bar.left >= strip.right
        ),
        barHeight: Math.round(bar.height),
      };
    });
    check('time bar: inside the view', boxes.inside, JSON.stringify(boxes));
    check('time bar: does not cover the instrument strip', !boxes.overlap, JSON.stringify(boxes));
    check('time bar: at least 44 px high', boxes.barHeight >= 44, JSON.stringify(boxes));
    await page.getByTestId('time-faster').click();
    await page.getByTestId('time-faster').click();
    check('time bar: › twice gives ×4', (await status()) === '×4', await status());
    await page.waitForTimeout(500);
    check(
      'time bar: link has tx=4',
      (await search(page, /tx=4/)).includes('tx=4'),
      await search(page),
    );
    check(
      'time bar: ×4 badge in the strip',
      (await text(page, 'strip-time')) === '×4',
      await text(page, 'strip-time'),
    );
    await shot(page, 'live-phone-time-bar-x4');
    await page.getByTestId('time-slowest').click();
    check('time bar: « gives ×¼', (await status()) === '×¼', await status());
    check(
      'time bar: ‹ is disabled at ×¼',
      await page.getByTestId('time-slower').isDisabled(),
      'disabled',
    );
    await shot(page, 'live-phone-time-bar-slow');
    await page.getByTestId('time-status').click();
    check('time bar: a tap on the status gives ×1', (await status()) === '×1', await status());
    await page.getByTestId('time-fastest').click();
    check('time bar: » gives ×16', (await status()) === '×16', await status());
    check(
      'time bar: › is disabled at ×16',
      await page.getByTestId('time-faster').isDisabled(),
      'disabled',
    );
    await page.getByTestId('time-status').click();
    // Pause as in Phase 1.
    await page.getByTestId('pause-button').click();
    check(
      'time bar: Pause says Resume',
      (await text(page, 'pause-button')) === 'Resume',
      await text(page, 'pause-button'),
    );
    await shot(page, 'live-phone-time-bar-paused');
    await page.getByTestId('pause-button').click();
    // Fold: only "Time" and Pause stay; the fold is remembered on this device.
    await page.getByTestId('time-fold').click();
    check(
      'time bar folded: the buttons are gone',
      !(await visible('time-fastest')) && !(await visible('time-status')),
      'hidden',
    );
    check('time bar folded: Pause stays', await visible('pause-button'), 'visible');
    await shot(page, 'live-phone-time-bar-folded');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    check(
      'time bar folded: remembered after a reload',
      !(await visible('time-fastest')) && (await visible('time-fold')),
      'folded',
    );
    await page.getByTestId('time-fold').click();
    check('time bar: the word Time opens it again', await visible('time-fastest'), 'open');
    problems.push(...(await auditPage(page, 'm10 time bar')));
    await context.close();
  }

  // The bar has nothing to do while held still with a steady wind: a "Held still" chip, no Pause
  // (issue #34); a tap on the chip explains where to change it.
  {
    const { context, page } = await openPage(
      phone,
      'm10 time bar held',
      '?wd=60&ws=12&held=1&tx=4',
    );
    await page.waitForTimeout(500);
    check(
      'held, steady: the "Held still" chip shows, no Pause, no time bar',
      (await text(page, 'held-chip')) === 'Held still' &&
        !(await page.getByTestId('pause-button').isVisible()) &&
        !(await page.getByTestId('time-fold').isVisible()) &&
        !(await page.getByTestId('time-fastest').isVisible()),
      'chip only',
    );
    check(
      'held, steady: no badge (the scale is 1)',
      !(await page.getByTestId('strip-time').isVisible()),
      'hidden',
    );
    check(
      'held, steady: the note is closed at first',
      !(await page.getByTestId('held-note').isVisible()),
      'hidden',
    );
    await page.getByTestId('held-chip').click();
    const note = (await page.getByTestId('held-note').textContent()) ?? '';
    check(
      'held chip: a tap opens the note that names the Wind tab',
      (await page.getByTestId('held-note').isVisible()) && /Wind tab/.test(note),
      note,
    );
    const noteBox = await page.evaluate(() => {
      const box = document.querySelector('[data-testid="held-note"]').getBoundingClientRect();
      return { left: box.left, right: box.right, width: window.innerWidth };
    });
    check(
      'held chip: the note fits the screen',
      noteBox.left >= 0 && noteBox.right <= noteBox.width,
      JSON.stringify(noteBox),
    );
    await shot(page, 'live-phone-held-chip-note');
    await page.getByTestId('held-chip').click();
    check(
      'held chip: a second tap closes the note',
      !(await page.getByTestId('held-note').isVisible()),
      'hidden',
    );
    // Switching to Sailing brings Pause back.
    await page.getByRole('tab', { name: 'Wind' }).click();
    await page.getByTestId('boat-mode').getByText('Sailing', { exact: true }).click();
    await page.waitForTimeout(300);
    check(
      'held chip: Sailing brings Pause back',
      (await page.getByTestId('pause-button').isVisible()) &&
        !(await page.getByTestId('held-chip').isVisible()),
      'Pause',
    );
    await context.close();
  }

  // Held still in Realistic mode keeps Pause (winching takes time).
  {
    const { context, page } = await openPage(
      phone,
      'm10 time bar held realistic',
      '?mode=realistic&wd=60&ws=12&held=1',
    );
    await page.waitForTimeout(500);
    check(
      'held, Realistic: Pause stays, no chip',
      (await page.getByTestId('pause-button').isVisible()) &&
        !(await page.getByTestId('held-chip').isVisible()),
      'Pause',
    );
    await context.close();
  }

  // The wind speed slider follows a wind mode (issue #33).
  {
    const { context, page } = await openPage(
      phone,
      'm10 wind slider follows',
      '?wd=60&ws=8&held=1&wm=build&tx=16',
    );
    await page.getByRole('tab', { name: 'Wind' }).click();
    await page.waitForTimeout(12000);
    const read = await page.evaluate(() => ({
      slider: Number(document.querySelector('#wind-speed').value),
      now: document.querySelector('[data-testid="wind-now"]').textContent,
      label: document.querySelector('label[for="wind-speed"]').parentElement.textContent,
    }));
    const nowKn = Number(/Wind now: (\d+) kn/.exec(read.now)?.[1]);
    check('building: the slider is above the starting 8 kn', read.slider > 8, JSON.stringify(read));
    check(
      'building: the slider matches "Wind now" under the compass (±1 kn)',
      Math.abs(read.slider - nowKn) <= 1 && read.label.includes(`${read.slider} kn`),
      JSON.stringify(read),
    );
    check(
      'building: the slider explains itself',
      await page.getByTestId('wind-speed-hint').isVisible(),
      'visible',
    );
    await shot(page, 'live-phone-wind-slider-building');
    await page.getByText('Steady', { exact: true }).click();
    await page.waitForTimeout(300);
    check(
      'steady: the slider shows the set 8 kn, no explanation',
      (await page.locator('#wind-speed').inputValue()) === '8' &&
        !(await page.getByTestId('wind-speed-hint').isVisible()),
      await page.locator('#wind-speed').inputValue(),
    );
    await context.close();
  }

  // The View tab switch and tb=0.
  {
    const { context, page } = await openPage(phone, 'm10 time bar off', '?wd=60&ws=12&tb=0&tx=4');
    await page.waitForTimeout(500);
    check(
      'tb=0: only Pause shows',
      (await page.getByTestId('pause-button').isVisible()) &&
        !(await page.getByTestId('time-fastest').isVisible()),
      'only Pause',
    );
    await page.getByRole('tab', { name: 'View' }).click();
    await page.locator('#time-bar-toggle').check();
    await page.waitForTimeout(500);
    check(
      'View tab: the switch brings the bar back',
      await page.getByTestId('time-fastest').isVisible(),
      'visible',
    );
    check(
      'View tab: tb=0 leaves the link',
      !(await search(page, /^(?!.*tb=0)/)).includes('tb=0'),
      await search(page),
    );
    await page.locator('#time-bar-toggle').uncheck();
    await page.waitForTimeout(500);
    check(
      'View tab: the switch off writes tb=0',
      (await search(page, /tb=0/)).includes('tb=0'),
      await search(page),
    );
    await context.close();
  }

  // Held still with a changing wind: the speed part shows again.
  {
    const { context, page } = await openPage(
      phone,
      'm10 time bar held wind',
      '?wd=60&ws=12&held=1&wm=gusty',
    );
    await page.waitForTimeout(500);
    check(
      'held, gusty: the speed part shows',
      await page.getByTestId('time-fastest').isVisible(),
      'visible',
    );
    await context.close();
  }

  // Held still: a wind mode still works (the sails answer), the badge shows.
  {
    const { context, page } = await openPage(
      phone,
      'm10 held',
      '?wd=60&ws=10&ms=20&js=25&wm=build&wg=12&tx=16&held=1',
    );
    let end = await trueKn(page);
    for (let i = 0; i < 100 && end < 22; i += 1) {
      await page.waitForTimeout(500);
      end = await trueKn(page);
    }
    check('held still: the wind builds too', end === 22, String(end));
    await context.close();
  }
}
