// M33 (fenders and the Harbour gear block): scenes and live checks for scripts/shots.mjs
// (PHASE6_SPEC 9.8). Labels contain "m33", which matches none of openPage's label tests, so every
// page opens Held still on flat water with the clock chip and the mini-map hidden.
import path from 'node:path';
import { setSheet, showSection, waitForLink } from './ui.mjs';

export const M33_SCENES = [
  {
    name: 'fenders-out',
    query: '?wd=0&ws=0&cam=side-port&sel=fit_fender&held=1&sea=flat&fd=1',
    waitMs: 1000,
  },
  // The Harbour gear block in Russian, folded open: nothing is cut off.
  { name: 'harbour-ru', query: '?lang=ru&wd=60&ws=12&held=1', section: 'harbour' },
];

/** The ball fender at the port corner of the stern (boat coordinates), PHASE6_SPEC 9.8. */
const BALL_FENDER = {
  name: 'ball-fender',
  position: [-11.0, 1.6, -4.5],
  target: [-8.2, 0.9, -2.3],
  fov: 45,
};

export async function liveM33Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M33 ${what}: ${detail}`);
    console.log(`live M33 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const [phone] = viewports;
  const search = (page) => page.evaluate(() => window.location.search);
  const option = (page, id) => page.locator(`label:has([data-testid="${id}"])`);
  const linkOrError = async (page, has, hasNot = []) => {
    try {
      return { ok: true, text: await waitForLink(page, has, hasNot) };
    } catch (error) {
      return { ok: false, text: String(error.message) };
    }
  };

  // The ball fender from behind and to the port, at both details.
  for (const detail of ['high', 'low']) {
    const { context, page } = await openPage(
      phone,
      `m33 close-up ${detail}`,
      `?wd=0&ws=0&lb=0&debug=1&fd=1&detail=${detail}`,
    );
    await page.waitForTimeout(1000);
    await setSheet(page, 'peek');
    await page.addStyleTag({ content: '.debug { display: none !important; }' });
    await page.evaluate(
      (v) => window.__sailDebug.setView(v.position, v.target, v.fov),
      BALL_FENDER,
    );
    await page.waitForTimeout(1500);
    await shot(page, `live-${BALL_FENDER.name}-${detail}`);
    await context.close();
  }

  // The switch writes fd=1 and removes it again; Held still shows no hint.
  {
    const { context, page } = await openPage(phone, 'm33 switch', '?wd=60&ws=12');
    await showSection(page, 'harbour');
    check(
      'the locker is chosen at first',
      await page.getByTestId('fenders-stowed').isChecked(),
      'fenders-stowed',
    );
    await option(page, 'fenders-out').click();
    const on = await linkOrError(page, ['fd=1']);
    check('Out writes fd=1', on.ok, on.text);
    check(
      'Out is chosen, and no hint in Held still',
      (await page.getByTestId('fenders-out').isChecked()) &&
        (await page.getByTestId('fenders-hint').isHidden()),
      'fenders-out / fenders-hint',
    );
    await shot(page, 'live-harbour-out');
    await option(page, 'fenders-stowed').click();
    const off = await linkOrError(page, [], ['fd=']);
    check('In the locker removes fd', off.ok, off.text);
    await context.close();
  }

  // Sailing with the fenders out: the hint shows; Held still takes it away.
  {
    const { context, page } = await openPage(phone, 'm33 hint', '?wd=60&ws=12&held=0&fd=1');
    await showSection(page, 'harbour');
    const hint = page.getByTestId('fenders-hint');
    const text = ((await hint.isVisible()) && (await hint.innerText())) || '';
    check(
      'the hint shows while Sailing',
      text.trim() === 'Bring the fenders in before you sail.',
      text,
    );
    await shot(page, 'live-harbour-hint');
    await context.close();
  }

  // An old link has no fenders.
  {
    const { context, page } = await openPage(phone, 'm33 old link', '?wd=60&ws=12');
    await showSection(page, 'harbour');
    check(
      'an old link opens with the fenders in the locker',
      (await page.getByTestId('fenders-stowed').isChecked()) &&
        !(await search(page)).includes('fd='),
      await search(page),
    );
    await context.close();
  }

  // Show me puts the fenders out; Back restores the entry and the locker.
  {
    const { context, page } = await openPage(phone, 'm33 show me', '?learn=fit_fender&m=learn');
    await page.waitForTimeout(500);
    const name = await page.getByTestId('learn-name').innerText();
    check('the entry is the Fender', name === 'Fender', name);
    await page.getByTestId('learn-show-me').click();
    const shown = await linkOrError(page, ['fd=1', 'sel=fit_fender']);
    check('Show me writes fd=1', shown.ok, shown.text);
    await page.waitForTimeout(1200);
    await shot(page, 'live-show-me-fender');
    await page.goBack();
    await page.waitForTimeout(600);
    const back = await search(page);
    const after = await page.getByTestId('learn-name').innerText();
    check(
      'Back returns to the entry with the fenders in the locker',
      after === 'Fender' && back.includes('learn=fit_fender') && !back.includes('fd='),
      `${after} ${back}`,
    );
    await context.close();
  }
}
