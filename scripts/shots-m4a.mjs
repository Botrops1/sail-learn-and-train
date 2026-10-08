// M4a (clutch-bank panel, Easy mode): scenes and live checks for scripts/shots.mjs.
// Kept in its own file so the shared screenshot script changes little.
import path from 'node:path';

/** What a link opens to, in the strip of the Ropes tab. */
const strip = (partId) => `.rope-strip [data-part-id="${partId}"]`;

/** Screenshots for the M4 checklist (WORKFLOW.md), at every size. */
export const M4A_SCENES = [
  { name: 'ropes-tab-helm', query: '?cam=helm' },
  { name: 'select-vang-side', query: '?sel=rope_vang&cam=side-port' },
  {
    name: 'select-mainsheet-two-ends-top',
    query: '?sel=rope_mainsheet&cam=top',
    open: '.shared-hint',
  },
  {
    name: 'select-main-furling-against-side',
    query: '?sel=rope_main_furling_line&cam=side-port',
    open: '.shared-hint',
  },
  { name: 'select-main-halyard-static', query: '?sel=rope_main_halyard&cam=side-port' },
  { name: 'select-spi-halyard-static', query: '?sel=rope_spi_halyard&cam=side-port' },
  { name: 'wheel-25-stbd-helm', query: '?sel=part_rudder&rd=25&cam=helm' },
  {
    name: 'jib-sheet-hauled-against-furl-bow',
    query: '?js=30&jf=40&jr=40&sel=rope_jib_sheet&cam=bow',
  },
  { name: 'ropes-list-and-legend', query: '?cam=side-port', scrollTo: '.rope-legend' },
  { name: 'view-tab-share-reset', query: '?cam=side-port', tab: 'View' },
];

/**
 * Live checks for the M4 checklist: clutches select ropes (and both main sheet clutches the same
 * rope), static ropes show a line instead of a slider, a rope tapped in 3D is selected in the
 * panel (also from another tab), step size and the wheel, Share gives a link that opens the same
 * state (also the jib sheet hauled against a partly furled jib), and Reset.
 */
export async function liveM4aChecks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M4a ${what}: ${detail}`);
    console.log(`live M4a ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const search = (page) => page.evaluate(() => window.location.search);
  const waitUrl = (page) => page.waitForTimeout(500);
  const clutch = (page, name) => page.getByRole('button', { name, exact: true });
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });

  for (const viewport of [viewports[0], viewports[2]]) {
    const v = viewport.name;
    const { context, page } = await openPage(viewport, `m4a ${v}`, '?cam=side-port&debug=1');
    await page.waitForTimeout(600);

    // Clutch "Vang" → vang selected, its slider shown.
    await clutch(page, 'Clutch “Vang”: Vang').click();
    await waitUrl(page);
    check(`${v} clutch Vang`, (await search(page)).includes('sel=rope_vang'), await search(page));
    check(
      `${v} Vang slider shown`,
      await page.getByLabel('Vang', { exact: true }).isVisible(),
      'slider visible',
    );

    // Either main sheet clutch → the same rope, "one rope, two ends".
    for (const name of [
      'Clutch “Main sheet”: Mainsheet, starboard end',
      'Clutch “MAIN SHEET”: Mainsheet, port end',
    ]) {
      await clutch(page, name).click();
      await waitUrl(page);
      const hint = await page.locator(`${strip('rope_mainsheet')} .shared-hint`).innerText();
      check(
        `${v} ${name.split(':')[0]}`,
        (await search(page)).includes('sel=rope_mainsheet') && /one rope, two ends/i.test(hint),
        `${await search(page)} | ${hint}`,
      );
    }
    const pressed = await page.locator('.clutch[aria-pressed="true"]').count();
    check(`${v} both main sheet clutches lit`, pressed === 2, `${pressed} clutches`);

    // Furling: both "Main furling" clutches and "Main outhaul" light up together.
    await clutch(page, 'Clutch “Main outhaul”: Outhaul').click();
    await waitUrl(page);
    const lit = await page.locator('.clutch[aria-pressed="true"]').count();
    const furlHint = await page
      .locator(`${strip('rope_main_furling_line')} .shared-hint`)
      .innerText();
    check(
      `${v} outhaul + furling together`,
      lit === 3 && /against each other/i.test(furlHint),
      `${lit} clutches | ${furlHint}`,
    );

    // Static ropes: an info line, no slider.
    for (const [name, id, text] of [
      ['Clutch “Main halyard”: Main halyard', 'rope_main_halyard', 'stays hoisted'],
      ['Clutch “SPI HALYARD”: Gennaker halyard', 'rope_spi_halyard', 'no gennaker'],
    ]) {
      await clutch(page, name).click();
      await page.waitForTimeout(200);
      const block = page.locator(strip(id));
      const note = await block.innerText();
      const sliders = await block.locator('input[type="range"]').count();
      check(`${v} ${id} info line`, note.includes(text) && sliders === 0, note.split('\n')[2]);
    }

    // A rope tapped in 3D is selected in the panel, also when another tab is open.
    await page.getByRole('tab', { name: 'Wind' }).click();
    await page.keyboard.press('Escape');
    const canvas = await page.locator('canvas.scene-canvas').boundingBox();
    const point = await page.evaluate(() => window.__sailDebug.partPoint('rope_topping_lift', 0));
    if (point) await page.mouse.click(canvas.x + point.x, canvas.y + point.y);
    await waitUrl(page);
    const ropesOpen = await page.getByRole('tab', { name: 'Ropes' }).getAttribute('aria-selected');
    check(
      `${v} tap topping lift in 3D → panel`,
      (await search(page)).includes('sel=rope_topping_lift') &&
        ropesOpen === 'true' &&
        (await page.getByLabel('Topping lift', { exact: true }).isVisible()),
      `${await search(page)} ropes tab ${ropesOpen}`,
    );
    await shot(page, `live-${v}-tap-topping-lift-in-3d`);

    // Step size: 1 % and 5 % for the + button; the wheel turns by the same step in degrees.
    await page.getByRole('tab', { name: 'View' }).click();
    await page.getByText('1 %', { exact: true }).click();
    await page.getByRole('tab', { name: 'Ropes' }).click();
    await page.locator('[data-select="rope_vang"]').click();
    await page.getByRole('button', { name: 'More: Vang' }).click();
    await waitUrl(page);
    check(`${v} step 1 %`, (await search(page)).includes('vg=51'), await search(page));
    await page.getByRole('tab', { name: 'View' }).click();
    await page.getByText('5 %', { exact: true }).click();
    await page.getByRole('tab', { name: 'Ropes' }).click();
    await page.getByRole('button', { name: 'More: Vang' }).click();
    await waitUrl(page);
    check(`${v} step 5 %`, (await search(page)).includes('vg=55'), await search(page));
    await page.locator('[data-select="part_rudder"]').click();
    await page.getByRole('button', { name: 'Turn the wheel to starboard' }).click();
    await page.getByRole('button', { name: 'Turn the wheel to starboard' }).click();
    await waitUrl(page);
    check(`${v} wheel +2 steps`, (await search(page)).includes('rd=10'), await search(page));
    await page.getByRole('button', { name: 'Helm', exact: true }).click();
    await page.waitForTimeout(1200);
    await shot(page, `live-${v}-wheel-10-stbd-helm`);
    await context.close();
  }

  // Share: the copied link opens exactly the same state, also the jib sheet hauled against a
  // partly furled jib (the M3 item left for M4). Reset restores the defaults.
  {
    const phone = viewports[0];
    const { context, page } = await openPage(phone, 'm4a share', '?wd=90&ws=12&js=100&cam=bow');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('[data-select="rope_jib_furling_line"]').click();
    const jibOut = page.getByLabel('Jib out', { exact: true });
    await jibOut.focus();
    for (let i = 0; i < 12; i += 1) await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(3000);
    await page.locator('[data-select="rope_jib_sheet"]').click();
    const sheet = page.getByLabel('Jib sheet', { exact: true });
    await sheet.focus();
    for (let i = 0; i < 14; i += 1) await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(2500);
    const metaHere = await page.locator(`${strip('rope_jib_sheet')} .control-meta`).innerText();
    const chipHere = await page.locator(`${strip('rope_jib_sheet')} .chip`).innerText();
    check(
      'share: built the fighting state by hand',
      chipHere === 'fighting',
      `${chipHere} | ${metaHere.replace(/\n/g, ' | ')}`,
    );
    await page.getByRole('tab', { name: 'View' }).click();
    await page.getByTestId('share-button').click();
    await page.waitForTimeout(300);
    const link = await page.evaluate(() => navigator.clipboard.readText());
    const here = await page.evaluate(() => window.location.href);
    check('share: link = address bar', link === here, link);
    check('share: link keeps the furl (jr)', /[?&]jr=40(&|$)/.test(link), link);
    await shot(page, 'live-phone-share-copied');

    const other = await context.newPage();
    await other.goto(link, { waitUntil: 'networkidle' });
    await other.waitForSelector('canvas.scene-canvas');
    await other.waitForTimeout(1200);
    const metaThere = await other.locator(`${strip('rope_jib_sheet')} .control-meta`).innerText();
    const chipThere = await other.locator(`${strip('rope_jib_sheet')} .chip`).innerText();
    const linkThere = await other.evaluate(() => window.location.href);
    check(
      'share: other tab shows the same',
      linkThere === link && chipThere === chipHere && metaThere === metaHere,
      `${chipThere} | ${metaThere.replace(/\n/g, ' | ')}`,
    );
    await other.screenshot({ path: path.join(outDir, `${prefix}live-phone-share-opened.png`) });
    await other.close();

    // Reset needs a second tap.
    await page.getByTestId('reset-button').click();
    await waitUrl(page);
    check('reset: first tap only asks', /js=30/.test(await search(page)), await search(page));
    await page.getByTestId('reset-button').click();
    await page.waitForTimeout(800);
    const reset = await search(page);
    check(
      'reset: defaults',
      reset === '?v=1&ms=30&js=30&vg=50&tl=100&mf=100&jf=100&rd=0&wd=60&ws=12&cam=side-port&step=5',
      reset,
    );
    await context.close();
  }
}
