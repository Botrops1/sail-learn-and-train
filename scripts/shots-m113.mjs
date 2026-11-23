// M113 (Choose the training dinghy): scenes and live checks for scripts/shots.mjs
// (PHASE_DINGHY_SPEC 7.9). Joins the m58 group (two built-in boats: the chooser and the hidden
// sections). Nothing here depends on app time, so the checks run on the real clock. What the
// dinghy's data and its steering do is unit-tested (tests/dinghyBoat.test.ts); here only what
// needs the real page: the welcome card, the chooser, the hidden sections and keys, and the 3D.
import path from 'node:path';
import { openSettings, sectionIds, setSheet, showSection, showTab, waitForLink } from './ui.mjs';

const D = '?boat=dinghy&wd=60&ws=8&ms=40&held=1&sea=flat';

/** Screenshots at every size: the whole dinghy, its cockpit from above, and the mast from ahead. */
export const M113_SCENES = [
  { name: 'side', query: `${D}&cam=side-port` },
  { name: 'top', query: `${D}&cam=top` },
  { name: 'bow', query: `${D}&cam=bow` },
].map((scene) => ({ ...scene, waitMs: 2500, sheet: 'peek' }));

export async function liveM113Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M113 ${what}: ${detail}`);
    console.log(`live M113 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone, , desktop] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const canvasReady = (page) =>
    page.waitForSelector('canvas.scene-canvas', { state: 'attached', timeout: 30_000 });
  const read = (page) => page.evaluate(() => window.__sailExercise.read());
  const visible = (page, id) => page.evaluate((part) => window.__sailDebug.partVisible(part), id);

  // 1. A fresh page: the welcome card offers the dinghy; a finger tap starts on it. The label also
  // names m85 so openPage adds no `held`, `sea`, `clock` or `mm` key: a bare address shows the card.
  {
    const { context, page } = await openPage(phone, 'm85 m113 welcome', '', { welcome: true });
    const button = page.getByTestId('welcome-dinghy');
    await button.waitFor({ state: 'visible', timeout: 15_000 });
    const buttons = await page
      .locator('[data-testid^="welcome-"]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-testid')));
    await shot(page, 'm113-live-welcome');
    await button.tap();
    // The page reloads on the dinghy: wait for the new address, not for a read in the old page.
    let link;
    try {
      await page.waitForURL((url) => url.search.includes('boat=dinghy'), { timeout: 15_000 });
      link = page.url();
    } catch (error) {
      link = String(error);
    }
    check(
      'welcome: the dinghy button starts on the dinghy',
      link.includes('boat=dinghy') &&
        buttons.includes('welcome-look') &&
        buttons.includes('welcome-close'),
      JSON.stringify({ link, buttons }),
    );
    await canvasReady(page);
    await context.close();
    const again = await openPage(phone, 'm113 boat id', `${D}&debug=1`);
    await canvasReady(again.page);
    await again.page.waitForTimeout(500);
    check('the app reports the dinghy', (await read(again.page)).boatId === 'dinghy', '');
    await again.context.close();
  }

  // 2. Settings → Boat lists both boats; choosing the dinghy starts on it; no profile download.
  {
    const { context, page } = await openPage(
      phone,
      'm113 chooser',
      '?boat=hanse508&wd=60&ws=8&held=1',
    );
    await canvasReady(page);
    await openSettings(page);
    const values = await page
      .getByTestId('boat-select')
      .evaluate((select) => [...select.options].map((option) => option.value));
    const downloadOnHanse = await page.getByTestId('boat-download').isVisible();
    await page.getByTestId('boat-select').selectOption('dinghy');
    let link;
    try {
      await page.waitForURL((url) => url.search.includes('boat=dinghy'), { timeout: 15_000 });
      link = page.url();
    } catch (error) {
      link = String(error);
    }
    await page.waitForLoadState('networkidle');
    await canvasReady(page);
    await openSettings(page);
    const downloadOnDinghy = await page.getByTestId('boat-download').count();
    const remove = await page.getByTestId('boat-remove').count();
    check(
      'chooser: both boats in order, the dinghy starts, no download or remove on it',
      values.join() === 'hanse508,dinghy' &&
        downloadOnHanse &&
        link.includes('boat=dinghy') &&
        downloadOnDinghy === 0 &&
        remove === 0,
      JSON.stringify({ values, downloadOnHanse, link, downloadOnDinghy, remove }),
    );
    await shot(page, 'm113-live-chooser');
    await context.close();
  }

  // 3. Only what the dinghy has: two modes, two rope rows, the steering, no other sections.
  {
    const { context, page } = await openPage(phone, 'm113 sections', `${D}&debug=1`);
    await canvasReady(page);
    await showTab(page, 'mode');
    const modes = await page
      .locator('[data-testid^="mode-choice-"]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-mode')));
    await showSection(page, 'ropes');
    const rows = await page
      .locator('.rope-item')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-select')));
    const names = await page
      .locator('.rope-item .rope-item-name')
      .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim()));
    await showSection(page, 'autopilot');
    const steeringSection = page.getByTestId('section-autopilot');
    const steering = await steeringSection.locator('#control-ctl_rudder').count();
    const autopilot = await steeringSection.getByTestId('autopilot').count();
    const label = await steeringSection.locator('label[for="control-ctl_rudder"]').innerText();
    const ids = await sectionIds(page);
    const bad = ['engine', 'anchor', 'place', 'harbour', 'helm'].filter((id) => ids.includes(id));
    check(
      'sections: Learn and Easy, two lines, the steering without autopilot buttons',
      modes.join() === 'learn,easy' &&
        rows.join() === 'rope_mainsheet,rope_vang' &&
        names[1] === 'Kicker' &&
        steering === 1 &&
        autopilot === 0 &&
        label.trim() === 'Tiller' &&
        bad.length === 0,
      JSON.stringify({ modes, rows, names, steering, autopilot, label, bad, ids }),
    );
    await setSheet(page, 'half');
    await shot(page, 'm113-live-sections');
    await context.close();
  }

  // 4. The Helm view is not offered, and a link that asks for it opens the side view.
  {
    const { context, page } = await openPage(phone, 'm113 camera', `${D}&cam=helm&debug=1`);
    await canvasReady(page);
    await page.getByTestId('camera-chip').click();
    const options = await page
      .locator('[data-testid^="camera-option-"]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-testid')));
    const chip = (await page.getByTestId('camera-chip').innerText()).trim();
    check(
      'camera: no Helm entry, the chip says Side',
      !options.includes('camera-option-helm') && options.length >= 4 && /side|port/i.test(chip),
      JSON.stringify({ options, chip }),
    );
    await context.close();
  }

  // 5. What is drawn: the dinghy's parts, and none of the Hanse's.
  {
    const { context, page } = await openPage(phone, 'm113 parts', `${D}&cam=side-port&debug=1`);
    await canvasReady(page);
    await page.waitForTimeout(1500);
    const shown = {};
    for (const id of [
      'part_tiller',
      'part_centreboard',
      'fit_toe_straps',
      'fit_ratchet_block',
      'part_deck',
      'part_cockpit',
    ]) {
      shown[id] = await visible(page, id);
    }
    const hidden = {};
    for (const id of [
      'sail_jib',
      'fit_winch',
      'helm_port',
      'fit_anchor_windlass',
      'fit_fender',
      'part_shroud',
      'person_captain',
    ]) {
      hidden[id] = await visible(page, id);
    }
    check(
      'drawn: the dinghy parts, none of the yacht ones',
      Object.values(shown).every((v) => v === true) &&
        Object.values(hidden).every((v) => v === false),
      JSON.stringify({ shown, hidden }),
    );
    await context.close();
  }

  // 6. A computer: R and P change nothing; the key list has no R / F or P line.
  {
    const { context, page } = await openPage(desktop, 'm113 keys', `${D}&debug=1`);
    await canvasReady(page);
    await page.waitForTimeout(800);
    const before = await waitForLink(page, ['boat=dinghy']);
    await page.keyboard.press('KeyR');
    await page.keyboard.press('KeyP');
    await page.waitForTimeout(700);
    const after = await page.evaluate(() => window.location.search);
    await page.keyboard.press('KeyH');
    await page.getByTestId('key-help').waitFor({ state: 'visible' });
    const lines = await page
      .locator('[data-testid="key-help"] dt')
      .evaluateAll((nodes) => nodes.map((node) => node.textContent));
    const clean = !/[?&](js|ap|apt)=/.test(after);
    check(
      'keys: R and P do nothing and have no line in the list',
      before === after.slice(0, before.length) || clean,
      JSON.stringify({ before, after, lines }),
    );
    check(
      'key list: no R F or P line',
      !lines.some((line) => /R|F|P/.test(line ?? '')) && lines.length >= 3,
      JSON.stringify(lines),
    );
    await shot(page, 'm113-live-keys');
    await context.close();
  }
}
