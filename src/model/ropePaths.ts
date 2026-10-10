import { boat, type BoatData } from './boat';
import type { RopeState } from './boomSolver';
import { halfBeamAt, sheerAt } from './hullShape';
import { carPoint, jibClew, jibFurlingLinePaidOut, jibSheetPaidOutFor, jibSheetSpan } from './jib';
import { channelLane, cutsSprayhood, sprayhoodClearY } from './deckVolumes';
import { mainFurlLengths } from './mainFurl';
import { availableSheetLength, deckBlocks, mainsheetBlocks, mainsheetPaidOut } from './mainsheet';
import {
  toppingLiftLimit,
  toppingLiftPaidOut,
  vangLimit,
  vangPaidOut,
  vangStrutLength,
} from './pitchLimits';
import { boomLocalToWorld, type BoomPose } from './rigGeometry';
import type { RigState } from './sim';
import { add, cross, distance, length, normalize, scale, sub, vec3, type Vec3 } from './vec3';

/**
 * Where the ropes run, as polylines in boat coordinates (PHASE1_SPEC 8.7). Pure maths, so
 * the renderer only copies points into buffers.
 *
 * Each rope is drawn as one or more strands, from the working end towards the clutch. Only the
 * working segment of a rope can sag; the lead to the clutch is straight. Every strand of a rope
 * always has the same number of points, so the renderer can reuse its buffers.
 */

export type RopeId =
  | 'rope_mainsheet'
  | 'rope_vang'
  | 'rope_topping_lift'
  | 'rope_outhaul'
  | 'rope_main_furling_line'
  | 'rope_jib_sheet'
  | 'rope_jib_furling_line'
  | 'rope_main_halyard'
  | 'rope_spi_halyard';

export interface RopeStrand {
  points: Vec3[];
  /**
   * Metres of rope that have gone out through the clutch end of this strand since fully hauled.
   * The renderer slides the rope's stripe pattern by it, so a hauled rope visibly moves.
   */
  feed: number;
}

export interface RopeDrawing {
  id: RopeId;
  state: RopeState;
  strands: RopeStrand[];
}

/** Direction the middle of a rope sags: gravity, at right angles to the rope. */
function sagDirection(a: Vec3, b: Vec3): Vec3 {
  const chord = sub(b, a);
  const d = length(chord);
  if (d < 1e-9) return [0, -1, 0];
  const c = scale(chord, 1 / d);
  // Gravity minus its part along the rope; straight down for a level rope.
  const across: Vec3 = sub([0, -1, 0], scale(c, -c[1]));
  const size = length(across);
  // A vertical rope has no "down" across it: let it fall aft.
  return size > 1e-6 ? scale(across, 1 / size) : [-1, 0, 0];
}

/**
 * Points of a rope hanging between a and b with `slack` metres of spare rope: a parabola with
 * mid-sag f = sqrt(3 · d · s / 8), capped at `visual.ropeMaxSagM` (PHASE1_SPEC 8.7). The sag
 * points down, at right angles to the rope: the same as straight down for a level rope, and
 * still visible on a steep one (a mainsheet part is almost vertical). Nothing hangs below
 * `floorY` (the deck under it).
 */
export function sagCurve(
  a: Vec3,
  b: Vec3,
  slack: number,
  segments: number,
  data: BoatData = boat,
  floorY = -Infinity,
): Vec3[] {
  const d = distance(a, b);
  const sag = Math.min(data.visual.ropeMaxSagM, Math.sqrt((3 * d * Math.max(0, slack)) / 8));
  const direction = sagDirection(a, b);
  const points: Vec3[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const p = add(add(a, scale(sub(b, a), t)), scale(direction, 4 * sag * t * (1 - t)));
    // The floor never lifts a rope whose both ends are lower (it only stops the sag).
    const floor = Math.min(floorY, Math.max(a[1], b[1]));
    points.push([p[0], Math.max(p[1], floor), p[2]]);
  }
  return points;
}

/**
 * A slack rope that would hang into the sprayhood lies on it instead (M3b): points inside the
 * hood are lifted onto its surface, and both ends of a straight piece that would still dip
 * into it are lifted together.
 */
export function drapeOverSprayhood(points: Vec3[], data: BoatData = boat): Vec3[] {
  const radius = data.visual.ropeRenderRadius;
  const lift = (p: Vec3) =>
    cutsSprayhood(p, radius, data)
      ? Math.max(0, sprayhoodClearY(p[0], p[2], radius, data) + DRAPE_MARGIN_M - p[1])
      : 0;
  const out = points.map((p): Vec3 => [p[0], p[1] + lift(p), p[2]]);
  for (let pass = 0; pass < DRAPE_PASSES; pass += 1) {
    let moved = false;
    for (let i = 1; i < out.length; i += 1) {
      const a = out[i - 1] as Vec3;
      const b = out[i] as Vec3;
      let need = 0;
      for (let k = 1; k < DRAPE_SAMPLES; k += 1) {
        const t = k / DRAPE_SAMPLES;
        need = Math.max(
          need,
          lift([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]),
        );
      }
      if (need > 0) {
        // The ends of the whole rope stay where they are fixed.
        if (i - 1 > 0) out[i - 1] = [a[0], a[1] + need, a[2]];
        if (i < out.length - 1) out[i] = [b[0], b[1] + need, b[2]];
        moved = true;
      }
    }
    if (!moved) break;
  }
  return out;
}

/** Gap kept between a draped rope and the hood, metres; passes and samples per straight piece. */
const DRAPE_MARGIN_M = 0.005;
const DRAPE_PASSES = 4;
const DRAPE_SAMPLES = 6;

type BankId = 'clutch_bank_a' | 'clutch_bank_b';

/** Where a rope enters its clutch: the front face of the bank, slot 1 most to port. */
function clutchPoint(bankId: BankId, slot: number, data: BoatData): Vec3 {
  const bank = data.cockpitHardware.clutchBanks.find((b) => b.id === bankId);
  if (!bank) throw new Error(`Clutch bank ${bankId} is missing from hanse508.json.`);
  const size = data.modelDetail.clutchBank;
  const slots = bank.clutches.length;
  const baseY = Math.max(bank.y, data.deck.cockpit.coamingTopY);
  return [
    bank.x + size.length / 2,
    baseY + size.height / 2,
    bank.z + ((slot - (slots + 1) / 2) * size.width) / slots,
  ];
}

/** Where a rope leaves its clutch towards the winch: the aft face of the bank. */
function clutchExitPoint(bankId: BankId, slot: number, data: BoatData): Vec3 {
  const front = clutchPoint(bankId, slot, data);
  return [front[0] - data.modelDetail.clutchBank.length, front[1], front[2]];
}

type LineSpec = BoatData['rig']['lineLead']['lines'][number];

/** The lead of one rope end from the mast foot to its clutch (rig.lineLead.lines). */
export function lineSpec(rope: string, tail?: string, data: BoatData = boat): LineSpec {
  const spec = data.rig.lineLead.lines.find(
    (line) => line.rope === rope && (tail === undefined || ('tail' in line && line.tail === tail)),
  );
  if (!spec) throw new Error(`No line lead for ${rope} ${tail ?? ''} in hanse508.json.`);
  return spec;
}

/** Centre of a line's turning block at the mast foot (on a ring around the mast). */
export function turningBlockPoint(spec: LineSpec, data: BoatData = boat): Vec3 {
  const angle = (spec.blockAngleDeg * Math.PI) / 180;
  const ring = data.rig.lineLead.turningBlockRingRadius;
  return [
    data.rig.mast.x - ring * Math.cos(angle),
    data.rig.mast.footY + data.modelDetail.mastBaseTurningBlocks.blockDiameter / 2,
    ring * Math.sin(angle),
  ];
}

/** Where a line leaves the mast (or its fitting) before dropping to its turning block. */
export function mastExitPoint(spec: LineSpec): Vec3 | undefined {
  return 'exit' in spec && spec.exit ? vec3(spec.exit) : undefined;
}

/**
 * From the turning block at the mast foot, flat aft into the covered channel on the clutch's
 * side, along it (under the sprayhood's edge, down onto the coaming) to the clutch.
 */
function leadToClutch(spec: LineSpec, data: BoatData): Vec3[] {
  const bankId = spec.bank as BankId;
  const side = bankId === 'clutch_bank_a' ? 1 : -1;
  const frontLane = 'frontLane' in spec && spec.frontLane ? spec.frontLane : spec.slot;
  return [
    turningBlockPoint(spec, data),
    ...channelLane(side, spec.slot, frontLane, data.visual.ropeRenderRadius, data),
    clutchPoint(bankId, spec.slot, data),
  ];
}

/** The pose the rig is drawn in (the smoothed boom). */
export function drawnPose(rig: RigState): BoomPose {
  return { thetaDeg: rig.theta.value, psiDeg: rig.psi.value };
}

/**
 * A rope put on a winch in Realistic mode (M5): which clutch's tail, which winch, how it is
 * wrapped. Built from the Realistic-mode state (`winchWraps` in realistic.ts).
 */
export interface WinchWrap {
  winchId: string;
  ropeId: string;
  /** Which end of the rope (main sheet: port / starboard; furling line: furl / unfurl). */
  tail: string | null;
  /** Turns on the drum: + clockwise seen from above (the right way), − anticlockwise. */
  turns: number;
  /** Tail in the self-tailer's jaw (else in the user's hand). */
  selfTailer: boolean;
}

/**
 * The ropes as polylines. `winches`: Realistic mode's winch setup (M5): a rope on a winch runs
 * on from its clutch and is drawn wrapped on that winch with its turns. Without it (Easy mode)
 * only the JIB ROLL line goes on to the port winch, two turns into the self-tailer (M3b).
 */
export function ropeDrawings(
  rig: RigState,
  data: BoatData = boat,
  winches?: readonly WinchWrap[],
): RopeDrawing[] {
  const pose = drawnPose(rig);
  const segments = data.visual.ropeSagSegments;
  const radius = data.visual.ropeRenderRadius;
  const boomTop = data.modelDetail.boomSection.height / 2 + radius;
  const blockRadius = data.modelDetail.block.radius;
  const boomBottom = -data.modelDetail.boomSection.height / 2 - blockRadius;
  const solution = rig.solution;
  const local = (p: Vec3) => boomLocalToWorld(p, pose, data);
  /** The lead to the clutch, continued onto the winch when this end is on one. */
  const lead = (rope: RopeId, tail?: string) => {
    const spec = lineSpec(rope, tail, data);
    const points = leadToClutch(spec, data);
    const wrap = winches?.find((w) => w.ropeId === rope && (w.tail ?? undefined) === tail);
    if (!wrap) return points;
    const exit = clutchExitPoint(spec.bank as BankId, spec.slot, data);
    return [...points, exit, ...winchWrapPoints(wrap, exit, data)];
  };
  const exitOf = (rope: RopeId) => {
    const exit = mastExitPoint(lineSpec(rope, undefined, data));
    if (!exit) throw new Error(`No mast exit for ${rope} in hanse508.json.`);
    return exit;
  };

  // Mainsheet: two parts from each deck block up to the three boom blocks. Each tail runs
  // forward to the mast-foot organiser (manual lead plan), then aft to its clutch.
  const [deckPort, deckStarboard] = deckBlocks(data);
  const spacing = data.modelDetail.mainsheetBoomBlockSpacing;
  const boomBlock = (k: number) =>
    local([-(data.rig.mainsheet.boomDistance + k * spacing), boomBottom, 0]);
  const sheetUsed =
    distance(local([-data.rig.mainsheet.boomDistance, 0, 0]), deckPort) +
    distance(local([-data.rig.mainsheet.boomDistance, 0, 0]), deckStarboard);
  const sheetSpare =
    solution.mainsheet.state === 'fighting'
      ? 0
      : Math.max(0, availableSheetLength(rig.applied.mainsheet, data) - sheetUsed);
  // L counts one part per side; the rope's spare, partsPerSide · (L_avail − L), is shared by
  // the 2 · partsPerSide parts, so each part has (L_avail − L) / 2.
  const perPart = sheetSpare / 2;
  const sheetOut = mainsheetPaidOut(rig.applied.mainsheet, data) / 2;
  const blocks = mainsheetBlocks(data);
  // The tails leave the deck blocks lying on the coachroof; slack parts sag onto it.
  const onRoof = (p: Vec3): Vec3 => [p[0], Math.max(p[1], data.deck.coachroof.topY + radius), p[2]];
  const sheetPart = (k: number, deck: Vec3): RopeStrand => ({
    points: drapeOverSprayhood(
      sagCurve(boomBlock(k), deck, perPart, segments, data, onRoof(deck)[1]),
      data,
    ),
    feed: 0,
  });
  const mainsheet: RopeDrawing = {
    id: 'rope_mainsheet',
    state: solution.mainsheet.state,
    strands: [
      ...blocks.port.map((k) => sheetPart(k, deckPort)),
      ...blocks.starboard.map((k) => sheetPart(k, deckStarboard)),
      {
        points: [onRoof(deckPort), ...lead('rope_mainsheet', 'port')],
        feed: sheetOut,
      },
      {
        points: [onRoof(deckStarboard), ...lead('rope_mainsheet', 'starboard')],
        feed: sheetOut,
      },
    ],
  };

  // Vang: the tackle runs alongside the rigid strut, then down to the mast foot and aft.
  const offset = data.modelDetail.vangTackleOffset;
  const vangTop = local([-data.rig.vang.boomDistance, 0, offset]);
  const theta = (pose.thetaDeg * Math.PI) / 180;
  const vangBottom = add(vec3(data.rig.vang.mastPoint), [
    offset * Math.sin(theta),
    0,
    offset * Math.cos(theta),
  ]);
  const vangSpare =
    solution.vang.state === 'fighting'
      ? 0
      : Math.max(
          0,
          vangStrutLength(vangLimit(rig.applied.vang, data), data) -
            vangStrutLength(pose.psiDeg, data),
        );
  const vang: RopeDrawing = {
    id: 'rope_vang',
    state: solution.vang.state,
    strands: [
      {
        points: sagCurve(vangTop, vangBottom, vangSpare, segments, data, data.rig.mast.footY),
        feed: 0,
      },
      {
        points: [vangBottom, ...lead('rope_vang')],
        feed: vangPaidOut(rig.applied.vang, data),
      },
    ],
  };

  // Topping lift: boom end up to the masthead, inside the mast, out at its foot and aft. Its
  // spare rope is measured to the lift's own limit, so a lift eased below the rigid vang
  // strut's stop hangs slack while the strut carries the boom.
  const liftPoint: Vec3 = [-data.rig.toppingLift.boomDistance, boomTop, 0];
  const liftEnd = local(liftPoint);
  const liftExit = vec3(data.rig.toppingLift.mastExit);
  const liftAvailable = distance(
    liftExit,
    boomLocalToWorld(
      liftPoint,
      { thetaDeg: pose.thetaDeg, psiDeg: toppingLiftLimit(rig.applied.toppingLift, data) },
      data,
    ),
  );
  const liftSpare =
    solution.toppingLift.state === 'slack'
      ? Math.max(0, liftAvailable - distance(liftExit, liftEnd))
      : 0;
  const toppingLift: RopeDrawing = {
    id: 'rope_topping_lift',
    state: solution.toppingLift.state,
    strands: [
      {
        points: sagCurve(liftEnd, liftExit, liftSpare, segments, data, data.rig.mast.footY),
        feed: 0,
      },
      {
        points: [exitOf('rope_topping_lift'), ...lead('rope_topping_lift')],
        feed: toppingLiftPaidOut(rig.applied.toppingLift, data),
      },
    ],
  };

  // Main furling: the clew, the outhaul and both tails of the furling line. The outhaul runs
  // in one part (1:1) from the clew aft along the top of the boom to a sheave at the boom end,
  // forward inside the boom (not drawn), and out at the gooseneck. Its marks on the boom stay
  // with the clew (feed 0); the lead to the clutch moves by the rope paid out.
  const furl = mainFurlLengths(rig.applied.mainFurl, data);
  const gooseneck = vec3(data.rig.boom.gooseneck);
  const gooseneckSize = data.modelDetail.gooseneckSize;
  const side = -data.modelDetail.outhaulPartSpacing;
  const outhaul: RopeDrawing = {
    id: 'rope_outhaul',
    state: 'taut',
    strands: [
      {
        points: [
          local([-furl.clewDistance, boomTop, side]),
          local([-data.rig.outhaul.boomBlockDistance, boomTop, side]),
        ],
        feed: 0,
      },
      {
        points: [
          [exitOf('rope_outhaul')[0], gooseneck[1] - gooseneckSize / 2, exitOf('rope_outhaul')[2]],
          exitOf('rope_outhaul'),
          ...lead('rope_outhaul'),
        ],
        feed: furl.outhaulPaidOut,
      },
    ],
  };

  // Both tails come off the drum under the gearbox and drop to their turning blocks.
  const tail = (name: 'furl' | 'unfurl', feed: number): RopeStrand => {
    const spec = lineSpec('rope_main_furling_line', name, data);
    const exit = mastExitPoint(spec);
    if (!exit) throw new Error('No drum exit for the main furling line in hanse508.json.');
    return { points: [exit, ...lead('rope_main_furling_line', name)], feed };
  };
  const furlingLine: RopeDrawing = {
    id: 'rope_main_furling_line',
    state: 'taut',
    strands: [tail('furl', furl.inTailPaidOut), tail('unfurl', furl.outTailPaidOut)],
  };

  return [
    mainsheet,
    vang,
    toppingLift,
    outhaul,
    furlingLine,
    ...jibRopes(rig, data, winches, lead),
    ...halyards(lead, data),
  ];
}

/**
 * The two static halyards (M5, owner after M4a), so selecting one highlights a rope in 3D too.
 * The main halyard runs inside the mast (in-mast furling): only its tail is seen, out of the
 * mast foot, down to its turning block and aft to the "Main halyard" clutch. The gennaker
 * halyard is parked: from the masthead down the front of the mast to its shackle at the mast
 * foot, and its tail from the mast foot to "SPI HALYARD". Both are drawn taut.
 */
function halyards(lead: (rope: RopeId, tail?: string) => Vec3[], data: BoatData): RopeDrawing[] {
  const tail = (rope: RopeId): RopeStrand => {
    const exit = mastExitPoint(lineSpec(rope, undefined, data));
    if (!exit) throw new Error(`No mast exit for ${rope} in hanse508.json.`);
    return { points: [exit, ...lead(rope)], feed: 0 };
  };
  const spi = lineSpec('rope_spi_halyard', undefined, data);
  if (!('parked' in spi) || !spi.parked) {
    throw new Error('No parked run for the gennaker halyard in hanse508.json.');
  }
  return [
    { id: 'rope_main_halyard', state: 'taut', strands: [tail('rope_main_halyard')] },
    {
      id: 'rope_spi_halyard',
      state: 'taut',
      strands: [
        { points: [vec3(spi.parked.masthead), vec3(spi.parked.end)], feed: 0 },
        tail('rope_spi_halyard'),
      ],
    },
  ];
}

/**
 * A rope's way round a winch drum (M5): from `from` (where it leaves the clutch) onto the drum
 * at the tangent point, `|turns|` turns rising up the drum (clockwise seen from above for + turns,
 * the way a winch turns; anticlockwise for − turns, PT-17), then into the self-tailer's jaw on
 * top or off the drum to the hand. With no turns the rope runs straight to the hand.
 */
export function winchWrapPoints(wrap: WinchWrap, from: Vec3, data: BoatData = boat): Vec3[] {
  const winch = data.cockpitHardware.winches.find((w) => w.id === wrap.winchId);
  if (!winch) throw new Error(`Winch ${wrap.winchId} is missing from hanse508.json.`);
  const size = data.modelDetail.winch;
  const detail = data.modelDetail.winchRope;
  const radius = data.visual.ropeRenderRadius;
  const r = size.diameter / 2 + radius;
  const inboard = -Math.sign(winch.z) || 1;
  const hand: Vec3 = [
    winch.x - detail.handAftM,
    data.deck.cockpit.coamingTopY + detail.handAboveCoamingM,
    winch.z + inboard * detail.handInboardM,
  ];
  const turns = Math.min(Math.abs(wrap.turns), data.realisticMode.capstan.maxTurns);
  if (turns === 0) return [hand];
  // Angles round the drum seen from above: 0 = forward (+x), +90° = starboard (+z). Increasing
  // angle is clockwise seen from above.
  const dir = wrap.turns > 0 ? 1 : -1;
  const at = (p: Vec3) => Math.atan2(p[2] - winch.z, p[0] - winch.x);
  const reach = (p: Vec3) =>
    Math.acos(Math.min(1, r / Math.max(r, Math.hypot(p[0] - winch.x, p[2] - winch.z))));
  // The rope meets the drum where it runs on in the turning direction, and leaves it where the
  // turning direction points at the hand.
  const start = at(from) + dir * reach(from);
  const end = start + dir * 2 * Math.PI * turns;
  let total = 2 * Math.PI * turns;
  if (!wrap.selfTailer) {
    const leave = at(hand) - dir * reach(hand);
    total += (((dir * (leave - end)) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  }
  // Each turn lies one rope's width above the last, up to the top of the wrap.
  const bottom = winch.y + detail.wrapBottomAboveBase;
  const top = Math.min(winch.y + detail.wrapTopAboveBase, bottom + 2 * radius * turns);
  const steps = Math.max(2, Math.ceil((WINCH_WRAP_POINTS_PER_TURN * total) / (2 * Math.PI)));
  const points: Vec3[] = [];
  for (let k = 0; k <= steps; k += 1) {
    const a = start + (dir * total * k) / steps;
    points.push([
      winch.x + r * Math.cos(a),
      bottom + ((top - bottom) * k) / steps,
      winch.z + r * Math.sin(a),
    ]);
  }
  if (!wrap.selfTailer) return [...points, hand];
  // Up over the rim into the jaw, a little further round, just inside the drum's edge.
  const jawAngle = start + dir * (total + (detail.jawAheadDeg * Math.PI) / 180);
  const jaw = size.diameter / 2 - radius;
  return [
    ...points,
    [
      winch.x + jaw * Math.cos(jawAngle),
      winch.y + size.height - radius,
      winch.z + jaw * Math.sin(jawAngle),
    ],
  ];
}

/**
 * Jib sheet and jib furling line (PHASE1_SPEC 8.5, 8.7). The sheet has two parts between the
 * clew and the car (2:1, photo), then runs along the track to the mast foot and aft to the
 * "Genoa sheet" clutch. The furling line runs from the drum at the bow aft along the port
 * stanchion bases to the JIB ROLL clutch.
 */
function jibRopes(
  rig: RigState,
  data: BoatData,
  winches: readonly WinchWrap[] | undefined,
  lead: (rope: RopeId, tail?: string) => Vec3[],
): RopeDrawing[] {
  const segments = data.visual.ropeSagSegments;
  const jib = rig.jibSolution;
  const phi = rig.jibPhi.value;
  const clew = jibClew(phi, jib.unfurled, data);
  const car = carPoint(clew, data);
  const track = data.rig.selfTackingTrack;

  // The two parts, a little apart across the rope so both show. The rope's spare,
  // purchase · (ℓ_avail − ℓ), is shared by the purchase's parts: each has ℓ_avail − ℓ.
  const along = sub(car, clew);
  const across = normalize(cross(along, [0, 1, 0]));
  const offset = scale(
    length(across) > 0 ? across : [1, 0, 0],
    data.modelDetail.jibSheetPartSpacing / 2,
  );
  const spare =
    jib.sheet.state === 'slack'
      ? Math.max(0, jib.sheetAvailable - jibSheetSpan(phi, jib.unfurled, data))
      : 0;
  const part = (sign: 1 | -1): RopeStrand => ({
    points: sagCurve(
      add(clew, scale(offset, sign)),
      add(car, scale(offset, sign)),
      spare,
      segments,
      data,
      // A slack sheet lies on the coachroof (the track is on it).
      Math.max(track.y, data.deck.coachroof.topY + data.visual.ropeRenderRadius),
    ),
    feed: 0,
  });
  // From the car into the mast front, down inside the mast (not drawn), out on its starboard
  // side, down to the turning block and aft to the "Genoa sheet" clutch.
  const sheetSpec = lineSpec('rope_jib_sheet', undefined, data);
  const sheetExit = mastExitPoint(sheetSpec);
  const sheetEntry = 'entry' in sheetSpec ? sheetSpec.entry : undefined;
  if (!sheetExit || !sheetEntry) {
    throw new Error('No mast entry or exit for the jib sheet in hanse508.json.');
  }
  const sheetFeed = jibSheetPaidOutFor(jib.sheetAvailable, data);
  const jibSheet: RopeDrawing = {
    id: 'rope_jib_sheet',
    state: jib.sheet.state,
    strands: [
      part(1),
      part(-1),
      { points: [car, vec3(sheetEntry)], feed: sheetFeed },
      { points: [sheetExit, ...lead('rope_jib_sheet')], feed: sheetFeed },
    ],
  };

  // Furling line: drum → fairleads at the port stanchion bases forward of the clutch → clutch.
  const furler = data.rig.jibFurler;
  const drum = vec3(furler.drum);
  const drumRadius = data.modelDetail.jibFurlerDrumDiameter / 2;
  const lifelines = data.modelDetail.lifelines;
  const clutch = data.cockpitHardware.jibRollClutch;
  const clutchSize = data.modelDetail.jibRollClutch;
  const radius = data.visual.ropeRenderRadius;
  const count = Math.max(
    2,
    Math.round((lifelines.fwdX - lifelines.aftX) / lifelines.stanchionSpacing) + 1,
  );
  const fairleads: Vec3[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const x = lifelines.aftX + ((lifelines.fwdX - lifelines.aftX) * i) / (count - 1);
    if (x <= clutch.x + clutchSize.length / 2) break;
    const inboard = lifelines.inset + lifelines.stanchionDiameter;
    fairleads.push([x, sheerAt(x, data) + radius, -(halfBeamAt(x, data) - inboard)]);
  }
  const furlingLine: RopeDrawing = {
    id: 'rope_jib_furling_line',
    state: 'taut',
    strands: [
      {
        points: [
          [drum[0], drum[1] + furler.drumHeight / 2, drum[2] - drumRadius],
          ...fairleads,
          // The JIB ROLL clutch stands on the side deck (as in the 3D model).
          [
            clutch.x + clutchSize.length / 2,
            Math.max(clutch.y, sheerAt(clutch.x, data)) + clutchSize.height / 2,
            clutch.z,
          ],
          [
            clutch.x - clutchSize.length / 2,
            Math.max(clutch.y, sheerAt(clutch.x, data)) + clutchSize.height / 2,
            clutch.z,
          ],
          ...jibRollPastClutch(winches, data),
        ],
        feed: jibFurlingLinePaidOut(jib.unfurled, data),
      },
    ],
  };
  return [jibSheet, furlingLine];
}

/**
 * Where the JIB ROLL line goes past its clutch. Easy mode (no winch setup): on to the port winch
 * and into its self-tailer (M3b). Realistic mode (M5): on to the port winch only while it is put
 * on it, wrapped as it is there; else its tail ends just past the clutch.
 */
function jibRollPastClutch(winches: readonly WinchWrap[] | undefined, data: BoatData): Vec3[] {
  if (!winches) return jibRollToWinch(data);
  const roll = data.cockpitHardware.jibRollClutch;
  const wrap = winches.find((w) => w.ropeId === roll.ropeId);
  const deckY = (x: number) => sheerAt(x, data) + data.visual.ropeRenderRadius;
  if (!wrap) {
    const x = roll.x - data.modelDetail.jibRollClutch.length;
    return [[x, Math.max(roll.y, deckY(x)) + data.modelDetail.jibRollClutch.height / 2, roll.z]];
  }
  const lead = roll.leadToWinch;
  const path: Vec3[] = [
    ...lead.sideDeck.map(([x = 0, z = 0]): Vec3 => [x, deckY(x), z]),
    ...lead.overCoaming.map((p) => vec3(p)),
  ];
  return [...path, ...winchWrapPoints(wrap, path[path.length - 1] as Vec3, data)];
}

/**
 * The jib furling line past its clutch (M3b, owner): aft along the port side deck, over the
 * coaming outboard of clutch bank B, onto the port winch from forward on its inboard side,
 * clockwise round the drum (seen from above) and into the self-tailer on top.
 */
export function jibRollToWinch(data: BoatData = boat): Vec3[] {
  const lead = data.cockpitHardware.jibRollClutch.leadToWinch;
  const radius = data.visual.ropeRenderRadius;
  const winch = data.cockpitHardware.winches.find((w) => w.id === lead.winch);
  if (!winch) throw new Error(`Winch ${lead.winch} is missing from hanse508.json.`);
  const size = data.modelDetail.winch;
  const points: Vec3[] = [
    ...lead.sideDeck.map(([x = 0, z = 0]): Vec3 => [x, sheerAt(x, data) + radius, z]),
    ...lead.overCoaming.map((p) => vec3(p)),
  ];
  // Clockwise seen from above (bow up, starboard right): from the inboard side, aft, outboard.
  const wrapRadius = size.diameter / 2 + radius;
  const turns = lead.wraps;
  const steps = turns * WRAP_POINTS_PER_TURN;
  const bottom = winch.y + lead.wrapBottomAboveWinchBase;
  const top = winch.y + lead.wrapTopAboveWinchBase;
  for (let k = 0; k <= steps; k += 1) {
    const phi = (2 * Math.PI * k) / WRAP_POINTS_PER_TURN;
    const inboard = -Math.sign(winch.z) || 1;
    points.push([
      winch.x - wrapRadius * Math.sin(phi),
      bottom + ((top - bottom) * k) / steps,
      winch.z + inboard * wrapRadius * Math.cos(phi),
    ]);
  }
  // Up into the jaws of the self-tailer, just inside the drum's rim.
  const jaw = size.diameter / 2 - radius;
  points.push([winch.x - jaw * 0.7, winch.y + size.height - radius, winch.z - jaw * 0.7]);
  return points;
}

/** Points per turn of a rope wrapped round a winch drum. */
const WRAP_POINTS_PER_TURN = 12;

/**
 * Points per turn of a rope on a winch in Realistic mode (M5): finer, so a rope seen close up
 * from the Helm view stays round on the drum.
 */
export const WINCH_WRAP_POINTS_PER_TURN = 24;
