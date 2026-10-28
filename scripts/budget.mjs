// The budget check (PHASE9_SPEC 6.8, M60): the 3D picture must stay light enough for a phone.
// Opens each preset view at both details, with Easy and Realistic ropes, and fails over budget.
// It runs on every PR from M60 on (group `budget` in scripts/shots.mjs).

export const BUDGET = {
  high: { calls: 300, triangles: 250000 },
  low: { calls: 150, triangles: 120000 },
};

const CAMS = ['side-port', 'side-starboard', 'top', 'bow', 'helm'];
const ROPES = [
  ['', 'easy'],
  ['&mode=realistic', 'realistic'],
];

/** Opens each preset view at both details, in Easy and Realistic ropes, on a 1,280 × 800 page, and fails over budget. */
export async function checkBudget({ openPage, problems }) {
  const viewport = { width: 1280, height: 800, name: 'budget' };
  for (const detail of ['high', 'low']) {
    for (const cam of CAMS) {
      for (const [extra, ropes] of ROPES) {
        const query = `?debug=1&held=1&sea=flat&clock=0&mm=0&cam=${cam}&detail=${detail}${extra}`;
        const { context, page } = await openPage(viewport, `budget ${detail} ${cam}`, query);
        await page.waitForTimeout(2500);
        const { calls, triangles } = await page.evaluate(() => window.__sailDebug.stats());
        const limit = BUDGET[detail];
        const ok = calls <= limit.calls && triangles <= limit.triangles;
        console.log(
          `budget ${detail} ${cam} ${ropes}: ${calls} calls, ${triangles} triangles ${ok ? 'ok' : 'OVER'}`,
        );
        if (!ok) {
          problems.push(
            `budget ${detail} ${cam} ${ropes}: ${calls} calls (max ${limit.calls}), ${triangles} triangles (max ${limit.triangles})`,
          );
        }
        await context.close();
      }
    }
  }
}
