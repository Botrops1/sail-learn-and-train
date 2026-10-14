// M23 (The app in Russian): scenes and live checks for scripts/shots.mjs (PHASE4_SPEC 9.7). Labels
// contain "m23", so openPage adds held=1, sea=flat and clock=0 to queries without them.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';

/** Every size, all in Russian; the tab is opened by its Russian name. */
export const M23_SCENES = [
  { name: 'ru-ropes', query: '?lang=ru&wd=90&ws=12&sel=rope_vang', waitMs: 800 },
  { name: 'ru-wind', query: '?lang=ru&wd=90&ws=12', tab: 'Ветер', waitMs: 800 },
  { name: 'ru-view', query: '?lang=ru&wd=90&ws=12', tab: 'Вид', waitMs: 800 },
  { name: 'ru-map', query: '?lang=ru&wd=90&ws=12&cam=map', waitMs: 1000 },
  { name: 'ru-learn', query: '?lang=ru&learn=rope_vang', waitMs: 800 },
  { name: 'ru-realistic', query: '?lang=ru&mode=realistic', waitMs: 800 },
  // `clock=1` is not a link key (it is ignored); its presence only stops openPage adding clock=0.
  { name: 'ru-clock', query: '?lang=ru&clock=1', click: ['clock-chip'], waitMs: 1000 },
];

/** The Latin words allowed on a Russian screen: latin-words.json plus the words of the boat's labels. */
function allowedLatin() {
  const words = JSON.parse(readFileSync('content/lang/latin-words.json', 'utf8')).words;
  const allowed = new Set(words.map((word) => word.toLowerCase()));
  const boat = JSON.parse(readFileSync('content/boat/hanse508.json', 'utf8')).cockpitHardware;
  const labels = [
    ...boat.clutchBanks.flatMap((bank) => bank.clutches.map((clutch) => clutch.label)),
    boat.jibRollClutch.label,
  ];
  for (const label of labels) {
    for (const word of label.match(/[A-Za-zÀ-ÿ&]+/g) ?? []) allowed.add(word.toLowerCase());
  }
  return [...allowed];
}

/** The tabs in the page order, by their (Russian) names; Learn is opened by the link. */
const TAB_NAMES = ['Концы', 'Ветер', 'Вид', 'Обучение'];

export async function liveM23Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M23 ${what}: ${detail}`);
    console.log(`live M23 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const allowed = allowedLatin();

  /** The address bar is written 300 ms after a change: poll up to 1 s. */
  const wait = async (page, test, text) => {
    try {
      await page.waitForFunction(test, text, { timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  };
  const has = (page, text) => wait(page, (value) => location.search.includes(value), text);

  /** Latin runs not in the allowed set and curly quotes, in the visible text of the page. */
  const scanText = (page) =>
    page.evaluate((allowedWords) => {
      const allowedSet = new Set(allowedWords);
      const skip =
        'a, input, textarea, [data-testid="build-version"], [data-testid="debug-overlay"]';
      const found = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const element = node.parentElement;
        if (!element || element.closest(skip) || ['SCRIPT', 'STYLE'].includes(element.tagName)) {
          continue;
        }
        if (element.closest('[hidden], [aria-hidden="true"]')) continue;
        if (element.getClientRects().length === 0) continue;
        if (getComputedStyle(element).visibility === 'hidden') continue;
        const text = (node.textContent ?? '').normalize('NFC');
        for (const word of text.match(/[A-Za-zÀ-ÿ&]{2,}/g) ?? []) {
          if (!allowedSet.has(word.toLowerCase())) found.push(`"${word}" in "${text.trim()}"`);
        }
        if (/[“”]/.test(text)) found.push(`curly quote in "${text.trim()}"`);
      }
      return found;
    }, allowed);

  /** Buttons, segments, tabs and labels whose text is wider than their box. */
  const clipped = (page) =>
    page.evaluate(() => {
      const found = [];
      for (const element of document.querySelectorAll('button, .segment, .tab, label')) {
        if (element.closest('[hidden], [aria-hidden="true"], .visually-hidden')) continue;
        if (element.classList.contains('visually-hidden')) continue;
        const rect = element.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) continue;
        if (element.scrollWidth > element.clientWidth + 1) {
          const name = element.getAttribute('data-testid') ?? element.className;
          found.push(`${element.tagName.toLowerCase()}[${name}] "${element.textContent?.trim()}"`);
        }
      }
      // Text drawn inside a picture (SVG) is cut off at the picture's edge, which scrollWidth
      // cannot see: its box must lie inside the picture's box.
      for (const text of document.querySelectorAll('svg text')) {
        if (text.closest('[hidden], [aria-hidden="true"], .visually-hidden')) continue;
        if (getComputedStyle(text).visibility === 'hidden') continue;
        const svg = text.ownerSVGElement;
        if (!svg) continue;
        const picture = svg.getBoundingClientRect();
        const box = text.getBoundingClientRect();
        if (box.width < 2 || picture.width < 2) continue;
        if (box.right > picture.right + 1 || box.left < picture.left - 1) {
          found.push(`svg text "${text.textContent?.trim()}" runs past its picture`);
        }
      }
      return found;
    });

  // 1. The Russian page: html lang, the four tabs, the language control.
  {
    const { context, page } = await openPage(phone, 'm23 basics', '?lang=ru');
    await page.waitForTimeout(500);
    const lang = await page.evaluate(() => document.documentElement.lang);
    check('html lang is ru', lang === 'ru', lang);
    const tabs = await page.getByRole('tab').allInnerTexts();
    check(
      'the four tabs in Russian',
      JSON.stringify(tabs.map((tab) => tab.trim())) === JSON.stringify(TAB_NAMES),
      tabs.join(' | '),
    );
    await page.getByRole('tab', { name: 'Вид' }).click();
    const checked = await page.getByTestId('language-ru').isChecked();
    check('the Russian segment is checked', checked, String(checked));
    await context.close();
  }

  // 2 and 3. The Latin scan and the clipping check, in every view.
  {
    const views = [
      ['?lang=ru&wd=90&ws=12', ['Концы', 'Ветер', 'Вид']],
      ['?lang=ru&wd=90&ws=12&learn=rope_vang', ['Обучение']],
      ['?lang=ru&mode=realistic', ['Концы']],
      ['?lang=ru&cam=map', ['Концы']],
    ];
    for (const [query, tabs] of views) {
      const { context, page } = await openPage(phone, `m23 scan ${query}`, query);
      await page.waitForTimeout(600);
      for (const tab of tabs) {
        await page.getByRole('tab', { name: tab }).click();
        await page.waitForTimeout(300);
        const latin = await scanText(page);
        check(
          `Latin scan ${query} ${tab}`,
          latin.length === 0,
          latin.length ? latin.join(' | ') : 'clean',
        );
        const cut = await clipped(page);
        check(
          `nothing clipped ${query} ${tab}`,
          cut.length === 0,
          cut.length ? cut.join(' | ') : 'clean',
        );
      }
      if (query.includes('realistic')) {
        // The Mast and Helm stations have their own drawings and texts.
        for (const station of ['starboard', 'helm', 'mast']) {
          await page.locator(`button.station-button[data-station="${station}"]`).click();
          await page.waitForTimeout(300);
          const latin = await scanText(page);
          check(
            `Latin scan realistic ${station}`,
            latin.length === 0,
            latin.length ? latin.join(' | ') : 'clean',
          );
          const cut = await clipped(page);
          check(
            `nothing clipped realistic ${station}`,
            cut.length === 0,
            cut.length ? cut.join(' | ') : 'clean',
          );
        }
        await shot(page, 'live-phone-m23-realistic-mast');
      }
      await context.close();
    }
  }

  // 4. The Language control: English and back, each a page reload.
  {
    const { context, page } = await openPage(
      phone,
      'm23 switch to English',
      '?lang=ru&wd=90&ws=12',
    );
    await page.getByRole('tab', { name: 'Вид' }).click();
    await page.locator('label.segment', { has: page.getByTestId('language-en') }).click();
    await page.waitForURL((url) => !url.search.includes('lang='), { timeout: 5000 });
    await page.waitForSelector('canvas.scene-canvas', { state: 'attached', timeout: 10_000 });
    const ropes = (await page.locator('#tab-ropes').innerText()).trim();
    check('English: no lang in the address bar and the Ropes tab', ropes === 'Ropes', ropes);
    await page.getByRole('tab', { name: 'View' }).click();
    await page.locator('label.segment', { has: page.getByTestId('language-ru') }).click();
    await page.waitForURL((url) => url.search.includes('lang=ru'), { timeout: 5000 });
    await page.waitForSelector('canvas.scene-canvas', { state: 'attached', timeout: 10_000 });
    const tabs = (await page.locator('#tab-ropes').innerText()).trim();
    check('Russian again: the tab reads Концы', tabs === 'Концы', tabs);
    await context.close();
  }

  // 5. A Russian entry: name, other names, the draft line, and search by the other name.
  {
    const { context, page } = await openPage(phone, 'm23 north', '?lang=ru&learn=term_north');
    await page.waitForTimeout(500);
    const name = (await page.getByTestId('learn-name').innerText()).trim();
    check('term_north is "север"', name === 'север', name);
    const alternatives = await page.getByTestId('learn-alternatives').innerText();
    check('its other names contain "норд"', alternatives.includes('норд'), alternatives);
    check(
      'the "not yet checked by a sailor" line shows',
      await page.getByTestId('learn-text-status').isVisible(),
      'text status',
    );
    await shot(page, 'live-phone-m23-north');
    await context.close();
    const search = await openPage(phone, 'm23 search', '?lang=ru&wd=90&ws=12');
    await search.page.getByRole('tab', { name: 'Обучение' }).click();
    await search.page.getByTestId('learn-search').fill('норд');
    const hit = await search.page.getByTestId('learn-hit-term_north').count();
    check('search "норд" finds term_north', hit === 1, String(hit));
    await search.context.close();
  }

  // 6. The checked names.
  {
    const { context, page } = await openPage(phone, 'm23 gennaker', '?lang=ru&learn=sail_gennaker');
    await page.waitForTimeout(500);
    const name = (await page.getByTestId('learn-name').innerText()).trim();
    check('sail_gennaker is "геннакер"', name === 'геннакер', name);
    const alternatives = await page.getByTestId('learn-alternatives').innerText();
    check('its other names contain "генакер"', alternatives.includes('генакер'), alternatives);
    await page.goto(page.url().replace('learn=sail_gennaker', 'learn=term_round_up'));
    await page.waitForSelector('canvas.scene-canvas', { state: 'attached', timeout: 10_000 });
    await page.waitForTimeout(500);
    const roundUp = (await page.getByTestId('learn-name').innerText()).trim();
    check('term_round_up is "брочинг"', roundUp === 'брочинг', roundUp);
    await context.close();
  }

  // 7. Show me and Back keep the language and do not reload the page.
  {
    const { context, page } = await openPage(phone, 'm23 show me', '?lang=ru&learn=rope_vang');
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      window.__m23 = 1;
    });
    await page.getByTestId('learn-show-me').click();
    check('Show me keeps lang=ru', await has(page, 'lang=ru'), 'in the address bar');
    await shot(page, 'live-phone-m23-show-me');
    await page.goBack();
    check('Back keeps lang=ru', await has(page, 'lang=ru'), 'in the address bar');
    const marker = await page.evaluate(() => window.__m23);
    check('Back did not reload the page', marker === 1, String(marker));
    await context.close();
  }

  // 8. Accessibility of the Learn tab and the View tab in Russian.
  {
    const { context, page } = await openPage(phone, 'm23 a11y', '?lang=ru&learn=rope_vang');
    await page.waitForTimeout(500);
    const learn = await auditPage(page, 'm23 a11y learn');
    check(
      'accessibility: Learn in Russian',
      learn.length === 0,
      learn.length ? learn.join(' | ') : 'clean',
    );
    await page.getByRole('tab', { name: 'Вид' }).click();
    await page.waitForTimeout(300);
    const view = await auditPage(page, 'm23 a11y view');
    check(
      'accessibility: View in Russian',
      view.length === 0,
      view.length ? view.join(' | ') : 'clean',
    );
    await context.close();
  }
}
