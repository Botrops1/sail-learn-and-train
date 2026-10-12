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
  const search = (page) => page.evaluate(() => window.location.search);
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
    check('link has wm=gusty', (await search(page)).includes('wm=gusty'), await search(page));
    await page.getByTestId('wind-size').evaluate((input) => {
      input.value = '45';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(500);
    check('link has wg=45', (await search(page)).includes('wg=45'), await search(page));
    await page.getByTestId('wind-new-pattern').click();
    await page.waitForTimeout(500);
    check('New pattern writes a seed', /seed=\d+/.test(await search(page)), await search(page));
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
    await page.getByText('×4', { exact: true }).click();
    await page.waitForTimeout(500);
    check(
      '×4 badge shows',
      (await text(page, 'strip-time')) === '×4',
      await text(page, 'strip-time'),
    );
    check('link has tx=4', (await search(page)).includes('tx=4'), await search(page));
    await shot(page, 'live-phone-wind-tab-building');
    problems.push(...(await auditPage(page, 'm10 wind tab')));
    await page.getByText('Steady', { exact: true }).click();
    await page.getByText('×1', { exact: true }).click();
    await page.waitForTimeout(500);
    check(
      'steady and ×1 leave the link clean',
      !/wm=|seed=|wg=|tx=/.test(await search(page)),
      await search(page),
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
