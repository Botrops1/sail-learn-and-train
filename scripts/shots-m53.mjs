// M53 (Realistic: the Helm section, PHASE8_SPEC 11.7): scenes and live checks for scripts/shots.mjs.
// Labels contain "m53", so openPage starts with every section folded. The live checks run on the
// test clock (shots.mjs passes `onTestClock`), on the phone and then on the desktop.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { setCamera, showSection, waitForLink } from './ui.mjs';

export const M53_SCENES = [
  { name: 'helm-section', query: '?mode=realistic&st=helm&cam=helm' },
  { name: 'harbour-realistic', query: '?m=harbour&mode=realistic&pl=marina' },
];

export async function liveM53Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M53 ${what}: ${detail}`);
    console.log(`live M53 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const visible = async (page, id) => {
    const node = page.getByTestId(id).first();
    return (await node.count()) > 0 && (await node.isVisible());
  };
  const isOpen = async (page, id) =>
    (await page.getByTestId(`section-${id}`).getAttribute('data-open')) === 'true';

  for (const viewport of [viewports[0], viewports[2]]) {
    const v = viewport.name;
    const open = (what, query) =>
      openPage(viewport, `m53 ${v} ${what}`, `${query}&detail=low`, { testClock: true });

    // 1. At the helm: the Helm section is open with the wheel and what the helmsman works.
    {
      const { context, page } = await open('at helm', '?mode=realistic&st=helm&cam=helm');
      check(`${v} at helm: Helm is open`, await isOpen(page, 'helm'), 'section-helm');
      const ids = ['helm-station', 'engine-helm', 'thruster-helm', 'windlass-helm'];
      for (const id of ids) check(`${v} at helm: ${id} shown`, await visible(page, id), id);
      const wheel = page.locator('[data-testid="helm-controls"] [data-part-id="part_rudder"]');
      check(`${v} at helm: the wheel`, await wheel.isVisible(), 'wheel control');
      check(`${v} at helm: helm-away hidden`, !(await visible(page, 'helm-away')), 'helm-away');
      await shot(page, `live-${v}-helm-section`);
      // Ropes: four stations, none pressed, and the line that says where you are.
      await showSection(page, 'ropes');
      const stations = (await page.locator('.station-button').allInnerTexts())
        .map((text) => text.replace(/\s*!$/, ''))
        .join('|');
      check(`${v} at helm: the station bar`, stations === 'Port|Starboard|Mast|Bow', stations);
      const pressed = await page.locator('.station-button[aria-pressed="true"]').count();
      check(`${v} at helm: no station pressed`, pressed === 0, `${pressed}`);
      check(`${v} at helm: real-at-helm shown`, await visible(page, 'real-at-helm'), 'text');
      problems.push(...(await auditPage(page, `m53 ${v} ropes at helm`)));
      await context.close();
    }

    // 2. A title tap walks to the helm.
    {
      const { context, page } = await open('stations', '?mode=realistic&st=port');
      await showSection(page, 'ropes');
      const stations = (await page.locator('.station-button').allInnerTexts())
        .map((text) => text.replace(/\s*!$/, ''))
        .join('|');
      check(`${v} stations: the bar`, stations === 'Port|Starboard|Mast|Bow', stations);
      check(`${v} stations: real-at-helm hidden`, !(await visible(page, 'real-at-helm')), 'port');
      await showSection(page, 'helm');
      const link = await waitForLink(page, ['st=helm']);
      check(`${v} stations: the title tap walks`, link.includes('st=helm'), link);
      check(`${v} stations: the controls show`, await visible(page, 'engine-helm'), 'engine-helm');
      problems.push(...(await auditPage(page, `m53 ${v} helm open`)));
      await context.close();
    }

    // 3. Away from the helm: the wheel selected opens Helm without walking.
    {
      const { context, page } = await open('away', '?mode=realistic&st=port&sel=part_rudder');
      check(`${v} away: Helm is open`, await isOpen(page, 'helm'), 'section-helm');
      const away = ((await page.getByTestId('helm-away').textContent()) ?? '').trim();
      check(`${v} away: the line`, away === 'You are at the Port station.', away);
      check(`${v} away: no controls`, !(await visible(page, 'engine-helm')), 'engine-helm');
      const before = await page.evaluate(() => window.location.search);
      check(`${v} away: no walk`, !before.includes('st=helm'), before);
      await shot(page, `live-${v}-helm-away`);
      await page.getByTestId('helm-go').click();
      await waitForLink(page, ['st=helm']);
      check(`${v} away: Go to the helm shows the controls`, await visible(page, 'engine-helm'), '');
      check(`${v} away: helm-away hidden`, !(await visible(page, 'helm-away')), 'helm-away');
      await context.close();
    }

    // 3b. The Helm camera walks to the helm (owner, PR 124); another camera leaves the station.
    {
      const { context, page } = await open('camera', '?mode=realistic&st=port&cam=side-port');
      await setCamera(page, 'top');
      await page.waitForTimeout(300);
      const kept = await page.evaluate(() => window.location.search);
      check(`${v} camera: another view keeps the station`, !kept.includes('st=helm'), kept);
      await setCamera(page, 'helm');
      const link = await waitForLink(page, ['st=helm', 'cam=helm']);
      check(`${v} camera: the Helm view walks to the helm`, link.includes('st=helm'), link);
      await context.close();
    }

    // 4. The wheel tapped in 3D opens Helm.
    {
      const { context, page } = await open(
        'wheel tap',
        '?mode=realistic&debug=1&held=1&sea=flat&cam=helm',
      );
      await page.addStyleTag({ content: '.debug { display: none !important; }' });
      // Looking forward from behind the starboard wheel: its hub is clear of the winches.
      await page.evaluate(() =>
        window.__sailDebug.setView([-9.5, 2.0, 0.88], [-7.2, 1.85, 0.88], 40),
      );
      await page.waitForTimeout(1500);
      const hub = await page.evaluate(() => window.__sailDebug.project(-7.2, 1.85, 0.88));
      const box = await page.locator('canvas.scene-canvas').boundingBox();
      await page.mouse.click(box.x + hub.x, box.y + hub.y);
      await waitForLink(page, ['sel=helm_starboard']);
      await page.waitForTimeout(400);
      check(`${v} wheel tap: Helm is open`, await isOpen(page, 'helm'), 'section-helm');
      await context.close();
    }

    // 5. Harbour with Realistic ropes: Helm opens first, she starts at Port.
    {
      const { context, page } = await open('harbour', '?m=harbour&mode=realistic&pl=marina');
      check(`${v} harbour: Helm is open`, await isOpen(page, 'helm'), 'section-helm');
      check(`${v} harbour: Ropes is not`, !(await isOpen(page, 'ropes')), 'section-ropes');
      check(`${v} harbour: helm-away shown`, await visible(page, 'helm-away'), 'helm-away');
      await shot(page, `live-${v}-harbour-realistic`);
      await context.close();
    }

    // 6. Easy ropes: no Helm section.
    {
      const { context, page } = await open('easy', '?cam=side-port');
      const hidden = await page.getByTestId('section-helm').evaluate((node) => node.hidden);
      check(`${v} easy: section-helm hidden`, hidden, `hidden ${hidden}`);
      await context.close();
    }
  }
}
