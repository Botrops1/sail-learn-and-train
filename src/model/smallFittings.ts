import { boat, type BoatData } from './boat';
import { halfBeamAt, keelLineAt, sectionPoint, sheerAt } from './hullShape';
import { helmPedestal } from './helmPedestal';
import { deckBlocks } from './mainsheet';
import { cleatPlaces } from './mooringFittings';
import { shroudSegments } from './rigGeometry';
import type { Vec3 } from './vec3';

/** Small fittings and contact shadows (PHASE9_SPEC 11.3), drawn at High detail only. */

const BISECTION_STEPS = 40;
const SAME_POINT = 1e-6;

/**
 * The hull's half-width at height y on station x: the z of `sectionPoint(x, s)` where its y equals
 * `y` (bisection over s in [0, 1]). y above the sheer gives the deck edge's half-beam; below the
 * keel line, 0.
 */
export function hullHalfWidthAt(x: number, y: number, data: BoatData = boat): number {
  const top = sheerAt(x, data);
  const bottom = Math.min(keelLineAt(x, data), top);
  if (y >= top) return halfBeamAt(x, data);
  if (y <= bottom) return 0;
  let low = 0;
  let high = 1;
  for (let i = 0; i < BISECTION_STEPS; i += 1) {
    const mid = (low + high) / 2;
    if (sectionPoint(x, mid, data)[0] < y) low = mid;
    else high = mid;
  }
  return sectionPoint(x, (low + high) / 2, data)[1];
}

/**
 * One portlight on one side: rows of points on the hull (top row, then bottom row), `columns + 1`
 * points each, `proudM` outside the hull.
 */
export function portlightGrid(
  light: { x: number; lengthM: number },
  side: 1 | -1,
  data: BoatData = boat,
): [Vec3[], Vec3[]] {
  const p = data.deckFittings.portlights;
  const top: Vec3[] = [];
  const bottom: Vec3[] = [];
  for (let k = 0; k <= p.columns; k += 1) {
    const x = light.x - light.lengthM / 2 + (light.lengthM * k) / p.columns;
    const yT = sheerAt(x, data) - p.belowSheerM;
    const yB = yT - p.heightM;
    top.push([x, yT, side * (hullHalfWidthAt(x, yT, data) + p.proudM)]);
    bottom.push([x, yB, side * (hullHalfWidthAt(x, yB, data) + p.proudM)]);
  }
  return [top, bottom];
}

export interface ShroudFoot {
  strap: { centre: Vec3; size: Vec3 };
  fittings: { toggle: [Vec3, Vec3]; turnbuckle: [Vec3, Vec3] }[];
}

/** The fittings at one side's chainplate: the strap, and for each shroud starting there its toggle and turnbuckle (centre lines). */
export function shroudFoot(side: 1 | -1, data: BoatData = boat): ShroudFoot {
  const cp = data.rig.shrouds.chainplate;
  const f = data.modelDetail.shroudFittings;
  const c: Vec3 = [cp.x, cp.y, side * cp.halfZ];
  const along = (dir: Vec3, d: number): Vec3 => [
    c[0] + dir[0] * d,
    c[1] + dir[1] * d,
    c[2] + dir[2] * d,
  ];
  const fittings = shroudSegments(side, data)
    .filter(({ a }) => Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]) < SAME_POINT)
    .map(({ b }) => {
      const length = Math.hypot(b[0] - c[0], b[1] - c[1], b[2] - c[2]);
      const dir: Vec3 = [(b[0] - c[0]) / length, (b[1] - c[1]) / length, (b[2] - c[2]) / length];
      return {
        toggle: [c, along(dir, f.toggleLengthM)] as [Vec3, Vec3],
        turnbuckle: [
          along(dir, f.toggleLengthM),
          along(dir, f.toggleLengthM + f.turnbuckleLengthM),
        ] as [Vec3, Vec3],
      };
    });
  return {
    strap: {
      centre: [c[0], c[1] + f.strapAboveM, c[2]],
      size: [f.strapM[0] ?? 0, f.strapM[1] ?? 0, f.strapM[2] ?? 0],
    },
    fittings,
  };
}

/** The stanchions' bases, as `buildLifelines` places them: starboard first, then port, aft to forward. */
export function stanchionBases(data: BoatData = boat): Vec3[] {
  const l = data.modelDetail.lifelines;
  const count = Math.max(2, Math.round((l.fwdX - l.aftX) / l.stanchionSpacing) + 1);
  return ([1, -1] as const).flatMap((side) =>
    Array.from({ length: count }, (_, i): Vec3 => {
      const x = l.aftX + ((l.fwdX - l.aftX) * i) / (count - 1);
      return [x, sheerAt(x, data), side * (halfBeamAt(x, data) - l.inset)];
    }),
  );
}

export interface HatchBox {
  frame: { centre: Vec3; size: Vec3 }[];
  lid: { centre: Vec3; size: Vec3 };
}

/** Each hatch as four frame bars and a lid (sizes are x, y, z). */
export function hatchBoxes(data: BoatData = boat): HatchBox[] {
  const h = data.deckFittings.hatches;
  return h.list.map((hatch) => {
    const yD = hatch.on === 'coachroof' ? data.deck.coachroof.topY : sheerAt(hatch.x, data);
    const yC = yD + h.frameHeightM / 2;
    const dz = (hatch.widthM - h.frameWidthM) / 2;
    const dx = (hatch.lengthM - h.frameWidthM) / 2;
    return {
      frame: [
        {
          centre: [hatch.x, yC, hatch.z - dz],
          size: [hatch.lengthM, h.frameHeightM, h.frameWidthM],
        },
        {
          centre: [hatch.x, yC, hatch.z + dz],
          size: [hatch.lengthM, h.frameHeightM, h.frameWidthM],
        },
        {
          centre: [hatch.x - dx, yC, hatch.z],
          size: [h.frameWidthM, h.frameHeightM, hatch.widthM - 2 * h.frameWidthM],
        },
        {
          centre: [hatch.x + dx, yC, hatch.z],
          size: [h.frameWidthM, h.frameHeightM, hatch.widthM - 2 * h.frameWidthM],
        },
      ],
      lid: {
        centre: [hatch.x, yD + h.frameHeightM - h.lidThicknessM / 2, hatch.z],
        size: [
          hatch.lengthM - 2 * h.frameWidthM,
          h.lidThicknessM,
          hatch.widthM - 2 * h.frameWidthM,
        ],
      },
    };
  });
}

export interface ShadowSpot {
  centre: Vec3;
  sizeX: number;
  sizeZ: number;
}

export interface ShadowSizes {
  stanchionM: number;
  winchM: number;
  cleatM: [number, number];
  deckBlockM: number;
  pedestalM: [number, number];
}

/**
 * Soft contact patches under deck fittings: axis-aligned rectangles, a fitting's own turn is
 * ignored. `sizes` come from `SCENE.contactShadow` (the model does not read `SCENE`).
 */
export function contactShadowSpots(sizes: ShadowSizes, data: BoatData = boat): ShadowSpot[] {
  const spots: ShadowSpot[] = [];
  for (const base of stanchionBases(data)) {
    spots.push({ centre: base, sizeX: sizes.stanchionM, sizeZ: sizes.stanchionM });
  }
  for (const w of data.cockpitHardware.winches) {
    if ((w as { present?: boolean }).present === false) continue;
    spots.push({ centre: [w.x, w.y, w.z], sizeX: sizes.winchM, sizeZ: sizes.winchM });
  }
  for (const place of cleatPlaces(data)) {
    spots.push({ centre: place.base, sizeX: sizes.cleatM[0], sizeZ: sizes.cleatM[1] });
  }
  for (const block of deckBlocks(data)) {
    spots.push({
      centre: [block[0], data.deck.coachroof.topY, block[2]],
      sizeX: sizes.deckBlockM,
      sizeZ: sizes.deckBlockM,
    });
  }
  for (const helm of data.cockpitHardware.helms) {
    const column = helmPedestal(helm.id, data).column;
    spots.push({
      centre: [column.centre[0], data.deck.cockpit.soleY, column.centre[2]],
      sizeX: sizes.pedestalM[0],
      sizeZ: sizes.pedestalM[1],
    });
  }
  return spots;
}
