// Browser-check helpers for the panel, the settings and the camera (PHASE5_SPEC 3.4; sections and modes from M27).
// Every check that opens part of the panel, the settings or a camera view goes through these, so
// that a later change of the screen changes only this file. They take a Playwright `page` and find
// things by data-testid, never by text, so they do not depend on the language.

/** M51: the phone tab each section is under: a copy of `TAB_OF` in src/ui/modes.ts (keep them in step). */
const TAB_OF_JS = {
  mode: 'mode',
  ropes: 'controls',
  helm: 'controls',
  sails: 'controls',
  autopilot: 'controls',
  engine: 'controls',
  conditions: 'conditions',
  learn: 'learn',
  place: 'controls',
  anchor: 'controls',
  harbour: 'controls',
  settings: 'settings',
};

/** M51: true on a phone (the stacked layout), where the panel has five tabs. */
export async function isStacked(page) {
  return page.evaluate(() => document.documentElement.dataset.layout === 'stacked');
}

/** M51: on a phone, taps a panel tab ('mode' | 'controls' | 'conditions' | 'learn' | 'settings'); elsewhere does nothing. */
export async function showTab(page, tab) {
  if (!(await isStacked(page))) return;
  await page.getByTestId(`panel-tab-${tab}`).click();
}

/** M51: the open tab on a phone, or null elsewhere. */
export async function tabNow(page) {
  return page.evaluate(() =>
    document.documentElement.dataset.layout === 'stacked'
      ? (document
          .querySelector('[data-testid^="panel-tab-"][aria-selected="true"]')
          ?.getAttribute('data-tab') ?? null)
      : null,
  );
}

/** Opens a section (folded ones are opened), raises a sheet at its lowest height to half, and scrolls the section into view (M27). Ids: ropes, sails, autopilot, engine, conditions, learn, harbour (mode and settings on a phone only, M52). */
export async function showSection(page, id) {
  const section = page.getByTestId(`section-${id}`);
  if ((await section.count()) === 0) throw new Error(`showSection: unknown section ${id}`);
  // M51: on a phone the section's tab first (this also raises a sheet at peek).
  await showTab(page, TAB_OF_JS[id]);
  // A folded section's header may sit under a sheet at peek: raise the sheet first.
  if (await sheetAtPeek(page)) await setSheet(page, 'half');
  if ((await section.getAttribute('data-open')) === 'false') {
    await page.getByTestId(`section-toggle-${id}`).click();
  }
  // M35: with every title on screen a half-height sheet leaves the open section about 100 px, so
  // (as the tap on a title does) the sheet goes to full. Checks that need the boat in view lower
  // it again with `setSheet(page, 'half')`.
  if ((await sheetHeightNow(page)) === 'half') await setSheet(page, 'full');
  await section.scrollIntoViewIfNeeded();
}

/** True if the section's content is shown now (open, not hidden, and the sheet not at peek). */
export async function sectionShown(page, id) {
  if (await sheetAtPeek(page)) return false;
  const section = page.getByTestId(`section-${id}`);
  if ((await section.count()) === 0) throw new Error(`sectionShown: unknown section ${id}`);
  return (
    (await section.getAttribute('data-open')) === 'true' &&
    !(await section.evaluate((node) => node.hidden))
  );
}

/** M38: true on the wide layout (side by side, 1,280 px or wider: two columns). */
export async function isWide(page) {
  return page.evaluate(() => document.documentElement.dataset.wide === 'true');
}

/** M27: chooses a mode (learn, easy, realistic, harbour): from the Mode tab (M51, phone) or the mode card the mode chip opens (M52, side and wide layouts). */
export async function setMode(page, mode) {
  if (await isStacked(page)) {
    await showTab(page, 'mode');
  } else if (!(await page.getByTestId('mode-card').isVisible())) {
    await page.getByTestId('mode-chip').click();
    await page.getByTestId('mode-card').waitFor({ state: 'visible' });
  }
  await page.getByTestId(`mode-choice-${mode}`).click();
}

/** M35: the ids of the sections that are shown now (open or folded), in page order, columns 1 then 2. */
export async function sectionIds(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-section]')]
      .filter((node) => !node.hidden)
      .map((node) => node.getAttribute('data-section')),
  );
}

/** M35: only one section is open at a time, so "every section open" is now "each section in turn": opens each available section and calls `visit(id)` while it is open, with the sheet at least half. */
export async function eachSection(page, visit) {
  if (await sheetAtPeek(page)) await setSheet(page, 'half');
  for (const id of await sectionIds(page)) {
    await showSection(page, id);
    await visit(id);
  }
}

/** The sheet's height ('peek', 'half', 'full') in the stacked layout, else null. */
async function sheetHeightNow(page) {
  return page.evaluate(() =>
    document.documentElement.dataset.layout === 'stacked'
      ? (document.querySelector('[data-testid="sheet"]')?.getAttribute('data-sheet') ?? null)
      : null,
  );
}

/** True in the stacked layout with the sheet at its lowest height ("at peek", PHASE5_SPEC 3.1). */
async function sheetAtPeek(page) {
  return page.evaluate(
    () =>
      document.documentElement.dataset.layout === 'stacked' &&
      document.querySelector('[data-testid="sheet"]')?.getAttribute('data-sheet') === 'peek',
  );
}

/** Waits until the sheet has finished moving (its height animation ended). */
async function sheetSettled(page) {
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="sheet"]')?.getAttribute('data-sheet-moving') ===
      'false',
  );
}

/** M26: sets the sheet's height by tapping its handle (no-op in the side layout). */
export async function setSheet(page, height) {
  const sheet = page.getByTestId('sheet');
  for (let taps = 0; taps <= 3; taps += 1) {
    if (await page.evaluate(() => document.documentElement.dataset.layout !== 'stacked')) return;
    if ((await sheet.getAttribute('data-sheet')) === height) break;
    if (taps === 3) throw new Error(`setSheet: the sheet never reached ${height}`);
    await page.getByTestId('sheet-handle').click();
    await sheetSettled(page);
  }
  await sheetSettled(page);
}

/**
 * M26: drags the sheet's handle by `dy` CSS px (negative = up) in `steps` moves, waiting `delayMs`
 * between them (0 = a fling). With waits the mouse is used. A fling is sent as pointer events from
 * inside the page, in one task: headless drawing makes every mouse move take ~100 ms, so a mouse
 * "fling" would be slow in wall-clock time and the app would rightly not treat it as one.
 */
export async function dragHandle(page, dy, steps, delayMs, testId = 'sheet-handle') {
  const box = await page.getByTestId(testId).boundingBox();
  if (!box) throw new Error(`dragHandle: ${testId} is not shown`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  if (delayMs === 0) {
    await page.evaluate(
      ({ x, y, dy, steps, testId }) => {
        const handle = document.querySelector(`[data-testid="${testId}"]`);
        const send = (type, clientY) =>
          handle.dispatchEvent(
            new PointerEvent(type, {
              pointerId: 1,
              pointerType: 'mouse',
              isPrimary: true,
              button: 0,
              buttons: type === 'pointerup' ? 0 : 1,
              clientX: x,
              clientY,
              bubbles: true,
              cancelable: true,
            }),
          );
        send('pointerdown', y);
        for (let step = 1; step <= steps; step += 1) send('pointermove', y + (dy * step) / steps);
        send('pointerup', y + dy);
      },
      { x, y, dy, steps, testId },
    );
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let step = 1; step <= steps; step += 1) {
      await page.mouse.move(x, y + (dy * step) / steps);
      await page.waitForTimeout(delayMs);
    }
    await page.mouse.up();
  }
  await sheetSettled(page);
}

/** Opens the settings: the Settings tab (M51, phone) or the settings card the gear opens (M52, side and wide layouts). Either way `settings-content` is shown. */
export async function openSettings(page) {
  if (await isStacked(page)) {
    await showTab(page, 'settings');
  } else if (!(await page.getByTestId('settings-card').isVisible())) {
    await page.getByTestId('settings-button').click();
    await page.getByTestId('settings-card').waitFor({ state: 'visible' });
  }
  await page.getByTestId('settings-content').waitFor({ state: 'visible' });
}

/** Closes the settings (on a phone (M51) goes back to the Controls tab; elsewhere the card's ×). */
export async function closeSettings(page) {
  if (await isStacked(page)) {
    await showTab(page, 'controls');
    await page.getByTestId('settings-content').waitFor({ state: 'hidden' });
    return;
  }
  if (await page.getByTestId('settings-card').isVisible()) {
    await page.getByTestId('settings-card-close').click();
  }
  await page.getByTestId('settings-card').waitFor({ state: 'hidden' });
}

/** Chooses a camera preset from the camera chip's menu. */
export async function setCamera(page, preset) {
  await page.getByTestId('camera-chip').click();
  await page.getByTestId(`camera-option-${preset}`).click();
}

/** The y (CSS px from the page top) of the top of the chip row: taps on the 3D view stay above it. */
export async function viewBottom(page) {
  const box = await page.getByTestId('view-bottom').boundingBox();
  if (!box) throw new Error('viewBottom: the chip row is not shown');
  return box.y;
}

/**
 * Polls the address bar (up to 3 s; the link is written 300 ms after a change) until it contains
 * every string of `has` and none of `hasNot`; returns the link, throws with the link if it never does.
 */
export async function waitForLink(page, has, hasNot = []) {
  const deadline = Date.now() + 3000;
  let link = '';
  for (;;) {
    link = await page.evaluate(() => window.location.search + window.location.hash);
    if (has.every((part) => link.includes(part)) && !hasNot.some((part) => link.includes(part))) {
      return link;
    }
    if (Date.now() > deadline) {
      throw new Error(
        `waitForLink: wanted [${has.join(', ')}] and none of [${hasNot.join(', ')}], got ${link}`,
      );
    }
    await page.waitForTimeout(50);
  }
}

/** M53: opens the Helm section (Realistic ropes) and, if "Go to the helm" shows, walks there. */
export async function goToHelm(page) {
  await showSection(page, 'helm');
  const go = page.getByTestId('helm-go');
  if (await go.isVisible()) await go.click();
}

/**
 * M41: holds a thruster joystick (which: 'bow' | 'stern', dir: -1 | 1) for `ms` milliseconds of app
 * time (page.waitForTimeout); via: 'section' (opens the Engine section first, where the thrusters are) | 'quick' | 'helm'.
 * `during`, if given, runs once the joystick has been held for half of `ms`.
 */
export async function holdThruster(page, which, dir, ms, via = 'section', during = undefined) {
  if (via === 'section') await showSection(page, 'engine');
  if (via === 'helm') await goToHelm(page);
  const suffix = via === 'section' ? '' : `-${via}`;
  const half = page.getByTestId(`thruster-${which}${suffix}-${dir < 0 ? 'port' : 'starboard'}`);
  await half.scrollIntoViewIfNeeded();
  const box = await half.boundingBox();
  if (!box) throw new Error(`holdThruster: ${which} ${dir} has no box`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  try {
    await page.waitForTimeout(ms / 2);
    if (during) await during();
    await page.waitForTimeout(ms / 2);
  } finally {
    await page.mouse.up();
  }
}

/** M42: chooses a place ('open' | 'marina' | 'bay') in the Place section (opened first). */
export async function choosePlace(page, place) {
  await showSection(page, 'place');
  await page.getByTestId(`place-${place}`).click();
}

/** M44, M45: taps a line action: code ('sp' | 'ss' | 'll' | 'bl' | 'sl'), action ('take' | 'tighten' | 'ease' | 'letGo'); the Harbour gear section is opened first. */
export async function lineAction(page, code, action) {
  await showSection(page, 'harbour');
  await page.getByTestId(`line-${code}-${action}`).click();
}

/**
 * M46: holds the windlass button ('down' | 'up') for `ms` milliseconds of app time
 * (page.waitForTimeout); `suffix` '' (the Anchor section, opened first), '-bow' or '-helm'.
 */
export async function holdWindlass(page, dir, ms, suffix = '') {
  if (suffix === '') await showSection(page, 'anchor');
  if (suffix === '-helm') await goToHelm(page);
  const button = page.getByTestId(`windlass-${dir}${suffix}`);
  await button.scrollIntoViewIfNeeded();
  const box = await button.boundingBox();
  if (!box) throw new Error(`holdWindlass: ${dir}${suffix} has no box`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  try {
    await page.waitForTimeout(ms);
  } finally {
    await page.mouse.up();
  }
}
