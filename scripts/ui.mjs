// Browser-check helpers for the panel, the settings and the camera (PHASE5_SPEC 3.4).
// Every check that opens part of the panel, the settings or a camera view goes through these, so
// that a later change of the screen changes only this file. They take a Playwright `page` and find
// things by data-testid, never by text, so they do not depend on the language.

/** The tab that holds a section (M25: there are no section elements yet). */
const TAB_OF_SECTION = {
  ropes: 'tab-ropes',
  sails: 'tab-ropes',
  autopilot: 'tab-ropes',
  engine: 'tab-ropes',
  legend: 'tab-ropes',
  conditions: 'tab-wind',
  learn: 'tab-learn',
};

/** Opens a section. Ids: ropes, sails, autopilot, engine, legend, conditions, learn. */
export async function showSection(page, id) {
  const tab = TAB_OF_SECTION[id];
  if (!tab) throw new Error(`showSection: unknown section ${id}`);
  await page.getByTestId(tab).click();
}

/** True if the section's content is shown now (its tab selected). */
export async function sectionShown(page, id) {
  const tab = TAB_OF_SECTION[id];
  if (!tab) throw new Error(`sectionShown: unknown section ${id}`);
  return (await page.getByTestId(tab).getAttribute('aria-selected')) === 'true';
}

/** Opens the settings dialog. */
export async function openSettings(page) {
  await page.getByTestId('settings-button').click();
  await page.getByTestId('settings-dialog').waitFor({ state: 'visible' });
}

/** Closes the settings dialog. */
export async function closeSettings(page) {
  await page.getByTestId('settings-close').click();
  await page.getByTestId('settings-dialog').waitFor({ state: 'hidden' });
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
