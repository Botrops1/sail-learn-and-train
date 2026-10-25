// M46 (anchor and windlass, PHASE7_SPEC 12.9): scenes and live checks for scripts/shots.mjs.
// Labels contain "m46", so openPage lets the app open as it does without a link (Sailing, default
// waves; a place link sets its own sea). The live checks run on the test clock (shots.mjs passes
// `onTestClock`): waitForTimeout moves the app's time on by exactly that long.
import path from 'node:path';
import { holdWindlass, showSection, waitForLink } from './ui.mjs';

/** The term_scope Show me link: the anchor 27 m ahead of the roller in 9.4 m of water, 34 m of chain, set. */
const ANCHORED = '?wd=90&ws=15&cam=top&pl=bay&pe=-1640.0&pn=0.0&hdg=90&an=34.0&ax=-1606.0,0.0&as=1';
/** Head to the west wind, at rest, the anchor still in the roller. */
const LET_GO = '?pl=bay&m=harbour&pe=-1640.0&pn=0.0&hdg=270&wd=-90&ws=10&tx=4';
/** Short chain on the sea grass in gusts: it drags. */
const DRAGGING =
  '?wd=0&ws=25&wm=gusty&cam=map&pl=bay&pe=-1560.0&pn=-70.0&hdg=0&an=20.0&ax=-1560.0,-50.0&m=harbour&tx=4';

export const M46_SCENES = [
  { name: 'anchored-top', query: ANCHORED, sheet: 'peek' },
  {
    name: 'anchored-map',
    query: ANCHORED.replace('cam=top', 'cam=map'),
    click: ['map-zoom-out'],
    sheet: 'peek',
  },
  { name: 'anchored-side', query: ANCHORED.replace('cam=top', 'cam=side-port'), sheet: 'peek' },
  {
    name: 'bow-station',
    query: `${ANCHORED}&mode=realistic&st=bow`,
    section: 'ropes',
    sheet: 'full',
  },
  { name: 'anchor-section', query: ANCHORED, section: 'anchor', sheet: 'full' },
  { name: 'anchor-section-ru', query: `${ANCHORED}&lang=ru`, section: 'anchor', sheet: 'full' },
  { name: 'anchor-dragging', query: DRAGGING, sheet: 'peek', waitMs: 6000 },
];

export async function liveM46Checks({ openPage, viewports, outDir, prefix, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M46 ${what}: ${detail}`);
    console.log(`live M46 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${prefix}${name}.png`) });
  const text = async (page, id) => ((await page.getByTestId(id).textContent()) ?? '').trim();
  /** Asks `ready` every `stepMs` of app time until it says yes, at most `maxMs`. */
  const poll = async (page, ready, maxMs, stepMs = 200) => {
    for (let waited = 0; waited <= maxMs; waited += stepMs) {
      if (await ready()) return true;
      await page.waitForTimeout(stepMs);
    }
    return false;
  };

  // 1. Let go: the chain goes out, the anchor hangs and then lies on the bottom; the link keeps it.
  {
    const { context, page } = await openPage(phone, 'm46 let go', LET_GO, { testClock: true });
    await holdWindlass(page, 'down', 3000);
    const hanging = await text(page, 'anchor-status');
    check('let go: the anchor hangs under the bow', /hanging/.test(hanging), hanging);
    const counter = await text(page, 'chain-counter');
    check('let go: the counter shows the chain out', /^[5-7] m$/.test(counter), counter);
    await holdWindlass(page, 'down', 10000);
    const landed = await poll(
      page,
      async () => /on the bottom/.test(await text(page, 'anchor-status')),
      4000,
    );
    check('let go: the anchor lies on the bottom', landed, await text(page, 'anchor-status'));
    const link = await waitForLink(page, ['an=', 'ax=']);
    check('let go: the link keeps the chain and the anchor', true, link);
    await shot(page, 'm46-let-go');
    await context.close();
  }

  // 2. The scope check: 34 m in 9.4 m of water, 15 kn: the rules ask for 47 m.
  {
    const { context, page } = await openPage(phone, 'm46 check', ANCHORED, { testClock: true });
    await showSection(page, 'anchor');
    const words = await text(page, 'anchor-check');
    check('check: it asks for 13 m more', /^Let out 13 m more/.test(words), words);
    const status = await text(page, 'anchor-status');
    check('check: the anchor is set', /set/.test(status), status);
    await context.close();
  }

  // 3. The Bow station: the windlass buttons are there, the station bar has five stations.
  {
    const { context, page } = await openPage(
      phone,
      'm46 bow station',
      `${ANCHORED}&mode=realistic&st=bow`,
      { testClock: true },
    );
    await showSection(page, 'ropes');
    check(
      'bow station: the windlass buttons are shown',
      (await page.getByTestId('windlass-down-bow').isVisible()) &&
        (await page.getByTestId('windlass-up-bow').isVisible()),
      'buttons',
    );
    const stations = await page.locator('.station-button').allInnerTexts();
    check(
      'bow station: the station bar',
      stations.join('|') === 'Port|Starboard|Mast|Bow',
      stations.join('|'),
    );
    const handle = await page.getByTestId('handle-bar').isVisible();
    check('bow station: no slot for the winch handle', !handle, `handle bar shown: ${handle}`);
    await shot(page, 'm46-bow-station');
    await context.close();
  }

  // 4. The helm has the windlass remote: Chain out works from there.
  {
    const { context, page } = await openPage(
      phone,
      'm46 helm remote',
      `${LET_GO}&mode=realistic&st=helm`,
      { testClock: true },
    );
    await showSection(page, 'helm');
    await holdWindlass(page, 'down', 2000, '-helm');
    const counter = await text(page, 'chain-counter-helm');
    check('helm remote: the chain goes out', /^[3-5] m$/.test(counter), counter);
    await context.close();
  }

  // 5. Dragging: a short chain on the sea grass in gusts drags and the alarm sounds.
  {
    const { context, page } = await openPage(phone, 'm46 dragging', DRAGGING, { testClock: true });
    const alarm = page.getByTestId('anchor-alarm-alert');
    const sounded = await poll(page, () => alarm.isVisible(), 60000, 500);
    check('dragging: the anchor alarm sounds within a minute', sounded, `alarm shown: ${sounded}`);
    await shot(page, 'm46-alarm');
    await showSection(page, 'anchor');
    await page.getByTestId('alarm-silence').click();
    await page.waitForTimeout(200);
    const stillShown = await alarm.isVisible();
    check('dragging: OK silences the alarm', !stillShown, `alarm shown: ${stillShown}`);
    await context.close();
  }
}
