// M12 (engine): scenes and live checks for scripts/shots.mjs.
// The checks follow the owner's checklist: idle, cruise and full ahead settle at the speeds of
// PHASE2_SPEC 12.5, astern goes backwards, the gearbox shifts through neutral, the Helm station's
// lever works, and motor-sailing beats sailing alone. Labels contain "m12" so the script opens
// them Sailing.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { showSection } from './ui.mjs';

/** Screenshots at every size. The script waits `waitMs` before each. */
export const M12_SCENES = [
  {
    // Easy mode: the Engine block under the autopilot, engine running at 65 %.
    name: 'engine-easy',
    query: '?ws=0&eng=1&lv=65&cam=side-port',
    section: 'engine',
    scrollTo: '[data-section="engine"] [data-testid="engine-panel"]',
    waitMs: 1500,
  },
  {
    // Realistic mode, Helm station: the lever beside the wheel.
    name: 'engine-helm',
    query: '?mode=realistic&st=helm&ws=0&eng=1&lv=65&cam=side-port',
    scrollTo: '.engine-helm',
    waitMs: 1500,
  },
  {
    // Motoring: calm water, engine at 1,850 rpm, the wake and the strip showing the rpm.
    name: 'motoring',
    query: '?ws=0&eng=1&lv=65',
    waitMs: 3000,
  },
];

const text = async (page, id) => (await page.getByTestId(id).textContent()) ?? '';

export async function liveM12Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M12 ${what}: ${detail}`);
    console.log(`live M12 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const speedKn = async (page) => parseFloat(await text(page, 'strip-speed'));
  const easy = (page) => page.locator('[data-section="engine"]');

  // Idle ahead: "Engine 8xx rpm", and the speed it settles at (a link opens settled).
  {
    const { context, page } = await openPage(phone, 'm12 idle', '?ws=0&eng=1&lv=11&cam=side-port');
    await page.waitForTimeout(1500);
    const rpm = await text(page, 'strip-engine');
    const number = Number(/Engine ([\d,]+) rpm/.exec(rpm)?.[1]?.replace(',', ''));
    check('idle: the strip shows the rpm', number >= 800 && number <= 850, rpm);
    const kn = await speedKn(page);
    check('idle: about 3.3 kn', kn >= 3.0 && kn <= 3.7, String(kn));
    await context.close();
  }

  // Cruise and full ahead.
  for (const [lever, lo, hi, name] of [
    [66, 7.6, 8.4, 'cruise'],
    [100, 9.0, 9.8, 'full ahead'],
  ]) {
    const { context, page } = await openPage(
      phone,
      `m12 ${name}`,
      `?ws=0&eng=1&lv=${lever}&cam=side-port`,
    );
    await page.waitForTimeout(1500);
    const kn = await speedKn(page);
    check(`${name}: speed ${lo}–${hi} kn`, kn >= lo && kn <= hi, String(kn));
    const rpm = Number(
      /Engine ([\d,]+) rpm/.exec(await text(page, 'strip-engine'))?.[1]?.replace(',', ''),
    );
    check(`${name}: rpm`, lever === 66 ? rpm >= 1800 && rpm <= 1900 : rpm >= 2480, String(rpm));
    await context.close();
  }

  // Start and Stop, and the lever slider (Easy mode).
  {
    const { context, page } = await openPage(phone, 'm12 start stop', '?ws=0&cam=top');
    await showSection(page, 'engine');
    const panel = easy(page).getByTestId('engine-panel');
    await panel.scrollIntoViewIfNeeded();
    check(
      'easy: the strip shows no engine while it is stopped',
      !(await page.getByTestId('strip-engine').isVisible()),
      'hidden',
    );
    await panel.getByTestId('engine-startstop').click();
    await page.waitForTimeout(1500);
    const rpm = await text(page, 'strip-engine');
    check('easy: Start shows the rpm in the strip', /Engine \d+ rpm/.test(rpm), rpm);
    // The lever: End key = full ahead; the readout and the link follow.
    const slider = panel.getByTestId('engine-lever');
    await slider.focus();
    await page.keyboard.press('End');
    await page.waitForTimeout(600);
    const value = await panel.getByTestId('engine-lever-value').textContent();
    check('easy: lever at full ahead says "Ahead 100 %"', value === 'Ahead 100 %', value ?? '');
    await page.waitForTimeout(1000);
    const url = await page.evaluate(() => window.location.search);
    check(
      'easy: the link has eng=1 and lv=100',
      /[?&]eng=1/.test(url) && /[?&]lv=100/.test(url),
      url,
    );
    await panel.scrollIntoViewIfNeeded();
    await shot(page, 'live-phone-engine-easy');
    problems.push(...(await auditPage(page, 'm12 engine easy')));
    await panel.getByTestId('engine-startstop').click();
    await page.waitForTimeout(500);
    check(
      'easy: Stop hides the rpm',
      !(await page.getByTestId('strip-engine').isVisible()),
      'hidden',
    );
    await context.close();
  }

  // Astern: she goes backwards; the autopilot says it does not steer then.
  {
    const { context, page } = await openPage(
      phone,
      'm12 astern',
      '?ws=0&eng=1&lv=-100&tx=16&cam=top',
    );
    let kn = 0;
    for (let i = 0; i < 100 && !(kn < -1); i += 1) {
      await page.waitForTimeout(200);
      kn = await speedKn(page);
    }
    check('astern: the speed goes negative', kn < -1, String(kn));
    const status = await page
      .locator('[data-section="autopilot"]')
      .getByTestId('autopilot-status')
      .textContent();
    check(
      'astern: the autopilot says it does not steer',
      /does not steer/.test(status ?? ''),
      status ?? '',
    );
    await shot(page, 'live-phone-astern');
    await context.close();
  }

  // Shifting: from full ahead straight to full astern pauses in neutral (slow motion shows it).
  {
    const { context, page } = await openPage(
      phone,
      'm12 shifting',
      '?ws=0&eng=1&lv=100&tx=0.25&cam=top',
    );
    await showSection(page, 'engine');
    const panel = easy(page).getByTestId('engine-panel');
    await panel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    // A finger swipe from the far right to the far left, through the middle: about 0.15 s real
    // time = 0.04 s of simulated time at this speed, far less than the half second the gearbox waits.
    const lever = panel.getByTestId('engine-lever');
    const box = await lever.boundingBox();
    if (!box) check('shifting: the lever slider is on screen', false, 'no box');
    else {
      const y = box.y + box.height / 2;
      await page.mouse.move(box.x + box.width - 4, y);
      await page.mouse.down();
      for (let i = 1; i <= 12; i += 1) {
        await page.mouse.move(box.x + box.width - 4 - ((box.width - 8) * i) / 12, y);
        await page.waitForTimeout(12);
      }
      await page.mouse.up();
    }
    let sawShift = false;
    for (let i = 0; i < 60 && !sawShift; i += 1) {
      await page.waitForTimeout(50);
      sawShift = /Shifting/.test((await panel.getByTestId('engine-status').textContent()) ?? '');
    }
    check(
      'shifting: a swipe through the middle still says "Shifting through neutral"',
      sawShift,
      String(sawShift),
    );
    let astern = false;
    for (let i = 0; i < 100 && !astern; i += 1) {
      await page.waitForTimeout(100);
      astern = /astern/.test((await panel.getByTestId('engine-status').textContent()) ?? '');
    }
    check('shifting: then it is in gear astern', astern, String(astern));
    await context.close();
  }

  // Helm station (Realistic mode): Start, drag the lever forward, rpm and speed rise.
  {
    const { context, page } = await openPage(
      phone,
      'm12 helm lever',
      '?mode=realistic&st=helm&ws=0&cam=side-port',
    );
    await showSection(page, 'helm');
    const helm = page.getByTestId('engine-helm');
    await helm.scrollIntoViewIfNeeded();
    await helm.getByTestId('engine-startstop').click();
    // The rpm climbs to idle with a 1 s lag.
    await page.waitForTimeout(4000);
    const idle = await helm.getByTestId('engine-rpm').textContent();
    check('helm: after Start the rpm reads idle', /^[78]\d\d rpm$/.test(idle ?? ''), idle ?? '');
    const lever = helm.getByTestId('engine-lever-drawing');
    const box = await lever.boundingBox();
    if (!box) {
      check('helm: the lever is drawn', false, 'no box');
    } else {
      const x = box.x + box.width / 2;
      await page.mouse.move(x, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(x, box.y + box.height * 0.2, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(2500);
      const value = await helm.getByTestId('engine-lever-value').textContent();
      check('helm: dragged forward reads "Ahead"', /^Ahead \d+ %$/.test(value ?? ''), value ?? '');
      const rpm = Number((await helm.getByTestId('engine-rpm').textContent())?.replace(/\D/g, ''));
      check('helm: the rpm rose', rpm > 1500, String(rpm));
      const kn = await speedKn(page);
      check('helm: she is moving', kn > 0.5, String(kn));
      await helm.scrollIntoViewIfNeeded();
      await shot(page, 'live-phone-engine-helm');
      problems.push(...(await auditPage(page, 'm12 engine helm')));
    }
    await context.close();
  }

  // Motor-sailing is faster than the sails alone.
  {
    const base = '?wd=60&ws=12&ms=20&js=25&cam=side-port';
    const sails = await openPage(phone, 'm12 sails alone', base);
    await sails.page.waitForTimeout(1500);
    const sailsKn = await speedKn(sails.page);
    await sails.context.close();
    const both = await openPage(phone, 'm12 motor-sailing', `${base}&eng=1&lv=66`);
    await both.page.waitForTimeout(1500);
    const bothKn = await speedKn(both.page);
    check(
      'motor-sailing: faster than the sails alone, at most 11 kn',
      bothKn > sailsKn && bothKn <= 11,
      `${bothKn} vs ${sailsKn}`,
    );
    await both.context.close();
  }
}
