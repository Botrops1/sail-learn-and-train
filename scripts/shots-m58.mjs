// M58 (choose and import a boat, PHASE8_SPEC 16.9): live checks for scripts/shots.mjs. Labels
// contain "m58", so openPage starts with every section folded and the app opens as it does without
// a link. Every openPage makes a new browser context (empty storage, downloads allowed). Nothing
// here depends on app time, so the checks run on the real clock; pages that reload are not on a
// test clock. The imported boats live in a context's storage: checks 1, 2, 3, 6 and 7 share one.
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { auditPage } from './a11y-audit.mjs';
import { openSettings, setMode, setSheet, showSection, waitForLink } from './ui.mjs';

export const M58_SCENES = [];

const HANSE = JSON.parse(
  await readFile(new URL('../content/boat/hanse508.json', import.meta.url), 'utf8'),
);

/** A test profile as a file's text: the Hanse 508's numbers with a length of 14 m and the chosen thrusters. */
function testProfile({
  id = 'test-light',
  name = 'Test light',
  loa = 14,
  thrusters = ['bow'],
} = {}) {
  const boat = structuredClone(HANSE);
  boat.dimensions.loa = loa;
  boat.hull.thrusters = boat.hull.thrusters.filter((thruster) => thrusters.includes(thruster.end));
  boat.meta.id = id;
  boat.meta.name = name;
  return JSON.stringify({
    app: 'sail-learn-and-train',
    kind: 'boatProfile',
    version: 1,
    id,
    name,
    boat,
  });
}

export async function liveM58Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M58 ${what}: ${detail}`);
    console.log(`live M58 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone, , desktop] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const canvasReady = (page) =>
    page.waitForSelector('canvas.scene-canvas', { state: 'attached', timeout: 30_000 });
  const asFile = (text) => ({
    name: 'boat.boat.json',
    mimeType: 'application/json',
    buffer: Buffer.from(text),
  });
  /** Gives the Import button a file, as a person would; returns the status text. */
  const importFile = async (page, text) => {
    const status = page.getByTestId('boat-status');
    const before = (await status.innerText()).trim();
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByTestId('boat-import').click(),
    ]);
    await chooser.setFiles(asFile(text));
    // A new message has come when the text is not the one from before (or the first one).
    await page.waitForFunction(
      (old) => {
        const now = document.querySelector('[data-testid="boat-status"]')?.textContent?.trim();
        return now !== '' && now !== old;
      },
      before,
      { timeout: 10_000 },
    );
    return (await status.innerText()).trim();
  };
  const stored = (page) => page.evaluate(() => window.localStorage.getItem('sail-learn.boats'));
  const options = (page) =>
    page.getByTestId('boat-select').evaluate((select) => [...select.options].map((o) => o.text));
  /** A full load of a link (the boat chooser's reload drops `debug=1`, which the 3D checks need). */
  const load = async (page, query) => {
    await page.goto(linkOf(page, query), { waitUntil: 'networkidle' });
    await canvasReady(page);
  };
  const hasPart = (page, id) => page.evaluate((part) => window.__sailDebug.hasPart(part), id);
  const linkOf = (page, query) => new URL(query, page.url()).toString();

  // 1, 2, 3, 6, 7 in one context (the imported boat lives in its storage).
  let setupFile;
  {
    const { context, page } = await openPage(phone, 'm58 chain', '?v=1&debug=1');
    await openSettings(page);

    // 1. Import.
    await page.getByTestId('boat-field').scrollIntoViewIfNeeded();
    const status = await importFile(page, testProfile());
    check(
      'import: the status',
      status === 'Imported Test light. Choose it above to sail it.',
      status,
    );
    const list = await options(page);
    check('import: the select lists Test light', list.includes('Test light'), list.join(' | '));
    check(
      'import: the Hanse 508 is first',
      list[0] === 'Hanse 508 (built in)',
      list[0] ?? 'no options',
    );
    check(
      'import: the Hanse 508 is still the boat in use',
      (await page.getByTestId('boat-name').innerText()) === 'Hanse 508',
      'boat-name',
    );
    check(
      'import: the Hanse 508 has no remove button',
      (await page.getByTestId('boat-remove').count()) === 0,
      'boat-remove',
    );

    // 2. Choose it: the page reloads on the boat.
    await Promise.all([
      page.waitForURL(/boat=test-light/),
      page.getByTestId('boat-select').selectOption('test-light'),
    ]);
    await canvasReady(page);
    const link = await waitForLink(page, ['v=1', 'boat=test-light']);
    check(
      'choose: the link starts v=1&boat=test-light',
      link.startsWith('?v=1&boat=test-light'),
      link,
    );
    await openSettings(page);
    await page.getByTestId('boat-field').scrollIntoViewIfNeeded();
    const name = await page.getByTestId('boat-name').innerText();
    check('choose: Settings → Boat reads Test light', name === 'Test light', name);
    const selected = await page.getByTestId('boat-select').inputValue();
    check('choose: the select shows it', selected === 'test-light', selected);
    await shot(page, 'live-phone-chosen');

    // The bow-only boat: Harbour mode shows the bow joystick only (quick row and Engine section).
    await load(page, '?v=1&boat=test-light&debug=1');
    check('bow only: the bow tunnel is drawn', await hasPart(page, 'part_bow_thruster'), 'bow');
    check(
      'bow only: no stern tunnel',
      !(await hasPart(page, 'part_stern_thruster')),
      'part_stern_thruster',
    );
    await setMode(page, 'harbour');
    await setSheet(page, 'peek');
    const quick = async (id) => page.getByTestId(id).isVisible();
    check('bow only: the quick row has the bow joystick', await quick('thruster-bow-quick'), 'bow');
    check(
      'bow only: and not the stern joystick',
      !(await quick('thruster-stern-quick')),
      'thruster-stern-quick',
    );
    check(
      'bow only: the quick row group is shown',
      await quick('quick-thrusters'),
      'quick-thrusters',
    );
    await showSection(page, 'engine');
    check(
      'bow only: the Engine section has the Thrusters block with the bow joystick only',
      (await quick('thrusters-block')) &&
        (await quick('thruster-bow')) &&
        !(await quick('thruster-stern')),
      'thrusters-block',
    );
    await shot(page, 'live-phone-bow-only');

    // 3. The Learn note, on the same page: a full load of a link that names the boat.
    await page.goto(linkOf(page, '?v=1&boat=test-light&m=learn&learn=rope_vang'), {
      waitUntil: 'networkidle',
    });
    await canvasReady(page);
    await showSection(page, 'learn');
    const note = page.getByTestId('learn-boat-note');
    await note.waitFor({ state: 'visible', timeout: 10_000 });
    const noteText = await note.innerText();
    check('learn: the note is shown', noteText === 'Written for the Hanse 508.', noteText);
    await shot(page, 'live-phone-learn-note');

    // 6. Save the setup with the boat in use.
    await openSettings(page);
    const saveButton = page.getByTestId('setup-save');
    await saveButton.scrollIntoViewIfNeeded();
    const [download] = await Promise.all([page.waitForEvent('download'), saveButton.click()]);
    setupFile = await readFile(await download.path());
    const file = JSON.parse(setupFile.toString('utf8'));
    check(
      'setup: the file carries the boat',
      file.boatProfile?.id === 'test-light' && file.link.includes('boat=test-light'),
      `${file.boatProfile?.id} ${file.link.slice(0, 40)}`,
    );

    // 7. Remove: two taps, then the page is on the Hanse 508 again.
    await page.getByTestId('boat-field').scrollIntoViewIfNeeded();
    const remove = page.getByTestId('boat-remove');
    check('remove: the button shows for an imported boat', await remove.isVisible(), 'boat-remove');
    await remove.click();
    check(
      'remove: the first tap asks again',
      (await remove.innerText()) === 'Tap again to remove it',
      await remove.innerText(),
    );
    await Promise.all([page.waitForURL((url) => !url.search.includes('boat=')), remove.click()]);
    await canvasReady(page);
    await openSettings(page);
    await page.getByTestId('boat-field').scrollIntoViewIfNeeded();
    const left = await options(page);
    check(
      'remove: Test light is gone from the select',
      !left.includes('Test light'),
      left.join(' | '),
    );
    check(
      'remove: the boat is the Hanse 508 again',
      (await page.getByTestId('boat-name').innerText()) === 'Hanse 508',
      'boat-name',
    );
    check('remove: nothing is stored', (await stored(page)) === '[]', String(await stored(page)));
    await context.close();
  }

  // 4. A link to a boat this device does not have.
  {
    const { context, page } = await openPage(phone, 'm58 missing', '?v=1&boat=test-light');
    const note = page.getByTestId('boat-missing');
    await note.waitFor({ state: 'visible', timeout: 10_000 });
    const text = await note.innerText();
    check('missing: the note names the boat', text.includes('"test-light"'), text);
    const link = await waitForLink(page, ['v=1'], ['boat=']);
    check('missing: the link has no boat=', !link.includes('boat='), link);
    check(
      'missing: the Hanse 508 is shown',
      (await openSettings(page), (await page.getByTestId('boat-name').innerText()) === 'Hanse 508'),
      'boat-name',
    );
    await setSheet(page, 'peek');
    await shot(page, 'live-phone-missing');
    await page.getByTestId('boat-missing-close').click();
    check(
      'missing: × removes the note',
      (await page.getByTestId('boat-missing').count()) === 0,
      'x',
    );
    problems.push(...(await auditPage(page, 'm58 phone missing')));
    await context.close();
  }

  // 5. A bad profile lists the problem and keeps nothing; 8. the audit with the list shown.
  for (const [view, size] of [
    ['phone', phone],
    ['desktop', desktop],
  ]) {
    const { context, page } = await openPage(size, `m58 bad ${view}`, '?v=1');
    await openSettings(page);
    await page.getByTestId('boat-field').scrollIntoViewIfNeeded();
    const status = await importFile(page, testProfile({ loa: 40 }));
    check(`bad ${view}: the status counts the problems`, /1 problems/.test(status), status);
    const lines = await page.getByTestId('boat-problems').locator('li').allInnerTexts();
    check(
      `bad ${view}: the list shows the length`,
      lines.includes('boat.dimensions.loa: 6 to 25'),
      lines.join(' | '),
    );
    check(
      `bad ${view}: nothing is stored`,
      (await stored(page)) === null,
      String(await stored(page)),
    );
    check(
      `bad ${view}: the select has the Hanse 508 only`,
      (await options(page)).length === 1,
      (await options(page)).join(' | '),
    );
    await page.getByTestId('boat-problems').scrollIntoViewIfNeeded();
    await shot(page, `live-${view}-bad`);
    problems.push(...(await auditPage(page, `m58 ${view} boat field with problems`)));

    // Not JSON, and the built-in id.
    const notJson = await importFile(page, 'this is not json');
    check(
      `bad ${view}: not JSON`,
      notJson === 'This file cannot be read: it is not a boat profile.',
      notJson,
    );
    const builtIn = await importFile(page, testProfile({ id: 'hanse508', name: 'Mine' }));
    check(
      `bad ${view}: the built-in id`,
      builtIn === 'This is the built-in Hanse 508: give your boat its own id.',
      builtIn,
    );
    await context.close();
  }

  // 6. (second half) The setup file opens on the boat in a fresh context.
  {
    const { context, page } = await openPage(phone, 'm58 setup load', '?v=1');
    await openSettings(page);
    await page.getByTestId('setup-field').scrollIntoViewIfNeeded();
    await Promise.all([
      page.waitForURL(/boat=test-light/),
      page.getByTestId('setup-file').setInputFiles({
        name: 'setup.json',
        mimeType: 'application/json',
        buffer: setupFile,
      }),
    ]);
    await canvasReady(page);
    await openSettings(page);
    await page.getByTestId('boat-field').scrollIntoViewIfNeeded();
    const name = await page.getByTestId('boat-name').innerText();
    check('setup: the page opens on Test light', name === 'Test light', name);
    const list = await options(page);
    check('setup: the boat is now on this device', list.includes('Test light'), list.join(' | '));
    await context.close();
  }

  // A boat with no thrusters: the Thrusters block, the quick row group, the Helm block and the tunnels are gone.
  {
    const { context, page } = await openPage(phone, 'm58 no thrusters', '?v=1&debug=1');
    await openSettings(page);
    const status = await importFile(
      page,
      testProfile({ id: 'test-none', name: 'No thrusters', thrusters: [] }),
    );
    check('none: imported', status.startsWith('Imported'), status);
    await Promise.all([
      page.waitForURL(/boat=test-none/),
      page.getByTestId('boat-select').selectOption('test-none'),
    ]);
    await canvasReady(page);
    await load(page, '?v=1&boat=test-none&debug=1');
    check(
      'none: no tunnel is drawn',
      !(await hasPart(page, 'part_bow_thruster')) && !(await hasPart(page, 'part_stern_thruster')),
      'tunnels',
    );
    await setMode(page, 'harbour');
    await setSheet(page, 'peek');
    check(
      'none: the quick row has no thrusters group',
      !(await page.getByTestId('quick-thrusters').isVisible()),
      'quick-thrusters',
    );
    await showSection(page, 'engine');
    check(
      'none: the Engine section has no Thrusters block',
      !(await page.getByTestId('thrusters-block').isVisible()),
      'thrusters-block',
    );
    // Realistic ropes: the Helm block.
    await page.goto(linkOf(page, '?v=1&boat=test-none&mode=realistic&st=helm&debug=1'), {
      waitUntil: 'networkidle',
    });
    await canvasReady(page);
    await showSection(page, 'helm');
    check(
      'none: the Helm section has no thruster block',
      !(await page.getByTestId('thruster-helm').isVisible()),
      'thruster-helm',
    );
    await shot(page, 'live-phone-none-helm');
    await context.close();
  }

  // The Hanse 508 still has both tunnels (control for the checks above).
  {
    const { context, page } = await openPage(phone, 'm58 hanse', '?v=1&debug=1');
    check(
      'hanse: both tunnels are drawn',
      (await hasPart(page, 'part_bow_thruster')) && (await hasPart(page, 'part_stern_thruster')),
      'tunnels',
    );
    await context.close();
  }
}
