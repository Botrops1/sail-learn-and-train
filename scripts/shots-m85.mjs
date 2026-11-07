// M85 (Welcome, PHASE_LAUNCH_SPEC 9.8): live checks for scripts/shots.mjs, on the test clock.
// Labels start with "m85-". No scenes.
import path from 'node:path';
import { exerciseLine, openSettings, waitForLink } from './ui.mjs';

export async function liveM85Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M85 ${what}: ${detail}`);
    console.log(`live M85 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const wide = viewports[2];
  const tid = (page, id) => page.getByTestId(id);
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const welcomeShown = (page) => tid(page, 'welcome').isVisible();
  const settingsKey = (page) => page.evaluate(() => localStorage.getItem('sail-learn.welcome'));

  // 1. Phone, bare address: the card, big buttons, no page scroll; Close remembers it.
  {
    const { context, page } = await openPage(phone, 'm85-welcome-phone', '', { welcome: true });
    await tid(page, 'welcome').waitFor({ state: 'visible' });
    for (const id of ['welcome-watch', 'welcome-look', 'welcome-close']) {
      const box = await tid(page, id).boundingBox();
      const ok =
        box !== null &&
        box.height >= 44 &&
        box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= phone.width &&
        box.y + box.height <= phone.height;
      check(`phone ${id} size and place`, ok, JSON.stringify(box));
    }
    const scroll = await page.evaluate(() => ({
      x: document.documentElement.scrollWidth > window.innerWidth,
      y: document.documentElement.scrollHeight > window.innerHeight,
    }));
    check('phone no page scroll', !scroll.x && !scroll.y, JSON.stringify(scroll));
    await shot(page, 'm85-welcome-phone');
    await tid(page, 'welcome-close').click();
    check('phone close hides it', !(await welcomeShown(page)), 'gone after Close');
    check('phone close stores the flag', (await settingsKey(page)) === '1', 'flag is 1');
    // A new page of the same context at the bare address: the stored flag keeps it away.
    const bare = page.url().split('?')[0];
    const other = await context.newPage();
    await other.goto(bare, { waitUntil: 'networkidle' });
    await other.waitForSelector('canvas.scene-canvas', { state: 'attached', timeout: 30_000 });
    check('second visit no welcome', !(await welcomeShown(other)), 'bare address, flag set');
    await context.close();
  }

  // 2. A link with settings never shows it.
  {
    const { context, page } = await openPage(phone, 'm85-link', '?v=1&m=easy', { welcome: true });
    check('link no welcome', !(await welcomeShown(page)), '?v=1&m=easy');
    await context.close();
  }

  // 3. Watch the first exercise.
  {
    const { context, page } = await openPage(phone, 'm85-watch', '', { welcome: true });
    await tid(page, 'welcome-watch').click();
    await page.waitForTimeout(1000);
    const link = await waitForLink(page, ['ex=points-of-sail']);
    const line = await exerciseLine(page);
    check('watch address', link.includes('ex=points-of-sail'), link);
    check('watch line', line !== null && line.startsWith('Watching ·'), String(line));
    check('watch hides welcome', !(await welcomeShown(page)), 'gone');
    await context.close();
  }

  // 4. Look around the boat.
  {
    const { context, page } = await openPage(phone, 'm85-look', '', { welcome: true });
    await tid(page, 'welcome-look').click();
    const link = await waitForLink(page, ['m=learn']);
    check('look address', link.includes('m=learn'), link);
    check('look hides welcome', !(await welcomeShown(page)), 'gone');
    await context.close();
  }

  // 5. Show it again from Settings → About; Escape closes it.
  {
    const { context, page } = await openPage(phone, 'm85-again', '?v=1&m=easy', { welcome: true });
    check('again not shown at first', !(await welcomeShown(page)), 'link');
    await openSettings(page);
    await tid(page, 'welcome-again').scrollIntoViewIfNeeded();
    await tid(page, 'welcome-again').click();
    check('again shows it', await welcomeShown(page), 'visible after the About button');
    await page.keyboard.press('Escape');
    check('escape closes it', !(await welcomeShown(page)), 'gone after Escape');
    await context.close();
  }

  // 6. Wide: the card is centred in the window.
  {
    const { context, page } = await openPage(wide, 'm85-welcome-wide', '', { welcome: true });
    await tid(page, 'welcome').waitFor({ state: 'visible' });
    const box = await tid(page, 'welcome').boundingBox();
    const dx = box ? Math.abs(box.x + box.width / 2 - wide.width / 2) : 9999;
    const dy = box ? Math.abs(box.y + box.height / 2 - wide.height / 2) : 9999;
    check('wide centred', dx <= 20 && dy <= 20, `off by ${dx.toFixed(1)}, ${dy.toFixed(1)} px`);
    await shot(page, 'm85-welcome-wide');
    await context.close();
  }
}
