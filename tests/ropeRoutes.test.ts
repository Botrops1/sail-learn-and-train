import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { defaultControls, type Controls } from '../src/model/controls';
import { channelPath, cutsCoachroof, cutsSprayhood } from '../src/model/deckVolumes';
import {
  lineSpec,
  mastExitPoint,
  ropeDrawings,
  turningBlockPoint,
  type RopeDrawing,
} from '../src/model/ropePaths';
import { initialRig } from '../src/model/sim';
import { sub, type Vec3 } from '../src/model/vec3';

const RADIUS = boat.visual.ropeRenderRadius;
/** Contact is allowed (a rope lying on the roof); this much overlap counts as cutting in. */
const TOLERANCE = 0.002;
/** Sample spacing along each rope, metres. */
const STEP = 0.02;

function samples(points: readonly Vec3[]): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1] as Vec3;
    const b = points[i] as Vec3;
    const n = Math.max(1, Math.ceil(Math.hypot(...sub(b, a)) / STEP));
    for (let k = 0; k < n; k += 1) {
      const t = k / n;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    }
  }
  out.push(points[points.length - 1] as Vec3);
  return out;
}

function drawings(values: Partial<Controls>): RopeDrawing[] {
  return ropeDrawings(initialRig({ ...defaultControls(), ...values }));
}

/** Rig states: wind all round, main sheet and vang hauled to eased, sails in and out. */
const STATES: Partial<Controls>[] = [];
for (let wd = -180; wd < 180; wd += 30) {
  for (const ms of [0, 30, 100]) {
    for (const vg of [0, 100]) {
      STATES.push({ ctl_wind_dir: wd, ctl_mainsheet: ms, ctl_vang: vg, ctl_wind_speed: 15 });
    }
  }
}
STATES.push(
  { ctl_wind_speed: 0, ctl_topping_lift: 0, ctl_vang: 0 },
  { ctl_main_furl: 0, ctl_jib_furl: 0, ctl_jib_sheet: 100 },
  { ctl_wind_dir: 90, ctl_jib_sheet: 100, ctl_jib_furl: 40 },
);

describe('M3b: rope routes', () => {
  it('no rope passes through the sprayhood or the coachroof, in any of the rig states', () => {
    for (const state of STATES) {
      for (const rope of drawings(state)) {
        rope.strands.forEach((strand, s) => {
          for (const p of samples(strand.points)) {
            const where = `${rope.id} strand ${s} at ${p.map((v) => v.toFixed(2)).join(', ')} ${JSON.stringify(state)}`;
            expect(cutsSprayhood(p, RADIUS - TOLERANCE), `sprayhood: ${where}`).toBe(false);
            expect(cutsCoachroof(p, RADIUS - TOLERANCE), `coachroof: ${where}`).toBe(false);
          }
        });
      }
    }
  }, 120_000);

  it('every line that comes out of the mast drops almost vertically (75–80°) to its turning block', () => {
    const [min, max] = boat.rig.lineLead.dropAngleDeg as [number, number];
    let checked = 0;
    for (const line of boat.rig.lineLead.lines) {
      const exit = mastExitPoint(line);
      if (!exit) continue;
      const block = turningBlockPoint(line);
      const d = sub(exit, block);
      const angle = (Math.atan2(d[1], Math.hypot(d[0], d[2])) * 180) / Math.PI;
      expect(angle, `${line.rope} ${'tail' in line ? line.tail : ''}`).toBeGreaterThanOrEqual(min);
      expect(angle, `${line.rope} ${'tail' in line ? line.tail : ''}`).toBeLessThanOrEqual(max);
      checked += 1;
    }
    // Topping lift, outhaul, jib sheet, both furling tails and both halyards (M5).
    expect(checked).toBe(7);
  });

  it('the drawn ropes really go out of the mast, down to their block, and flat aft into the channel', () => {
    const ropes = drawings({});
    for (const line of boat.rig.lineLead.lines) {
      const rope = ropes.find((r) => r.id === line.rope);
      expect(rope, line.rope).toBeDefined();
      if (!rope) continue;
      const block = turningBlockPoint(line);
      const strand = rope.strands.find((s) =>
        s.points.some((p) => Math.hypot(...sub(p, block)) < 1e-9),
      );
      const name = `${line.rope} ${'tail' in line ? line.tail : ''}`;
      expect(strand, name).toBeDefined();
      const points = strand?.points ?? [];
      const at = points.findIndex((p) => Math.hypot(...sub(p, block)) < 1e-9);
      const exit = mastExitPoint(line);
      if (exit) expect(points[at - 1], name).toEqual(exit);
      // From the block the rope runs flat to the channel mouth (within 3° of level).
      const mouth = points[at + 1] as Vec3;
      const d = sub(mouth, block);
      const slope = (Math.atan2(Math.abs(d[1]), Math.hypot(d[0], d[2])) * 180) / Math.PI;
      expect(slope, name).toBeLessThan(3);
    }
  });

  it('no diagonal shortcuts: between the mast foot and the clutch every line stays inside its covered channel', () => {
    const ropes = drawings({});
    const channel = boat.rig.lineLead.channel;
    for (const line of boat.rig.lineLead.lines) {
      const rope = ropes.find((r) => r.id === line.rope);
      if (!rope) continue;
      const side = line.bank === 'clutch_bank_a' ? 1 : -1;
      const path = channelPath(side);
      const front = path[0] as Vec3;
      const end = path[path.length - 1] as Vec3;
      const block = turningBlockPoint(line);
      const strand = rope.strands.find((s) =>
        s.points.some((p) => Math.hypot(...sub(p, block)) < 1e-9),
      );
      const points = strand?.points ?? [];
      const at = points.findIndex((p) => Math.hypot(...sub(p, block)) < 1e-9);
      // Up to the clutch's front face (M5: the tail then goes on into the rope tail box).
      const bank = boat.cockpitHardware.clutchBanks.find((b) => b.id === line.bank);
      const clutchFront = (bank?.x ?? 0) + boat.modelDetail.clutchBank.length / 2;
      const clutchAt = points.findIndex((p, k) => k > at && Math.abs(p[0] - clutchFront) < 1e-9);
      const lead = points.slice(at + 1, clutchAt);
      for (const p of samples(lead)) {
        // Where along the channel: the floor's centre line at this station.
        let centre: Vec3 = front;
        for (let i = 1; i < path.length; i += 1) {
          const a = path[i - 1] as Vec3;
          const b = path[i] as Vec3;
          if (p[0] <= a[0] + 1e-9 && p[0] >= b[0] - 1e-9) {
            const t = (a[0] - p[0]) / (a[0] - b[0]);
            centre = [p[0], a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
            break;
          }
        }
        const name = `${line.rope} at ${p.map((v) => v.toFixed(2)).join(', ')}`;
        expect(p[0], name).toBeLessThanOrEqual(front[0] + 1e-9);
        expect(p[0], name).toBeGreaterThanOrEqual(end[0] - 1e-9);
        expect(Math.abs(p[2] - centre[2]), name).toBeLessThan(channel.width / 2 - RADIUS);
        expect(p[1] + RADIUS, name).toBeLessThanOrEqual(centre[1] + channel.coverHeight);
        expect(p[1] - RADIUS, name).toBeGreaterThanOrEqual(centre[1] - 1e-9);
      }
    }
  });

  it('every line reaches its own clutch, on the side of its bank', () => {
    const ropes = drawings({});
    for (const line of boat.rig.lineLead.lines) {
      const rope = ropes.find((r) => r.id === line.rope);
      if (!rope) continue;
      const bank = boat.cockpitHardware.clutchBanks.find((b) => b.id === line.bank);
      // M5: the tail goes on through the clutch into the rope tail box behind the winch.
      const reaches = rope.strands.some((s) =>
        s.points.some(
          (p) =>
            Math.abs(p[0] - (bank?.x ?? 0)) <= boat.modelDetail.clutchBank.length / 2 + 1e-9 &&
            Math.abs(p[2] - (bank?.z ?? 0)) < boat.modelDetail.clutchBank.width,
        ),
      );
      expect(reaches, `${line.rope} → ${line.bank}`).toBe(true);
    }
  });

  it('JIB ROLL: the furling line runs on past its clutch, aft along the port side deck, past the port winch (nothing on it in Easy mode) into the port rope tail box', () => {
    const rope = drawings({}).find((r) => r.id === 'rope_jib_furling_line');
    const points = rope?.strands[0]?.points ?? [];
    const clutch = boat.cockpitHardware.jibRollClutch;
    const winch = boat.cockpitHardware.winches.find((w) => w.id === 'winch_primary_port');
    expect(winch).toBeDefined();
    const w = winch as NonNullable<typeof winch>;
    // Past the clutch, still on the port side.
    const after = points.filter((p) => p[0] < clutch.x - 0.5);
    expect(after.length).toBeGreaterThan(4);
    for (const p of after) expect(p[2]).toBeLessThan(0);
    // Not wrapped on the drum: every point stays clear of it.
    for (const p of points) {
      expect(Math.hypot(p[0] - w.x, p[2] - w.z)).toBeGreaterThan(
        boat.modelDetail.winch.diameter / 2 + RADIUS,
      );
    }
    // Ends in the port rope tail box, below its rim.
    const box = boat.cockpitHardware.ropeBins.boxes.find((b) => b.side === 'port');
    const last = points[points.length - 1] as Vec3;
    expect(Math.abs(last[0] - (box?.x ?? 0))).toBeLessThan(boat.modelDetail.ropeBin.length / 2);
    expect(Math.abs(last[2] - (box?.z ?? 0))).toBeLessThan(boat.modelDetail.ropeBin.width / 2);
    expect(last[1]).toBeLessThan(boat.deck.cockpit.coamingTopY);
  });

  it('the mainsheet tails come forward from their deck blocks to the mast foot, then aft in the channels', () => {
    const rope = drawings({}).find((r) => r.id === 'rope_mainsheet');
    for (const tail of ['port', 'starboard'] as const) {
      const block = turningBlockPoint(lineSpec('rope_mainsheet', tail));
      const strand = rope?.strands.find((s) =>
        s.points.some((p) => Math.hypot(...sub(p, block)) < 1e-9),
      );
      const first = strand?.points[0] as Vec3;
      const d = boat.rig.mainsheet.deckBlocks;
      expect(first[0]).toBeCloseTo(d.x, 6);
      expect(Math.abs(first[2])).toBeCloseTo(d.halfZ, 6);
    }
  });
});
