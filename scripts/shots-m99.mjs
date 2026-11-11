// M99 (Easier camera control, PHASE_CAMERA_SPEC 5.8): live checks for scripts/shots.mjs, on the
// test clock. No scenes (the group is all gestures). Every page reads the pose from
// window.__sailDebug.cameraPose().
import { waitForLink } from './ui.mjs';

export const M99_SCENES = [];

const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };
const BASE = 'debug=1&sea=flat&cam=side-port';

export async function liveM99Checks({ openPage, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M99 ${what}: ${detail}`);
    console.log(`live M99 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const pose = (page) => page.evaluate(() => window.__sailDebug.cameraPose());
  const distanceOf = (p) => Math.hypot(...p.position.map((v, i) => v - p.target[i]));
  const moved = (a, b) => Math.hypot(...a.target.map((v, i) => v - b.target[i]));
  const direction = (p) => {
    const d = distanceOf(p);
    return p.position.map((v, i) => (v - p.target[i]) / d);
  };
  const canvasBox = (page) => page.locator('canvas.scene-canvas').boundingBox();
  const freeArea = (page) => page.evaluate(() => window.__sailCamera.freeArea());
  const open = async (viewport, what, query = BASE) => {
    const opened = await openPage(viewport, `m99 ${what}`, `?${query}`, { testClock: true });
    await opened.page.waitForTimeout(800);
    return opened;
  };
  /** Touch events through a CDP session (touchTools in shots-m4b.mjs only swipes with one finger). */
  const touch = (cdp, type, points) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  const point = (x, y, id = 1) => ({ x, y, id });

  // ---- Computer ----
  // 1. Zoom to the pointer.
  {
    const { context, page } = await open(DESKTOP, 'wheel');
    const box = await canvasBox(page);
    const before = await pose(page);
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.4);
    for (let i = 0; i < 5; i += 1) await page.mouse.wheel(0, -200);
    await page.waitForTimeout(800);
    const after = await pose(page);
    check(
      'the wheel at a corner zooms in and moves the target',
      distanceOf(after) < distanceOf(before) && moved(before, after) > 0.5,
      `distance ${distanceOf(before).toFixed(1)} → ${distanceOf(after).toFixed(1)}, target moved ${moved(before, after).toFixed(2)}`,
    );
    await context.close();
  }
  {
    const { context, page } = await open(DESKTOP, 'wheel centre');
    const box = await canvasBox(page);
    const area = await freeArea(page);
    const before = await pose(page);
    await page.mouse.move(box.x + box.width / 2, box.y + (area.top + area.bottom) / 2);
    for (let i = 0; i < 5; i += 1) await page.mouse.wheel(0, -200);
    await page.waitForTimeout(800);
    const after = await pose(page);
    check(
      'the wheel at the middle of the free area leaves the target',
      moved(before, after) < 0.3,
      `target moved ${moved(before, after).toFixed(3)}`,
    );
    await context.close();
  }

  // 2. Slide stops without a twist.
  {
    const { context, page } = await open(DESKTOP, 'slide limit');
    const box = await canvasBox(page);
    const before = await pose(page);
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.4);
    await page.mouse.down({ button: 'right' });
    for (let i = 1; i <= 30; i += 1) {
      await page.mouse.move(box.x + box.width * 0.8 - 40 * i, box.y + box.height * 0.4);
      await page.waitForTimeout(30);
    }
    await page.mouse.up({ button: 'right' });
    await page.waitForTimeout(800);
    const after = await pose(page);
    const [d0, d1] = [direction(before), direction(after)];
    const turn = Math.max(...d0.map((v, i) => Math.abs(v - d1[i])));
    check(
      'a long slide stops at the limit',
      Math.abs(after.target[0]) <= 25.001 && Math.abs(after.target[2]) <= 25.001,
      `target ${after.target.map((v) => v.toFixed(2)).join(', ')}`,
    );
    check('a long slide does not turn the view', turn < 0.01, `largest change ${turn.toFixed(4)}`);
    await context.close();
  }

  // 3. Middle drag slides.
  {
    const { context, page } = await open(DESKTOP, 'middle drag');
    const box = await canvasBox(page);
    const before = await pose(page);
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.4);
    await page.mouse.down({ button: 'middle' });
    for (let i = 1; i <= 10; i += 1) {
      await page.mouse.move(box.x + box.width * 0.6 - 10 * i, box.y + box.height * 0.4);
      await page.waitForTimeout(30);
    }
    await page.mouse.up({ button: 'middle' });
    await page.waitForTimeout(800);
    const after = await pose(page);
    const change = Math.abs(distanceOf(after) / distanceOf(before) - 1);
    check(
      'the middle button slides',
      moved(before, after) > 0.5 && change < 0.02,
      `target moved ${moved(before, after).toFixed(2)}, distance changed ${(change * 100).toFixed(2)} %`,
    );
    await context.close();
  }

  // 4. Shift + drag slides.
  {
    const { context, page } = await open(DESKTOP, 'shift drag');
    const box = await canvasBox(page);
    const before = await pose(page);
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.4);
    await page.keyboard.down('Shift');
    await page.mouse.down();
    for (let i = 1; i <= 10; i += 1) {
      await page.mouse.move(box.x + box.width * 0.6 - 10 * i, box.y + box.height * 0.4);
      await page.waitForTimeout(30);
    }
    await page.mouse.up();
    await page.keyboard.up('Shift');
    await page.waitForTimeout(800);
    const after = await pose(page);
    check(
      'Shift + left drag slides',
      moved(before, after) > 0.5,
      `target moved ${moved(before, after).toFixed(2)}`,
    );
    await context.close();
  }

  // 5. Stops above the water.
  {
    const { context, page } = await open(DESKTOP, 'low');
    const box = await canvasBox(page);
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.3);
    await page.mouse.down();
    for (let i = 1; i <= 20; i += 1) {
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.3 - 30 * i);
      await page.waitForTimeout(30);
    }
    await page.mouse.up();
    const heights = [];
    for (let i = 0; i < 10; i += 1) {
      await page.waitForTimeout(100);
      heights.push((await pose(page)).position[1]);
    }
    let jump = 0;
    for (let i = 1; i < heights.length; i += 1) {
      jump = Math.max(jump, Math.abs(heights[i] - heights[i - 1]));
    }
    check(
      'dragging up stops above the water and holds still',
      Math.min(...heights) >= 0.299 && jump < 0.05,
      `lowest ${Math.min(...heights).toFixed(3)} m, largest change ${jump.toFixed(3)} m`,
    );
    await context.close();
  }

  // 6. No jump at the hull.
  {
    const { context, page } = await open(DESKTOP, 'hull');
    const box = await canvasBox(page);
    await page.evaluate(() => window.__sailDebug.setView([0, 1.5, 4], [0, 1, 0]));
    await page.waitForTimeout(300);
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.3);
    await page.mouse.down();
    let previous = (await pose(page)).position[1];
    let jump = 0;
    for (let i = 1; i <= 20; i += 1) {
      await page.mouse.move(box.x + box.width * 0.4 + 15 * i, box.y + box.height * 0.3);
      await page.waitForTimeout(60);
      const y = (await pose(page)).position[1];
      jump = Math.max(jump, Math.abs(y - previous));
      previous = y;
    }
    await page.mouse.up();
    check(
      'orbiting close to the hull has no jump',
      jump < 0.5,
      `largest change of y ${jump.toFixed(3)} m`,
    );
    await context.close();
  }

  // 7. Double-click on the water centres.
  {
    const { context, page } = await open(DESKTOP, 'dblclick water');
    const box = await canvasBox(page);
    const area = await freeArea(page);
    const x = box.x + box.width * 0.5;
    const y = box.y + area.top + 0.9 * (area.bottom - area.top);
    await page.mouse.dblclick(x, y);
    await page.waitForTimeout(800);
    const after = await pose(page);
    check(
      'a double-click on the water brings the target down',
      after.target[1] < 0.5,
      `target y ${after.target[1].toFixed(2)}`,
    );
    let link;
    try {
      link = await waitForLink(page, ['cam=free']);
    } catch (error) {
      link = String(error);
    }
    check('the link says cam=free', link.includes('cam=free'), link);
    const chip = ((await page.getByTestId('camera-chip').textContent()) ?? '').trim();
    check('the camera chip reads Free', chip.includes('Free'), chip);
    await context.close();
  }

  // 8 and 9. Double-click on a part centres and selects it; a single click only selects.
  const partSpot = async (page) => {
    const box = await canvasBox(page);
    const area = await freeArea(page);
    const centres = await page.evaluate(() => window.__sailDebug.hitCentres());
    const c = centres.find(
      (h) =>
        h.partId.startsWith('fit_') &&
        h.x > 0 &&
        h.x < box.width &&
        h.y > area.top &&
        h.y < area.bottom,
    );
    return c ? { x: box.x + c.x, y: box.y + c.y } : null;
  };
  {
    const { context, page } = await open(DESKTOP, 'dblclick part');
    const spot = await partSpot(page);
    check('a fitting is in the free area', Boolean(spot), JSON.stringify(spot));
    if (spot) {
      const before = await pose(page);
      await page.mouse.dblclick(spot.x, spot.y);
      await page.waitForTimeout(800);
      const after = await pose(page);
      let link;
      try {
        link = await waitForLink(page, ['sel=']);
      } catch (error) {
        link = String(error);
      }
      check('a double-click on a part selects it', link.includes('sel='), link);
      check(
        'a double-click on a part centres on it (on the boat)',
        moved(before, after) > 1 && after.target[1] > 0.5,
        `target moved ${moved(before, after).toFixed(2)}, y ${after.target[1].toFixed(2)}`,
      );
    }
    await context.close();
  }
  {
    const { context, page } = await open(DESKTOP, 'click part');
    const spot = await partSpot(page);
    if (spot) {
      const before = await pose(page);
      await page.mouse.click(spot.x, spot.y);
      await page.waitForTimeout(800);
      const after = await pose(page);
      let link;
      try {
        link = await waitForLink(page, ['sel=']);
      } catch (error) {
        link = String(error);
      }
      check('a single click selects', link.includes('sel='), link);
      check(
        'a single click does not move the target',
        moved(before, after) < 0.01,
        `${moved(before, after).toFixed(4)}`,
      );
    }
    await context.close();
  }

  // 10. Help line (mouse words).
  {
    const { context, page } = await open(DESKTOP, 'help mouse');
    await page.getByTestId('camera-chip').click();
    const hint = (await page.locator('.camera-menu-hint').textContent()) ?? '';
    check(
      'the menu hint names the wheel',
      hint.includes('wheel to zoom towards the pointer'),
      hint,
    );
    await context.close();
  }

  // ---- Phone ----
  // 11. Pinch towards the fingers.
  {
    const { context, page } = await open(PHONE, 'pinch');
    const box = await canvasBox(page);
    const cdp = await context.newCDPSession(page);
    const before = await pose(page);
    const y = box.y + 250;
    await touch(cdp, 'touchStart', [point(box.x + 80, y, 1), point(box.x + 170, y, 2)]);
    for (let i = 1; i <= 10; i += 1) {
      await touch(cdp, 'touchMove', [
        point(box.x + 80 - 8 * i, y, 1),
        point(box.x + 170 + 8 * i, y, 2),
      ]);
      await page.waitForTimeout(30);
    }
    await touch(cdp, 'touchEnd', []);
    await page.waitForTimeout(800);
    const after = await pose(page);
    check(
      'a pinch zooms in and moves the target',
      distanceOf(after) < distanceOf(before) && moved(before, after) > 0.5,
      `distance ${distanceOf(before).toFixed(1)} → ${distanceOf(after).toFixed(1)}, target moved ${moved(before, after).toFixed(2)}`,
    );
    await context.close();
  }

  // 12. Double-tap on the water.
  {
    const { context, page } = await open(PHONE, 'double tap');
    const box = await canvasBox(page);
    const area = await freeArea(page);
    const cdp = await context.newCDPSession(page);
    // Water to the side of the far-away boat and above the info card: the first tap selects the water
    // and its card then covers the lower part of the view, so a second tap there would hit the card.
    const x = box.x + 285;
    const y = box.y + area.bottom - 130;
    for (let i = 0; i < 2; i += 1) {
      await touch(cdp, 'touchStart', [point(x, y)]);
      await touch(cdp, 'touchEnd', []);
    }
    await page.waitForTimeout(800);
    const after = await pose(page);
    check(
      'a double-tap on the water brings the target down',
      after.target[1] < 0.5,
      `target y ${after.target[1].toFixed(2)}`,
    );
    let link;
    try {
      link = await waitForLink(page, ['cam=free']);
    } catch (error) {
      link = String(error);
    }
    check('the link says cam=free', link.includes('cam=free'), link);
    await context.close();
  }

  // 12b. Double-tap a winch in the opening view (review of the PR): the first tap opens the info card, which
  //      covers the boat on a phone; the card lets the second tap through, so the camera centres on the winch.
  {
    const { context, page } = await open(PHONE, 'double tap winch');
    const box = await canvasBox(page);
    const area = await freeArea(page);
    const cdp = await context.newCDPSession(page);
    const centre = await page.evaluate(() =>
      window.__sailDebug.hitCentres().find((h) => h.partId === 'winch_primary_port'),
    );
    const inside =
      centre &&
      centre.x > 0 &&
      centre.x < box.width &&
      centre.y > area.top &&
      centre.y < area.bottom;
    check('the port winch is in the free area', Boolean(inside), JSON.stringify(centre));
    if (inside) {
      const before = await pose(page);
      for (let i = 0; i < 2; i += 1) {
        await touch(cdp, 'touchStart', [point(box.x + centre.x, box.y + centre.y)]);
        await touch(cdp, 'touchEnd', []);
      }
      await page.waitForTimeout(800);
      const after = await pose(page);
      check(
        'a double-tap on the winch centres on it (on the boat)',
        moved(before, after) > 1 && after.target[1] > 0.5,
        `target moved ${moved(before, after).toFixed(2)}, y ${after.target[1].toFixed(2)}`,
      );
      let link;
      try {
        link = await waitForLink(page, ['cam=free', 'sel=']);
      } catch (error) {
        link = String(error);
      }
      check('the link says cam=free and names a part', link.includes('cam=free'), link);
      // The card takes taps again once the window has passed.
      const cardHit = await page.evaluate(() => {
        const card = document.querySelector('[data-testid="info-card"]');
        return card ? getComputedStyle(card).pointerEvents : 'none-element';
      });
      check('the info card takes taps again after the window', cardHit === 'auto', cardHit);
    }
    await context.close();
  }

  // 13. Help line (touch words).
  {
    const { context, page } = await open(PHONE, 'help touch');
    await page.getByTestId('camera-chip').tap();
    const hint = (await page.locator('.camera-menu-hint').textContent()) ?? '';
    check('the menu hint names one finger', hint.includes('one finger turns'), hint);
    await context.close();
  }

  // 14. Russian.
  {
    const { context, page } = await open(PHONE, 'help ru', `${BASE}&lang=ru`);
    await page.getByTestId('camera-chip').tap();
    const hint = (await page.locator('.camera-menu-hint').textContent()) ?? '';
    check('the Russian hint names one finger', hint.includes('один палец'), hint);
    const menu = await page.getByTestId('camera-menu').boundingBox();
    const fits =
      menu &&
      menu.x >= 0 &&
      menu.y >= 0 &&
      menu.x + menu.width <= PHONE.width &&
      menu.y + menu.height <= PHONE.height;
    check('the Russian menu fits on the screen', Boolean(fits), JSON.stringify(menu));
    await context.close();
  }
}
