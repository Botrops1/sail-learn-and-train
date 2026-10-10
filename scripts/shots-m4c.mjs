// M4c (Realistic mode, part 2): scenes and live checks for scripts/shots.mjs.
// The live checks drive the WORKFLOW.md M4c checklist on a phone with real touch input
// (Chrome DevTools Protocol touch events, as a finger): the winch button with the strain bar,
// cranking the winch handle both ways (PT-19), and the slipping-furling-line scenario fixed at
// the Mast station. The foldable and desktop sizes repeat the mast crank with the mouse.
import path from 'node:path';
import { line, touchTools } from './shots-m4b.mjs';

/** Screenshots at every size. */
export const M4C_SCENES = [
  {
    name: 'mast-station-handle-in',
    query: '?mode=realistic&st=mast&hd=mast.w&gb=in&co=a3,b3&wd=60&ws=20&cam=side-port',
    scrollTo: '[data-testid="station-drawing-mast"]',
  },
  {
    name: 'mast-station-blocked-list',
    query: '?mode=realistic&st=mast&hd=c&gb=in&wd=60&ws=20&cam=side-port',
    scrollTo: '[data-testid="mast-status"]',
  },
  {
    name: 'starboard-handle-in-winch',
    query:
      '?mode=realistic&st=starboard&hd=starboard.w&wsb=a5.4.t&wd=90&ws=25&js=30&sel=rope_jib_sheet&cam=helm',
    centre: '[data-testid="station-drawing-starboard"] .real-drum',
  },
  {
    name: 'port-handle-slot-bar',
    query: '?mode=realistic&wd=90&ws=12&cam=helm',
    scrollTo: '[data-testid="handle-bar"]',
  },
];

const drawing = (station) => `[data-testid="station-drawing-${station}"]`;

/** Scrolls the panel so the part is in its middle, then lets it settle. */
async function centreOn(page, selector) {
  await page
    .locator(selector)
    .first()
    .evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(300);
}

/** A finger on the screen: down, moves, up, as separate steps (CDP touch events). */
function finger(cdp, page) {
  const send = (type, x, y) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }],
    });
  return {
    down: (p) => send('touchStart', p.x, p.y),
    async moveThrough(points, waitMs = 20) {
      for (const p of points) {
        await send('touchMove', p.x, p.y);
        await page.waitForTimeout(waitMs);
      }
    },
    up: (p) => send('touchEnd', p.x, p.y),
  };
}

/** Points circling `centre` from `from`, `turns` > 0 clockwise on screen, 24 points a turn. */
function arc(centre, from, turns) {
  const radius = Math.hypot(from.x - centre.x, from.y - centre.y);
  const a0 = Math.atan2(from.y - centre.y, from.x - centre.x);
  const steps = Math.ceil(24 * Math.abs(turns));
  return Array.from({ length: steps }, (_, i) => {
    const a = a0 + (Math.sign(turns) * (i + 1) * Math.abs(turns) * 2 * Math.PI) / steps;
    return { x: centre.x + radius * Math.cos(a), y: centre.y + radius * Math.sin(a) };
  });
}

export async function liveM4cChecks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M4c ${what}: ${detail}`);
    console.log(`live M4c ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const param = async (page, name) =>
    new URLSearchParams(await page.evaluate(() => window.location.search)).get(name);
  const settle = (page) => page.waitForTimeout(700);
  const strainShown = (page, station) =>
    page
      .locator(`${drawing(station)} .real-strain`)
      .evaluate((g) => g.getAttribute('visibility') === 'visible');
  const strainClass = (page, station) =>
    page.locator(`${drawing(station)} .real-strain-fill`).getAttribute('class');
  const phone = viewports[0];

  // 1. Strain bar: holding the winch button shows it; at the limit it is red and the motor cuts out.
  {
    const { context, page } = await openPage(
      phone,
      'm4c strain',
      '?mode=realistic&wd=90&ws=20&js=30&st=starboard&wsb=a5.4.t&sel=rope_jib_sheet&cam=helm',
    );
    await page.waitForTimeout(600);
    const cdp = await context.newCDPSession(page);
    const t = touchTools(cdp, page);
    const f = finger(cdp, page);
    await centreOn(page, `${drawing('starboard')} .real-drum`);
    check('strain bar hidden while the winch rests', !(await strainShown(page, 'starboard')), '');
    const button = await t.where(`${drawing('starboard')} .real-button-disc`);
    await f.down(button);
    await page.waitForTimeout(700);
    const shown = await strainShown(page, 'starboard');
    const strip = await page.getByTestId('real-strip').innerText();
    check('holding the button shows the strain bar', shown, `visible ${shown}`);
    check(
      'the strip says the winch load',
      /Winch load: about [\d.]+ kN of the 7\.0 kN/.test(strip),
      strip.split('\n').find((l) => l.startsWith('Winch load')) ?? 'no line',
    );
    await shot(page, 'live-phone-strain-holding-button');
    await f.up(button);
    await settle(page);
    check('letting go hides it', !(await strainShown(page, 'starboard')), '');
    await context.close();
  }
  {
    const { context, page } = await openPage(
      phone,
      'm4c strain limit',
      '?mode=realistic&ws=0&tl=0&vg=0&wp=b5.4.t&sel=rope_vang&cam=helm',
    );
    await page.waitForTimeout(600);
    const cdp = await context.newCDPSession(page);
    const t = touchTools(cdp, page);
    const f = finger(cdp, page);
    await centreOn(page, `${drawing('port')} .real-drum`);
    const button = await t.where(`${drawing('port')} .real-button-disc`);
    await f.down(button);
    await page.waitForTimeout(900);
    const cls = (await strainClass(page, 'port')) ?? '';
    const cut = await page.locator(`${drawing('port')} .real-button`).getAttribute('class');
    check('fighting rope: strain bar at the limit (red)', cls.includes('is-limit'), cls);
    check('and the motor has cut out', (cut ?? '').includes('is-cut-out'), cut ?? '');
    await shot(page, 'live-phone-strain-at-limit-cut-out');
    await f.up(button);
    await context.close();
  }

  // 2. PT-19: the handle in the starboard winch, jib sheet heavily loaded (25 kn).
  {
    const { context, page } = await openPage(
      phone,
      'm4c pt19',
      '?mode=realistic&wd=90&ws=25&js=30&st=starboard&wsb=a5.4.t&hd=starboard.w&sel=rope_jib_sheet&cam=helm',
    );
    await page.waitForTimeout(600);
    const cdp = await context.newCDPSession(page);
    const t = touchTools(cdp, page);
    const f = finger(cdp, page);
    const dr = drawing('starboard');
    await centreOn(page, `${dr} .real-drum`);
    const centre = await t.where(`${dr} .real-drum`);
    let grip = await t.where(`${dr} .real-crank`);
    // Clockwise (1st gear): the handle does not turn, the sheet stays.
    await f.down(grip);
    await f.moveThrough(arc(centre, grip, 3));
    const alert = await page.getByTestId('handle-bar').innerText();
    await shot(page, 'live-phone-pt19-clockwise-stalls');
    await f.up(grip);
    await settle(page);
    check(
      'PT-19 clockwise (1st gear) stalls on the loaded jib sheet',
      (await param(page, 'js')) === '30',
      `js ${await param(page, 'js')}`,
    );
    check(
      'the handle bar says to crank the other way',
      /Too heavy for 1st gear/.test(alert),
      alert.split('\n').find((l) => l.includes('heavy')) ?? 'no hint',
    );
    // Anticlockwise (2nd gear): it comes in slowly.
    grip = await t.where(`${dr} .real-crank`);
    await f.down(grip);
    await f.moveThrough(arc(centre, grip, -7));
    await shot(page, 'live-phone-pt19-anticlockwise-hauls');
    await f.up(grip);
    await settle(page);
    const js = Number(await param(page, 'js'));
    check(
      'PT-19 anticlockwise (2nd gear) brings the sheet in slowly',
      js < 30 && js > 15,
      `js 30 → ${js}`,
    );
    await context.close();
  }

  // 3. The slipping furling line, set up by the Practice button, fixed at the mast by hand.
  {
    const { context, page } = await openPage(phone, 'm4c scenario', '?mode=realistic&cam=helm');
    await page.waitForTimeout(600);
    const cdp = await context.newCDPSession(page);
    const t = touchTools(cdp, page);
    const f = finger(cdp, page);
    await page.locator('[data-testid="practice"] summary').scrollIntoViewIfNeeded();
    await page.locator('[data-testid="practice"] summary').tap();
    await page.getByTestId('practice-furl-slips').tap();
    await settle(page);
    check(
      'practice sets up the scenario',
      (await param(page, 'wsb')) === 'a2.1.t' && (await param(page, 'st')) === 'starboard',
      `st ${await param(page, 'st')}, wsb ${await param(page, 'wsb')}`,
    );
    await centreOn(page, `${drawing('starboard')} .real-drum`);
    const button = await t.where(`${drawing('starboard')} .real-button-disc`);
    await f.down(button);
    await page.waitForTimeout(900);
    const strip = await page.getByTestId('real-strip').innerText();
    await page.getByTestId('real-strip').scrollIntoViewIfNeeded();
    await shot(page, 'live-phone-furl-line-slips');
    await f.up(button);
    check(
      'the furling line slips on the winch',
      /Slipping on the drum/.test(strip),
      strip.split('\n').find((l) => l.includes('lipping')) ?? 'no hint',
    );
    check(
      'the main stays out',
      (await param(page, 'mf')) === '100',
      `mf ${await param(page, 'mf')}`,
    );

    // Fetch the handle from Port: tap it in the drawing (picks it up).
    await page.locator('.station-button[data-station="port"]').tap();
    await settle(page);
    await centreOn(page, `${drawing('port')} .real-slot`);
    const pocket = await t.where(`${drawing('port')} .real-slot-box`);
    await t.swipe([pocket, pocket]);
    await settle(page);
    check(
      'tap on the handle picks it up',
      (await param(page, 'hd')) === 'c',
      `hd ${await param(page, 'hd')}`,
    );
    // Walk to the mast, drag the handle into the socket, flip the switch.
    await page.locator('.station-button[data-station="mast"]').tap();
    await settle(page);
    const md = drawing('mast');
    await centreOn(page, md);
    const carried = await t.where(`${md} .real-slot-box`);
    const socket = await t.where(`${md} .real-socket`);
    await t.swipe(line(carried, socket, 12));
    await settle(page);
    check(
      'handle dragged into the gearbox socket',
      (await param(page, 'hd')) === 'mast.w',
      `hd ${await param(page, 'hd')}`,
    );
    // The switch is a toggle, IN to the left and OUT to the right (owner): a tap flips it,
    // a slide sets the side it goes to.
    const toggle = await t.where(`${md} [data-testid="gearbox-switch"] .real-switch-box`);
    const side = toggle.box.width / 3;
    await t.swipe([toggle, toggle]);
    await settle(page);
    check(
      'tap flips the switch from OUT to IN',
      (await param(page, 'gb')) === 'in',
      `gb ${await param(page, 'gb')}`,
    );
    await t.swipe(
      line({ x: toggle.x - side, y: toggle.y }, { x: toggle.x + side, y: toggle.y }, 6),
    );
    await settle(page);
    check(
      'slide right sets OUT',
      (await param(page, 'gb')) === null,
      `gb ${await param(page, 'gb')}`,
    );
    await shot(page, 'live-phone-mast-switch-out');
    await t.swipe(
      line({ x: toggle.x + side, y: toggle.y }, { x: toggle.x - side, y: toggle.y }, 6),
    );
    await settle(page);
    check(
      'slide left sets IN',
      (await param(page, 'gb')) === 'in',
      `gb ${await param(page, 'gb')}`,
    );
    // Crank: circle the grip.
    const centre = await t.where(`${md} .real-socket`);
    const grip = await t.where(`${md} .real-crank`);
    await f.down(grip);
    await f.moveThrough(arc(centre, grip, 6));
    await shot(page, 'live-phone-mast-cranking-in');
    await f.up(grip);
    await settle(page);
    const mf = Number(await param(page, 'mf'));
    check('cranking at the mast rolls the main in', mf < 100, `mf 100 → ${mf}`);
    await page.getByTestId('mast-status').scrollIntoViewIfNeeded();
    await shot(page, 'live-phone-mast-after-cranking');
    await context.close();
  }

  // M4b review leftovers: a wrong-way rope stays out of the jaw; shutting a clutch on a
  // running rope stops it with a warning.
  {
    const { context, page } = await openPage(
      phone,
      'm4c review',
      '?mode=realistic&wd=90&ws=12&wp=b5.-2.h&sel=rope_vang&cam=helm',
    );
    await page.waitForTimeout(600);
    const t = touchTools(await context.newCDPSession(page), page);
    const dr = drawing('port');
    await centreOn(page, `${dr} .real-drum`);
    const hand = await t.where(`${dr} [data-drag="hand"]`);
    const jaw = await t.where(`${dr} .real-jaw`);
    await t.swipe(line(hand, jaw, 10));
    await settle(page);
    const notice = await page
      .locator('.station-wrap[data-station="port"] .station-notice')
      .innerText();
    check(
      'wrong-way rope refused by the self-tailer',
      (await param(page, 'wp')) === 'b5.-2.h' && /wrong way/.test(notice),
      `wp ${await param(page, 'wp')} | ${notice}`,
    );
    await shot(page, 'live-phone-wrong-way-not-into-jaw');
    await context.close();
  }
  {
    const { context, page } = await openPage(
      phone,
      'm4c closed on running',
      '?mode=realistic&wd=90&ws=6&js=10&st=starboard&co=a5&sel=rope_jib_sheet&cam=helm',
    );
    // The link opens with the clutch open: at 6 kn the sheet runs out slowly. Shut it.
    const t = touchTools(await context.newCDPSession(page), page);
    const dr = drawing('starboard');
    await centreOn(page, `${dr} [data-key="a5"] .real-lever`);
    const lever = await t.where(`${dr} [data-key="a5"] .real-lever`);
    await t.swipe(line(lever, { x: lever.x, y: lever.y + 40 }, 4));
    await settle(page);
    const strip = await page.getByTestId('real-strip').innerText();
    const js = Number(await param(page, 'js'));
    check(
      'shutting the clutch on the running sheet warns',
      /strip its cover/.test(strip) && (await param(page, 'co')) === null,
      `co ${await param(page, 'co')}, js ${js} | ${strip.split('\n')[1]}`,
    );
    await page.getByTestId('real-strip').evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(300);
    await shot(page, 'live-phone-clutch-shut-on-running-rope');
    await context.close();
  }

  // Owner comments after M4c: a carried handle fills the hand (B); the handle comes out of a
  // winch only when its grip is dropped on the slot, never by cranking (C); a tap on the slot
  // takes the handle or lays it down (D); every place has a slot, always drawn.
  {
    const { context, page } = await openPage(
      phone,
      'm4c handle slot',
      '?mode=realistic&wd=90&ws=12&js=30&st=starboard&wsb=a5.4.t&hd=starboard.w&sel=rope_jib_sheet&cam=helm',
    );
    await page.waitForTimeout(600);
    const cdp = await context.newCDPSession(page);
    const t = touchTools(cdp, page);
    const f = finger(cdp, page);
    const dr = drawing('starboard');
    await centreOn(page, `${dr} .real-drum`);
    const drum = await t.where(`${dr} .real-drum`);
    const unit = drum.box.width / 66;
    const at = (dx, dy) => ({ x: drum.x + dx * unit, y: drum.y + dy * unit });
    const slotBox = `${dr} .real-slot-box`;
    const hd = async () => String(await param(page, 'hd'));
    // The slot is drawn even while the handle is in the winch (it is empty then).
    const empty = await page
      .locator(`${dr} .real-slot`)
      .evaluate((g) => g.classList.contains('is-empty'));
    check(
      'the slot is drawn while the handle is in the winch, and empty',
      (await page.locator(slotBox).isVisible()) && empty,
      `empty ${empty}`,
    );
    await shot(page, 'live-phone-slot-empty-handle-in-winch');
    // C: a wide, sloppy circle with the finger far outside the crank circle: the handle stays.
    let grip = await t.where(`${dr} .real-crank`);
    await f.down(grip);
    await f.moveThrough(arc(drum, at(0, -125), 2.5));
    await f.up(at(0, -125));
    await settle(page);
    check(
      'C: a wide circle while cranking does not take the handle out',
      (await hd()) === 'starboard.w',
      `hd ${await hd()}`,
    );
    // C: the grip dragged away and let go anywhere but on the slot: the handle stays in.
    grip = await t.where(`${dr} .real-crank`);
    await t.swipe(line(grip, at(-100, 45), 12));
    await settle(page);
    check(
      'C: the grip dropped away from the slot leaves the handle in the winch',
      (await hd()) === 'starboard.w',
      `hd ${await hd()}`,
    );
    // C: the grip dragged onto the slot: the handle comes out and lies there.
    grip = await t.where(`${dr} .real-crank`);
    let slot = await t.where(slotBox);
    await t.swipe(line(grip, slot, 14));
    await settle(page);
    check(
      'C: the grip dropped on the slot takes the handle out and lays it there',
      (await hd()) === 'starboard.s',
      `hd ${await hd()}`,
    );
    // D: a tap on the slot takes the handle.
    slot = await t.where(slotBox);
    await t.swipe([slot, slot]);
    await settle(page);
    check('D: tap on the slot takes the handle', (await hd()) === 'c', `hd ${await hd()}`);
    // B: with the handle in the hand a line end cannot be worked. (M5: the clutches are taller,
    // so the lever is scrolled into view first.)
    await page
      .locator(`${dr} [data-key="a5"] .real-lever`)
      .evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(250);
    const lever = await t.where(`${dr} [data-key="a5"] .real-lever`);
    await t.swipe(line(lever, { x: lever.x, y: lever.y - 40 }, 6));
    await settle(page);
    const notice = await page.locator(`${dr} ~ .station-notice`).innerText();
    check(
      'B: the Genoa sheet clutch cannot be opened with the handle in the hand',
      (await param(page, 'co')) === null && /holding the winch handle/.test(notice),
      `co ${await param(page, 'co')} | ${notice}`,
    );
    await shot(page, 'live-phone-handle-in-hand-refuses');
    // D: a tap on the slot lays it down here, another takes it, another lays it down.
    await page.locator(slotBox).evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(250);
    slot = await t.where(slotBox);
    await t.swipe([slot, slot]);
    await settle(page);
    check(
      'D: tap on the slot lays the carried handle down here',
      (await hd()) === 'starboard.s',
      `hd ${await hd()}`,
    );
    await shot(page, 'live-phone-slot-handle-lying');
    await t.swipe([slot, slot]);
    await settle(page);
    check('D: tap on it again takes it', (await hd()) === 'c', `hd ${await hd()}`);
    await t.swipe([slot, slot]);
    await settle(page);
    check('D: and again lays it down', (await hd()) === 'starboard.s', `hd ${await hd()}`);
    // With the handle laid down the line end works again.
    await page
      .locator(`${dr} [data-key="a5"] .real-lever`)
      .evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(250);
    const lever2 = await t.where(`${dr} [data-key="a5"] .real-lever`);
    await t.swipe(line(lever2, { x: lever2.x, y: lever2.y - 40 }, 6));
    await settle(page);
    check(
      'B: laid down, the clutch lever works',
      (await param(page, 'co'))?.includes('a5') === true,
      `co ${await param(page, 'co')}`,
    );
    await t.swipe(line(lever2, { x: lever2.x, y: lever2.y + 40 }, 6));
    await settle(page);
    // From the slot onto the drum: into the winch.
    await page.locator(`${dr} .real-drum`).evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(250);
    const drumNow = await t.where(`${dr} .real-drum`);
    slot = await t.where(slotBox);
    await t.swipe(line(slot, drumNow, 12));
    await settle(page);
    check(
      'the handle dragged from the slot onto the drum goes into the winch',
      (await hd()) === 'starboard.w',
      `hd ${await hd()}`,
    );
    await context.close();
  }
  {
    const { context, page } = await openPage(
      phone,
      'm4c handle out of the gearbox',
      '?mode=realistic&st=mast&hd=mast.w&gb=in&wd=60&ws=20&cam=side-port',
    );
    await page.waitForTimeout(600);
    const t = touchTools(await context.newCDPSession(page), page);
    const md = drawing('mast');
    await centreOn(page, md);
    const slotBox = `${md} .real-slot-box`;
    const hd = async () => String(await param(page, 'hd'));
    check(
      'the slot is drawn at the mast while the handle is in the gearbox',
      await page.locator(slotBox).isVisible(),
      '',
    );
    const grip = await t.where(`${md} .real-crank`);
    const slot = await t.where(slotBox);
    await t.swipe(line(grip, slot, 14));
    await settle(page);
    check(
      'C: the grip dropped on the slot takes the handle out of the gearbox',
      (await hd()) === 'mast.s',
      `hd ${await hd()}`,
    );
    await t.swipe([slot, slot]);
    await settle(page);
    check(
      'D: at the mast a tap on the slot takes the handle',
      (await hd()) === 'c',
      `hd ${await hd()}`,
    );
    await t.swipe([slot, slot]);
    await settle(page);
    check('D: and lays it down', (await hd()) === 'mast.s', `hd ${await hd()}`);
    await context.close();
  }
  {
    // The slot at the helm and at a place the handle is not at.
    const { context, page } = await openPage(
      phone,
      'm4c helm slot',
      '?mode=realistic&st=helm&hd=c&cam=helm',
    );
    await page.waitForTimeout(600);
    const t = touchTools(await context.newCDPSession(page), page);
    const slotBox = '[data-testid="slot-view"] .real-slot-box';
    check('the helm has a slot too', await page.locator(slotBox).isVisible(), '');
    const slot = await t.where(slotBox);
    await t.swipe([slot, slot]);
    await settle(page);
    check(
      'D: at the helm a tap on the slot lays the carried handle down',
      (await param(page, 'hd')) === 'helm.s',
      `hd ${await param(page, 'hd')}`,
    );
    await shot(page, 'live-phone-helm-slot');
    await page.locator('.station-button[data-station="starboard"]').tap();
    await settle(page);
    const away = await page
      .locator(`${drawing('starboard')} .real-slot`)
      .evaluate((g) => g.classList.contains('is-empty'));
    check('the slot is drawn, empty, where the handle is not', away, `empty ${away}`);
    await context.close();
  }

  // 4. The same crank with the mouse at the foldable and desktop sizes.
  for (const viewport of viewports.slice(1, 3)) {
    const { context, page } = await openPage(
      viewport,
      `m4c mast ${viewport.name}`,
      '?mode=realistic&st=mast&hd=mast.w&gb=in&co=a3,b3&wd=60&ws=20&cam=side-port',
    );
    await page.waitForTimeout(600);
    const md = drawing('mast');
    await page.locator(md).scrollIntoViewIfNeeded();
    const where = async (sel) => {
      const box = await page.locator(sel).first().boundingBox();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    };
    const centre = await where(`${md} .real-socket`);
    const grip = await where(`${md} .real-crank`);
    await page.mouse.move(grip.x, grip.y);
    await page.mouse.down();
    for (const p of arc(centre, grip, 5)) {
      await page.mouse.move(p.x, p.y);
      await page.waitForTimeout(20);
    }
    await shot(page, `live-${viewport.name}-mast-cranking-in`);
    await page.mouse.up();
    await settle(page);
    const mf = Number(await param(page, 'mf'));
    check(
      `${viewport.name}: mouse crank at the mast rolls the main in`,
      mf < 100,
      `mf 100 → ${mf}`,
    );
    await context.close();
  }
}
