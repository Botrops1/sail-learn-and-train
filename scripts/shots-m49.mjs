// M49 ("Show it working" and "Where is it?", PHASE8_SPEC 7): scenes and live checks for
// scripts/shots.mjs. Labels contain "m49", so openPage starts with every section folded. The live
// checks run on the test clock (shots.mjs passes `onTestClock`): waitForTimeout moves the app's
// time on by exactly that long; the camera glide is a CSS-free tween on performance.now, which
// the test clock also drives, so a short real wait is only a safety margin.
import { auditPage } from './a11y-audit.mjs';
import { setSheet, showSection, waitForLink } from './ui.mjs';

const WINCH = '?m=learn&learn=winch_primary_starboard&debug=1&held=1&sea=flat&lb=1';

export const M49_SCENES = [
  {
    name: 'where-is-it-winch',
    query: WINCH,
    section: 'learn',
    sheet: 'half',
    click: ['learn-show-on-boat'],
    waitMs: 1200,
  },
  {
    name: 'where-is-it-cleat',
    query: '?m=learn&learn=fit_mooring_cleat&debug=1&held=1&sea=flat',
    section: 'learn',
    sheet: 'half',
    click: ['learn-show-on-boat'],
    waitMs: 1200,
  },
];

export async function liveM49Checks({ openPage, viewports, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M49 ${what}: ${detail}`);
    console.log(`live M49 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const desktop = viewports[2];

  const hook = (page, name) => page.evaluate((n) => window.__sailDebug[n](), name);
  const spotlight = (page) => hook(page, 'spotlight');
  const pose = (page) => hook(page, 'cameraPose');
  const gap = (a, b) =>
    Math.max(
      ...a.position.map((v, i) => Math.abs(v - b.position[i])),
      ...a.target.map((v, i) => Math.abs(v - b.target[i])),
    );
  /** App time for the glide, then a short real wait for the page to draw. */
  const glide = async (page) => {
    await page.waitForTimeout(1000);
    await page.realWaitForTimeout(600);
  };
  const open = async (viewport, what, query, height) => {
    const { context, page } = await openPage(viewport, `m49 ${what}`, query);
    await showSection(page, 'learn');
    if (height) await setSheet(page, height);
    return { context, page };
  };
  const camOf = (link) => /cam=([\w-]+)/.exec(link)?.[1] ?? '';

  for (const viewport of [phone, desktop]) {
    const v = viewport.name;
    const onPhone = viewport === phone;

    // 1. Where is it? on the primary winch: close, the hint, the link unchanged, the rest faded.
    let before;
    {
      const { context, page } = await open(viewport, 'where', WINCH, onPhone ? 'half' : undefined);
      before = await pose(page);
      const linkBefore = await page.evaluate(() => location.search);
      await page.getByTestId('learn-show-on-boat').click();
      await glide(page);
      const now = await spotlight(page);
      const linkAfter = await page.evaluate(() => location.search);
      check(
        `${v} where: spotlight on the winch`,
        now?.partId === 'winch_primary_starboard' &&
          now.kind === 'where' &&
          now.distanceM > 1.15 &&
          now.distanceM < 3.0,
        JSON.stringify(now),
      );
      check(
        `${v} where: hint shown`,
        await page.getByTestId('learn-spotlight-hint').isVisible(),
        'learn-spotlight-hint',
      );
      check(
        `${v} where: the camera is not in the link`,
        camOf(linkAfter) === camOf(linkBefore) && !linkAfter.includes('cam=free'),
        `${linkBefore} → ${linkAfter}`,
      );
      if (onPhone) {
        const sheet = await page.getByTestId('sheet').getAttribute('data-sheet');
        check(`${v} where: sheet at half`, sheet === 'half', String(sheet));
      }
      const faded = await page.locator('.label3d.label-faded').count();
      check(`${v} where: other labels faded`, faded >= 1, `${faded} faded labels`);

      // 2. A tap on the sky ends it and the camera glides back.
      const box = await page.locator('.scene-canvas').boundingBox();
      await page.mouse.click(box.x + 20, box.y + 120);
      await page.waitForTimeout(1000);
      const ended = await spotlight(page);
      check(`${v} where: tap on the 3D view ends it`, ended === null, JSON.stringify(ended));
      check(
        `${v} where: hint hidden, labels back`,
        !(await page.getByTestId('learn-spotlight-hint').isVisible()) &&
          (await page.locator('.label3d.label-faded').count()) === 0,
        'hint hidden, no faded label',
      );
      await page.realWaitForTimeout(600);
      const back = await pose(page);
      check(
        `${v} where: camera back`,
        gap(back, before) < 0.05,
        `gap ${gap(back, before).toFixed(3)} m`,
      );
      await context.close();
    }

    // 3. One instance of a part drawn several times (one cleat of six).
    {
      const { context, page } = await open(
        viewport,
        'cleat',
        '?m=learn&learn=fit_mooring_cleat&debug=1&held=1&sea=flat',
        onPhone ? 'half' : undefined,
      );
      await page.getByTestId('learn-show-on-boat').click();
      await glide(page);
      const now = await spotlight(page);
      check(
        `${v} cleat: one cleat`,
        now !== null && now.distanceM > 1.15 && now.distanceM < 3.0,
        JSON.stringify(now),
      );
      await context.close();
    }

    // 4. Show it working: closer than the scene, not as close as Where is it?; Escape glides back.
    {
      const { context, page } = await open(
        viewport,
        'show',
        '?m=learn&learn=rope_vang&debug=1&held=1&sea=flat',
        onPhone ? 'half' : undefined,
      );
      await page.getByTestId('learn-show-me').click();
      await glide(page);
      let link;
      try {
        link = await waitForLink(page, ['sel=rope_vang']);
      } catch (error) {
        link = String(error.message);
      }
      const now = await spotlight(page);
      check(
        `${v} show: spotlight on the vang`,
        now?.partId === 'rope_vang' && now.kind === 'show' && now.distanceM > 1.15,
        `${JSON.stringify(now)} ${link}`,
      );
      await page.keyboard.press('Escape');
      await glide(page);
      const p = await pose(page);
      const far = Math.hypot(...p.position.map((x, i) => x - p.target[i]));
      check(
        `${v} show: Escape glides back`,
        (await spotlight(page)) === null && far >= (now?.distanceM ?? Infinity),
        `${far.toFixed(2)} m ≥ ${now?.distanceM?.toFixed(2)} m`,
      );
      await context.close();
    }

    // 5. A part drawn in the world (the quay): nothing to light.
    {
      const { context, page } = await open(
        viewport,
        'quay',
        '?m=learn&learn=env_quay&pl=marina&debug=1',
        onPhone ? 'half' : undefined,
      );
      await page.getByTestId('learn-show-on-boat').click();
      await glide(page);
      const now = await spotlight(page);
      check(`${v} quay: no spotlight`, now === null, JSON.stringify(now));
      await context.close();
    }

    // 6. A drag ends it and the camera stays.
    {
      const { context, page } = await open(viewport, 'drag', WINCH, onPhone ? 'half' : undefined);
      await page.getByTestId('learn-show-on-boat').click();
      await glide(page);
      // A point where the canvas itself is on top (not a 3D label or a button over it).
      const start = await page.evaluate(() => {
        const canvas = document.querySelector('.scene-canvas');
        const r = canvas.getBoundingClientRect();
        for (let y = r.top + 100; y < r.bottom - 100; y += 20) {
          for (let x = r.left + 80; x < r.right - 160; x += 20) {
            const free = [0, 20, 40, 60].every(
              (dx) => document.elementFromPoint(x + dx, y) === canvas,
            );
            if (free) return { x, y };
          }
        }
        return null;
      });
      const { x, y } = start ?? { x: 0, y: 0 };
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 60, y, { steps: 6 });
      // Held still before letting go, so the orbit's damping has nothing left to carry on.
      // (The damping slows the camera per drawn frame; the test clock draws one per 100 ms: 40 frames.)
      await page.waitForTimeout(4000);
      await page.mouse.up();
      const ended = await spotlight(page);
      const right = await pose(page);
      await page.waitForTimeout(1000);
      await page.realWaitForTimeout(600);
      const later = await pose(page);
      check(
        `${v} drag: ends and stays`,
        ended === null && gap(later, right) < 0.05,
        `spotlight ${JSON.stringify(ended)}, moved ${gap(later, right).toFixed(3)} m`,
      );
      await context.close();
    }

    // 7. Names, English and Russian.
    {
      const { context, page } = await open(viewport, 'names', WINCH);
      const en = [
        await page.getByTestId('learn-show-on-boat').innerText(),
        (await page.getByTestId('learn-show-me').count()) > 0
          ? await page.getByTestId('learn-show-me').innerText()
          : 'Show it working',
      ];
      check(
        `${v} names (en)`,
        en[0] === 'Where is it?' && en[1] === 'Show it working',
        en.join(' | '),
      );
      await context.close();
      const ru = await open(viewport, 'names ru', `${WINCH}&lang=ru`);
      const where = await ru.page.getByTestId('learn-show-on-boat').innerText();
      check(`${v} names (ru)`, where === 'Где это?', where);
      await ru.context.close();
      const ruShow = await open(
        viewport,
        'names ru show',
        '?m=learn&learn=rope_vang&lang=ru&debug=1',
      );
      const show = await ruShow.page.getByTestId('learn-show-me').innerText();
      check(`${v} names (ru) show`, show === 'Показать в работе', show);
      await ruShow.context.close();
    }

    // 8. A full sheet comes down to half.
    if (onPhone) {
      const { context, page } = await open(viewport, 'full', WINCH, 'full');
      await page.getByTestId('learn-show-on-boat').click();
      await page.waitForTimeout(600);
      await page.realWaitForTimeout(600);
      const sheet = await page.getByTestId('sheet').getAttribute('data-sheet');
      check(`${v} full sheet comes down`, sheet === 'half', String(sheet));
      await context.close();
    }

    // 9. Accessibility, the Learn entry open.
    if (onPhone) {
      const { context, page } = await open(viewport, 'audit', WINCH, 'half');
      problems.push(...(await auditPage(page, 'm49 learn entry')));
      await context.close();
    }
  }
}
