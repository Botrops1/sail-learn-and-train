// M24 (Phase 4 sign-off): live checks for scripts/shots.mjs (PHASE4_SPEC 10.3). No scenes. Labels
// contain "m24", so openPage adds held=1, sea=flat and clock=0 to queries without them.
// For each language (phone size, one page each) it opens every Learn entry, checks that every
// section heading has text under it, and (English only) runs every "Show me" button and the
// phone's Back button. The counts come from the registry, so a new id needs no change here.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { setMode, showSection } from './ui.mjs';

export const M24_SCENES = [];

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

export async function liveM24Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M24 ${what}: ${detail}`);
    console.log(`live M24 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });

  // 1. What to expect: from the registry, read in Node.
  const registry = readJson('content/registry/parts.json').entries;
  const groups = new Set(registry.map((entry) => entry.group));
  const showMeIds = registry.filter((entry) => entry.showMe).map((entry) => entry.id);
  check('the registry has ids', registry.length > 0, String(registry.length));
  check('the registry has groups', groups.size > 0, String(groups.size));
  check('the registry has Show-me ids', showMeIds.length > 0, String(showMeIds.length));

  const search = (page) => page.evaluate(() => location.search);

  for (const code of ['en', 'ru']) {
    const names = Object.fromEntries(
      Object.entries(readJson(`content/lang/${code}/glossary.json`).entries).map(([id, text]) => [
        id,
        text.name,
      ]),
    );
    const label = `m24 ${code}`;
    const errorsBefore = problems.length;
    const { context, page } = await openPage(phone, label, code === 'en' ? '?' : '?lang=ru');
    await setMode(page, 'learn');
    await showSection(page, 'learn');
    await page.waitForTimeout(500);

    const groupCount = await page.locator('[data-testid="learn-groups"] > details').count();
    check(
      `${code}: a list for every group`,
      groupCount === groups.size,
      `${groupCount} of ${groups.size}`,
    );
    const buttonCount = await page.locator('[data-testid^="learn-entry-"]').count();
    check(
      `${code}: an entry button for every id`,
      buttonCount === registry.length,
      `${buttonCount} of ${registry.length}`,
    );

    /** Opens the entry's group first: the list is rebuilt, closed, after every Back. */
    const openEntry = async (entry) => {
      await page.evaluate((group) => {
        const details = document.querySelector(`[data-testid="learn-group-${group}"]`);
        if (details) details.open = true;
      }, entry.group);
      await page.getByTestId(`learn-entry-${entry.id}`).click();
      await page.getByTestId('learn-name').waitFor({ timeout: 5000 });
    };
    const learnName = async () => (await page.getByTestId('learn-name').innerText()).trim();

    let widest = { id: '', headings: 0 };
    const wrongName = [];
    const emptySection = [];
    const showMeFailures = [];
    for (const entry of registry) {
      await openEntry(entry);
      const name = await learnName();
      if (name !== names[entry.id])
        wrongName.push(`${entry.id}: "${name}" instead of "${names[entry.id]}"`);
      const headings = await page.evaluate(() =>
        [...document.querySelectorAll('[data-testid="learn-entry"] h3')].map(
          (heading) => heading.nextElementSibling?.textContent?.trim() ?? '',
        ),
      );
      if (headings.some((text) => text === '')) emptySection.push(entry.id);
      if (headings.length > widest.headings) widest = { id: entry.id, headings: headings.length };

      if (code === 'en' && entry.showMe) {
        try {
          await page.waitForFunction((id) => location.search.includes(`learn=${id}`), entry.id, {
            timeout: 3000,
          });
          const recorded = await search(page);
          await page.getByTestId('learn-show-me').click();
          await page.waitForFunction((before) => location.search !== before, recorded, {
            timeout: 3000,
          });
          // `null` for same-page history; the return value is not used.
          await page.goBack();
          await page.waitForFunction((before) => location.search === before, recorded, {
            timeout: 3000,
          });
          await page.waitForFunction(
            (expected) =>
              document.querySelector('[data-testid="learn-name"]')?.textContent?.trim() ===
              expected,
            names[entry.id],
            { timeout: 3000 },
          );
        } catch (error) {
          showMeFailures.push(`${entry.id}: ${String(error.message).split('\n')[0]}`);
          // Get back to the list so the next entry can be opened.
          await page.goto(page.url().split('?')[0] + '?held=1&sea=flat&clock=0');
          await page.waitForSelector('canvas.scene-canvas', { state: 'attached' });
          await setMode(page, 'learn');
          await showSection(page, 'learn');
          continue;
        }
      }
      await page.getByTestId('learn-back').click();
    }
    check(
      `${code}: all ${registry.length} entries show their name`,
      wrongName.length === 0,
      wrongName.length ? wrongName.slice(0, 5).join(' | ') : 'ok',
    );
    check(
      `${code}: every section heading has text under it`,
      emptySection.length === 0,
      emptySection.length
        ? emptySection.join(', ')
        : `most sections: ${widest.id} (${widest.headings})`,
    );
    if (code === 'en') {
      check(
        `en: all ${showMeIds.length} Show me buttons open a scene and Back returns`,
        showMeFailures.length === 0,
        showMeFailures.length ? showMeFailures.join(' | ') : `${showMeIds.length} ok`,
      );
    }

    // 5. Accessibility: the entry with the most sections, one group open, search results.
    const clean = (what, found) =>
      check(
        `${code}: accessibility, ${what}`,
        found.length === 0,
        found.length ? found.join(' | ') : 'clean',
      );
    const widestEntry = registry.find((entry) => entry.id === widest.id);
    await openEntry(widestEntry);
    clean(`the longest entry (${widest.id})`, await auditPage(page, `${label} a11y entry`));
    await page.getByTestId('learn-back').click();
    await page.evaluate(() => {
      const details = document.querySelector('[data-testid="learn-group-ropes"]');
      if (details) details.open = true;
    });
    clean('one group open', await auditPage(page, `${label} a11y group`));
    await shot(page, `live-phone-m24-${code}-group`);
    await page.getByTestId('learn-search').fill('ma');
    await page.waitForTimeout(300);
    const hits = await page.locator('[data-testid^="learn-hit-"]').count();
    check(`${code}: the search for "ma" finds something`, hits > 0, String(hits));
    clean('search results for "ma"', await auditPage(page, `${label} a11y search`));
    await shot(page, `live-phone-m24-${code}-search`);

    // 4. No console error during the whole run (openPage collects them into the problem list).
    const errors = problems
      .slice(errorsBefore)
      .filter((problem) => problem.startsWith(`${label}:`));
    check(
      `${code}: no console error`,
      errors.length === 0,
      errors.length ? errors.join(' | ') : 'none',
    );
    await context.close();
  }
}
