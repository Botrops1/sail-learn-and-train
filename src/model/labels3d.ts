import { boat, type BoatData } from './boat';
import { jibClew } from './jib';
import { boomPoint, mainSailCorners } from './rigGeometry';
import { drawnPose, type RopeDrawing } from './ropePaths';
import type { RigState } from './sim';
import { distance, vec3, type Vec3 } from './vec3';

/**
 * Labels in 3D (M5, PHASE1_SPEC 5.2 View tab): where each label sits on the boat, as the rig is
 * drawn now. Pure: the 3D view projects the points to the screen and the UI places the names.
 * The list and its order (the priority when labels overlap) come from `visual.labels3d`.
 */
export interface LabelAnchor {
  /** Registry id of the part or rope. */
  id: string;
  point: Vec3;
}

/** One entry of `visual.labels3d.list` (the fields each kind of `at` uses). */
interface LabelSpec {
  id: string;
  at: string | number[];
  distance?: number;
  strand?: number;
  fraction?: number;
  lift?: number;
}

/** Point a fraction of the way along a polyline (by length). */
export function alongPolyline(points: readonly Vec3[], fraction: number): Vec3 | undefined {
  if (points.length === 0) return undefined;
  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const d = distance(points[i - 1] as Vec3, points[i] as Vec3);
    lengths.push(d);
    total += d;
  }
  let left = Math.min(1, Math.max(0, fraction)) * total;
  for (let i = 1; i < points.length; i += 1) {
    const d = lengths[i - 1] as number;
    if (left <= d && d > 0) {
      const a = points[i - 1] as Vec3;
      const b = points[i] as Vec3;
      const t = left / d;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    }
    left -= d;
  }
  return points[points.length - 1];
}

function centroid(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  return [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
}

/** A cockpit fitting by id (winch, wheel, clutch bank, JIB ROLL clutch), at its base. */
function hardwarePoint(id: string, data: BoatData): Vec3 | undefined {
  const hw = data.cockpitHardware;
  const helm = hw.helms.find((h) => h.id === id);
  if (helm) return [helm.x, hw.wheelHubY, helm.z];
  const fitting =
    hw.winches.find((w) => w.id === id) ??
    hw.clutchBanks.find((b) => b.id === id) ??
    (hw.jibRollClutch.id === id ? hw.jibRollClutch : undefined);
  return fitting ? [fitting.x, fitting.y, fitting.z] : undefined;
}

function anchorOf(
  spec: LabelSpec,
  rig: RigState,
  drawings: readonly RopeDrawing[],
  data: BoatData,
): Vec3 | undefined {
  const shown = (unfurled: number) => unfurled * 100 >= data.visual.solver.furledBelowPct;
  if (Array.isArray(spec.at)) return spec.at.length === 3 ? vec3(spec.at) : undefined;
  switch (spec.at) {
    case 'mainSail': {
      const unfurled = rig.applied.mainFurl / 100;
      if (!shown(unfurled)) return undefined;
      const { tack, head, clew } = mainSailCorners(unfurled, drawnPose(rig), data);
      return centroid(tack, head, clew);
    }
    case 'jibSail': {
      const unfurled = rig.jibSolution.unfurled;
      if (!shown(unfurled)) return undefined;
      const { tack, head } = data.sails.jib;
      return centroid(vec3(tack), vec3(head), jibClew(rig.jibPhi.value, unfurled, data));
    }
    case 'boom':
      return spec.distance === undefined
        ? undefined
        : boomPoint(spec.distance, drawnPose(rig), data);
    case 'rope': {
      const rope = drawings.find((d) => d.id === spec.id);
      const strand = rope?.strands[spec.strand ?? 0];
      return strand ? alongPolyline(strand.points, spec.fraction ?? 0.5) : undefined;
    }
    case 'hardware': {
      const base = hardwarePoint(spec.id, data);
      return base ? [base[0], base[1] + (spec.lift ?? 0), base[2]] : undefined;
    }
    default:
      return undefined;
  }
}

/**
 * Every label's point, in priority order, for the rig as drawn (`drawings`: the ropes as drawn
 * this frame). A sail rolled away has no label.
 */
export function labelAnchors(
  rig: RigState,
  drawings: readonly RopeDrawing[],
  data: BoatData = boat,
): LabelAnchor[] {
  const anchors: LabelAnchor[] = [];
  for (const spec of data.visual.labels3d.list as LabelSpec[]) {
    const point = anchorOf(spec, rig, drawings, data);
    if (point && point.every(Number.isFinite)) anchors.push({ id: spec.id, point });
  }
  return anchors;
}

/** A label placed on the screen: its box in CSS px (left, top, width, height). */
export interface ScreenBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function overlaps(a: ScreenBox, b: ScreenBox, gap: number): boolean {
  return (
    a.x < b.x + b.width + gap &&
    b.x < a.x + a.width + gap &&
    a.y < b.y + b.height + gap &&
    b.y < a.y + a.height + gap
  );
}

/**
 * Which labels to show (M5): in priority order (the selected one first), each label whose box is
 * fully inside `area`, clear of every box in `blocked` (buttons over the view) and of the labels
 * already placed, by at least `gap` px. Pure, so it is tested without a browser.
 */
export function placeLabels(
  boxes: readonly (ScreenBox & { id: string })[],
  area: ScreenBox,
  blocked: readonly ScreenBox[],
  selected: readonly string[],
  gap: number,
): Set<string> {
  const order = [
    ...boxes.filter((box) => selected.includes(box.id)),
    ...boxes.filter((box) => !selected.includes(box.id)),
  ];
  const placed: ScreenBox[] = [];
  const shown = new Set<string>();
  for (const box of order) {
    const inside =
      box.x >= area.x &&
      box.y >= area.y &&
      box.x + box.width <= area.x + area.width &&
      box.y + box.height <= area.y + area.height;
    if (!inside) continue;
    if (blocked.some((b) => overlaps(box, b, 0))) continue;
    if (placed.some((b) => overlaps(box, b, gap))) continue;
    placed.push(box);
    shown.add(box.id);
  }
  return shown;
}
