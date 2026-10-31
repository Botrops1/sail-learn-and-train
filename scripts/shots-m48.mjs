// M48 (Ropes as a list in Easy and Learn, PHASE8_SPEC 6): scenes and live checks for
// scripts/shots.mjs. Labels contain "m48", so openPage starts with every section folded.
import { auditPage } from './a11y-audit.mjs';
import { setMode, setSheet, showSection, waitForLink } from './ui.mjs';

export const M48_SCENES = [
  {
    name: 'easy-ropes-list',
    query: '?sel=rope_vang&cam=side-port',
    section: 'ropes',
    sheet: 'full',
  },
  {
    name: 'learn-realistic-ropes',
    query: '?mode=realistic&m=learn&sel=rope_vang&cam=side-port',
    section: 'ropes',
    sheet: 'full',
  },
];

export async function liveM48Checks({ openPage, viewports, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M48 ${what}: ${detail}`);
    console.log(`live M48 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const phone = viewports[0];
  const desktop = viewports[2];

  for (const viewport of [phone, desktop]) {
    const v = viewport.name;
    const open = async (what, query) => {
      const { context, page } = await openPage(viewport, `m48 ${what}`, query);
      await showSection(page, 'ropes');
      await setSheet(page, 'full');
      return { context, page };
    };

    // 1. Easy: no drawing, the list, the vang from the list.
    {
      const { context, page } = await open('easy', '?cam=side-port');
      const text = await page.locator('[data-testid="ropes-easy"] .strip-empty').innerText();
      check(
        `${v} easy: empty text`,
        text === 'Tap a rope in the 3D view or in the list below to work it.',
        text,
      );
      const rows = await page.locator('.rope-item').count();
      check(
        `${v} easy: no drawing, list`,
        !(await page.getByTestId('clutch-drawing').isVisible()) &&
          (await page.getByTestId('ropes-easy').isVisible()) &&
          rows >= 8,
        `${rows} rows`,
      );
      await page.locator('[data-select="rope_vang"]').click();
      let link;
      try {
        link = await waitForLink(page, ['sel=rope_vang']);
      } catch (error) {
        link = String(error.message);
      }
      check(
        `${v} easy: vang from the list`,
        link.includes('sel=rope_vang') &&
          (await page.getByLabel('Vang', { exact: true }).isVisible()),
        link,
      );
      await context.close();
    }

    // 2. Learn with Easy ropes: the + button works.
    {
      const { context, page } = await open('learn', '?m=learn&sel=rope_vang&vg=50');
      const drawing = await page.getByTestId('clutch-drawing').isVisible();
      await page.getByRole('button', { name: 'More: Vang' }).click();
      let link;
      try {
        link = await waitForLink(page, ['vg=55']);
      } catch (error) {
        link = String(error.message);
      }
      check(
        `${v} learn: list and +`,
        !drawing && link.includes('vg=55'),
        `drawing ${drawing} ${link}`,
      );
      await context.close();
    }

    // 3. Learn with Realistic ropes: read-only, then Easy frees it.
    {
      const { context, page } = await open(
        'learn realistic',
        '?mode=realistic&m=learn&sel=rope_vang',
      );
      const plus = page.getByRole('button', { name: 'More: Vang' });
      const before =
        (await page.getByTestId('ropes-easy').isVisible()) &&
        !(await page.getByTestId('ropes-realistic').isVisible()) &&
        (await page.getByTestId('ropes-learn-realistic').isVisible()) &&
        (await plus.isDisabled());
      check(`${v} learn realistic: read-only`, before, 'note shown, + disabled');
      await setMode(page, 'easy');
      await showSection(page, 'ropes');
      const after =
        !(await page.getByTestId('ropes-learn-realistic').isVisible()) && (await plus.isEnabled());
      check(`${v} learn realistic → easy: free`, after, 'note hidden, + enabled');
      await context.close();
    }

    // 4. Harbour with Easy ropes: the same list, no drawing (owner's change on the PR).
    {
      const { context, page } = await open('harbour', '?m=harbour');
      const rows = await page.locator('.rope-item').count();
      check(
        `${v} harbour: list, no drawing`,
        (await page.getByTestId('ropes-easy').isVisible()) &&
          !(await page.getByTestId('clutch-drawing').isVisible()) &&
          rows >= 8,
        `${rows} rows`,
      );
      await context.close();
    }

    // 5. Realistic keeps the stations.
    {
      const { context, page } = await open('realistic', '?mode=realistic');
      check(
        `${v} realistic: stations`,
        (await page.getByTestId('ropes-realistic').isVisible()) &&
          !(await page.getByTestId('clutch-drawing').isVisible()),
        'stations visible, no drawing',
      );
      await context.close();
    }

    // 6. Quick row (phone only).
    if (viewport === phone) {
      const { context, page } = await openPage(viewport, 'm48 quick', '?cam=side-port');
      await setSheet(page, 'peek');
      const text = (await page.getByTestId('quick-hint').innerText()).replace(/\s+/g, ' ');
      check(`${v} quick row`, text.includes('Tap a rope: its − and + appear here.'), text);
      await context.close();
    }

    // 7. Accessibility (phone, Ropes open).
    if (viewport === phone) {
      const { context, page } = await open('audit', '?cam=side-port');
      problems.push(...(await auditPage(page, 'm48 ropes list')));
      await context.close();
    }
  }
}
