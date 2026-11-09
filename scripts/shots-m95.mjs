// M95 (time-lapse, PHASE10_SPEC 25.7): scenes and live checks for scripts/shots.mjs, on the test
// clock (an hour of app time at ×240 is 15 s of the test clock's time).
import path from 'node:path';
import { showSection } from './ui.mjs';

const ANCHORED =
  '?pl=bay&pe=-1660.0&pn=0.0&hdg=90&bs=0&an=60&ax=-1600.0,0.0&as=1&wd=90&ws=6&sea=sheltered&clk=202606012000&cam=top';

export const M95_SCENES = [
  { name: 'lapse-card', query: ANCHORED, click: ['time-open'] },
  { name: 'lapse-card-ru', query: `${ANCHORED}&lang=ru`, click: ['time-open'] },
  { name: 'lapse-hint', query: '?clk=202606012000', click: ['time-open'] },
];

export async function liveM95Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M95 ${what}: ${detail}`);
    console.log(`live M95 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const text = async (page, id) => ((await page.getByTestId(id).textContent()) ?? '').trim();

  // 1. At anchor: the row is there; ×240 runs an hour in 15 s of app time.
  {
    const { context, page } = await openPage(phone, 'm95 anchored', ANCHORED, { testClock: true });
    await page.getByTestId('time-open').click();
    const row = page.getByTestId('time-lapse');
    check(
      'anchored: the time-lapse row shows two buttons',
      (await row.isVisible()) && (await row.locator('button').count()) === 2,
      `visible ${await row.isVisible()}`,
    );
    check(
      'anchored: no hint',
      !(await page.getByTestId('time-lapse-hint').isVisible()),
      'hint hidden',
    );
    await page.getByTestId('time-scale-240').click();
    const status = await text(page, 'time-status');
    check('anchored: the status says ×240', status === '×240', status);
    await page.waitForTimeout(15000);
    const chip = await text(page, 'clock-chip');
    check('anchored: an hour later the clock reads 21:00 or 21:01', /21:0[01]/.test(chip), chip);
    await shot(page, 'live-phone-m95-night');
    await context.close();
  }

  // 2. Sailing in open water: the hint, no ×60 or ×240.
  {
    const { context, page } = await openPage(phone, 'm95 open water', '?clk=202606012000', {
      testClock: true,
    });
    await page.getByTestId('time-open').click();
    check(
      'open water: the hint shows',
      await page.getByTestId('time-lapse-hint').isVisible(),
      'time-lapse-hint',
    );
    check(
      'open water: no ×240 button',
      !(await page.getByTestId('time-scale-240').isVisible()),
      'time-scale-240 hidden',
    );
    check(
      'open water: no time-lapse row',
      !(await page.getByTestId('time-lapse').isVisible()),
      'time-lapse hidden',
    );
    await context.close();
  }

  // 3. Raising the anchor: the speed drops to ×1 when it leaves the bottom.
  {
    const { context, page } = await openPage(phone, 'm95 raise', ANCHORED, { testClock: true });
    await page.getByTestId('time-open').click();
    await page.getByTestId('time-scale-240').click();
    await page.getByTestId('time-card-close').click();
    await showSection(page, 'anchor');
    const button = page.getByTestId('windlass-up');
    await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox();
    if (!box) throw new Error('windlass-up has no box');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    let status = '';
    try {
      for (let waited = 0; waited <= 20000; waited += 500) {
        status = await text(page, 'time-status');
        if (status === '×1') break;
        await page.waitForTimeout(500);
      }
    } finally {
      await page.mouse.up();
    }
    check(
      'raise: the status drops to ×1 once the anchor leaves the bottom',
      status === '×1',
      status,
    );
    await context.close();
  }
}
