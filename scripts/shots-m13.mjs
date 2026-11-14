// M13 (Phase 2 polish and sign-off): scenes and live checks for scripts/shots.mjs.
// - The accessibility audit (names, text size, touch targets, keyboard) on the Phase 2 controls
//   that earlier milestones did not audit: the autopilot, the sails panel, the Held still /
//   Sailing switch with the wind modes and the time bar, the engine at Detail Low.
// - The scene of the heaviest case (gusty wind at ×16, debug overlay). Its step-time check is the
//   one of the M19 group, on a heavier case. Labels contain "m13" so the script opens them Sailing.
import { auditPage } from './a11y-audit.mjs';
import { showSection } from './ui.mjs';

/** The heaviest case of the owner's checklist. */
const HEAVY = '?wd=90&ws=16&ms=40&js=100&wm=gusty&tx=16&debug=1';

/** Screenshots at every size. The script waits `waitMs` before each. */
export const M13_SCENES = [
  {
    // The heaviest case with the debug overlay: frame rate, slowest frame, work per frame.
    name: 'heavy',
    query: HEAVY,
    waitMs: 3000,
  },
  {
    // Easy mode with everything of Phase 2 in the Ropes tab: autopilot on a wind angle.
    name: 'autopilot',
    query: '?wd=60&ws=12&ms=30&js=100&ap=wind&cam=side-port',
    section: 'autopilot',
    scrollTo: '[data-section="autopilot"] [data-testid="autopilot"]',
    waitMs: 1500,
  },
  {
    // The sails panel: trim chips and hints.
    name: 'sails',
    query: '?wd=60&ws=12&ms=10&js=100&cam=side-port',
    scrollTo: '[data-section="sails"] [data-testid="sails-panel"]',
    waitMs: 1500,
  },
];

export async function liveM13Checks({ openPage, viewports, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M13 ${what}: ${detail}`);
    console.log(`live M13 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;

  // Accessibility of the Phase 2 controls (phone).
  for (const [name, query, tab, scrollTo] of [
    [
      'autopilot',
      '?wd=60&ws=12&ms=30&js=100&ap=wind&cam=side-port',
      'autopilot',
      'section-autopilot',
    ],
    ['sails panel', '?wd=60&ws=12&ms=10&js=100&cam=side-port', null, 'sails-panel'],
    [
      'wind tab: gusty, Held still / Sailing',
      '?wd=90&ws=16&ms=40&js=100&wm=gusty',
      'conditions',
      null,
    ],
    [
      'wind tab: shifty, time bar at ×4',
      '?wd=90&ws=12&ms=40&js=100&wm=shifty&tx=4',
      'conditions',
      null,
    ],
    ['engine at Detail Low', '?ws=0&eng=1&lv=66&detail=low', 'engine', 'engine-panel'],
  ]) {
    const { context, page } = await openPage(phone, `m13 a11y ${name}`, query);
    await page.waitForTimeout(800);
    if (tab) await showSection(page, tab);
    if (scrollTo) {
      const target = page.locator(`[data-testid="${scrollTo}"], .${scrollTo}`).first();
      if ((await target.count()) > 0) {
        // Sections start folded (M35): open the one that holds the target.
        const holder = await target.evaluate((el) => el.closest('[data-section]')?.dataset.section);
        if (holder) await showSection(page, holder);
        await target.scrollIntoViewIfNeeded();
      }
    }
    const found = await auditPage(page, `a11y ${name}`);
    check(`accessibility: ${name}`, found.length === 0, found.length ? found.join(' | ') : 'clean');
    await context.close();
  }
}
