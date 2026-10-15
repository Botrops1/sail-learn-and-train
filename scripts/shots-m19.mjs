// M19 (Phase 3 polish and sign-off): live checks for scripts/shots.mjs (PHASE3_SPEC 11.2, 11.3).
// - The accessibility audit (names, text size, touch targets, keyboard) on the Phase 3 controls:
//   the Wind tab with the Waves block, the clock chip and its card, the View tab with the Clock
//   switch, the map with the buoys.
// - The M13 guard on the new heaviest case (open sea, gusty wind, ×16, a clock at night): the
//   debug overlay's "step" (model and panel work per frame) stays small at both details. Headless
//   software rendering says nothing about a phone's FPS; the owner measures that on the phone.
// Labels contain "m19", so the script opens them Sailing, on Coastal water, with the clock shown.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { openSettings, showSection } from './ui.mjs';

/** The heaviest case of the owner's checklist (WORKFLOW M19). */
const HEAVY = '?wd=90&ws=20&ms=40&js=100&sea=open&wm=gusty&tx=16&clk=202606012030&debug=1';

/** No screenshot scenes: M19 changes no picture. */
export const M19_SCENES = [];

export async function liveM19Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M19 ${what}: ${detail}`);
    console.log(`live M19 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone, desktop] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const audit = async (page, name) => {
    const found = await auditPage(page, `m19 a11y ${name}`);
    check(`accessibility: ${name}`, found.length === 0, found.length ? found.join(' | ') : 'clean');
  };

  // Accessibility of the Phase 3 controls (phone).
  {
    const { context, page } = await openPage(phone, 'm19 a11y wind tab', '?wd=90&ws=12&sea=open');
    await page.waitForTimeout(800);
    await showSection(page, 'conditions');
    const block = page.getByTestId('sea-setting');
    if ((await block.count()) > 0) await block.first().scrollIntoViewIfNeeded();
    check('the Waves block is in the Wind tab', (await block.count()) > 0, 'no sea-setting');
    await audit(page, 'Wind tab with the Waves block');
    await context.close();
  }
  {
    const { context, page } = await openPage(phone, 'm19 a11y clock', '?wd=90&ws=12&ms=40&js=100');
    await page.waitForTimeout(800);
    await audit(page, 'clock chip');
    await page.getByTestId('clock-chip').click();
    await page.waitForTimeout(300);
    await audit(page, 'clock card');
    await context.close();
  }
  {
    const { context, page } = await openPage(phone, 'm19 a11y settings', '?wd=90&ws=12');
    await page.waitForTimeout(800);
    await openSettings(page);
    const toggle = page.getByTestId('clock-switch');
    check('the Clock switch is in the settings', (await toggle.count()) > 0, 'no clock-switch');
    await audit(page, 'Settings with the Clock switch');
    await context.close();
  }
  {
    const { context, page } = await openPage(phone, 'm19 a11y map', '?wd=90&ws=12&cam=map');
    await page.waitForTimeout(1500);
    for (let i = 0; i < 4; i += 1) {
      await page.getByTestId('map-zoom-out').click();
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(500);
    await audit(page, 'map with buoys at 2 m/px');
    await shot(page, 'live-phone-m19-map-buoys');
    await context.close();
  }

  // The heaviest case at Detail Low and High: the overlay's frame numbers, no crash, no stall.
  for (const viewport of [phone, desktop]) {
    for (const detail of ['low', 'high']) {
      const { context, page } = await openPage(
        viewport,
        `m19 heavy ${viewport.name} ${detail}`,
        `${HEAVY}&detail=${detail}`,
      );
      await page.waitForTimeout(4000);
      const overlay = (await page.getByTestId('debug-overlay').innerText()).replace(/\s+/g, ' ');
      const stepMs = Number(/step ([\d.]+)/.exec(overlay)?.[1]);
      console.log(
        `live M19 frames at open sea, gusty, ×16, night, ${viewport.name}, Detail ${detail}: ${overlay.slice(0, 200)} (software rendering)`,
      );
      check(
        `heaviest case: the step stays under 8 ms (${viewport.name}, ${detail})`,
        Number.isFinite(stepMs) && stepMs < 8,
        `step ${stepMs} ms per frame; ${overlay.slice(0, 100)}`,
      );
      if (viewport === phone) await shot(page, `live-phone-m19-heavy-${detail}`);
      await context.close();
    }
  }
}
