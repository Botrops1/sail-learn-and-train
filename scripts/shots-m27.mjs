// M27 (modes and sections): scenes and live checks for scripts/shots.mjs (PHASE5_SPEC 8.9).
// Labels contain "m27", so openPage adds nothing: the app opens as it does without a link
// (Sailing, Coastal waves, the clock chip shown).
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { findClipped, scanLatin } from './shots-m23.mjs';
import {
  eachSection,
  sectionShown,
  setMode,
  setSheet,
  showSection,
  showTab,
  waitForLink,
} from './ui.mjs';

const BOAT = '?wd=60&ws=12';
// M51: on the phone Mode is the first section and Settings the last (they are the Mode and Settings tabs).
const SECTION_ORDER = {
  easy: [
    'mode',
    'ropes',
    'sails',
    'autopilot',
    'engine',
    'conditions',
    'learn',
    'place',
    'anchor',
    'harbour',
    'settings',
  ],
  realistic: ['mode', 'ropes', 'sails', 'conditions', 'learn', 'place', 'harbour', 'settings'],
  learn: [
    'mode',
    'learn',
    'ropes',
    'sails',
    'autopilot',
    'engine',
    'conditions',
    'place',
    'anchor',
    'harbour',
    'settings',
  ],
};

export const M27_SCENES = [
  { name: 'learn-mode', query: `?m=learn${BOAT.replace('?', '&')}` },
  {
    name: 'easy-peek-selected',
    query: `?sel=rope_mainsheet${BOAT.replace('?', '&')}`,
    sheet: 'peek',
  },
  {
    name: 'conditions-explain',
    query: BOAT,
    section: 'conditions',
    click: ['section-explain-conditions'],
  },
  { name: 'realistic-mode', query: '?mode=realistic&st=port' },
];

export async function liveM27Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M27 ${what}: ${detail}`);
    console.log(`live M27 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone, , desktop] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  // M51: the mode is named on the Mode tab.
  const chipLabel = async (page) => (await page.getByTestId('panel-tab-mode').innerText()).trim();
  const dataOpen = (page, id) => page.getByTestId(`section-${id}`).getAttribute('data-open');
  /** The visible sections in page order. */
  const sectionIds = (page) =>
    page.evaluate(() =>
      [...document.querySelectorAll('.panel-body > [data-section]')]
        .filter((node) => !node.hidden)
        .map((node) => node.getAttribute('data-section')),
    );
  const learnName = async (page) => (await page.getByTestId('learn-name').innerText()).trim();

  // 1. Opens in Easy: the chip, the order, what is open, no tabs.
  {
    const { context, page } = await openPage(phone, 'm27 easy', '?');
    await page.waitForTimeout(500);
    check('the chip reads Easy', (await chipLabel(page)) === 'Easy', await chipLabel(page));
    const ids = await sectionIds(page);
    check('Easy order', ids.join() === SECTION_ORDER.easy.join(), ids.join());
    const opens = [];
    for (const id of ids) opens.push(`${id}:${await dataOpen(page, id)}`);
    check(
      'Easy: every section folded (M35)',
      opens.join() ===
        'mode:false,ropes:false,sails:false,autopilot:false,engine:false,conditions:false,learn:false,place:false,anchor:false,harbour:false,settings:false',
      opens.join(),
    );
    const tabs = await page.locator('[role="tab"]').count();
    check('five tabs', tabs === 5, String(tabs));
    await context.close();
  }

  // 2. Learn mode: first and open; the link; an entry; back to Easy drops m and learn.
  {
    const { context, page } = await openPage(phone, 'm27 learn mode', BOAT);
    await setMode(page, 'learn');
    await waitForLink(page, ['&m=learn']);
    const ids = await sectionIds(page);
    check('Learn order', ids.join() === SECTION_ORDER.learn.join(), ids.join());
    check(
      'the Learn tab opens its section',
      (await dataOpen(page, 'learn')) === 'true',
      String(await dataOpen(page, 'learn')),
    );
    await showSection(page, 'learn');
    await page.getByTestId('learn-group-ropes').evaluate((node) => {
      node.open = true;
    });
    await page.getByTestId('learn-entry-rope_vang').click();
    await waitForLink(page, ['learn=rope_vang']);
    await setMode(page, 'easy');
    await waitForLink(page, [], ['&m=', 'learn=']);
    await setMode(page, 'learn');
    await page.getByTestId('learn-name').waitFor({ state: 'visible' });
    check('the Vang entry shows again', (await learnName(page)) === 'Vang', await learnName(page));
    await context.close();
  }

  // 3. Realistic: the link, the stations, no Autopilot and Engine sections.
  {
    const { context, page } = await openPage(phone, 'm27 realistic', BOAT);
    await setMode(page, 'realistic');
    await waitForLink(page, ['mode=realistic']);
    await showSection(page, 'ropes');
    check(
      'the station bar shows in the Ropes section',
      await page.getByTestId('section-ropes').getByTestId('station-bar').isVisible(),
      'not visible',
    );
    for (const id of ['autopilot', 'engine']) {
      const hidden = await page.getByTestId(`section-${id}`).evaluate((node) => node.hidden);
      check(`${id} is hidden in Realistic`, hidden, String(hidden));
    }
    const ids = await sectionIds(page);
    check('Realistic order', ids.join() === SECTION_ORDER.realistic.join(), ids.join());
    await context.close();
  }

  // 4. Old links.
  {
    const open = async (query, label) => openPage(phone, `m27 old ${label}`, query);
    let opened = await open('?learn=term_north', 'learn');
    await opened.page.waitForTimeout(500);
    check(
      '?learn= opens Learn mode',
      (await chipLabel(opened.page)) === 'Learn',
      await chipLabel(opened.page),
    );
    check(
      '"North" shows',
      (await learnName(opened.page)) === 'North',
      await learnName(opened.page),
    );
    await opened.context.close();

    opened = await open('?mode=realistic&sel=rope_mainsheet', 'realistic');
    await opened.page.waitForTimeout(500);
    check(
      '?mode=realistic opens Realistic',
      (await chipLabel(opened.page)) === 'Realistic',
      await chipLabel(opened.page),
    );
    await opened.context.close();

    opened = await open('?learn=rope_vang&mode=realistic', 'both');
    await opened.page.waitForTimeout(500);
    check(
      'learn= wins: Learn mode',
      (await chipLabel(opened.page)) === 'Learn',
      await chipLabel(opened.page),
    );
    await setMode(opened.page, 'realistic');
    await showSection(opened.page, 'ropes');
    const stations = await opened.page.getByTestId('station-bar').isVisible();
    check('Realistic stations after choosing Realistic', stations, String(stations));
    await opened.context.close();
  }

  // 5. Show me in Learn mode, then Back.
  {
    const { context, page } = await openPage(phone, 'm27 show me', '?m=learn&learn=rope_vang');
    await page.waitForTimeout(500);
    // The boat's speed (`bs`) and the rudder (`rd`, the autopilot moves it) change all the time:
    // compare the rest of the link.
    const link = () => page.evaluate(() => window.location.search.replace(/&(bs|rd)=[^&]*/g, ''));
    const before = await link();
    await page.getByTestId('learn-show-me').click();
    await page.waitForTimeout(800);
    check('the chip still reads Learn', (await chipLabel(page)) === 'Learn', await chipLabel(page));
    await page.goBack();
    await page.waitForTimeout(800);
    const after = await link();
    check('Back returns to the same link', after === before, `${before} | ${after}`);
    check('still Learn', (await chipLabel(page)) === 'Learn', await chipLabel(page));
    await context.close();
  }

  // 5b. Show me after reading an entry in Easy mode's Learn section (review of PR #65): Back
  // returns to the entry.
  {
    const { context, page } = await openPage(phone, 'm27 show me easy', BOAT);
    await page.waitForTimeout(500);
    await showSection(page, 'learn');
    await page.getByTestId('learn-group-ropes').evaluate((node) => {
      node.open = true;
    });
    await page.getByTestId('learn-entry-rope_vang').click();
    await page.getByTestId('learn-show-me').click();
    await page.waitForTimeout(800);
    await page.goBack();
    await page.waitForTimeout(800);
    const back = await page.evaluate(() => window.location.search);
    check(
      'Show me from Easy: Back returns to the entry',
      back.includes('m=learn') && back.includes('learn=rope_vang'),
      back,
    );
    check('the Vang entry shows again', (await learnName(page)) === 'Vang', await learnName(page));
    await context.close();
  }

  // 6. More and Try it.
  {
    const { context, page } = await openPage(phone, 'm27 more', '?sel=part_boom&wd=60&ws=12');
    await page.waitForTimeout(500);
    await page.getByTestId('card-more').click();
    await waitForLink(page, ['m=learn', 'learn=part_boom']);
    check('More: Learn mode', (await chipLabel(page)) === 'Learn', await chipLabel(page));
    check('the Boom entry shows', (await learnName(page)) === 'Boom', await learnName(page));
    await context.close();

    const tryIt = await openPage(phone, 'm27 try it', '?m=learn&learn=rope_vang&wd=60&ws=12');
    const tryPage = tryIt.page;
    await tryPage.waitForTimeout(500);
    await tryPage.getByTestId('learn-try-rope_vang').click();
    await waitForLink(tryPage, ['sel=rope_vang'], ['m=learn']);
    check('Try it: Easy', (await chipLabel(tryPage)) === 'Easy', await chipLabel(tryPage));
    check('the Ropes section is shown', await sectionShown(tryPage, 'ropes'), 'not shown');
    const strip = await tryPage
      .locator('[data-testid="rope-strip"] > :not([hidden]) .control-name')
      .first()
      .innerText();
    check('the strip shows the Vang', /Vang/i.test(strip), strip);
    await tryIt.context.close();
  }

  // 7. The instrument strip opens Conditions.
  {
    const { context, page } = await openPage(phone, 'm27 instruments', BOAT);
    await page.waitForTimeout(500);
    await page.getByTestId('strip-main').click();
    await page.waitForTimeout(500);
    const open = await dataOpen(page, 'conditions');
    check('Conditions is open', open === 'true', String(open));
    const sheet = await page.getByTestId('sheet').getAttribute('data-sheet');
    check('the sheet is at least half', sheet === 'half' || sheet === 'full', String(sheet));
    const inView = await page.getByTestId('section-conditions').evaluate((node) => {
      const box = node.getBoundingClientRect();
      const body = node.closest('.panel-body').getBoundingClientRect();
      return box.top >= body.top - 2 && box.top < body.bottom;
    });
    check('Conditions starts inside the panel', inView, String(inView));
    await context.close();
  }

  // 8. Folding and "?".
  {
    const { context, page } = await openPage(phone, 'm27 folding', BOAT);
    await page.waitForTimeout(500);
    check(
      'a folded body is hidden',
      await page.locator('#section-body-sails').evaluate((node) => node.hidden),
      'not hidden',
    );
    await page.getByTestId('section-toggle-sails').click();
    check(
      'Sails opens',
      (await dataOpen(page, 'sails')) === 'true',
      String(await dataOpen(page, 'sails')),
    );
    await page.getByTestId('section-toggle-sails').click();
    check(
      'Sails folds again',
      (await dataOpen(page, 'sails')) === 'false',
      String(await dataOpen(page, 'sails')),
    );
    await showSection(page, 'conditions');
    const hint = page.getByTestId('section-conditions').locator('.explain').first();
    check('the explanation is hidden at first', !(await hint.isVisible()), 'visible');
    await page.getByTestId('section-explain-conditions').click();
    check('"?" shows it', await hint.isVisible(), 'hidden');
    await page.getByTestId('section-explain-conditions').click();
    check('a second tap hides it', !(await hint.isVisible()), 'visible');
    await context.close();
  }

  // 9. The quick row.
  {
    const { context, page } = await openPage(
      phone,
      'm27 quick row',
      '?sel=rope_mainsheet&ms=40&wd=60&ws=12',
    );
    await page.waitForTimeout(500);
    await setSheet(page, 'peek');
    const name = (await page.getByTestId('quick-name').innerText()).trim();
    const value = (await page.getByTestId('quick-value').innerText()).trim();
    check('quick name', name === 'Main sheet', name);
    check('quick value', value === '40 % eased', value);
    await page.getByRole('button', { name: 'More: Main sheet', exact: true }).click();
    await waitForLink(page, ['ms=45']);
    await setSheet(page, 'half');
    check(
      'the quick row is hidden at half',
      !(await page.getByTestId('quick-row').isVisible()),
      'visible',
    );
    const more = await page.getByRole('button', { name: 'More: Main sheet', exact: true }).count();
    check('one "More: Main sheet" button', more === 1, String(more));
    await context.close();
  }

  // 10. Russian.
  {
    const { context, page } = await openPage(phone, 'm27 ru', '?lang=ru&wd=60&ws=12');
    await page.waitForTimeout(500);
    await showTab(page, 'mode');
    const names = await page
      .locator('[data-testid="mode-choices"] .mode-option-name')
      .allInnerTexts();
    check(
      'the mode menu in Russian',
      names.map((n) => n.trim()).join() === 'Обучение,Простой,Реалистичный,Гавань',
      names.join(),
    );
    const latinMenu = await scanLatin(page);
    check(
      'Latin scan with the menu open',
      latinMenu.length === 0,
      latinMenu.join(' | ') || 'clean',
    );
    await showTab(page, 'controls');
    await eachSection(page, async (id) => {
      const latin = await scanLatin(page);
      check(`Latin scan with ${id} open`, latin.length === 0, latin.join(' | ') || 'clean');
      const cut = await findClipped(page);
      check(`nothing clipped with ${id} open`, cut.length === 0, cut.join(' | ') || 'clean');
    });
    await shot(page, 'live-phone-m27-ru');
    await context.close();
  }

  // 11. Accessibility.
  {
    let opened = await openPage(phone, 'm27 a11y menu', BOAT);
    await opened.page.waitForTimeout(500);
    await showTab(opened.page, 'mode');
    problems.push(...(await auditPage(opened.page, 'm27 mode menu')));
    await opened.context.close();

    opened = await openPage(phone, 'm27 a11y easy', BOAT);
    await opened.page.waitForTimeout(500);
    await eachSection(opened.page, async (id) => {
      problems.push(...(await auditPage(opened.page, `m27 easy, ${id} open`)));
    });
    await opened.context.close();

    opened = await openPage(phone, 'm27 a11y learn', '?m=learn&learn=rope_vang&wd=60&ws=12');
    await opened.page.waitForTimeout(500);
    problems.push(...(await auditPage(opened.page, 'm27 learn entry')));
    await opened.context.close();

    opened = await openPage(phone, 'm27 a11y realistic', '?mode=realistic&st=port');
    await opened.page.waitForTimeout(500);
    await setSheet(opened.page, 'full');
    problems.push(...(await auditPage(opened.page, 'm27 realistic, full')));
    await opened.context.close();

    opened = await openPage(desktop, 'm27 a11y desktop', BOAT);
    await opened.page.waitForTimeout(500);
    problems.push(...(await auditPage(opened.page, 'm27 easy, desktop')));
    await opened.context.close();
  }

  // 12. Every section in every mode.
  {
    const { context, page } = await openPage(phone, 'm27 every section', BOAT);
    await page.waitForTimeout(500);
    for (const mode of ['learn', 'easy', 'realistic']) {
      await setMode(page, mode);
      for (const id of SECTION_ORDER[mode]) {
        await showSection(page, id);
        const shown = await sectionShown(page, id);
        check(`${mode}: ${id} can be shown`, shown, String(shown));
      }
    }
    await context.close();
  }
}
