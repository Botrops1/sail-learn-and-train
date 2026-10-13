// M15 (Waves change the sailing): scenes and live checks for scripts/shots.mjs (PHASE3_SPEC 7.7).
// Labels contain "m15", so the script opens them Sailing and without the `sea=flat` it adds to
// the older scenes. The live checks look at numbers the page shows (the address bar, the
// instrument strip), not at the picture, which headless Chromium draws by software.

/** Screenshots at every size. The script waits `waitMs` before each. */
export const M15_SCENES = [
  { name: 'feedback-quartering', query: '?wd=135&ws=15&ms=100&js=100&cam=helm', waitMs: 3000 },
  { name: 'feedback-head', query: '?wd=45&ws=20&ms=20&js=0&sea=open&cam=bow', waitMs: 3000 },
];

/** The distinct values `read(page)` gives every 250 ms from 2 s to 12 s after the page loaded. */
async function distinctValues(page, read) {
  const seen = new Set();
  await page.waitForTimeout(2000);
  for (let i = 0; i < 41; i += 1) {
    const value = await read(page);
    if (value !== null && value !== undefined) seen.add(value);
    await page.waitForTimeout(250);
  }
  return seen;
}

export async function liveM15Checks({ openPage, viewports, problems }) {
  const check = (what, ok, detail) => {
    if (!ok) problems.push(`live M15 ${what}: ${detail}`);
    console.log(`live M15 ${what}: ${detail} ${ok ? 'ok' : 'WRONG'}`);
  };
  const [phone] = viewports;
  const rudderInLink = (page) =>
    page.evaluate(() => new URLSearchParams(window.location.search).get('rd'));
  const apparentAngle = async (page) => {
    const text = await page.getByTestId('strip-apparent').textContent();
    return /App (-?\d+)°/.exec(text ?? '')?.[1] ?? null;
  };
  const stripSpeed = async (page) => {
    const text = await page.getByTestId('strip-speed').textContent();
    const found = /(-?\d+\.\d)/.exec(text ?? '');
    return found ? Number(found[1]) : null;
  };
  const mean = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;

  // The autopilot keeps correcting in waves from behind at an angle; on flat water it does not.
  for (const [what, extra, test] of [
    ['the wheel keeps moving in waves', '', (n) => n >= 3],
    ['the wheel stays still on flat water', '&sea=flat', (n) => n <= 2],
  ]) {
    const { context, page } = await openPage(
      phone,
      `m15 wheel ${what}`,
      `?wd=135&ws=15&ms=100&js=100${extra}`,
    );
    const seen = await distinctValues(page, rudderInLink);
    check(what, test(seen.size), `${seen.size} different rd values: ${[...seen].join(' ')}`);
    await context.close();
  }

  // The apparent wind swings with the rocking; on flat water it hardly moves.
  for (const [what, extra, test] of [
    ['the apparent wind swings in waves', '', (n) => n >= 3],
    ['the apparent wind is steady on flat water', '&sea=flat', (n) => n <= 2],
  ]) {
    const { context, page } = await openPage(
      phone,
      `m15 apparent ${what}`,
      `?wd=90&ws=15&ms=50&js=100${extra}`,
    );
    const seen = await distinctValues(page, apparentAngle);
    check(what, test(seen.size), `${seen.size} different angles: ${[...seen].join(' ')}`);
    await context.close();
  }

  // Head seas slow her: the mean of 10 strip speeds over 5 s, 30 s after the page loaded.
  {
    const open = await openPage(phone, 'm15 speed open', '?wd=45&ws=20&ms=20&js=0&sea=open');
    const flat = await openPage(phone, 'm15 speed flat', '?wd=45&ws=20&ms=20&js=0&sea=flat');
    await Promise.all([open.page.waitForTimeout(30_000), flat.page.waitForTimeout(30_000)]);
    const speeds = { open: [], flat: [] };
    for (let i = 0; i < 10; i += 1) {
      speeds.open.push(await stripSpeed(open.page));
      speeds.flat.push(await stripSpeed(flat.page));
      await open.page.waitForTimeout(500);
    }
    const slower = mean(speeds.flat) - mean(speeds.open);
    check(
      'head seas slow her',
      slower >= 0.5,
      `flat ${mean(speeds.flat).toFixed(2)} kn, open sea ${mean(speeds.open).toFixed(2)} kn, ${slower.toFixed(2)} kn slower`,
    );
    await open.context.close();
    await flat.context.close();
  }
}
