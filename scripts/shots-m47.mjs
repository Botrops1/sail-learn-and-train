// M47 (stern-to with the anchor, checks and sign-off, PHASE7_SPEC 13.5): scenes and live checks for
// scripts/shots.mjs. Labels contain "m47", so openPage lets the app open as it does without a link.
// The live checks run on the test clock (shots.mjs passes `onTestClock`): waitForTimeout moves
// the app's time on by exactly that long.
import path from 'node:path';
import { auditPage } from './a11y-audit.mjs';
import { showSection } from './ui.mjs';

/** The marina berth stern-to: stern lines on, the anchor ahead under the south row. */
const MARINA_ANCHOR =
  '?pl=marina&m=harbour&pe=2.8&pn=1490.4&hdg=180&ws=0&ln=sp:2.55,ss:2.55&an=48.0&ax=2.8,1442.0&as=1&cam=top';
/** The bay: anchored with a shore line from the stern. */
const BAY_ANCHOR_SHORE =
  '?pl=bay&m=harbour&pe=-1665.0&pn=0.0&hdg=90&wd=0&ws=15&an=60.0&ax=-1605.0,0.0&as=1&ln=sl1:28.08&cam=top';
/** The M41 Harbour mode link: sails away, standing still, engine running in neutral. */
const HARBOUR_MODE = '?m=harbour&wd=0&ws=0&mf=0&jf=0&js=100&bs=0&ap=off&eng=1&lv=0&cam=top';

export const M47_SCENES = [
  {
    name: 'marina-anchor',
    query: MARINA_ANCHOR,
    section: 'harbour',
    click: ['section-explain-harbour'],
    sheet: 'full',
  },
  { name: 'bay-anchor-shore', query: BAY_ANCHOR_SHORE, sheet: 'peek' },
  {
    name: 'harbour-heavy',
    query: '?pl=marina&ml=tight&tr=busy&m=harbour&detail=high&cam=side-port',
    sheet: 'peek',
  },
];

export async function liveM47Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M47 ${what}: ${detail}`);
    console.log(`live M47 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const heading = async (page) =>
    parseInt(
      ((await page.getByTestId('strip-heading').textContent()) ?? '').replace(/\D/g, ''),
      10,
    );
  const audit = async (name, query, sections) => {
    const { context, page } = await openPage(phone, `m47 audit ${name}`, query, {
      testClock: true,
    });
    for (const section of sections) await showSection(page, section);
    problems.push(...(await auditPage(page, `m47 ${name}`)));
    await context.close();
  };

  // 1. Marina, stern-to on our own anchor: the hint explains it.
  {
    const { context, page } = await openPage(phone, 'm47 marina anchor', MARINA_ANCHOR, {
      testClock: true,
    });
    await showSection(page, 'harbour');
    await page.getByTestId('section-explain-harbour').click();
    const hint = page.getByTestId('mooring-anchor-hint');
    const shown = await hint.isVisible();
    check('marina anchor: the hint is shown', shown, `visible: ${shown}`);
    const words = shown ? ((await hint.textContent()) ?? '').trim() : '';
    check('marina anchor: it says stern-to', /^Stern-to on your own anchor/.test(words), words);
    await shot(page, 'm47-marina-anchor');
    await context.close();
  }

  // 2. Bay, anchor and shore line: after 5 s she still points about east.
  {
    const { context, page } = await openPage(phone, 'm47 bay shore', `${BAY_ANCHOR_SHORE}&tx=16`, {
      testClock: true,
    });
    await page.waitForTimeout(5000);
    const h = await heading(page);
    check('bay shore: the heading stays between 080° and 100°', h >= 80 && h <= 100, `${h}°`);
    await showSection(page, 'harbour');
    await page.getByTestId('section-explain-harbour').click();
    const hint = await page.getByTestId('mooring-anchor-hint').isVisible();
    check('bay shore: the hint is shown', hint, `visible: ${hint}`);
    await shot(page, 'm47-bay-shore');
    await context.close();
  }

  // 3. Keyboard: Space on a thruster half holds it, like a press.
  {
    const { context, page } = await openPage(phone, 'm47 keyboard', `${HARBOUR_MODE}&tx=4`, {
      testClock: true,
    });
    await showSection(page, 'engine');
    const before = await heading(page);
    await page.getByTestId('thruster-bow-starboard').focus();
    await page.keyboard.down('Space');
    await page.waitForTimeout(2000);
    await page.keyboard.up('Space');
    const after = await heading(page);
    const turned = Math.abs(((after - before + 540) % 360) - 180);
    check(
      'keyboard: Space held on the bow thruster turns her 5° or more',
      turned >= 5,
      `${before}° → ${after}°`,
    );
    await context.close();
  }

  // Accessibility (PHASE7_SPEC 13.5).
  await audit('harbour mode', HARBOUR_MODE, ['engine']);
  await audit('marina', '?pl=marina&m=harbour', ['place', 'harbour']);
  await audit('bay anchor', BAY_ANCHOR_SHORE, ['anchor']);
  await audit(
    'bow station',
    '?wd=90&ws=15&pl=bay&pe=-1640.0&pn=0.0&hdg=90&an=34.0&ax=-1606.0,0.0&as=1&mode=realistic&st=bow',
    ['ropes'],
  );
  await audit(
    'helm thrusters',
    '?wd=0&ws=0&mf=0&jf=0&js=100&bs=0&ap=off&eng=1&lv=0&mode=realistic&st=helm&cam=helm',
    ['ropes'],
  );
}
