// M41 (thrusters and Harbour mode, PHASE7_SPEC 7.9; owner's changes on PR #99: the thrusters are in the
// Engine section, the strip has tags, the keyboard works both at once): scenes and live checks for scripts/shots.mjs.
// Labels contain "m41", so openPage lets the app open as it does without a link (Sailing, default
// waves). The live checks run on the test clock (shots.mjs passes `onTestClock`): waitForTimeout
// moves the app's time on, so "2.5 s" is 2.5 s of app time on every machine.
import path from 'node:path';
import { holdThruster, setMode, setSheet, showSection, waitForLink } from './ui.mjs';

/** Sails away, standing still, engine running in neutral, seen from above. */
const AWAY = 'wd=0&ws=0&mf=0&jf=0&js=100&bs=0&ap=off&eng=1&lv=0&cam=top';

export const M41_SCENES = [
  { name: 'harbour-mode', query: `?m=harbour&${AWAY}`, sheet: 'half' },
  { name: 'harbour-peek', query: `?m=harbour&${AWAY}`, sheet: 'peek' },
  {
    name: 'helm-thrusters',
    query: '?wd=0&ws=0&mf=0&jf=0&js=100&bs=0&ap=off&eng=1&lv=0&mode=realistic&st=helm&cam=helm',
    section: 'ropes',
    sheet: 'full',
  },
];

export async function liveM41Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M41 ${what}: ${detail}`);
    console.log(`live M41 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  /** The heading on the instrument strip, 0 … 359. */
  const heading = async (page) =>
    parseInt(
      ((await page.getByTestId('strip-heading').textContent()) ?? '').replace(/\D/g, ''),
      10,
    );
  const dir = (page, id) => page.getByTestId(id).getAttribute('data-dir');

  // 1. Hold the bow joystick to starboard: the status line names it and the heading grows.
  {
    const { context, page } = await openPage(phone, 'm41 spin', `?m=harbour&${AWAY}&tx=4`, {
      testClock: true,
    });
    const before = await heading(page);
    let status = '';
    await holdThruster(page, 'bow', 1, 2500, 'section', async () => {
      status = (await page.getByTestId('thrusters-status').textContent()) ?? '';
      await shot(page, 'm41-spin-during');
    });
    const after = await heading(page);
    const grown = (after - before + 360) % 360;
    check(
      'spin: the heading grew by 10° or more',
      grown >= 10 && grown < 180,
      `${before}° → ${after}°`,
    );
    check('spin: the status names "bow to starboard"', /bow to starboard/.test(status), status);
    check('spin: the joystick is released', (await dir(page, 'thruster-bow')) === '0', 'data-dir');
    await context.close();
  }

  // 2. Harbour is in the mode chip and the link, and survives a reload.
  {
    const { context, page } = await openPage(phone, 'm41 mode link', `?${AWAY}`);
    await setMode(page, 'harbour');
    const link = await waitForLink(page, ['m=harbour']);
    check('mode link: the link has m=harbour', link.includes('m=harbour'), link);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('canvas.scene-canvas', { state: 'attached', timeout: 30_000 });
    const chip = (await page.getByTestId('mode-chip').textContent()) ?? '';
    check('mode link: after a reload the chip reads "Harbour"', /Harbour/.test(chip), chip.trim());
    await context.close();
  }

  // 3. Blur lets go of the joystick.
  {
    const { context, page } = await openPage(phone, 'm41 release', `?m=harbour&${AWAY}&tx=4`, {
      testClock: true,
    });
    let held = '';
    let released = '';
    await holdThruster(page, 'bow', 1, 1000, 'section', async () => {
      held = (await dir(page, 'thruster-bow')) ?? '';
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      await page.waitForTimeout(100);
      released = (await dir(page, 'thruster-bow')) ?? '';
    });
    check('release: held shows data-dir 1', held === '1', held);
    check('release: a window blur puts it back to 0', released === '0', released);
    await context.close();
  }

  // 4. The strip at the bottom: the lever's − / + and two small joysticks fit and work.
  {
    const { context, page } = await openPage(phone, 'm41 quick row', `?m=harbour&${AWAY}&tx=4`, {
      testClock: true,
    });
    await setSheet(page, 'peek');
    const row = page.getByTestId('quick-harbour');
    const box = await row.boundingBox();
    const viewport = page.viewportSize();
    check(
      'quick row: the Harbour block fits the width',
      box !== null && viewport !== null && box.x >= 0 && box.x + box.width <= viewport.width + 0.5,
      JSON.stringify(box),
    );
    const small = await page.evaluate(
      () =>
        [
          ...document.querySelectorAll(
            'button[data-testid^="quick-lever-"], .thruster-joystick-quick button',
          ),
        ]
          .map((node) => node.getBoundingClientRect())
          .filter((r) => r.width > 0 && (r.width < 43.5 || r.height < 43.5)).length,
    );
    check('quick row: every control is at least 44 × 44 px', small === 0, `${small} too small`);
    const value = async () => (await page.getByTestId('quick-lever-value').textContent()) ?? '';
    check('quick row: neutral reads N', /N/.test(await value()), await value());
    for (let i = 0; i < 4; i += 1) await page.getByTestId('quick-lever-more').click();
    check('quick row: + four times reads ▲40', (await value()).includes('▲40'), await value());
    await page.getByTestId('quick-lever-less').click();
    check('quick row: − once reads ▲30', (await value()).includes('▲30'), await value());
    await shot(page, 'm41-quick-row');
    const before = await heading(page);
    await holdThruster(page, 'bow', 1, 1000, 'quick');
    const after = await heading(page);
    check(
      'quick row: the compact joystick turns her',
      (after - before + 360) % 360 >= 2,
      `${before}° → ${after}°`,
    );
    await context.close();
  }

  // 5. Weak at speed: at 4 kn the status says so.
  {
    const { context, page } = await openPage(
      phone,
      'm41 weak',
      '?m=harbour&wd=0&ws=0&mf=0&jf=0&js=100&bs=4&eng=1&lv=40&ap=off&cam=top',
      { testClock: true },
    );
    let status = '';
    await holdThruster(page, 'bow', 1, 1000, 'section', async () => {
      status = (await page.getByTestId('thrusters-status').textContent()) ?? '';
    });
    check(
      'weak: the status says little effect at this speed',
      /little effect/.test(status),
      status,
    );
    await context.close();
  }

  // 6. Realistic mode: the two joysticks are under the engine lever at the Helm station.
  {
    const { context, page } = await openPage(
      phone,
      'm41 helm',
      `?wd=0&ws=0&mf=0&jf=0&js=100&bs=0&ap=off&eng=1&lv=0&mode=realistic&st=helm&cam=top&tx=4`,
      { testClock: true },
    );
    await showSection(page, 'ropes');
    const block = page.getByTestId('thruster-helm');
    await block.scrollIntoViewIfNeeded();
    check('helm: the thruster block is shown', await block.isVisible(), 'thruster-helm');
    const before = await heading(page);
    await holdThruster(page, 'bow', 1, 1000, 'helm');
    const after = await heading(page);
    check(
      'helm: the bow joystick turns her',
      (after - before + 360) % 360 >= 2,
      `${before}° → ${after}°`,
    );
    await shot(page, 'm41-helm');
    await context.close();
  }

  // 7. The strip names its two groups (owner, PR #99).
  {
    const { context, page } = await openPage(phone, 'm41 tags', `?m=harbour&${AWAY}`);
    await setSheet(page, 'peek');
    const engine = (await page.getByTestId('quick-engine').textContent()) ?? '';
    const thrusters = (await page.getByTestId('quick-thrusters').textContent()) ?? '';
    check('tags: the engine group is named', /Engine/.test(engine), engine);
    check('tags: the thruster group is named', /Thrusters/.test(thrusters), thrusters);
    await context.close();
  }

  // 8. The keyboard works both thrusters at once, in Harbour mode only.
  {
    const { context, page } = await openPage(phone, 'm41 keys', `?m=harbour&${AWAY}&tx=4`, {
      testClock: true,
    });
    await page.keyboard.down('KeyA');
    await page.keyboard.down('KeyL');
    await page.waitForTimeout(500);
    const both = [await dir(page, 'thruster-bow'), await dir(page, 'thruster-stern')];
    check(
      'keys: A and L together push the bow to port and the stern to starboard',
      both.join() === '-1,1',
      both.join(),
    );
    await page.keyboard.up('KeyA');
    await page.waitForTimeout(100);
    const stern = [await dir(page, 'thruster-bow'), await dir(page, 'thruster-stern')];
    check('keys: letting go of A stops only the bow', stern.join() === '0,1', stern.join());
    await page.keyboard.up('KeyL');
    await page.waitForTimeout(100);
    check('keys: both let go', (await dir(page, 'thruster-stern')) === '0', 'data-dir');
    await context.close();
    const other = await openPage(phone, 'm41 keys easy', `?${AWAY}&tx=4`, { testClock: true });
    await other.page.keyboard.down('KeyA');
    await other.page.waitForTimeout(300);
    check(
      'keys: in Easy mode the keys do nothing',
      (await dir(other.page, 'thruster-bow')) === '0',
      'data-dir',
    );
    await other.page.keyboard.up('KeyA');
    await other.context.close();
  }

  // 9. On a phone with the sheet at half, the open block does not reach under the next header.
  for (const [what, query] of [
    ['harbour', `?m=harbour&${AWAY}`],
    ['easy with a rope', '?wd=0&ws=0&sel=rope_mainsheet'],
  ]) {
    const { context, page } = await openPage(phone, `m41 overlap ${what}`, query);
    await setSheet(page, 'half');
    const over = await page.evaluate(() => {
      const section = document.querySelector('.panel-section[data-open="true"]');
      const body = section?.querySelector('.section-body');
      if (!section || !body) return null;
      return body.getBoundingClientRect().bottom - section.getBoundingClientRect().bottom;
    });
    check(
      `overlap (${what}): the body stays inside its block`,
      over !== null && over <= 0.5,
      String(over),
    );
    await context.close();
  }
}
