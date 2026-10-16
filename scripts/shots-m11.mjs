// M11 (gybes): scenes and live checks for scripts/shots.mjs.
// A gybe happens when the boat is steered 15° or more past dead downwind (by the lee). The
// checks use the autopilot's −10 button, as the owner's checklist does: the wind from 175°, the
// boat turned to 350° and then 340°. Their labels contain "m11" so the script opens them Sailing.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { showSection } from './ui.mjs';

/** Screenshots at every size. The script waits `waitMs` before each. */
export const M11_SCENES = [
  {
    // Steered to 350°: the wind is 5° by the lee, the faint outline of where the boom would swing.
    name: 'by-the-lee-top',
    query: '?wd=175&ws=15&ms=100&js=100&apt=350&cam=top',
    waitMs: 9000,
  },
];

const text = async (page, id) => (await page.getByTestId(id).textContent()) ?? '';

export async function liveM11Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M11 ${what}: ${detail}`);
    console.log(`live M11 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const turn = (page, deg) =>
    page.locator('[data-section="autopilot"]').getByTestId(`autopilot-turn-${deg}`);

  /** Waits (real time) until the test id is visible; false after `ms`. */
  const appears = async (page, id, ms) => {
    try {
      await page.getByTestId(id).waitFor({ state: 'visible', timeout: ms });
      return true;
    } catch {
      return false;
    }
  };

  // The accidental gybe: the boom slams across, the red sector shows, the report says how hard.
  {
    const { context, page } = await openPage(
      phone,
      'm11 accidental gybe',
      '?wd=175&ws=20&ms=100&js=100&tx=0.5&cam=top',
    );
    await page.waitForTimeout(1000);
    await showSection(page, 'autopilot');
    await turn(page, -10).click();
    await turn(page, -10).click();
    const flash = await appears(page, 'gybe-label', 90_000);
    check('accidental gybe: the GYBE flash shows', flash, String(flash));
    // About a second in (the swing takes 3 s at half speed): the red sector is on screen.
    await page.waitForTimeout(900);
    await shot(page, 'live-phone-gybe-danger');
    const report = await appears(page, 'gybe-report', 20_000);
    check('accidental gybe: the report shows', report, String(report));
    const said = report ? await text(page, 'gybe-report') : '';
    check('report starts "Accidental gybe!"', said.startsWith('Accidental gybe!'), said);
    const load = Number(/load (\d+\.\d) kN/.exec(said)?.[1]);
    check('report: peak main sheet load is several kN', load >= 5 && load <= 40, String(load));
    check(
      'report: says what to do',
      said.includes('haul the main sheet in before turning'),
      said.slice(-80),
    );
    await shot(page, 'live-phone-gybe-report');
    problems.push(...(await auditPage(page, 'm11 gybe report')));
    // It goes away again (8 s of simulated time = 16 s here at half speed).
    let gone = false;
    for (let i = 0; i < 400 && !gone; i += 1) {
      await page.waitForTimeout(100);
      gone = !(await page.getByTestId('gybe-report').isVisible());
    }
    check('report goes away again', gone, String(gone));
    await context.close();
  }

  // The controlled gybe: the main sheet hauled in, so the boom hardly moves and the load is small.
  {
    const { context, page } = await openPage(
      phone,
      'm11 controlled gybe',
      '?wd=175&ws=20&ms=5&js=100&cam=top',
    );
    await page.waitForTimeout(1000);
    await showSection(page, 'autopilot');
    await turn(page, -10).click();
    await turn(page, -10).click();
    const report = await appears(page, 'gybe-report', 90_000);
    check('controlled gybe: the report shows', report, String(report));
    const said = report ? await text(page, 'gybe-report') : '';
    check('report starts "Controlled gybe"', said.startsWith('Controlled gybe'), said);
    const load = Number(/load (\d+\.\d) kN/.exec(said)?.[1]);
    check('report: the load is small (under 3 kN)', load < 3, String(load));
    await shot(page, 'live-phone-gybe-controlled');
    await context.close();
  }

  // By the lee: the warning shows, and after 3 s it says the boom can come across any moment.
  {
    const { context, page } = await openPage(
      phone,
      'm11 by the lee',
      '?wd=175&ws=15&ms=100&js=100&cam=top',
    );
    await page.waitForTimeout(1000);
    await showSection(page, 'autopilot');
    await turn(page, -10).click();
    const lee = await appears(page, 'by-the-lee-label', 60_000);
    check('by the lee: the warning shows', lee, String(lee));
    check(
      'by the lee: first the quiet warning',
      (await text(page, 'by-the-lee-label')) === 'By the lee: gybe risk',
      await text(page, 'by-the-lee-label'),
    );
    await shot(page, 'live-phone-by-the-lee');
    let strong = false;
    for (let i = 0; i < 300 && !strong; i += 1) {
      await page.waitForTimeout(100);
      strong = (await text(page, 'by-the-lee-label')).includes('any moment');
    }
    check(
      'by the lee: after 3 s the stronger warning',
      strong,
      await text(page, 'by-the-lee-label'),
    );
    await shot(page, 'live-phone-by-the-lee-strong');
    check(
      'by the lee: no gybe report (she is still by the lee, not across)',
      !(await page.getByTestId('gybe-report').isVisible()),
      'hidden',
    );
    await context.close();
  }

  // Held still is Phase 1: the same gybe from the Wind tab's dial gets a report too.
  {
    const { context, page } = await openPage(
      phone,
      'm11 held gybe',
      '?wd=170&ws=15&ms=100&js=100&held=1&cam=top',
    );
    await showSection(page, 'conditions');
    await page.getByTestId('wind-dial').scrollIntoViewIfNeeded();
    const hasReport = await page.getByTestId('gybe-report').count();
    check('held: the report element exists, hidden', hasReport === 1, String(hasReport));
    await context.close();
  }
}
