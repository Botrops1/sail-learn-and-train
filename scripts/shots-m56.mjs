// M56 (your setup in a file, PHASE8_SPEC 14.7): live checks for scripts/shots.mjs. Labels contain
// "m56", so openPage starts with every section folded and the app opens as it does without a
// link. Every openPage makes a new browser context (empty storage, downloads allowed). Nothing
// here depends on app time, so the checks run on the real clock.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { columnSections, moveSectionBy, openSettings } from './ui.mjs';

export const M56_SCENES = [];

const today = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export async function liveM56Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M56 ${what}: ${detail}`);
    console.log(`live M56 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone, , desktop] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const inJson = (file) => ({ name: 'setup.json', mimeType: 'application/json', buffer: file });
  const text = (page, id) => page.getByTestId(id).innerText();
  const statusIs = async (page, expected) => {
    try {
      await page
        .getByTestId('setup-status')
        .filter({ hasText: expected })
        .waitFor({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  };
  const canvasReady = (page) => page.waitForSelector('canvas.scene-canvas', { state: 'attached' });

  // 1. Save, on the wide layout: the file holds the link, the layout and the folded time bar.
  let saved;
  {
    const { context, page } = await openPage(desktop, 'm56 save', '?wd=90&ws=16&lang=ru&cam=top');
    await page.getByTestId('section-grip-learn').waitFor();
    await moveSectionBy(page, 'conditions', 'other');
    await page.getByTestId('time-fold').click();
    const folded = await page.getByTestId('time-fold').getAttribute('aria-expanded');
    check('save: the time bar is folded', folded === 'false', String(folded));
    await openSettings(page);
    const button = page.getByTestId('setup-save');
    await button.scrollIntoViewIfNeeded();
    const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
    check(
      'save: the file name',
      download.suggestedFilename() === `sail-setup-${today()}.json`,
      download.suggestedFilename(),
    );
    const { readFile } = await import('node:fs/promises');
    saved = await readFile(await download.path());
    const file = JSON.parse(saved.toString('utf8'));
    check(
      'save: kind',
      file.kind === 'setup' && file.version === 1,
      `${file.kind} ${file.version}`,
    );
    for (const part of ['wd=90', 'ws=16', 'lang=ru']) {
      check(`save: the link has ${part}`, String(file.link).includes(part), file.link);
    }
    check(
      'save: conditions is in column 1',
      Array.isArray(file.device?.layout?.c?.[0]) && file.device.layout.c[0].includes('conditions'),
      JSON.stringify(file.device?.layout),
    );
    check('save: the time bar is folded', file.device?.timeBarFolded === true, 'timeBarFolded');
    check('save: a status line', (await text(page, 'setup-status')).includes(today()), 'status');
    await shot(page, 'live-save');
    await context.close();
  }

  // 2. Load into a fresh page: the page loads again on the file's link, with the layout and the fold.
  if (saved) {
    const { context, page } = await openPage(desktop, 'm56 load', '?');
    await page.getByTestId('section-grip-learn').waitFor();
    check(
      'load: starts with the default columns',
      (await columnSections(page))[0].every((id) => id !== 'conditions'),
      JSON.stringify(await columnSections(page)),
    );
    await openSettings(page);
    await page.getByTestId('setup-file').setInputFiles(inJson(saved));
    await page.waitForURL(/wd=90/);
    await canvasReady(page);
    await page.getByTestId('section-grip-learn').waitFor();
    const link = await page.evaluate(() => window.location.search);
    check('load: the link has wd=90 and lang=ru', /wd=90/.test(link) && /lang=ru/.test(link), link);
    const columns = await columnSections(page);
    check(
      'load: conditions is in column 1',
      columns[0].includes('conditions'),
      JSON.stringify(columns),
    );
    const folded = await page.getByTestId('time-fold').getAttribute('aria-expanded');
    check('load: the time bar is folded', folded === 'false', String(folded));
    await shot(page, 'live-load');
    await context.close();
  }

  // 3. A file without a saved layout puts the computer back to the default arrangement.
  {
    const { context, page } = await openPage(desktop, 'm56 default layout', '?');
    await page.getByTestId('section-grip-learn').waitFor();
    await moveSectionBy(page, 'conditions', 'other');
    const moved = await columnSections(page);
    check('default layout: moved first', moved[0].includes('conditions'), JSON.stringify(moved));
    await openSettings(page);
    const file = Buffer.from(
      JSON.stringify({
        app: 'sail-learn-and-train',
        kind: 'setup',
        version: 1,
        savedAt: new Date().toISOString(),
        link: '?v=1&wd=-90',
        device: { timeBarFolded: false, layout: null },
      }),
    );
    await page.getByTestId('setup-file').setInputFiles(inJson(file));
    await page.waitForURL(/wd=-90/);
    await canvasReady(page);
    await page.getByTestId('section-grip-learn').waitFor();
    const columns = await columnSections(page);
    check(
      'default layout: conditions is back in column 2',
      columns[1].includes('conditions') && !columns[0].includes('conditions'),
      JSON.stringify(columns),
    );
    await context.close();
  }

  // 4. Bad files are refused with a message; the page does not reload.
  {
    const { context, page } = await openPage(phone, 'm56 bad files', '?');
    await openSettings(page);
    await page.evaluate(() => {
      window.__m56 = 1;
    });
    const input = page.getByTestId('setup-file');
    const cases = [
      [
        'not JSON',
        { name: 'nope.json', mimeType: 'application/json', buffer: Buffer.from('nope') },
        'This file cannot be read: it is not a setup file.',
      ],
      [
        'another app',
        { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"app":"x"}') },
        'This is not a setup file of this app.',
      ],
      [
        'newer version',
        {
          name: 'new.json',
          mimeType: 'application/json',
          buffer: Buffer.from(
            '{"app":"sail-learn-and-train","kind":"setup","version":2,"link":"?v=1"}',
          ),
        },
        'This setup file comes from a newer version of the app.',
      ],
      [
        'damaged link',
        {
          name: 'bad.json',
          mimeType: 'application/json',
          buffer: Buffer.from(
            '{"app":"sail-learn-and-train","kind":"setup","version":1,"link":"v=1"}',
          ),
        },
        'This setup file is damaged: its boat settings cannot be read.',
      ],
      [
        'too big',
        { name: 'big.json', mimeType: 'application/json', buffer: Buffer.alloc(1_000_001) },
        'This file is too big to be a setup file.',
      ],
    ];
    for (const [what, file, message] of cases) {
      await input.setInputFiles(file);
      check(`bad file (${what}): the message`, await statusIs(page, message), message);
    }
    const marker = await page.evaluate(() => window.__m56);
    check('bad files: no reload', marker === 1, String(marker));
    // The same file can be chosen twice in a row (the input is emptied after each read).
    await input.setInputFiles(cases[0][1]);
    check('bad files: the same file again', await statusIs(page, cases[0][2]), 'same message');
    await shot(page, 'live-bad');
    await context.close();
  }

  // 5. Phone: both buttons are 44 px high and inside the Settings tab; the audit is clean.
  {
    const { context, page } = await openPage(phone, 'm56 phone', '?');
    await openSettings(page);
    const content = page.getByTestId('settings-content');
    for (const id of ['setup-save', 'setup-load']) {
      const button = content.getByTestId(id);
      await button.scrollIntoViewIfNeeded();
      const box = await button.boundingBox();
      check(
        `phone: ${id} is in the Settings tab and 44 px high`,
        (await button.count()) === 1 && Boolean(box) && Math.round(box.height) >= 44,
        JSON.stringify(box),
      );
    }
    problems.push(...(await auditPage(page, 'm56 phone setup field')));
    await shot(page, 'live-phone');
    await context.close();
  }

  // 6. Computer: the field in the settings card passes the audit.
  {
    const { context, page } = await openPage(desktop, 'm56 desktop', '?');
    await openSettings(page);
    await page.getByTestId('setup-field').scrollIntoViewIfNeeded();
    problems.push(...(await auditPage(page, 'm56 desktop setup field')));
    await shot(page, 'live-desktop');
    await context.close();
  }
}
