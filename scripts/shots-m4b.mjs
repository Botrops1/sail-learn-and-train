// M4b (Realistic mode, part 1): scenes and live checks for scripts/shots.mjs.
// The live checks drive the WORKFLOW.md M4b checklist with real gestures where the app has
// them (lever drags, tail onto the winch, circling the drum, the jaw, the button).
import path from 'node:path';

/** Screenshots at every size. */
export const M4B_SCENES = [
  { name: 'port-station-helm', query: '?mode=realistic&wd=90&ws=12&cam=helm' },
  {
    name: 'starboard-jib-on-winch',
    query: '?mode=realistic&wd=90&ws=20&js=30&st=starboard&wsb=a5.3.t&sel=rope_jib_sheet&cam=helm',
  },
  {
    name: 'port-vang-wrong-way',
    query: '?mode=realistic&wd=90&ws=12&co=b5&wp=b5.-2.h&sel=rope_vang&cam=side-port',
  },
  {
    name: 'port-strip-buttons',
    query: '?mode=realistic&wd=90&ws=12&wp=b5.2.h&co=b2&sel=rope_vang&cam=side-port',
    scrollTo: '[data-testid="real-strip"]',
  },
  { name: 'helm-station', query: '?mode=realistic&st=helm&sel=part_rudder&rd=15&cam=helm' },
];

/** Centre of an element in page coordinates. */
async function centre(page, selector) {
  // The panel scrolls inside itself: bring the part on screen first (the mouse does not scroll).
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
}

/** Drags with the mouse through the given points (page coordinates). */
async function dragPath(page, points, { holdMs = 0 } = {}) {
  const [first, ...rest] = points;
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const p of rest) await page.mouse.move(p.x, p.y, { steps: 3 });
  if (holdMs) await page.waitForTimeout(holdMs);
  await page.mouse.up();
}

const drawing = (station) => `[data-testid="station-drawing-${station}"]`;

/** The station drawing's parts. */
const lever = (station, key) => `${drawing(station)} [data-key="${key}"] .real-lever`;
const knob = (station, key) => `${drawing(station)} [data-drag="tail:${key}"]`;
const drum = (station) => `${drawing(station)} .real-drum`;
const jaw = (station) => `${drawing(station)} .real-jaw`;
const handKnob = (station) => `${drawing(station)} [data-drag="hand"]`;
const winchButton = (station) => `${drawing(station)} .real-button-disc`;

/**
 * Scrolls the panel so the Vang clutch body is near the top and the "in your hand" knob is
 * still on screen, then returns both centres (page coordinates).
 */
async function handAndClutch(page, where) {
  await page.locator(`${drawing('port')} .real-drum`).scrollIntoViewIfNeeded();
  const clutchSel = `${drawing('port')} [data-key="b5"] .clutch-body`;
  const top = await page.locator('.panel-body').evaluate((el) => el.getBoundingClientRect().top);
  const clutch = await where(clutchSel);
  await page.locator('.panel-body').evaluate(
    (el, delta) => {
      el.scrollTop += delta;
    },
    clutch.y - (top + 70),
  );
  await page.waitForTimeout(200);
  return { hand: await where(handKnob('port')), clutch: await where(clutchSel) };
}

async function circleDrum(page, station, turns) {
  const { x, y, box } = await centre(page, drum(station));
  const radius = box.width / 2 + 10;
  const steps = 24;
  const sweep = Math.abs(turns) * 2 * Math.PI + 0.5;
  const sign = turns > 0 ? 1 : -1;
  const points = [];
  for (let i = 0; i <= Math.ceil((steps * sweep) / (2 * Math.PI)); i += 1) {
    const a = -Math.PI / 2 + (sign * i * 2 * Math.PI) / steps;
    points.push({ x: x + radius * Math.cos(a), y: y + radius * Math.sin(a) });
  }
  await dragPath(page, points);
}

/**
 * Real touch input (Chrome DevTools Protocol), as a finger on a phone: the mouse does not show
 * what the browser does with a touch. Found on the owner's phone after M4b: the browser took
 * the touch over to scroll the panel and cancelled every drag in the drawing.
 */
function touchTools(cdp, page) {
  const send = (type, x, y) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }],
    });
  const where = async (selector) => {
    const box = await page.locator(selector).first().boundingBox();
    if (!box) throw new Error(`no box for ${selector}`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
  };
  return {
    where,
    /** Finger down at the first point, along the rest, up at the last. */
    async swipe(points, { hold = 0 } = {}) {
      const [first, ...rest] = points;
      await send('touchStart', first.x, first.y);
      for (const p of rest) {
        await send('touchMove', p.x, p.y);
        await page.waitForTimeout(20);
      }
      if (hold) await page.waitForTimeout(hold);
      const last = rest.at(-1) ?? first;
      await send('touchEnd', last.x, last.y);
    },
  };
}

/** Points along a line from a to b. */
function line(a, b, steps = 10) {
  return Array.from({ length: steps + 1 }, (_, i) => ({
    x: a.x + ((b.x - a.x) * i) / steps,
    y: a.y + ((b.y - a.y) * i) / steps,
  }));
}

/** Points on a circle round (x, y), turns > 0 clockwise on screen, starting at the top. */
function circle(x, y, radius, turns) {
  const steps = Math.ceil(24 * Math.abs(turns)) + 2;
  const sign = turns > 0 ? 1 : -1;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = -Math.PI / 2 + sign * (i / steps) * Math.abs(turns) * 2 * Math.PI;
    return { x: x + radius * Math.cos(a), y: y + radius * Math.sin(a) };
  });
}

/**
 * The M4b checklist with a finger: lever, tail onto the winch, turns, self-tailer, the button,
 * and the panel still scrolling when the finger starts on empty space (not on a part).
 */
export async function liveM4bTouchChecks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M4b touch ${what}: ${detail}`);
    console.log(`live M4b touch ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const { context, page } = await openPage(
    phone,
    'm4b touch',
    '?mode=realistic&wd=90&ws=12&cam=side-port',
  );
  await page.waitForTimeout(600);
  const t = touchTools(await context.newCDPSession(page), page);
  const param = async (name) =>
    new URLSearchParams(await page.evaluate(() => window.location.search)).get(name);
  const settle = () => page.waitForTimeout(700);
  const dr = drawing('port');
  // Scroll the drum into view first: positions are measured after the panel stops moving.
  const ready = () => page.locator(`${dr} .real-drum`).scrollIntoViewIfNeeded();

  // Lever up opens, down closes (PT-15).
  await ready();
  let p = await t.where(lever('port', 'b5'));
  await t.swipe(line(p, { x: p.x, y: p.y - 40 }, 6));
  await settle();
  check('lever up opens the Vang clutch', (await param('co')) === 'b5', await param('co'));
  p = await t.where(lever('port', 'b5'));
  await t.swipe(line(p, { x: p.x, y: p.y + 40 }, 6));
  await settle();
  check('lever down closes it', (await param('co')) === null, String(await param('co')));

  // A tap on the tail selects its rope.
  await ready();
  p = await t.where(knob('port', 'b5'));
  await t.swipe([p, p]);
  await settle();
  check(
    'tap on the tail selects the vang',
    (await param('sel')) === 'rope_vang',
    String(await param('sel')),
  );

  // Tail onto the winch, two turns clockwise, one back, into the self-tailer.
  await ready();
  p = await t.where(knob('port', 'b5'));
  let d = await t.where(drum('port'));
  await t.swipe(line(p, d, 12));
  await settle();
  check('tail dragged onto the winch', (await param('wp')) === 'b5.0.h', String(await param('wp')));
  // With 0 turns, dragging the rope back to its clutch takes it off the winch; then back on.
  let hc = await handAndClutch(page, t.where);
  await t.swipe(line(hc.hand, hc.clutch, 14));
  await settle();
  check(
    '0 turns: rope dragged back to its clutch comes off the winch',
    (await param('wp')) === null,
    String(await param('wp')),
  );
  await ready();
  p = await t.where(knob('port', 'b5'));
  d = await t.where(drum('port'));
  await t.swipe(line(p, d, 12));
  await settle();
  check('and onto the winch again', (await param('wp')) === 'b5.0.h', String(await param('wp')));
  await ready();
  d = await t.where(drum('port'));
  const ring = d.box.width / 2 + 10;
  await t.swipe(circle(d.x, d.y, ring, 2));
  await settle();
  check('two turns clockwise', (await param('wp')) === 'b5.2.h', String(await param('wp')));
  await ready();
  d = await t.where(drum('port'));
  await t.swipe(circle(d.x, d.y, ring, -1));
  await settle();
  check('one turn back anticlockwise', (await param('wp')) === 'b5.1.h', String(await param('wp')));
  // With a turn on the drum the same gesture is refused with a message.
  hc = await handAndClutch(page, t.where);
  await t.swipe(line(hc.hand, hc.clutch, 14));
  await page.waitForTimeout(400);
  const refusal = await page.locator('[data-station="port"] .station-notice').innerText();
  check(
    '1 turn: dragging it back is refused with a message',
    (await param('wp')) === 'b5.1.h' && /turns off first/i.test(refusal),
    `${await param('wp')} | ${refusal}`,
  );
  await page.screenshot({
    path: path.join(outDir, `${prefix}live-phone-take-off-needs-zero-turns.png`),
  });
  await ready();
  d = await t.where(drum('port'));
  await t.swipe(circle(d.x, d.y, ring, 1));
  // The "in your hand" knob sits low in the drawing: bring it fully on screen first.
  await page.locator(handKnob('port')).scrollIntoViewIfNeeded();
  p = await t.where(handKnob('port'));
  const j = await t.where(jaw('port'));
  await t.swipe(line(p, j, 10));
  await settle();
  check('tail into the self-tailer', (await param('wp')) === 'b5.2.t', String(await param('wp')));

  // Hold the button: the vang comes in; lift the finger: it stops.
  await ready();
  const before = Number(await param('vg'));
  const b = await t.where(winchButton('port'));
  await t.swipe([b, b], { hold: 900 });
  await settle();
  const after = Number(await param('vg'));
  await page.waitForTimeout(800);
  const later = Number(await param('vg'));
  check(
    'button held by a finger hauls the vang, letting go stops it',
    after < before && later === after,
    `vg ${before} → ${after} → ${later}`,
  );
  await page.screenshot({ path: path.join(outDir, `${prefix}live-phone-touch-vang-on-winch.png`) });

  // The panel still scrolls when the finger starts on the body of a clutch (only its lever is
  // dragged), and that scroll does not select the clutch.
  const body = page.locator('.panel-body');
  await body.evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.waitForTimeout(200);
  const spot = await t.where(`${dr} [data-key="b2"] .clutch-body`);
  const selBefore = await param('sel');
  await t.swipe(line({ x: spot.x, y: spot.y + 30 }, { x: spot.x, y: spot.y - 200 }, 12));
  await page.waitForTimeout(500);
  const scrolled = await body.evaluate((el) => el.scrollTop);
  check('panel still scrolls from a clutch body', scrolled > 40, `scrollTop ${scrolled}`);
  check(
    'that scroll does not select the clutch',
    (await param('sel')) === selBefore,
    `${selBefore} → ${await param('sel')}`,
  );
  // A plain tap on a clutch body does select it.
  await body.evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.waitForTimeout(200);
  const body2 = await t.where(`${dr} [data-key="b2"] .clutch-body`);
  await t.swipe([body2, body2]);
  await settle();
  check(
    'tap on a clutch body selects it',
    (await param('sel')) === 'rope_topping_lift',
    String(await param('sel')),
  );
  await context.close();
}

export async function liveM4bChecks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M4b ${what}: ${detail}`);
    console.log(`live M4b ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const search = (page) => page.evaluate(() => window.location.search);
  const param = async (page, name) => new URLSearchParams(await search(page)).get(name);
  const num = async (page, name) => Number(await param(page, name));
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const stripText = (page) => page.getByTestId('real-strip').innerText();
  const notice = (page, station) =>
    page.locator(`[data-station="${station}"] .station-notice`).innerText();
  const settleUrl = (page) => page.waitForTimeout(700);

  for (const viewport of [viewports[0], viewports[2]]) {
    const v = viewport.name;
    const { context, page } = await openPage(
      viewport,
      `m4b ${v}`,
      '?mode=realistic&wd=90&ws=12&cam=helm',
    );
    await page.waitForTimeout(600);

    // Three stations; only the chosen one is shown.
    const stations = await page.locator('.station-button').allInnerTexts();
    check(`${v} three stations`, stations.join('|') === 'Port|Starboard|Helm', stations.join('|'));

    // PT-15: drag the Vang lever up (open) and down (closed).
    await page.locator(drawing('port')).scrollIntoViewIfNeeded();
    let p = await centre(page, lever('port', 'b5'));
    await dragPath(page, [p, { x: p.x, y: p.y - 40 }]);
    await settleUrl(page);
    check(`${v} vang lever up opens`, (await param(page, 'co')) === 'b5', await search(page));
    p = await centre(page, lever('port', 'b5'));
    await dragPath(page, [p, { x: p.x, y: p.y + 40 }]);
    await settleUrl(page);
    check(`${v} vang lever down closes`, (await param(page, 'co')) === null, await search(page));

    // Closed: dragging the vang tail out does nothing and says "open the clutch".
    const vgBefore = await num(page, 'vg');
    p = await centre(page, knob('port', 'b5'));
    await dragPath(page, [p, { x: p.x + 10, y: p.y + 30 }, { x: p.x + 30, y: p.y + 60 }]);
    await page.waitForTimeout(400);
    const said = await notice(page, 'port');
    check(
      `${v} PT-15 closed clutch: tail drag does nothing`,
      /open the clutch/i.test(said) && (await num(page, 'vg')) === vgBefore,
      said,
    );
    await shot(page, `live-${v}-pt15-open-the-clutch`);

    // Tail onto the winch, circle clockwise twice, then anticlockwise once.
    p = await centre(page, knob('port', 'b5'));
    const d = await centre(page, drum('port'));
    await dragPath(page, [p, { x: (p.x + d.x) / 2, y: (p.y + d.y) / 2 }, d]);
    await settleUrl(page);
    check(`${v} vang onto the winch`, (await param(page, 'wp')) === 'b5.0.h', await search(page));
    // 0 turns: back to its clutch takes it off; then on again.
    let hc = await handAndClutch(page, (sel) => centre(page, sel));
    await dragPath(page, [
      hc.hand,
      { x: (hc.hand.x + hc.clutch.x) / 2, y: (hc.hand.y + hc.clutch.y) / 2 },
      hc.clutch,
    ]);
    await settleUrl(page);
    check(
      `${v} 0 turns: back to its clutch comes off the winch`,
      (await param(page, 'wp')) === null,
      await search(page),
    );
    p = await centre(page, knob('port', 'b5'));
    const d2 = await centre(page, drum('port'));
    await dragPath(page, [p, { x: (p.x + d2.x) / 2, y: (p.y + d2.y) / 2 }, d2]);
    await settleUrl(page);
    check(
      `${v} and onto the winch again`,
      (await param(page, 'wp')) === 'b5.0.h',
      await search(page),
    );
    await circleDrum(page, 'port', 2);
    await settleUrl(page);
    check(`${v} two turns clockwise`, (await param(page, 'wp')) === 'b5.2.h', await search(page));
    await shot(page, `live-${v}-vang-two-turns`);
    await circleDrum(page, 'port', -1);
    await settleUrl(page);
    check(
      `${v} anticlockwise takes one off`,
      (await param(page, 'wp')) === 'b5.1.h',
      await search(page),
    );
    // 1 turn: the same drag is refused with a message and the rope stays on the winch.
    hc = await handAndClutch(page, (sel) => centre(page, sel));
    await dragPath(page, [
      hc.hand,
      { x: (hc.hand.x + hc.clutch.x) / 2, y: (hc.hand.y + hc.clutch.y) / 2 },
      hc.clutch,
    ]);
    await page.waitForTimeout(400);
    const refusal = await page.locator('[data-station="port"] .station-notice').innerText();
    check(
      `${v} 1 turn: refused with a message`,
      (await param(page, 'wp')) === 'b5.1.h' && /turns off first/i.test(refusal),
      `${await param(page, 'wp')} | ${refusal}`,
    );
    await circleDrum(page, 'port', 1);

    // Into the self-tailer, hold the button: the vang comes in; let go: it stops.
    p = await centre(page, handKnob('port'));
    const j = await centre(page, jaw('port'));
    await dragPath(page, [p, { x: (p.x + j.x) / 2, y: (p.y + j.y) / 2 }, j]);
    await settleUrl(page);
    check(
      `${v} tail into the self-tailer`,
      (await param(page, 'wp')) === 'b5.2.t',
      await search(page),
    );
    const b = await centre(page, winchButton('port'));
    await page.mouse.move(b.x, b.y);
    await page.mouse.down();
    await page.waitForTimeout(900);
    await shot(page, `live-${v}-vang-winching`);
    await page.mouse.up();
    await settleUrl(page);
    const vgAfter = await num(page, 'vg');
    await page.waitForTimeout(800);
    const vgLater = await num(page, 'vg');
    check(
      `${v} button hauls the vang in, letting go stops it`,
      vgAfter < vgBefore && vgLater === vgAfter,
      `vg ${vgBefore} → ${vgAfter} → ${vgLater}`,
    );
    await context.close();
  }

  const phone = viewports[0];

  // PT-18: Genoa sheet, nothing on the winch, open the clutch: runs fast at 20 kn, not at 4 kn.
  for (const ws of [20, 4]) {
    const { context, page } = await openPage(
      phone,
      `m4b pt18 ${ws}`,
      `?mode=realistic&wd=90&ws=${ws}&js=30&st=starboard&sel=rope_jib_sheet&cam=top`,
    );
    await page.waitForTimeout(500);
    await page.getByTestId('act-clutch').click();
    await page.waitForTimeout(ws === 20 ? 150 : 400);
    const text = await stripText(page);
    if (ws === 20) {
      await shot(page, 'live-phone-pt18-jib-sheet-running');
      check('PT-18 running shows', /RUNNING OUT/.test(text), text.split('\n')[1]);
    }
    await page.waitForTimeout(1500);
    const js = Number(/Jib sheet: (\d+) %/.exec(await stripText(page))?.[1]);
    check(`PT-18 at ${ws} kn`, ws === 20 ? js > 90 : js < 35, `js ${js}`);
    if (ws === 20) await shot(page, 'live-phone-pt18-jib-flew-out');
    await context.close();
  }

  // PT-16 and PT-17 with the strip's buttons: turns, tail in hand, open the clutch.
  const jibOnWinch = async (ws, turns) => {
    const { context, page } = await openPage(
      phone,
      `m4b pt16 ${ws} ${turns}`,
      `?mode=realistic&wd=90&ws=${ws}&js=30&st=starboard&sel=rope_jib_sheet&cam=top`,
    );
    await page.waitForTimeout(400);
    await page.getByTestId('act-winch').click();
    for (let i = 0; i < Math.abs(turns); i += 1) {
      await page.getByTestId(turns > 0 ? 'act-add-turn' : 'act-remove-turn').click();
    }
    await page.getByTestId('act-clutch').click();
    return { context, page };
  };
  const jibPct = async (page) => Number(/Jib sheet: (\d+) %/.exec(await stripText(page))?.[1]);
  {
    const { context, page } = await jibOnWinch(20, 2);
    await page.waitForTimeout(250);
    const text = await stripText(page);
    await page.waitForTimeout(800);
    check(
      'PT-16 2 turns at 20 kn slip',
      /Slipping/.test(text) && (await jibPct(page)) > 40,
      text.split('\n')[1],
    );
    await context.close();
  }
  {
    const { context, page } = await jibOnWinch(20, 3);
    await page.waitForTimeout(1000);
    check('PT-16 3 turns at 20 kn hold', (await jibPct(page)) === 30, `js ${await jibPct(page)}`);
    await shot(page, 'live-phone-pt16-three-turns-hold');
    await context.close();
  }
  {
    const { context, page } = await jibOnWinch(12, 2);
    await page.waitForTimeout(300);
    const ease = await centre(page, '[data-testid="act-ease"]');
    await page.mouse.move(ease.x, ease.y);
    await page.mouse.down();
    await page.waitForTimeout(1500);
    const text = await stripText(page);
    await page.mouse.up();
    await page.waitForTimeout(500);
    check(
      'PT-16 2 turns at 12 kn ease smoothly',
      (await jibPct(page)) > 32 && !/jerks/.test(text),
      `js ${await jibPct(page)} | ${text.split('\n')[1]}`,
    );
    await shot(page, 'live-phone-pt16-easing-two-turns');
    await context.close();
  }
  {
    const { context, page } = await jibOnWinch(20, -3);
    await page.waitForTimeout(150);
    const text = await stripText(page);
    await shot(page, 'live-phone-pt17-wrong-way');
    check('PT-17 anticlockwise runs', /wrong way/i.test(text), text.split('\n')[1]);
    await context.close();
  }

  // PT-19a: vang and topping lift fighting, vang on the winch, hold the button: cut out.
  {
    const { context, page } = await openPage(
      phone,
      'm4b pt19a',
      '?mode=realistic&ws=0&tl=0&vg=0&wp=b5.4.t&sel=rope_vang&cam=side-port',
    );
    await page.waitForTimeout(500);
    const button = await centre(page, '[data-testid="act-button"]');
    await page.mouse.move(button.x, button.y);
    await page.mouse.down();
    await page.waitForTimeout(800);
    const text = await stripText(page);
    await page.locator(drawing('port')).scrollIntoViewIfNeeded();
    await shot(page, 'live-phone-pt19a-cut-out');
    await page.mouse.up();
    check(
      'PT-19a cut out, fighting hint',
      /cut out/i.test(text) && /fighting/i.test(text),
      text.split('\n')[1],
    );
    await context.close();
  }

  // Main furling blocked by the "out" tail and the outhaul: the hint names both clutches.
  {
    const { context, page } = await openPage(
      phone,
      'm4b furl blocked',
      '?mode=realistic&wd=90&ws=12&st=starboard&wsb=a2.4.t&sel=rope_main_furling_line&cam=side-port',
    );
    await page.waitForTimeout(500);
    // The link selects the "in" tail (a2) already: a tap on it would open its clutch.
    const button = await centre(page, '[data-testid="act-button"]');
    await page.mouse.move(button.x, button.y);
    await page.mouse.down();
    await page.waitForTimeout(600);
    await page.locator('.real-alert').scrollIntoViewIfNeeded();
    await shot(page, 'live-phone-main-furl-blocked');
    const text = await stripText(page);
    await page.mouse.up();
    check(
      'main furl blocked names the clutches',
      /Main outhaul/.test(text) && /Main furling/.test(text),
      text.split('\n')[1],
    );
    await context.close();
  }

  // Pause: open a clutch and wrap a winch while paused; nothing moves. Resume: both happen.
  {
    const { context, page } = await openPage(
      phone,
      'm4b pause',
      '?mode=realistic&wd=90&ws=20&js=30&ms=30&st=starboard&sel=rope_jib_sheet&cam=top',
    );
    await page.waitForTimeout(500);
    await page.getByTestId('pause-button').click();
    await page.getByTestId('act-clutch').click();
    await page.locator('.station-button[data-station="port"]').click();
    await page.locator(`${drawing('port')} [data-key="b4"]`).click();
    await page.getByTestId('act-clutch').click();
    await page.waitForTimeout(1200);
    const paused = await search(page);
    check(
      'pause: nothing moves',
      (await num(page, 'js')) === 30 && (await num(page, 'ms')) === 30,
      paused,
    );
    const alert = await page.getByTestId('station-alerts').innerText();
    check('pause: alert for the other station', /Starboard/.test(alert), alert);
    await shot(page, 'live-phone-paused-two-clutches-open');
    await page.getByTestId('pause-button').click();
    // The address bar follows 300 ms after the ropes stop moving.
    await page.waitForTimeout(3000);
    check(
      'resume: both run together',
      (await num(page, 'js')) > 60 && (await num(page, 'ms')) > 50,
      await search(page),
    );
    await shot(page, 'live-phone-resumed-both-ran');
    await context.close();
  }

  // A running rope at another station shows an alert there; the 3D rope flashes.
  {
    const { context, page } = await openPage(
      phone,
      'm4b alert',
      '?mode=realistic&wd=90&ws=6&js=30&st=starboard&sel=rope_jib_sheet&cam=bow',
    );
    await page.waitForTimeout(500);
    await page.getByTestId('act-clutch').click();
    await page.locator('.station-button[data-station="port"]').click();
    await page.waitForTimeout(300);
    const alert = await page.getByTestId('station-alerts').innerText();
    check('alert: rope running at Starboard', /running at Starboard/i.test(alert), alert);
    await shot(page, 'live-phone-alert-running-elsewhere');
    await context.close();
  }

  // Share keeps the mode and the clutch states; Easy mode is one tap away.
  {
    const { context, page } = await openPage(
      phone,
      'm4b share',
      '?mode=realistic&wd=90&ws=12&st=starboard&co=a2&wsb=a5.3.t&sel=rope_jib_sheet&cam=helm',
    );
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.waitForTimeout(500);
    await page.getByRole('tab', { name: 'View' }).click();
    await page.getByTestId('share-button').click();
    await page.waitForTimeout(300);
    const link = await page.evaluate(() => navigator.clipboard.readText());
    check(
      'share keeps mode, clutches, winch, station',
      /mode=realistic/.test(link) &&
        /co=a2/.test(link) &&
        /wsb=a5\.3\.t/.test(link) &&
        /st=starboard/.test(link),
      link,
    );
    const other = await context.newPage();
    await other.goto(link, { waitUntil: 'networkidle' });
    await other.waitForSelector('canvas.scene-canvas');
    await other.waitForTimeout(800);
    const open = await other
      .locator(`${drawing('starboard')} [data-key="a2"]`)
      .getAttribute('class');
    const turns = await other.locator(`${drawing('starboard')} .real-turns`).textContent();
    check(
      'share opens the same',
      /is-open/.test(open ?? '') && /3/.test(turns),
      `${open} | ${turns}`,
    );
    await other.close();
    await page.getByRole('tab', { name: 'Ropes' }).click();
    await page.getByText('Easy', { exact: true }).click();
    await page.waitForTimeout(400);
    const easyShown = await page.getByTestId('ropes-easy').isVisible();
    const slider = await page.getByLabel('Jib sheet', { exact: true }).isVisible();
    check('Easy mode one tap away', easyShown && slider, `easy ${easyShown} slider ${slider}`);
    check(
      'Easy mode drops mode from the link',
      !(await search(page)).includes('mode='),
      await search(page),
    );
    await context.close();
  }
}
