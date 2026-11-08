// M92 (the time widget, issue #172, PHASE_TIME_SPEC 1.8): scenes and live checks for
// scripts/shots.mjs. Labels contain "m92", so openPage sails with the clock shown. The pages run
// on the test clock (`onTestClock`). Carry on in an exercise is checked by the m67 group, the
// step pause's Resume by m69, the ×4 note by m81.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { closeSettings, openSettings, waitForLink } from './ui.mjs';

const BOAT = '?wd=60&ws=12&ms=20&js=25&cam=side-port';

export const M92_SCENES = [
  { name: 'widget', query: BOAT },
  { name: 'card', query: BOAT, click: ['time-open'] },
  { name: 'paused', query: BOAT, click: ['pause-button'] },
  { name: 'held', query: `${BOAT}&held=1` },
  { name: 'ru-card', query: `${BOAT}&lang=ru`, click: ['time-open'] },
];

export async function liveM92Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M92 ${what}: ${detail}`);
    console.log(`live M92 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone, , desktop] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const tid = (page, id) => page.getByTestId(id);
  const box = (page, id) =>
    page.evaluate((testId) => {
      const node = document.querySelector(`[data-testid="${testId}"]`);
      if (!node || node.getClientRects().length === 0) return null;
      const b = node.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom };
    }, id);
  const viewBox = (page) =>
    page.evaluate(() => {
      const b = document.querySelector('.view').getBoundingClientRect();
      return { x: b.x, w: b.width, r: b.right, b: b.bottom };
    });

  // 1. A phone: one row at the top; the widget beside the wind box, the clock in it.
  {
    const { context, page } = await openPage(phone, 'm92 phone', BOAT);
    await page.waitForTimeout(1000);
    const top = await box(page, 'view-top');
    const strip = await box(page, 'instrument-strip');
    const bar = await box(page, 'time-bar');
    const clock = await box(page, 'clock-chip');
    const pause = await box(page, 'pause-button');
    check(
      'phone: the widget is beside the wind box, in the same row',
      !!bar && !!strip && bar.x >= strip.r - 1 && bar.y < strip.b,
      JSON.stringify({ strip, bar }),
    );
    check(
      'phone: the top area is at most 80 px high (108 px before M92)',
      !!top && top.h <= 80,
      JSON.stringify(top),
    );
    check(
      'phone: the clock is under the speed, in the left part',
      !!clock && !!bar && !!pause && clock.y > bar.y + 12 && clock.r <= pause.x + 1,
      JSON.stringify({ clock, pause }),
    );
    const speed = (await tid(page, 'time-status').innerText()).trim();
    const time = (await tid(page, 'clock-chip').innerText()).trim();
    check('phone: Time ×1 and 12:00', speed === '×1' && time === '12:00', `${speed} ${time}`);
    check('phone: the widget is 44 px high or more', !!bar && bar.h >= 44, JSON.stringify(bar));

    // Pause: Resume, orange, same width; Resume lets time run again.
    await tid(page, 'pause-button').click();
    const paused = await box(page, 'time-bar');
    const resumeText = (await tid(page, 'pause-button').textContent())?.trim();
    const orange = await tid(page, 'pause-button').evaluate((n) =>
      n.classList.contains('is-paused'),
    );
    check(
      'phone: Pause turns into an orange Resume, the widget keeps its width',
      resumeText === 'Resume' && orange && Math.abs((paused?.w ?? 0) - (bar?.w ?? 0)) < 0.5,
      JSON.stringify({ resumeText, orange, before: bar?.w, after: paused?.w }),
    );
    await shot(page, 'live-phone-paused');
    await tid(page, 'pause-button').click();
    check(
      'phone: Resume says Pause again',
      (await tid(page, 'pause-button').textContent())?.trim() === 'Pause',
      'Pause',
    );

    // The card: nearly the view's width, the speeds in one row, the clock under them.
    await tid(page, 'time-open').click();
    const card = await box(page, 'time-card');
    const view = await viewBox(page);
    const scales = await page.evaluate(() =>
      [...document.querySelectorAll('.time-scale')].map((n) => n.getBoundingClientRect().top),
    );
    const set = await box(page, 'clock-set');
    check(
      'phone: the card is nearly as wide as the view',
      !!card && card.w >= view.w - 20 && card.x >= view.x && card.r <= view.r,
      JSON.stringify({ card, view }),
    );
    check(
      'phone: seven speeds in one row',
      scales.length === 7 && new Set(scales.map((y) => Math.round(y))).size === 1,
      JSON.stringify(scales),
    );
    check(
      'phone: the card is under the top area, the Set button inside the view',
      !!card && !!top && card.y >= top.b && !!set && set.b <= view.b && set.b <= card.b + 1,
      JSON.stringify({ card, set, top }),
    );
    check(
      'phone: the left part says the card is open',
      (await tid(page, 'time-open').getAttribute('aria-expanded')) === 'true',
      'aria-expanded',
    );
    await shot(page, 'live-phone-card');
    problems.push(...(await auditPage(page, 'm92 phone card')));
    await tid(page, 'time-scale-4').click();
    await waitForLink(page, ['tx=4']);
    check(
      'phone: 4 sets ×4 and the link',
      (await tid(page, 'time-status').innerText()).trim() === '×4',
      await tid(page, 'time-status').innerText(),
    );
    const same = await box(page, 'time-bar');
    check(
      'phone: ×4 keeps the widget width',
      Math.abs((same?.w ?? 0) - (bar?.w ?? 0)) < 0.5,
      JSON.stringify({ before: bar?.w, after: same?.w }),
    );
    await tid(page, 'time-card-close').click();
    check('phone: × closes the card', !(await tid(page, 'time-card').isVisible()), 'open');
    await tid(page, 'time-open').click();
    await tid(page, 'time-open').click();
    check(
      'phone: a second tap on the left part closes the card',
      !(await tid(page, 'time-card').isVisible()),
      'open',
    );
    await context.close();
  }

  // 2. The Settings switches: Clock off leaves "Time ×1"; both off leave only Pause.
  {
    const { context, page } = await openPage(phone, 'm92 switches', BOAT);
    await openSettings(page);
    await tid(page, 'clock-switch').uncheck();
    await closeSettings(page);
    await page.waitForTimeout(300);
    check(
      'Clock off: the speed stays, the clock goes',
      (await tid(page, 'time-status').isVisible()) && !(await tid(page, 'clock-chip').isVisible()),
      'speed only',
    );
    await tid(page, 'time-open').click();
    check(
      'Clock off: the card has no clock part',
      (await tid(page, 'time-speed').isVisible()) && !(await tid(page, 'clock-card').isVisible()),
      'speeds only',
    );
    await page.keyboard.press('Escape');
    await openSettings(page);
    await page.locator('#time-bar-toggle').uncheck();
    await closeSettings(page);
    await page.waitForTimeout(300);
    check(
      'both off: only Pause',
      !(await tid(page, 'time-open').isVisible()) && (await tid(page, 'pause-button').isVisible()),
      'Pause only',
    );
    await context.close();
  }

  // 3. Held still, steady wind, flat water: the clock and the Held still chip; the card has only the clock.
  {
    const { context, page } = await openPage(phone, 'm92 held', `${BOAT}&held=1&sea=flat`);
    await page.waitForTimeout(500);
    check(
      'held: the clock and "Held still", no speed, no Pause',
      (await tid(page, 'clock-chip').isVisible()) &&
        (await tid(page, 'held-chip').isVisible()) &&
        !(await tid(page, 'time-status').isVisible()) &&
        !(await tid(page, 'pause-button').isVisible()),
      'clock and chip',
    );
    await tid(page, 'time-open').click();
    check(
      'held: the card shows the clock, no speeds',
      (await tid(page, 'clock-card').isVisible()) && !(await tid(page, 'time-speed').isVisible()),
      'clock only',
    );
    await shot(page, 'live-phone-held-card');
    await context.close();
  }

  // 4. A computer: the widget at the top right, the Attention chip under it; the card over the
  // Attention card that starts open, 420 px at most.
  {
    const { context, page } = await openPage(desktop, 'm92 desktop', BOAT);
    await page.waitForTimeout(800);
    const bar = await box(page, 'time-bar');
    const alert = await box(page, 'alert-chip');
    const strip = await box(page, 'instrument-strip');
    check(
      'desktop: the widget beside the wind box, the Attention chip under it',
      !!bar && !!alert && !!strip && bar.x >= strip.r && alert.y >= bar.b,
      JSON.stringify({ bar, alert, strip }),
    );
    await tid(page, 'time-open').click();
    const card = await box(page, 'time-card');
    const onTop = await page.evaluate(() => {
      const c = document.querySelector('[data-testid="time-card"]').getBoundingClientRect();
      const hit = document.elementFromPoint(c.left + 20, c.top + 60);
      return hit?.closest('[data-testid="time-card"]') !== null;
    });
    check(
      'desktop: the card is 420 px at most and on top',
      !!card && card.w <= 420.5 && onTop,
      JSON.stringify({ card, onTop }),
    );
    await shot(page, 'live-desktop-card');
    problems.push(...(await auditPage(page, 'm92 desktop card')));
    await context.close();
  }

  // 5. Russian: the words fit, the card opens.
  {
    const { context, page } = await openPage(phone, 'm92 ru', `${BOAT}&lang=ru`);
    await page.waitForTimeout(500);
    const word = (await tid(page, 'pause-button').textContent())?.trim();
    const bar = await box(page, 'time-bar');
    const view = await viewBox(page);
    check(
      'ru: Пауза, and the widget inside the view',
      word === 'Пауза' && !!bar && bar.r <= view.r,
      JSON.stringify({ word, bar }),
    );
    await tid(page, 'time-open').click();
    const heading = await page.locator('.time-card-heading').first().innerText();
    check('ru: the card says Скорость времени', heading === 'Скорость времени', heading);
    await shot(page, 'live-phone-ru-card');
    await context.close();
  }
}
