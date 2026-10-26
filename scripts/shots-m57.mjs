// M57 (the boat profile file, PHASE8_SPEC 15.8): live checks for scripts/shots.mjs. Labels contain
// "m57", so openPage starts with every section folded. Every openPage makes a new browser context
// (downloads allowed). Nothing here depends on app time, so the checks run on the real clock.
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { auditPage } from './a11y-audit.mjs';
import { openSettings, setSheet } from './ui.mjs';

export const M57_SCENES = [];

export async function liveM57Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M57 ${what}: ${detail}`);
    console.log(`live M57 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone, , desktop] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });

  // 1. The Boat field on the computer: the name, the download, the guide link.
  {
    const { context, page } = await openPage(desktop, 'm57 boat field', '?');
    await openSettings(page);
    const field = page.getByTestId('boat-field');
    await field.scrollIntoViewIfNeeded();
    const name = await page.getByTestId('boat-name').innerText();
    check('boat name', name === 'Hanse 508', name);

    const button = page.getByTestId('boat-download');
    const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
    check(
      'download: the file name',
      download.suggestedFilename() === 'hanse508.boat.json',
      download.suggestedFilename(),
    );
    const file = JSON.parse((await readFile(await download.path())).toString('utf8'));
    check(
      'download: kind, id and the length',
      file.kind === 'boatProfile' && file.id === 'hanse508' && file.boat?.dimensions?.loa === 15.55,
      `${file.kind} ${file.id} ${file.boat?.dimensions?.loa}`,
    );
    check(
      'download: both thrusters are in the file',
      Array.isArray(file.boat?.hull?.thrusters) && file.boat.hull.thrusters.length === 2,
      String(file.boat?.hull?.thrusters?.length),
    );

    const guide = page.getByTestId('boat-guide');
    const href = (await guide.getAttribute('href')) ?? '';
    const target = await guide.getAttribute('target');
    check(
      'guide: link to docs/BOAT_PROFILE.md in a new tab',
      href.endsWith('docs/BOAT_PROFILE.md') && target === '_blank',
      `${href} ${target}`,
    );
    problems.push(...(await auditPage(page, 'm57 desktop boat field')));
    await field.scrollIntoViewIfNeeded();
    await shot(page, 'live-desktop');
    await field.screenshot({ path: path.join(outDir, `${prefix}live-desktop-field.png`) });
    await context.close();
  }

  // 2. A phone: the field is in the Settings tab and its controls are 44 px high.
  {
    const { context, page } = await openPage(phone, 'm57 phone', '?');
    await openSettings(page);
    await page.getByTestId('boat-field').scrollIntoViewIfNeeded();
    for (const id of ['boat-download', 'boat-guide']) {
      const target = page.getByTestId(id);
      await target.scrollIntoViewIfNeeded();
      const box = await target.boundingBox();
      check(
        `phone: ${id} is 44 px high`,
        Boolean(box) && Math.round(box.height) >= 44,
        JSON.stringify(box),
      );
    }
    problems.push(...(await auditPage(page, 'm57 phone boat field')));
    await page.getByTestId('boat-field').scrollIntoViewIfNeeded();
    await shot(page, 'live-phone');
    await context.close();
  }

  // 3. The Hanse 508 keeps both thrusters: the quick row (phone) shows both joysticks.
  {
    const { context, page } = await openPage(phone, 'm57 thrusters', '?m=harbour&pl=marina');
    await setSheet(page, 'peek');
    for (const id of ['thruster-bow-quick', 'thruster-stern-quick']) {
      check(`thrusters: ${id} is shown`, await page.getByTestId(id).isVisible(), id);
    }
    check(
      'thrusters: the quick row group is shown',
      await page.getByTestId('quick-thrusters').isVisible(),
      'quick-thrusters',
    );
    await context.close();
  }
}
