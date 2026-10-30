// M31 (anchor and windlass): scenes and live checks for scripts/shots.mjs (PHASE6_SPEC 7.6).
// Labels contain "m31", which matches none of openPage's label tests, so every page opens Held
// still on flat water with the clock chip and the mini-map hidden (the Phase 1 picture).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { setSheet } from './ui.mjs';

/** The Show me link of the Anchor entry: the bow from the front. */
export const M31_SCENES = [
  { name: 'anchor-bow', query: '?wd=0&ws=0&cam=bow&sel=fit_anchor&held=1&sea=flat', waitMs: 1000 },
];

/** Close-ups (boat coordinates: x forward, y up, z starboard), PHASE6_SPEC 7.6. */
const CLOSE_UPS = [
  { name: 'bow-from-above', position: [4.2, 3.4, 1.4], target: [6.2, 1.7, 0.15], fov: 45 },
  { name: 'bow-from-side', position: [6.6, 1.9, 2.6], target: [6.6, 1.6, 0.15], fov: 45 },
];

export async function liveM31Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M31 ${what}: ${detail}`);
    console.log(`live M31 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
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
  const search = (page) => page.evaluate(() => window.location.search);
  const closeUpLink = (detail) => `?wd=0&ws=0&lb=0&debug=1&detail=${detail}`;

  // The bow from above and from the side, at both details.
  for (const detail of ['high', 'low']) {
    const { context, page } = await openPage(phone, `m31 close-ups ${detail}`, closeUpLink(detail));
    await page.waitForTimeout(1000);
    for (const view of CLOSE_UPS) {
      await closeUp(page, view);
      await shot(page, `live-${view.name}-${detail}`);
    }
    await context.close();
  }

  // Tapping the anchor, the roller and the windlass (not the chain: it is thin and lies between).
  // The anchor and the windlass are tapped at their tap points (7.3); the windlass stands 1.2 m aft
  // of the side close-up's frame, so it is tapped from above. The roller's own tap point (the top
  // centre between the cheeks) lies under the anchor's shank, so the roller is tapped on its
  // starboard cheek, which the shank does not cover.
  const cheek = JSON.parse(readFileSync('content/boat/hanse508.json', 'utf8')).deckFittings
    .bowRoller;
  const TAPS = [
    { id: 'fit_anchor', view: CLOSE_UPS[1] },
    {
      id: 'fit_bow_roller',
      view: CLOSE_UPS[1],
      point: [
        (cheek.aftX + cheek.rollerX) / 2,
        cheek.plateY + cheek.plateThickness + cheek.cheekHeight / 2,
        cheek.centreZ + cheek.halfWidth,
      ],
    },
    { id: 'fit_anchor_windlass', view: CLOSE_UPS[0] },
  ];
  for (const { id, view, point } of TAPS) {
    const { context, page } = await openPage(phone, `m31 tap ${id}`, closeUpLink('high'));
    await page.waitForTimeout(1000);
    await closeUp(page, view);
    const box = await page.locator('canvas.scene-canvas').boundingBox();
    const screen = await page.evaluate(
      ([partId, at]) =>
        at
          ? window.__sailDebug.project(...at)
          : (window.__sailDebug.hitCentres().find((c) => c.partId === partId) ?? null),
      [id, point ?? null],
    );
    const onScreen =
      screen && screen.x > 0 && screen.y > 0 && screen.x < box.width && screen.y < box.height;
    if (!onScreen) {
      check(`tap ${id}`, false, `the tap point is off the screen: ${JSON.stringify(screen)}`);
    } else {
      await page.mouse.click(box.x + screen.x, box.y + screen.y);
      await page.waitForTimeout(400);
      const got = await page.evaluate(() =>
        document.querySelector('[data-testid="info-card"]')?.getAttribute('data-part-id'),
      );
      check(`tap ${id}`, got === id, String(got));
    }
    await shot(page, `live-tap-${id}`);
    await context.close();
  }

  // The Anchor entry: its name, Show me writes the bow view, the phone's Back returns to the entry.
  {
    const { context, page } = await openPage(
      phone,
      'm31 show me anchor',
      '?learn=fit_anchor&m=learn&held=1&sea=flat',
    );
    await page.waitForTimeout(500);
    const name = await page.getByTestId('learn-name').innerText();
    check('the entry is the Anchor', name === 'Anchor', name);
    await page.getByTestId('learn-show-me').click();
    const link = await waitForLinkOrEmpty(page, ['sel=fit_anchor', 'cam=bow']);
    check('Show me writes sel=fit_anchor and cam=bow', link.ok, link.text);
    await shot(page, 'live-show-me-anchor');
    await page.goBack();
    await page.waitForTimeout(600);
    const after = await page.getByTestId('learn-name').innerText();
    const back = await search(page);
    check(
      'Back returns to the entry',
      after === 'Anchor' && back.includes('learn=fit_anchor') && !back.includes('cam=bow'),
      `${after} ${back}`,
    );
    await context.close();
  }

  // "Show on the boat" exists for the roller, the windlass (it was hidden while they were not
  // drawn), and the chain, which lights up.
  for (const id of ['fit_bow_roller', 'fit_anchor_windlass', 'fit_anchor_chain', 'fit_anchor']) {
    const { context, page } = await openPage(
      phone,
      `m31 show on the boat ${id}`,
      `?learn=${id}&m=learn&held=1&sea=flat`,
    );
    await page.waitForTimeout(500);
    const button = page.getByTestId('learn-show-on-boat');
    const visible = (await button.count()) > 0 && (await button.isVisible());
    check(`${id}: the "Show on the boat" button is there`, visible, String(visible));
    if (visible) {
      await button.click();
      const link = await waitForLinkOrEmpty(page, [`sel=${id}`]);
      check(`${id}: Show on the boat selects it`, link.ok, link.text);
    }
    await context.close();
  }
}

/** Waits up to 3 s for the address bar to hold every string; never throws. */
async function waitForLinkOrEmpty(page, has) {
  const deadline = Date.now() + 3000;
  let text = '';
  for (;;) {
    text = await page.evaluate(() => window.location.search);
    if (has.every((part) => text.includes(part))) return { ok: true, text };
    if (Date.now() > deadline) return { ok: false, text };
    await page.waitForTimeout(50);
  }
}
