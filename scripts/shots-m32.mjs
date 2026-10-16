// M32 (cleats and fairleads): scenes and live checks for scripts/shots.mjs (PHASE6_SPEC 8.6).
// Labels contain "m32", which matches none of openPage's label tests, so every page opens Held
// still on flat water with the clock chip and the mini-map hidden (the Phase 1 picture).
import path from 'node:path';
import { setSheet, waitForLink } from './ui.mjs';

/** The side view with the cleats lit up (what "Show on the boat" writes). */
export const M32_SCENES = [
  {
    name: 'cleats-side',
    query: '?wd=0&ws=0&cam=side-starboard&sel=fit_mooring_cleat&held=1&sea=flat',
    waitMs: 1000,
  },
];

/** Close-ups (boat coordinates: x forward, y up, z starboard), PHASE6_SPEC 8.6. */
const CLOSE_UPS = [
  { name: 'cleat-bow', position: [4.3, 2.3, 1.4], target: [5.0, 1.75, 0.58], fov: 40 },
  { name: 'cleat-midship', position: [-0.2, 2.2, 3.4], target: [-1.2, 1.6, 2.2], fov: 40 },
  { name: 'cleat-stern', position: [-9.6, 2.4, 3.2], target: [-7.6, 1.46, 2.08], fov: 40 },
];

export async function liveM32Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M32 ${what}: ${detail}`);
    console.log(`live M32 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const [phone] = viewports;
  /** A close-up from a boat position; the debug overlay (needed for the hook) is hidden. */
  const closeUp = async (page, view) => {
    await setSheet(page, 'peek');
    await page.addStyleTag({ content: '.debug { display: none !important; }' });
    await page.evaluate((v) => window.__sailDebug.setView(v.position, v.target, v.fov), view);
    await page.waitForTimeout(1500);
  };
  const closeUpLink = (detail) => `?wd=0&ws=0&lb=0&debug=1&detail=${detail}`;

  // The three stations, at both details.
  for (const detail of ['high', 'low']) {
    const { context, page } = await openPage(phone, `m32 close-ups ${detail}`, closeUpLink(detail));
    await page.waitForTimeout(1000);
    for (const view of CLOSE_UPS) {
      await closeUp(page, view);
      await shot(page, `live-${view.name}-${detail}`);
    }
    await context.close();
  }

  // "Show on the boat" in the Mooring cleat entry selects the cleats.
  {
    const { context, page } = await openPage(
      phone,
      'm32 show cleat',
      '?learn=fit_mooring_cleat&m=learn&wd=0&ws=0&cam=side-starboard&lb=0',
    );
    await page.waitForTimeout(500);
    await page.getByTestId('learn-show-on-boat').click();
    let link;
    try {
      link = await waitForLink(page, ['sel=fit_mooring_cleat']);
    } catch (error) {
      link = String(error.message);
    }
    const got = await page
      .getByTestId('info-card')
      .getAttribute('data-part-id', { timeout: 3000 })
      .catch(() => null);
    check(
      'Show on the boat selects the cleat',
      link.includes('sel=fit_mooring_cleat') && got === 'fit_mooring_cleat',
      `${link} ${got}`,
    );
    await shot(page, 'live-show-cleat');
    await context.close();
  }

  // A tap on a cleat and on a fairlead names it. Each is tapped at the hit point nearest the
  // middle of the screen, where the close-up looks at the starboard fitting.
  const TAPS = [
    { id: 'fit_mooring_cleat', view: CLOSE_UPS[1], name: 'Mooring cleat' },
    { id: 'fit_fairlead', view: CLOSE_UPS[0], name: 'Fairlead' },
  ];
  for (const { id, view, name } of TAPS) {
    const { context, page } = await openPage(phone, `m32 tap ${id}`, closeUpLink('high'));
    await page.waitForTimeout(1000);
    await closeUp(page, view);
    const box = await page.locator('canvas.scene-canvas').boundingBox();
    const screen = await page.evaluate(
      ([partId, w, h]) => {
        const near = (c) => Math.hypot(c.x - w / 2, c.y - h / 2);
        const all = window.__sailDebug.hitCentres().filter((c) => c.partId === partId);
        return all.sort((a, b) => near(a) - near(b))[0] ?? null;
      },
      [id, box.width, box.height],
    );
    const onScreen =
      screen && screen.x > 0 && screen.y > 0 && screen.x < box.width && screen.y < box.height;
    if (!onScreen) {
      check(`tap ${id}`, false, `the tap point is off the screen: ${JSON.stringify(screen)}`);
    } else {
      await page.mouse.click(box.x + screen.x, box.y + screen.y);
      await page.waitForTimeout(400);
      const card = page.getByTestId('info-card');
      const got = await card.getAttribute('data-part-id').catch(() => null);
      const text = (await card.innerText().catch(() => '')) ?? '';
      check(`tap ${id}`, got === id && text.includes(name), `${got} ${text.slice(0, 40)}`);
    }
    await shot(page, `live-tap-${id}`);
    await context.close();
  }
}
