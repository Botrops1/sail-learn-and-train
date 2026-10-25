// M52 (Mode and Settings chips on the computer, PHASE8_SPEC 10.7): scenes and live checks for
// scripts/shots.mjs. Labels contain "m52", so openPage starts with every section folded and adds
// no `held=1`, `sea`, `clock` or `mm`. The live checks run on the wide layout (1,440 x 900), then
// on the side layout (820 x 1000).
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { closeSettings, openSettings, setMode } from './ui.mjs';

const SIDE = '?cam=side-port';

/** The `card: 'mode'` field opens the mode card (a no-op on the phone, which has the Mode tab). */
export const M52_SCENES = [
  { name: 'wide-chips', query: SIDE },
  { name: 'wide-mode-card', query: SIDE, card: 'mode' },
  { name: 'wide-settings-card', query: SIDE, settings: true },
  { name: 'side-settings-card', query: SIDE, settings: true },
];

export async function liveM52Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M52 ${what}: ${detail}`);
    console.log(`live M52 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [, foldable, desktop] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const visible = async (page, id) => {
    const node = page.getByTestId(id).first();
    return (await node.count()) > 0 && (await node.isVisible());
  };
  const box = async (page, id) => {
    const node = page.getByTestId(id).first();
    if ((await node.count()) === 0 || !(await node.isVisible())) return null;
    return node.boundingBox();
  };
  const focusedId = (page) =>
    page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? '');
  const search = (page) => page.evaluate(() => window.location.search);

  for (const viewport of [desktop, foldable]) {
    const wide = viewport === desktop;
    const name = wide ? 'wide' : 'side';

    // 1. No Mode and no Settings section; the chips, in order, close together at the right.
    {
      const { context, page } = await openPage(viewport, `m52 ${name} chips`, SIDE);
      await page.waitForTimeout(500);
      const sections = await page.evaluate(() =>
        [...document.querySelectorAll('[data-section]')]
          .filter((node) => node.offsetParent !== null)
          .map((node) => node.getAttribute('data-section')),
      );
      check(
        `${name}: no Mode and no Settings section`,
        !sections.includes('mode') && !sections.includes('settings'),
        sections.join(),
      );
      const mode = await box(page, 'mode-chip');
      const camera = await box(page, 'camera-chip');
      const gear = await box(page, 'settings-button');
      check(`${name}: the three chips are visible`, !!mode && !!camera && !!gear, 'chips');
      const view = await page.locator('.view').first().boundingBox();
      if (wide && mode && camera && gear) {
        const gaps = [camera.x - (mode.x + mode.width), gear.x - (camera.x + camera.width)];
        check(
          'wide: mode chip, camera chip, gear from left to right, 8 px apart',
          gaps.every((gap) => gap >= 0 && gap <= 9),
          JSON.stringify(gaps),
        );
        check(
          'wide: the group ends within 12 px of the view’s right edge',
          view.x + view.width - (gear.x + gear.width) <= 12,
          String(view.x + view.width - (gear.x + gear.width)),
        );
      } else if (mode && camera && gear) {
        check(
          'side: mode chip at the left, camera chip, gear at the right',
          mode.x - view.x <= 12 &&
            mode.x < camera.x &&
            camera.x < gear.x &&
            view.x + view.width - (gear.x + gear.width) <= 12,
          JSON.stringify({ mode, camera, gear }),
        );
      }
      const text = (await page.getByTestId('mode-chip').innerText()).replace(/\s+/g, ' ').trim();
      check(
        `${name}: the mode chip reads ${wide ? '"Mode: Easy"' : '"Easy"'}`,
        text.startsWith(wide ? 'Mode: Easy' : 'Easy') && (wide || !text.includes('Mode')),
        text,
      );
      await shot(page, `live-${name}-chips`);
      await context.close();
    }

    // 2. The mode card.
    {
      const { context, page } = await openPage(viewport, `m52 ${name} mode card`, SIDE);
      await page.waitForTimeout(500);
      await page.getByTestId('mode-chip').click();
      await page.getByTestId('mode-card').waitFor({ state: 'visible' });
      check(
        `${name}: the mode card opens with Easy checked and the focus on it`,
        (await page.getByTestId('mode-choice-easy').getAttribute('aria-checked')) === 'true' &&
          (await focusedId(page)) === 'mode-choice-easy',
        await focusedId(page),
      );
      await shot(page, `live-${name}-mode-card`);
      const problemsOpen = await auditPage(page, `m52 ${name} mode card open`);
      problems.push(...problemsOpen);
      await page.getByTestId('mode-choice-realistic').click();
      await page.getByTestId('mode-card').waitFor({ state: 'hidden' });
      await page.waitForTimeout(400);
      const chipText = (await page.getByTestId('mode-chip').innerText()).trim();
      check(
        `${name}: choosing Realistic closes the card, the link and the chip say so`,
        (await search(page)).includes('mode=realistic') &&
          chipText.includes('Realistic') &&
          (await focusedId(page)) === 'mode-chip',
        `${await search(page)} ${chipText} ${await focusedId(page)}`,
      );
      await context.close();
    }

    // 3. The settings card: not modal, a tap on the view, Escape.
    {
      const { context, page } = await openPage(viewport, `m52 ${name} settings card`, SIDE);
      await page.waitForTimeout(500);
      await page.getByTestId('settings-button').click();
      await page.getByTestId('settings-card').waitFor({ state: 'visible' });
      check(
        `${name}: the gear opens the card with the settings inside, the focus on ×`,
        (await page.getByTestId('settings-card').getByTestId('settings-content').count()) === 1 &&
          (await focusedId(page)) === 'settings-card-close',
        await focusedId(page),
      );
      await shot(page, `live-${name}-settings-card`);
      problems.push(...(await auditPage(page, `m52 ${name} settings card open`)));
      await page.keyboard.press('Escape');
      await page.getByTestId('settings-card').waitFor({ state: 'hidden' });
      check(
        `${name}: Escape closes the card and the focus is on the gear`,
        (await focusedId(page)) === 'settings-button',
        await focusedId(page),
      );
      // A tap on a part of the boat selects it and closes the card (the view stays usable).
      const canvas = await page.locator('canvas.scene-canvas').boundingBox();
      let selected = false;
      let closedByTap = true;
      for (let i = 0; i < 24 && !selected; i += 1) {
        await page.getByTestId('settings-button').click();
        await page
          .getByTestId('settings-card')
          .waitFor({ state: 'visible', timeout: 3000 })
          .catch(async () => {
            await shot(page, `debug-${name}-${i}`);
            throw new Error(`gear did not open the card at try ${i}: ${await search(page)}`);
          });
        // Left of the card (it stands at the right, 380 px wide).
        const x = canvas.x + 20 + 10 * (i % 8);
        const y = canvas.y + canvas.height * (0.35 + 0.07 * Math.floor(i / 8));
        await page.mouse.click(x, y);
        await page.waitForTimeout(200);
        closedByTap = closedByTap && !(await visible(page, 'settings-card'));
        selected = (await search(page)).includes('sel=');
      }
      check(`${name}: a tap on the view closes the card`, closedByTap, String(closedByTap));
      check(`${name}: a tap on a part selects it`, selected, await search(page));
      await context.close();
    }

    // 4. One card at a time.
    {
      const { context, page } = await openPage(viewport, `m52 ${name} one card`, SIDE);
      await page.waitForTimeout(500);
      await openSettings(page);
      await page.getByTestId('mode-chip').click();
      await page.getByTestId('mode-card').waitFor({ state: 'visible' });
      check(
        `${name}: opening the mode card closes the settings card`,
        !(await visible(page, 'settings-card')) && (await visible(page, 'mode-card')),
        'cards',
      );
      await page.getByTestId('settings-button').click();
      await page.getByTestId('settings-card').waitFor({ state: 'visible' });
      check(
        `${name}: opening the settings card closes the mode card`,
        !(await visible(page, 'mode-card')) && (await visible(page, 'settings-card')),
        'cards',
      );
      await page.getByTestId('camera-chip').click();
      check(
        `${name}: a chip menu closes the card`,
        !(await visible(page, 'settings-card')) && (await visible(page, 'camera-menu')),
        'menu',
      );
      await context.close();
    }

    // 5. A language change in the card reopens the card.
    {
      const { context, page } = await openPage(viewport, `m52 ${name} language`, SIDE);
      await page.waitForTimeout(500);
      await openSettings(page);
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        page.locator('label:has([data-testid="language-ru"])').click(),
      ]);
      await page.waitForSelector('canvas.scene-canvas', { state: 'attached' });
      await page.waitForTimeout(500);
      const title = (await visible(page, 'settings-card'))
        ? (await page.locator('#settings-title').innerText()).trim()
        : '';
      check(
        `${name}: after a language change the settings card is open, in Russian`,
        title === 'Настройки' && (await search(page)).includes('lang=ru'),
        `${title} ${await search(page)}`,
      );
      await closeSettings(page);
      await setMode(page, 'learn');
      await context.close();
    }
  }

  // 6. Turning narrow closes an open card.
  {
    const { context, page } = await openPage(desktop, 'm52 resize', SIDE);
    await page.waitForTimeout(500);
    await openSettings(page);
    await page.setViewportSize({ width: 820, height: 1000 });
    await page.waitForFunction(() => document.documentElement.dataset.wide !== 'true');
    await page.waitForTimeout(300);
    check('turning narrow closes the card', !(await visible(page, 'settings-card')), 'open');
    await context.close();
  }
}
