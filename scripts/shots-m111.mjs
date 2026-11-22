// M111 (The captain on board): scenes and live checks for scripts/shots.mjs
// (PHASE_PEOPLE_SPEC 7.9). Joins the m73 group. Where he stands and the pose are unit tests
// (tests/people.test.ts); here only what needs the real 3D view and the taps. The live checks
// run on the test clock (shots.mjs passes `onTestClock`).
import path from 'node:path';
import { goToStation, helmView, setCamera, setSheet } from './ui.mjs';

const B = '?wd=60&ws=10&ms=40&js=60&held=1&sea=flat';

/** Screenshots at every size: the captain at the wheel, at Low detail, on the foredeck and at the mast. */
export const M111_SCENES = [
  { name: 'helm', query: `${B}&cam=side-port` },
  { name: 'helm-low', query: `${B}&cam=side-port&detail=low` },
  { name: 'bow', query: `${B}&mode=realistic&st=bow&cam=side-starboard` },
  { name: 'mast', query: `${B}&mode=realistic&st=mast&cam=side-port` },
].map((scene) => ({ ...scene, waitMs: 2500, sheet: 'peek' }));

export async function liveM111Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M111 ${what}: ${detail}`);
    console.log(`live M111 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const captain = (page) => page.evaluate(() => window.__sailDebug.captain());
  const near = (a, b) => Math.abs(a - b) <= 0.01;

  // 1. Easy ropes, port wheel: behind it, steering, in view.
  {
    const { context, page } = await openPage(phone, 'm111 steering', `${B}&cam=side-port&debug=1`, {
      testClock: true,
    });
    await setSheet(page, 'peek');
    await page.waitForTimeout(1500);
    const c = await captain(page);
    const visible = await page.evaluate(() => window.__sailDebug.partVisible('person_captain'));
    check(
      'at the port wheel, steering, in view',
      c !== null &&
        c.pose === 'steer' &&
        near(c.x, -7.85) &&
        near(c.z, -0.88) &&
        c.hidden === false &&
        visible === true,
      JSON.stringify({ c, visible }),
    );
    await shot(page, 'm111-live-steering');
    await context.close();
  }

  // 2. Through his eyes: hidden in the Helm view, also at the other wheel, back in a side view.
  {
    const { context, page } = await openPage(phone, 'm111 eyes', `${B}&cam=side-port&debug=1`, {
      testClock: true,
    });
    await page.waitForTimeout(800);
    await setCamera(page, 'helm');
    await page.waitForTimeout(1200);
    let c = await captain(page);
    let visible = await page.evaluate(() => window.__sailDebug.partVisible('person_captain'));
    check(
      'Helm view: hidden',
      c?.hidden === true && visible === false,
      JSON.stringify({ c, visible }),
    );
    // His invisible tap area is just ahead of the eye: a tap at the middle of the view must not open his card.
    const view = await page.locator('canvas.scene-canvas').boundingBox();
    await page.touchscreen.tap(view.x + view.width / 2, view.y + view.height * 0.3);
    await page.waitForTimeout(400);
    const cardText = (await page.getByTestId('info-card').isVisible())
      ? ((await page.getByTestId('info-card').textContent()) ?? '')
      : '';
    check(
      'Helm view: a tap ahead does not open his card',
      !cardText.includes('Captain (you)'),
      JSON.stringify(cardText.slice(0, 60)),
    );
    await helmView(page, 'other');
    await page.waitForTimeout(1200);
    c = await captain(page);
    check(
      'Other wheel: he stands behind the starboard wheel and stays hidden',
      c !== null && near(c.z, 0.88) && c.hidden === true,
      JSON.stringify(c),
    );
    await setCamera(page, 'side-port');
    await page.waitForTimeout(1200);
    c = await captain(page);
    check('side view: visible again', c?.hidden === false, JSON.stringify(c));
    await context.close();
  }

  // 3. Realistic ropes: he stands at the station and jumps when another is chosen.
  {
    const { context, page } = await openPage(
      phone,
      'm111 station',
      `${B}&mode=realistic&st=port&cam=top&debug=1`,
      { testClock: true },
    );
    await page.waitForTimeout(1000);
    let c = await captain(page);
    check(
      'Port station: beside the winch, standing',
      c !== null && near(c.x, -7.75) && near(c.z, -1.08) && c.pose === 'stand',
      JSON.stringify(c),
    );
    // M112: he walks there (about 19 s); the check waits for the arrival.
    await goToStation(page, 'bow');
    c = await captain(page);
    check(
      'Bow station: on the foredeck once he has walked',
      c !== null && near(c.x, 4.85),
      JSON.stringify(c),
    );
    await context.close();
  }

  // 4. A touch tap on his chest opens his card.
  {
    const { context, page } = await openPage(phone, 'm111 tap', `${B}&cam=side-port&debug=1`, {
      testClock: true,
    });
    await setSheet(page, 'peek');
    await page.waitForTimeout(1500);
    const p = await page.evaluate(() => window.__sailDebug.project(-7.85, 2.2, -0.88));
    const box = await page.locator('canvas.scene-canvas').boundingBox();
    await page.touchscreen.tap(box.x + p.x, box.y + p.y);
    await page.waitForTimeout(500);
    const card = page.getByTestId('info-card');
    const visible = await card.isVisible();
    const text = visible ? ((await card.textContent()) ?? '') : '';
    check(
      'a tap on him opens the card "Captain (you)"',
      visible && text.includes('Captain (you)'),
      JSON.stringify(text.slice(0, 80)),
    );
    await shot(page, 'm111-live-card');
    await context.close();
  }
}
