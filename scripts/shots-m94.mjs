// M94 (the Adriatic winds, PHASE10_SPEC 24.8): scenes and live checks for scripts/shots.mjs, on the
// test clock (the wind follows the clock, which runs with app time).
import path from 'node:path';
import { showSection } from './ui.mjs';

export const M94_SCENES = [
  {
    name: 'local-summer',
    query: '?wm=summer&clk=202606011400&cam=top',
    section: 'conditions',
    sheet: 'half',
  },
  {
    name: 'local-bura',
    query: '?wm=bura&clk=202606010800&cam=top',
    section: 'conditions',
    sheet: 'half',
  },
];

export async function liveM94Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M94 ${what}: ${detail}`);
    console.log(`live M94 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const text = async (page, id) => (await page.getByTestId(id).textContent()) ?? '';
  /** A wind mode's segment: the radio is hidden inside its label, so tap the label. */
  const pick = (page, mode) =>
    page.locator('label.segment', { has: page.getByTestId(`wind-mode-${mode}`) }).click();
  /** "Wind now: 14 kn from 318°" → 318. */
  const nowBearing = async (page) => Number(/from (\d{3})/.exec(await text(page, 'wind-now'))?.[1]);

  // 1. The maestral at 14:00: choose the Summer day; the dial is locked with a note.
  {
    const { context, page } = await openPage(phone, 'm94 summer', '?clk=202606011400&cam=top', {
      testClock: true,
    });
    await showSection(page, 'conditions');
    await page.getByTestId('wind-modes').scrollIntoViewIfNeeded();
    await pick(page, 'summer');
    await page.waitForTimeout(2000);
    check(
      'summer: checked',
      await page.getByTestId('wind-mode-summer').isChecked(),
      'wind-mode-summer',
    );
    const note = page.getByTestId('wind-locked-note');
    check(
      'summer: the locked note says Summer day',
      (await note.isVisible()) && (await note.textContent())?.includes('Summer day') === true,
      await text(page, 'wind-locked-note'),
    );
    check(
      'summer: the speed slider is disabled',
      await page.getByTestId('wind-speed').isDisabled(),
      'disabled',
    );
    const bearing = await nowBearing(page);
    check(
      'summer: wind now from 315-326°',
      bearing >= 315 && bearing <= 326,
      `${bearing}° (${await text(page, 'wind-now')})`,
    );
    await shot(page, 'live-phone-m94-summer');
    // 3. Back to Steady: the note goes and the slider works again.
    await pick(page, 'steady');
    await page.waitForTimeout(500);
    check('steady: the note is hidden', !(await note.isVisible()), 'hidden');
    check(
      'steady: the speed slider is enabled',
      await page.getByTestId('wind-speed').isEnabled(),
      'enabled',
    );
    await context.close();
  }

  // 2. The burin at 23:30: a light wind from 045-056°.
  {
    const { context, page } = await openPage(phone, 'm94 burin', '?wm=summer&clk=202606012330', {
      testClock: true,
    });
    await showSection(page, 'conditions');
    await page.waitForTimeout(2000);
    const bearing = await nowBearing(page);
    check(
      'burin: wind now from 045-056°',
      bearing >= 45 && bearing <= 56,
      `${bearing}° (${await text(page, 'wind-now')})`,
    );
    await context.close();
  }

  // 4. The bura: the Bura segment is checked, its label names the strength, and the wind rises.
  {
    const { context, page } = await openPage(
      phone,
      'm94 bura',
      '?wm=bura&wg=20&clk=202606011200&cam=top',
      { testClock: true },
    );
    await showSection(page, 'conditions');
    check('bura: checked', await page.getByTestId('wind-mode-bura').isChecked(), 'wind-mode-bura');
    const name = await text(page, 'wind-size-name');
    check('bura: the size label starts "Bura 20 kn"', name.startsWith('Bura 20 kn'), name);
    await page.waitForTimeout(150000);
    const kn = Number(/(\d+) kn/.exec(await text(page, 'strip-true'))?.[1]);
    check('bura: the true wind is at least 10 kn after 150 s', kn >= 10, `${kn} kn`);
    await shot(page, 'live-phone-m94-bura');
    await context.close();
  }
}
