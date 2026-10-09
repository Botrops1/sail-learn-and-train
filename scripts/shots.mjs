// Screenshots for the PR (PHASE1_SPEC 11, "Visual").
// Usage: npm run shots   (builds first, then serves dist/ and drives headless Chromium)
// Writes PNGs into docs/screenshots/<milestone>/ and fails on any console error, a wrong
// layout mode, a page that scrolls, a tap that shows an unknown part, or a camera/URL problem.
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { createServer, preview } from 'vite';
import { liveM4aChecks, M4A_SCENES } from './shots-m4a.mjs';
import { liveM4bChecks, M4B_SCENES } from './shots-m4b.mjs';

const MILESTONE = process.env.SHOTS_MILESTONE ?? 'm4b';
const OUT_DIR = path.join('docs', 'screenshots', MILESTONE);
/** Every file of the set starts with this (M4a: "m4a-"), so parallel milestones never clash. */
const PREFIX = process.env.SHOTS_PREFIX ?? `${MILESTONE}-`;
const BASE_PATH = '/sail-learn-and-train/';

/** The three sizes from the spec, plus a landscape phone to show the rotation switch. */
const VIEWPORTS = [
  { name: 'phone-390x844', width: 390, height: 844, layout: 'stacked' },
  { name: 'foldable-820x1000', width: 820, height: 1000, layout: 'side' },
  { name: 'desktop-1440x900', width: 1440, height: 900, layout: 'side' },
  {
    name: 'phone-landscape-844x390',
    width: 844,
    height: 390,
    layout: 'side',
    only: [
      'wind-beam-side-port',
      'pt11-jib-sheet-100-bow',
      'm3-jib-fully-furled-sheet-released',
      'm4a-select-vang-side',
      'm4b-port-station-helm',
    ],
  },
];

/** Wind presets (PHASE1_SPEC 6.3), shot from the side (port) and from the top (spec 11). */
const WIND_PRESETS = [
  { name: 'head', wd: 0 },
  { name: 'close', wd: 45 },
  { name: 'beam', wd: 90 },
  { name: 'broad', wd: 135 },
  { name: 'run', wd: 175 },
];

/** What to show at each size. `tab` is clicked before the shot. */
const SCENES = [
  ...WIND_PRESETS.flatMap((preset) =>
    ['side-port', 'top'].map((cam) => ({
      name: `wind-${preset.name}-${cam}`,
      query: `?wd=${preset.wd}&ws=12&cam=${cam}`,
    })),
  ),
  // The presets change only the wind (easing is the learner's job). A realistic trim downwind:
  ...['broad', 'run'].flatMap((name) => {
    const wd = WIND_PRESETS.find((preset) => preset.name === name)?.wd;
    return ['side-port', 'top'].map((cam) => ({
      name: `wind-${name}-sheet-eased-${cam}`,
      query: `?wd=${wd}&ws=12&ms=80&cam=${cam}`,
    }));
  }),
  // WORKFLOW M3 checklist, one picture per check (the M2 set stays in docs/screenshots/m2).
  { name: 'pt10-wind30-car-port-top', query: '?wd=30&ws=12&cam=top' },
  { name: 'pt10-wind-30-car-stbd-top', query: '?wd=-30&ws=12&cam=top' },
  { name: 'pt10-wind30-bow', query: '?wd=30&ws=12&cam=bow' },
  // M3 review: fully hauled, the car still sits at the leeward end of the track (PT-10).
  { name: 'pt10-sheet-0-wind30-top', query: '?wd=30&ws=12&js=0&cam=top' },
  { name: 'pt10-sheet-0-wind-30-top', query: '?wd=-30&ws=12&js=0&cam=top' },
  { name: 'm3-head-to-wind-jib-flaps-bow', query: '?wd=0&ws=12&cam=bow' },
  { name: 'pt11-jib-sheet-0-top', query: '?wd=90&ws=12&js=0&cam=top' },
  { name: 'pt11-jib-sheet-100-top', query: '?wd=90&ws=12&js=100&cam=top' },
  { name: 'pt11-jib-sheet-0-bow', query: '?wd=90&ws=12&js=0&cam=bow' },
  { name: 'pt11-jib-sheet-100-bow', query: '?wd=90&ws=12&js=100&cam=bow' },
  {
    name: 'pt13-furl-blocked-ropes-tab',
    query: '?js=0&jf=0&cam=side-port&sel=rope_jib_furling_line',
    scrollTo: '.rope-strip',
  },
  {
    name: 'pt13-furl-sheet-90-ropes-tab',
    query: '?js=90&jf=0&cam=side-port&sel=rope_jib_furling_line',
    scrollTo: '.rope-strip',
  },
  // Owner decision after M3: 100 % jib sheet = released, so the jib rolls away completely.
  {
    name: 'm3-jib-fully-furled-sheet-released',
    query: '?js=100&jf=0&cam=side-port&sel=rope_jib_furling_line',
    scrollTo: '.rope-strip',
  },
  { name: 'm3-jib-fully-furled-bow', query: '?js=100&jf=0&cam=bow' },
  // M3 review: released sheet, half furled: the jib keeps its angle and flaps.
  {
    name: 'review-released-half-furled-top',
    query: '?wd=90&ws=12&js=100&jf=50&cam=top&sel=rope_jib_sheet',
    scrollTo: '.rope-strip',
  },
  // M3 review: on a run the panel says the main would block the jib's wind (Phase 2).
  {
    name: 'review-run-jib-note-ropes-tab',
    query: '?wd=175&ws=12&ms=80&cam=top&sel=rope_jib_sheet',
    scrollTo: '.rope-strip',
  },
  // M2 follow-ups: an eased topping lift hangs slack; a hauled one fights the main sheet.
  { name: 'm2fix-topping-lift-eased-sags-side', query: '?wd=90&ws=12&ms=40&cam=side-port' },
  {
    name: 'm2fix-pt06-lift-hauled-sheet-fighting',
    query: '?wd=60&ws=12&tl=0&ms=5&cam=side-port&sel=rope_mainsheet',
    scrollTo: '.rope-strip',
  },
  { name: 'card-jib-sheet', query: '?wd=60&ws=12&cam=side-port&sel=rope_jib_sheet' },
  { name: 'view-tab-debug', query: '?cam=top&debug=1', tab: 'View' },
  ...M4A_SCENES.map((scene) => ({ ...scene, name: `m4a-${scene.name}` })),
  ...M4B_SCENES.map((scene) => ({ ...scene, name: `m4b-${scene.name}` })),
];

/** Parts a tap must find somewhere in the sweep (WORKFLOW.md M1 checklist). */
const MUST_IDENTIFY = [
  'part_boom',
  'part_keel',
  'part_hull',
  'part_forestay',
  'part_backstay',
  'part_shroud',
  'sail_main',
  'sail_jib',
  'helm_port',
  'helm_starboard',
  'winch_primary_port',
  'winch_primary_starboard',
  'clutch_bank_a',
  'clutch_bank_b',
  'part_vang_strut',
  'fit_sprayhood',
  'part_lifelines',
  'fit_self_tacking_track',
  'rope_mainsheet',
  'rope_vang',
  'rope_topping_lift',
  'rope_jib_sheet',
  'part_windex',
];

/** Small fittings with an enlarged hit area, by side; each must respond where it is visible. */
const SMALL_CENTRELINE = [
  'part_gooseneck',
  'part_main_furling_gearbox',
  'fit_self_tacking_car',
  'fit_mainsheet_boom_blocks',
  'fit_mainsheet_deck_blocks',
  'fit_mast_base_turning_blocks',
  'part_jib_furler',
];
const SMALL_PORT = ['clutch_bank_b', 'clutch_jib_roll', 'winch_primary_port'];
const SMALL_STARBOARD = ['clutch_bank_a', 'winch_primary_starboard'];
const SMALL_PART_VIEWS = [
  { cam: 'side-port', expected: [...SMALL_CENTRELINE, ...SMALL_PORT] },
  { cam: 'side-starboard', expected: [...SMALL_CENTRELINE, ...SMALL_STARBOARD] },
  // M3b: the furling gearbox is on the mast's aft face under the gooseneck: hidden from above.
  {
    cam: 'top',
    expected: [
      ...SMALL_CENTRELINE.filter((id) => id !== 'part_main_furling_gearbox'),
      ...SMALL_PORT,
      ...SMALL_STARBOARD,
    ],
  },
];

/** Parts that must never be drawn (not on the reference boat). */
const MUST_NOT_IDENTIFY = ['winch_secondary_port', 'winch_secondary_starboard'];

const LAUNCH_ARGS = [
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
];

const server = await preview({ preview: { port: 4173, strictPort: false }, logLevel: 'warn' });
const origin =
  server.resolvedUrls?.local[0]?.replace(/\/sail-learn-and-train\/?$/, '') ??
  'http://localhost:4173';
const browser = await chromium.launch({ args: LAUNCH_ARGS });

await rm(OUT_DIR, { recursive: true, force: true });
await mkdir(OUT_DIR, { recursive: true });

const problems = [];

async function openPage(viewport, label, query) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    hasTouch: viewport.width < 1000,
    isMobile: false,
  });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      problems.push(`${label}: console ${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => problems.push(`${label}: page error: ${error.message}`));
  await page.goto(`${origin}${BASE_PATH}${query}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas.scene-canvas', { timeout: 10_000 });
  return { context, page };
}

const cardPart = (page) =>
  page.evaluate(() => {
    const card = document.querySelector('[data-testid="info-card"]');
    // Stacked layout: a rope shown in the Ropes tab's strip keeps the card away (M4a).
    if (!card || (card.hidden && !card.hasAttribute('data-in-panel'))) return null;
    return {
      id: card.getAttribute('data-part-id'),
      name: card.querySelector('.card-name')?.textContent ?? '',
    };
  });

/** Text of the mainsheet control's lines ("… paid out", "Mainsail filled, boom 34° out"). */
const mainsheetMeta = (page) =>
  page.locator('.rope-strip [data-part-id="rope_mainsheet"] .control-meta').innerText();

const boomAngle = async (page) => {
  const text = await mainsheetMeta(page);
  const match = /boom (\d+)° out/.exec(text);
  return match ? Number(match[1]) : NaN;
};

/**
 * M2 live checks (WORKFLOW M2): presets, rope controls and keyboard reach the URL; easing the
 * sheet from the centre moves the boom more than easing far out (PT-06); wind 170 → 180 →
 * −170 → −165 gives a gybe (PT-05); a held + button repeats.
 */
async function liveM2Checks() {
  const phone = VIEWPORTS[0];
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M2 ${what}: ${detail}`);
    console.log(`live M2 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };

  // PT-06: angle per 10 % of sheet, near the centre and far out (beam reach, vang eased).
  const angles = {};
  for (const ms of [0, 10, 70, 80]) {
    const { context, page } = await openPage(
      phone,
      `pt06 ms=${ms}`,
      `?wd=90&ws=12&vg=100&ms=${ms}&sel=rope_mainsheet`,
    );
    await page.waitForTimeout(400);
    angles[ms] = await boomAngle(page);
    await context.close();
  }
  const first = angles[10] - angles[0];
  const late = angles[80] - angles[70];
  check('PT-06 first vs late 10 %', first > late, `${first}° vs ${late}°`);

  // Gybe: wind 170 → 180 → −170 → −165 with the dial's keyboard (step 5).
  {
    const { context, page } = await openPage(phone, 'gybe', '?wd=170&ws=12&ms=100&cam=top');
    await page.getByRole('tab', { name: 'Wind' }).click();
    const dial = page.getByTestId('wind-dial');
    await dial.focus();
    const gybeShown = () => page.getByTestId('gybe-label').isVisible();
    const leeShown = () => page.getByTestId('by-the-lee-label').isVisible();
    for (let i = 0; i < 4; i += 1) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(400);
    }
    const url = await page.evaluate(() => window.location.search);
    check('dial wd 170 → −170', url.includes('wd=-170'), url);
    check('no gybe at −170', !(await gybeShown()), 'label hidden');
    check('by the lee at −170', await leeShown(), 'label shown');
    await page.screenshot({
      path: path.join(OUT_DIR, `${PREFIX}live-phone-by-the-lee-wd-170.png`),
    });
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(250);
    check('gybe at −165', await gybeShown(), 'label shown');
    await page.screenshot({ path: path.join(OUT_DIR, `${PREFIX}live-phone-gybe-wd-165.png`) });
    await context.close();
  }

  // Tack: wind 40 → −40 across the bow with the dial keys: "Tack", never "GYBE".
  {
    const { context, page } = await openPage(phone, 'tack', '?wd=40&ws=12&ms=20&cam=top');
    await page.getByRole('tab', { name: 'Wind' }).click();
    await page.getByTestId('wind-dial').focus();
    let sawGybe = false;
    let sawTack = false;
    for (let i = 0; i < 16; i += 1) {
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(120);
      sawGybe ||= await page.getByTestId('gybe-label').isVisible();
      sawTack ||= await page.getByTestId('tack-label').isVisible();
    }
    await page.waitForTimeout(500);
    const url = await page.evaluate(() => window.location.search);
    check('dial wd 40 → −40', url.includes('wd=-40'), url);
    check('tack shows "Tack", not "GYBE"', sawTack && !sawGybe, `tack ${sawTack}, gybe ${sawGybe}`);
    await page.screenshot({ path: path.join(OUT_DIR, `${PREFIX}live-phone-tack-wd-40.png`) });
    await context.close();
  }

  // Presets, slider keyboard, held + button.
  {
    const { context, page } = await openPage(phone, 'controls', '?wd=0&ws=5&ms=30');
    await page.getByRole('tab', { name: 'Wind' }).click();
    await page.getByRole('button', { name: 'Beam, starboard' }).click();
    await page.waitForTimeout(500);
    let url = await page.evaluate(() => window.location.search);
    check('preset beam', url.includes('wd=90&ws=12'), url);
    await page.getByRole('tab', { name: 'Ropes' }).click();
    await page.locator('[data-select="rope_mainsheet"]').click();
    await page.getByLabel('Main sheet', { exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    url = await page.evaluate(() => window.location.search);
    check('slider arrow key', url.includes('ms=35'), url);
    await page.locator('[data-select="rope_vang"]').click();
    const plus = page.getByRole('button', { name: 'More: Vang' });
    const box = await plus.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(1500);
    await page.mouse.up();
    await page.waitForTimeout(500);
    url = await page.evaluate(() => window.location.search);
    const vg = Number(/vg=(\d+)/.exec(url)?.[1]);
    check('held + repeats', vg >= 70, `vg=${vg}`);
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(OUT_DIR, `${PREFIX}live-phone-after-preset-and-controls.png`),
    });
    await context.close();
  }
}

/** Text of a rope control's lines, by its rope id (selected first, so the strip shows it). */
const controlMeta = async (page, ropeId) => {
  await page.locator(`[data-select="${ropeId}"]`).click();
  return page.locator(`.rope-strip [data-part-id="${ropeId}"] .control-meta`).innerText();
};

/**
 * M3 live checks (WORKFLOW M3): the car slides across when the wind crosses the bow (PT-10);
 * furling with the sheet hauled stops with a hint, easing the sheet lets it continue (PT-13).
 */
async function liveM3Checks() {
  const phone = VIEWPORTS[0];
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M3 ${what}: ${detail}`);
    console.log(`live M3 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };

  // PT-10: wind 30 → −30 with the dial keys (step 5): the car crosses to starboard.
  {
    const { context, page } = await openPage(phone, 'pt10', '?wd=30&ws=12&js=0&cam=top');
    const before = await controlMeta(page, 'rope_jib_sheet');
    check('car at port end at +30', before.includes('port end'), before.replace(/\n/g, ' | '));
    await page.getByRole('tab', { name: 'Wind' }).click();
    await page.getByTestId('wind-dial').focus();
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(1200);
    const url = await page.evaluate(() => window.location.search);
    check('dial wd 30 → −30', url.includes('wd=-30'), url);
    await page.screenshot({ path: path.join(OUT_DIR, `${PREFIX}live-phone-pt10-after-wd-30.png`) });
    await page.getByRole('tab', { name: 'Ropes' }).click();
    const after = await controlMeta(page, 'rope_jib_sheet');
    check(
      'car at starboard end at −30',
      after.includes('starboard end'),
      after.replace(/\n/g, ' | '),
    );
    await context.close();
  }

  // PT-13: sheet hauled, furl the jib with the keyboard (Home = 0 %): stops with the hint.
  {
    const { context, page } = await openPage(phone, 'pt13', '?wd=60&ws=12&js=0&cam=side-port');
    await page.locator('[data-select="rope_jib_furling_line"]').click();
    await page.getByLabel('Jib out', { exact: true }).focus();
    await page.keyboard.press('Home');
    await page.waitForTimeout(1500);
    let meta = await controlMeta(page, 'rope_jib_furling_line');
    check(
      'furl blocked with the sheet hauled',
      meta.includes('Ease the jib sheet'),
      meta.replace(/\n/g, ' | '),
    );
    await page.locator('.rope-strip').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(OUT_DIR, `${PREFIX}live-phone-pt13-furl-blocked.png`),
    });
    // Sheet 90 %: the furl continues, but stops again with the hint.
    await page.locator('[data-select="rope_jib_sheet"]').click();
    const sheet = page.getByLabel('Jib sheet', { exact: true });
    await sheet.focus();
    await page.keyboard.press('End');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(3000);
    meta = await controlMeta(page, 'rope_jib_furling_line');
    await page.locator('[data-select="rope_jib_sheet"]').click();
    const stopped = Number(/stopped at (\d+) %/.exec(meta)?.[1] ?? NaN);
    check('sheet 90 %: the furl continues, then stops', stopped < 80, meta.replace(/\n/g, ' | '));
    // 100 % = released: the furl completes, the hint goes away, the furling line is all in.
    await sheet.focus();
    await page.keyboard.press('End');
    await page.waitForTimeout(3000);
    meta = await controlMeta(page, 'rope_jib_furling_line');
    check(
      'sheet 100 % (released): the jib furls completely',
      !meta.includes('Ease the jib sheet') && meta.includes('0.0 m of rope paid out'),
      meta.replace(/\n/g, ' | '),
    );
    await page.locator('.rope-strip').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(OUT_DIR, `${PREFIX}live-phone-pt13-sheet-released-furled.png`),
    });
    await context.close();
  }
}

// SHOTS_ONLY_LIVE=1: only the live checks (quick re-check while iterating).
const ONLY_LIVE = process.env.SHOTS_ONLY_LIVE === '1';
// SHOTS_ONLY_M4B=1: only the M4b scenes and live checks (quick re-check while iterating).
const ONLY_M4B = process.env.SHOTS_ONLY_M4B === '1';
const QUICK = ONLY_LIVE || ONLY_M4B;

/**
 * Live checks on one page, no reload (M0–M4a): layout follows resizes; camera buttons and
 * dragging reach the URL; then the M2, M3 and M4a checklists.
 */
async function liveGeneralChecks() {
  const { context, page } = await openPage(VIEWPORTS[0], 'live', '');
  const steps = [
    { width: 390, height: 844, layout: 'stacked' },
    { width: 844, height: 390, layout: 'side' },
    { width: 699, height: 600, layout: 'stacked' },
    { width: 700, height: 600, layout: 'side' },
    { width: 800, height: 1001, layout: 'stacked' },
    { width: 1440, height: 900, layout: 'side' },
  ];
  for (const step of steps) {
    await page.setViewportSize({ width: step.width, height: step.height });
    // Software WebGL in the headless browser is slow: give the resize event time to land.
    await page.waitForTimeout(800);
    const layout = await page.evaluate(() => document.documentElement.dataset.layout);
    const ok = layout === step.layout;
    if (!ok)
      problems.push(`live resize ${step.width}x${step.height}: ${layout}, expected ${step.layout}`);
    console.log(`live resize ${step.width}x${step.height} -> ${layout} ${ok ? 'ok' : 'WRONG'}`);
  }
  const expectUrl = async (what, expected) => {
    // The address bar follows after a 300 ms debounce; at High detail one software-rendered
    // frame can take longer than that, so wait up to 3 s for it rather than a fixed 0.5 s.
    await page
      .waitForFunction((want) => window.location.search === want, expected, { timeout: 3000 })
      .catch(() => undefined);
    const search = await page.evaluate(() => window.location.search);
    const ok = search === expected;
    if (!ok) problems.push(`live ${what}: got ${search}, expected ${expected}`);
    console.log(`live ${what} -> ${search} ${ok ? 'ok' : 'WRONG'}`);
  };
  const c = 'ms=30&js=30&vg=50&tl=100&mf=100&jf=100&rd=0&wd=60&ws=12';
  await page.getByRole('button', { name: 'Top', exact: true }).click();
  // The phone-sized screen starts at low detail (M3b).
  await expectUrl('Top button', `?v=1&${c}&cam=top&step=5&detail=low`);
  const canvas = await page.locator('canvas.scene-canvas').boundingBox();
  const cx = canvas.x + canvas.width / 2;
  const cy = canvas.y + canvas.height / 3;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 10; i += 1) await page.mouse.move(cx + i * 15, cy + i * 4);
  await page.mouse.up();
  await expectUrl('drag', `?v=1&${c}&cam=free&step=5&detail=low`);
  await page.getByRole('tab', { name: 'View' }).click();
  await page.getByText('Side (starboard)', { exact: true }).click();
  await page.getByText('1 %', { exact: true }).click();
  await page.getByText('Debug overlay', { exact: true }).click();
  await expectUrl('View tab', `?v=1&${c}&cam=side-starboard&step=1&detail=low&debug=1`);
  // Detail: High rebuilds the boat with shadows and reflections; the overlay says so.
  await page.getByText('High', { exact: true }).click();
  await expectUrl('Detail high', `?v=1&${c}&cam=side-starboard&step=1&detail=high&debug=1`);
  await page.waitForTimeout(1500);
  const overlay = await page.getByTestId('debug-overlay').innerText();
  const ok = /Detail\s+high/.test(overlay) && /Draw calls\s+\d+/.test(overlay);
  if (!ok) problems.push(`live Detail high: overlay says ${overlay.replace(/\n/g, ' | ')}`);
  console.log(`live Detail high -> overlay ${ok ? 'ok' : 'WRONG'}`);
  await page.screenshot({
    path: path.join(OUT_DIR, `${PREFIX}live-desktop-view-tab-detail-high.png`),
  });
  await page.getByText('Low', { exact: true }).click();
  await expectUrl('Detail low', `?v=1&${c}&cam=side-starboard&step=1&detail=low&debug=1`);
  await context.close();

  await liveM2Checks();
  await liveM3Checks();
  await liveM4aChecks({
    openPage,
    viewports: VIEWPORTS,
    outDir: OUT_DIR,
    prefix: PREFIX,
    problems,
  });
}

try {
  for (const viewport of ONLY_LIVE ? [] : VIEWPORTS) {
    for (const scene of SCENES) {
      if (viewport.only && !viewport.only.includes(scene.name)) continue;
      if (ONLY_M4B && !scene.name.startsWith('m4b-')) continue;
      const label = `${viewport.name}/${scene.name}`;
      const { context, page } = await openPage(viewport, label, scene.query);
      if (scene.tab) await page.getByRole('tab', { name: scene.tab }).click();
      if (scene.open) {
        await page.locator(`.rope-strip > :not([hidden]) ${scene.open} summary`).click();
      }
      if (scene.scrollTo) await page.locator(scene.scrollTo).scrollIntoViewIfNeeded();
      await page.waitForTimeout(1200);

      const facts = await page.evaluate(() => ({
        layout: document.documentElement.dataset.layout,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        sceneError: document.querySelector('.scene-error')?.textContent ?? null,
        panelOverflow: (() => {
          const body = document.querySelector('.panel-body');
          return body ? body.scrollWidth - body.clientWidth : 0;
        })(),
        version: document.querySelector('[data-testid="build-version"]')?.textContent ?? null,
        url: window.location.search,
      }));
      if (facts.layout !== viewport.layout) {
        problems.push(`${label}: layout ${facts.layout}, expected ${viewport.layout}`);
      }
      if (facts.scrollWidth > facts.innerWidth) {
        problems.push(
          `${label}: page scrolls sideways (${facts.scrollWidth} > ${facts.innerWidth})`,
        );
      }
      if (facts.scrollHeight > facts.innerHeight) {
        problems.push(
          `${label}: page scrolls vertically (${facts.scrollHeight} > ${facts.innerHeight})`,
        );
      }
      if (facts.sceneError) problems.push(`${label}: ${facts.sceneError}`);
      if (facts.panelOverflow > 0) {
        problems.push(`${label}: panel content is ${facts.panelOverflow} px too wide`);
      }

      const file = path.join(OUT_DIR, `${PREFIX}${viewport.name}-${scene.name}.png`);
      await page.screenshot({ path: file });
      console.log(`${file}  layout=${facts.layout}  ${facts.version}  ${facts.url}`);
      await context.close();
    }
  }

  // Tap-to-identify sweep: tap a grid over the 3D view in several presets and collect what the
  // card shows. Every tap must give a registered part with a name (or nothing, for the sky).
  const found = new Map();
  const sweeps = QUICK
    ? []
    : [
        { viewport: VIEWPORTS[0], cam: 'side-port' },
        { viewport: VIEWPORTS[0], cam: 'bow' },
        { viewport: VIEWPORTS[0], cam: 'helm' },
        { viewport: VIEWPORTS[2], cam: 'side-starboard' },
        { viewport: VIEWPORTS[2], cam: 'top' },
      ];
  for (const { viewport, cam } of sweeps) {
    const label = `taps ${viewport.name}/${cam}`;
    const { context, page } = await openPage(viewport, label, `?cam=${cam}`);
    await page.waitForTimeout(800);
    const box = await page.locator('canvas.scene-canvas').boundingBox();
    const barTop = await page
      .locator('.camera-bar')
      .evaluate((bar) => bar.getBoundingClientRect().top);
    const step = viewport.width < 500 ? 14 : 24;
    let taps = 0;
    for (let y = box.y + step / 2; y < barTop - 4; y += step) {
      for (let x = box.x + step / 2; x < box.x + box.width; x += step) {
        await page.mouse.click(x, y);
        taps += 1;
        const part = await cardPart(page);
        if (!part) continue;
        if (!part.id || !part.name) problems.push(`${label}: tap at ${x},${y} gave an empty card`);
        found.set(part.id, (found.get(part.id) ?? 0) + 1);
        await page.keyboard.press('Escape');
      }
    }
    const search = await page.evaluate(() => window.location.search);
    if (!search.includes(`cam=${cam}`))
      problems.push(`${label}: taps changed the camera (${search})`);
    console.log(`${label}: ${taps} taps`);
    await context.close();
  }
  console.log(
    `identified by tapping: ${[...found.entries()].map(([id, n]) => `${id}×${n}`).join(', ')}`,
  );
  for (const id of QUICK ? [] : MUST_IDENTIFY) {
    if (!found.has(id)) problems.push(`tap sweep never identified ${id}`);
  }
  for (const id of MUST_NOT_IDENTIFY) {
    if (found.has(id)) problems.push(`tap sweep found ${id}, which should not be drawn`);
  }

  // Small fittings: in the default Side and Top views, a real tap on each one's hit-area centre
  // (positions from the debug-only hook) must show its card.
  for (const viewport of QUICK ? [] : VIEWPORTS.slice(0, 3)) {
    for (const view of SMALL_PART_VIEWS) {
      const label = `small parts ${viewport.name}/${view.cam}`;
      const { context, page } = await openPage(viewport, label, `?cam=${view.cam}&debug=1`);
      await page.waitForTimeout(800);
      const box = await page.locator('canvas.scene-canvas').boundingBox();
      const barTop = await page
        .locator('.camera-bar')
        .evaluate((bar) => bar.getBoundingClientRect().top);
      const centres = await page.evaluate(() => window.__sailDebug.hitCentres());
      const missing = [];
      for (const id of view.expected) {
        let ok = false;
        for (const c of centres.filter((centre) => centre.partId === id)) {
          const x = box.x + c.x;
          const y = box.y + c.y;
          if (y > barTop - 4 || x < box.x || x > box.x + box.width) continue;
          await page.mouse.click(x, y);
          const part = await cardPart(page);
          if (part) await page.keyboard.press('Escape');
          if (part?.id === id) {
            ok = true;
            break;
          }
        }
        if (!ok) missing.push(id);
      }
      // The mast is thin and sits between the sails' edges: a tap right on it must find it.
      if (view.cam !== 'top') {
        const mast = await page.evaluate(() => window.__sailDebug.project(0, 10, 0));
        await page.mouse.click(box.x + mast.x, box.y + mast.y);
        const part = await cardPart(page);
        if (part) await page.keyboard.press('Escape');
        if (part?.id !== 'part_mast') missing.push(`part_mast (got ${part?.id ?? 'nothing'})`);
      }
      if (missing.length > 0) problems.push(`${label}: no card for ${missing.join(', ')}`);
      console.log(
        `${label}: ${view.expected.length - missing.length}/${view.expected.length} respond`,
      );
      await context.close();
    }
  }

  // Live checks: layout, camera and URL, the M2–M4a checklists, then M4b (Realistic mode).
  if (!ONLY_M4B) await liveGeneralChecks();
  await liveM4bChecks({
    openPage,
    viewports: VIEWPORTS,
    outDir: OUT_DIR,
    prefix: PREFIX,
    problems,
  });
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}

// Proportion check (M1 "done when"): the model rendered at the scale of the reference sketches,
// with the sketch laid on top. Served by the Vite dev server from scripts/compare/.
const dev = await createServer({ server: { port: 5190, strictPort: false }, logLevel: 'warn' });
await dev.listen();
const compareBrowser = await chromium.launch({ args: LAUNCH_ARGS });
try {
  for (const [view, width, height] of QUICK
    ? []
    : [
        ['side', 824, 1168],
        ['plan', 792, 400],
      ]) {
    const page = await compareBrowser.newPage({ viewport: { width, height } });
    page.on('pageerror', (error) => problems.push(`compare ${view}: page error: ${error.message}`));
    await page.goto(`${dev.resolvedUrls.local[0]}scripts/compare/index.html?view=${view}`);
    await page.waitForSelector('body[data-ready="1"]', { state: 'attached', timeout: 30_000 });
    const file = path.join(OUT_DIR, `${PREFIX}compare-${view}-model-vs-sketch.png`);
    await page.screenshot({ path: file });
    console.log(file);
  }
} finally {
  await compareBrowser.close();
  await dev.close();
}

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):\n${problems.join('\n')}`);
  process.exit(1);
}
console.log('\nNo console errors, layouts as expected, no page scroll, taps and camera OK.');
